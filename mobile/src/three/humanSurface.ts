import * as THREE from "three";

// A muted, matte illustrative skin palette. Muscle colouring is independent of
// skin and eye colour; no photograph, skin texture or identity is synthesized.
export const HUMAN_SURFACE = {
  skin: "#c1a58d", clothing: "#2c3035", sclera: "#e3dfd5",
  iris: "#64584d", pupil: "#1d2022", roughness: .78,
};
export function humanSurfaceColours(positions: Float32Array, materials: Uint8Array) {
  const centres = [-1,1].map(side=>{
    const box = new THREE.Box3();
    for(let i=0;i<materials.length;i++)if(materials[i]===2&&positions[i*3]*side>0)box.expandByPoint(new THREE.Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]));
    return {centre:box.getCenter(new THREE.Vector3()),radius:box.getSize(new THREE.Vector3()).multiplyScalar(.5)};
  });
  const skin=new THREE.Color(HUMAN_SURFACE.skin),cloth=new THREE.Color(HUMAN_SURFACE.clothing),white=new THREE.Color(HUMAN_SURFACE.sclera),iris=new THREE.Color(HUMAN_SURFACE.iris),pupil=new THREE.Color(HUMAN_SURFACE.pupil),colour=new THREE.Color();
  const blood=new THREE.Color("#b87966"),lips=new THREE.Color("#976b61"),brow=new THREE.Color("#655349");
  const result=new Float32Array(positions.length),eyeY=centres[0].centre.y;
  for(let i=0;i<materials.length;i++){
    colour.copy(materials[i]===1?cloth:skin);
    if(materials[i]===0){
      const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2],a=Math.abs(x);
      const front=THREE.MathUtils.smoothstep(z,.8,1.2);
      const cheek=Math.exp(-(((a-.52)/.24)**2+((y-(eyeY-.27))/.22)**2))*front;
      const mouth=Math.exp(-((x/.24)**4+((y-(eyeY-.53))/.055)**2))*front;
      const eyebrow=Math.exp(-(((a-.30)/.20)**4+((y-(eyeY+.19))/.046)**2))*front;
      colour.lerp(blood,cheek*.18).lerp(lips,mouth*.48).lerp(brow,eyebrow*.74);
      // Subtle rest-space variation follows the skin, rather than a fixed light
      // or a muscle activity map. Clothing and eye whites stay separate.
      colour.multiplyScalar(1+.012*Math.sin(x*17+y*11)*Math.sin(z*19-y*7));
    }
    if(materials[i]===2){
      const {centre,radius}=centres[positions[i*3]<0?0:1];
      const distance=Math.hypot((positions[i*3]-centre.x)/radius.x,(positions[i*3+1]-centre.y)/radius.y);
      colour.copy(white);
      if(positions[i*3+2]>centre.z){
        colour.lerp(iris,THREE.MathUtils.smoothstep(.62-distance,0,.16));
        colour.lerp(pupil,THREE.MathUtils.smoothstep(.25-distance,0,.10));
      }
    }
    colour.toArray(result,i*3);
  }
  return result;
}
