import * as THREE from "three";
const { createHash } = require("node:crypto");
import asset from "../src/data/human/makehuman.json";
import { HandGripSurface } from "../src/three/handGrip";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { createTrainingScene } from "../src/three/trainingScene";
import { MOTION_TYPES } from "../src/domain/exerciseMotion";
import { trainingFrame3d } from "../src/domain/training3d";
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const base=new Float32Array(bytes(asset.positions).buffer),m=bytes(asset.materials);

test("the accepted body and hand reference geometry, normals and weights remain unchanged; garment rings have level edges",()=>{
 const h=createHash("sha256");
 for(const [key,size] of [["positions",3],["normals",3],["skinIndices",4],["skinWeights",4]] as const){
  const b=bytes(asset[key]),n=key==="skinIndices"?1:4;
  for(let i=0;i<m.length;i++)if(m[i]!==1)h.update(b.slice(i*size*n,(i+1)*size*n));
 }
 expect(h.digest("hex")).toBe("7eb21e4bac0ac6287513ae8964b3aec7c8c654fa98836e511d724f969f21d4c6");
 expect(asset.garmentRevision).toBe("level-hems-v1");
 const edges=new Map<string,number>(),indices=new Uint16Array(bytes(asset.indices).buffer);
 for(let i=0;i<indices.length;i+=3){const tri=Array.from(indices.slice(i,i+3));if(!tri.every(i=>m[i]===1))continue;for(let j=0;j<3;j++){const key=[tri[j],tri[(j+1)%3]].sort((a,b)=>a-b).join("/");edges.set(key,(edges.get(key)??0)+1);}}
 const boundary=new Set([...edges].filter(([,n])=>n===1).flatMap(([key])=>key.split("/").map(Number)));
 for(const side of [0,-1,1]){const ring=[...boundary].filter(i=>side===0?base[i*3+1]>0:base[i*3+1]<0&&base[i*3]*side>0).map(i=>base[i*3+1]);expect(ring.length).toBeGreaterThan(10);expect(Math.max(...ring)-Math.min(...ring)).toBeLessThan(.12);}
});
test("grip fitting leaves the wrist and axial spacing fixed, with finite normals across different handle sizes",()=>{
 const ref=asset.grips.L,fit=new HandGripSurface(ref),wrist=new THREE.Vector3(...ref.wrist),n=new THREE.Vector3(1,0,0),copy=wrist.clone();
 fit.fit(wrist,n,.35);expect(wrist.distanceTo(copy)).toBeLessThan(1e-9);
 const axis=new THREE.Vector3(...ref.axis),centre=new THREE.Vector3(...ref.centre);
 for(const radius of [.1,.2,.35]){
  const p=centre.clone().addScaledVector(new THREE.Vector3(...ref.approach),-.08).addScaledVector(axis,.12),normal=new THREE.Vector3(...ref.approach),before=p.clone().sub(centre).dot(axis);
  fit.fit(p,normal,radius);expect(p.clone().sub(centre).dot(axis)).toBeCloseTo(before,7);expect(p.toArray().every(Number.isFinite)).toBe(true);expect(normal.length()).toBeCloseTo(1,7);
 }
});
test.each(MOTION_TYPES)("%s: real finger skin remains outside the grip and clothing follows posed body support",type=>{
 const human=createRealisticHuman(new THREE.Group());
 try{for(const progress of [0,.33,.66,1]){
  const f=trainingFrame3d(type,progress);human.draw(f,true);
  for(const stats of human.mesh.userData.gripSurfaces){expect(stats.minimumClearance).toBeGreaterThanOrEqual(.024);expect(stats.contactVertices).toBeGreaterThan(5);}
  human.mesh.userData.handContacts.forEach((contact:any)=>expect(contact.error).toBeLessThan(1e-6));
  const p=human.mesh.geometry.attributes.position,n=human.mesh.geometry.attributes.normal;
  expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
  for(const binding of asset.garmentBindings){
   const support=new THREE.Vector3(),normal=new THREE.Vector3();binding.body.forEach((i,j)=>{expect(m[i]).toBe(0);support.addScaledVector(new THREE.Vector3().fromBufferAttribute(p,i),binding.weights[j]);normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(n,i),binding.weights[j]);});
   const clearance=new THREE.Vector3().fromBufferAttribute(p,binding.vertex).sub(support).dot(normal.normalize());expect(clearance).toBeGreaterThan(.4499);
  }
 }}finally{human.dispose();}
});
test("anatomy on/off and buffer reuse preserve the fitted hand surface and remove it on disposal",()=>{
 const parent=new THREE.Group(),human=createRealisticHuman(parent),f=trainingFrame3d("chest-press",.5),p=human.mesh.geometry.attributes.position;
 human.draw(f,false);const neutral=(p.array as Float32Array).slice();human.draw(f,true);expect(human.mesh.geometry.attributes.position).toBe(p);expect(p.array).toEqual(neutral);
 const dispose=jest.spyOn(human.mesh.geometry,"dispose");human.dispose();human.dispose();expect(dispose).toHaveBeenCalledTimes(1);expect(parent.children).toHaveLength(0);
});
test("hands focus reveals real fingers without opaque contact balls; feet keep their existing contact markers",()=>{
 let scene:THREE.Scene;
 const renderer={setPixelRatio:jest.fn(),setSize:jest.fn(),shadowMap:{},render:(s:THREE.Scene)=>{scene=s;},dispose:jest.fn()} as unknown as THREE.WebGLRenderer;
 const handle=createTrainingScene(renderer,390,400),input={type:"chest-press",progress:.5,view:"front" as const,anatomy:true,transparent:false};
 try{handle.draw({...input,focus:"hands"});expect(scene!.getObjectByName("contact0")?.visible??false).toBe(false);handle.draw({...input,focus:"feet"});expect(scene!.getObjectByName("contact0")?.visible).toBe(true);handle.draw({...input,focus:"hands"});expect(scene!.getObjectByName("contact0")?.visible).toBe(false);}finally{handle.dispose();}
});
