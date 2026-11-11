import * as THREE from "three";

// A muted, matte illustrative skin palette. Muscle colouring is independent of
// skin and eye colour; no photograph, skin texture or identity is synthesized.
export const HUMAN_SURFACE = {
  skin: "#c1a58d", clothing: "#2c3035", sclera: "#e3dfd5",
  iris: "#64584d", pupil: "#1d2022", roughness: .82,
};
export function humanSurfaceColours(positions: Float32Array, materials: Uint8Array) {
  const centres = [-1,1].map(side=>{
    const box = new THREE.Box3();
    for(let i=0;i<materials.length;i++)if(materials[i]===2&&positions[i*3]*side>0)box.expandByPoint(new THREE.Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]));
    return {centre:box.getCenter(new THREE.Vector3()),radius:box.getSize(new THREE.Vector3()).multiplyScalar(.5)};
  });
  const skin=new THREE.Color(HUMAN_SURFACE.skin),cloth=new THREE.Color(HUMAN_SURFACE.clothing),white=new THREE.Color(HUMAN_SURFACE.sclera),iris=new THREE.Color(HUMAN_SURFACE.iris),pupil=new THREE.Color(HUMAN_SURFACE.pupil),colour=new THREE.Color();
  const result=new Float32Array(positions.length);
  for(let i=0;i<materials.length;i++){
    colour.copy(materials[i]===1?cloth:skin);
    if(materials[i]===2){
      const {centre,radius}=centres[positions[i*3]<0?0:1];
      const distance=Math.hypot((positions[i*3]-centre.x)/radius.x,(positions[i*3+1]-centre.y)/radius.y);
      colour.copy(white);
      if(positions[i*3+2]>centre.z){
        colour.lerp(iris,THREE.MathUtils.smoothstep(.68-distance,0,.16));
        colour.lerp(pupil,THREE.MathUtils.smoothstep(.3-distance,0,.12));
      }
    }
    colour.toArray(result,i*3);
  }
  return result;
}
