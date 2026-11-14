import * as THREE from "three";
import asset from "../src/data/human/makehuman.json";
import { torsoRetarget } from "../src/three/torsoRetarget";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { trainingFrame3d, unit3, sub3, dot3, length3 } from "../src/domain/training3d";
import { MOTION_TYPES } from "../src/domain/exerciseMotion";
const root=asset.rest.spine05.head,neck=asset.rest.neck.head;

test.each(["chest-press","lat-pulldown","pec-fly","barbell-bench-press"])("%s: neutral vertebrae share one continuous transform rather than separate forward offsets",type=>{
 const frame=trainingFrame3d(type,.5),torso=torsoRetarget(frame.body,root,neck,4.8),source=new THREE.Vector3(.4,3.5,.8);
 const reference=source.clone().applyMatrix4(torso.transform(asset.rest.spine05));
 for(const name of ["hip","spine05","spine04","spine03","spine02","spine01"] as const){
  const matrix=torso.transform(asset.rest[name]);expect(source.clone().applyMatrix4(matrix).distanceTo(reference)).toBeLessThan(1e-6);
  expect(matrix.elements.every(Number.isFinite)).toBe(true);expect(matrix.determinant()).toBeGreaterThan(0);
 }
});
test.each(["abdominal-crunch","chest-dip"])("%s: intentional exercise curvature and endpoints survive neutral source alignment",type=>{
 for(const p of [0,.5,1]){
  const f=trainingFrame3d(type,p),torso=torsoRetarget(f.body,root,neck,4.8);
  expect(length3(sub3(torso.point(0),f.body.hip))).toBeLessThan(1e-7);expect(length3(sub3(torso.point(1),f.body.shoulder))).toBeLessThan(1e-7);
  expect(torso.forwardAt(.8).every(Number.isFinite)).toBe(true);
  expect(torso.transform(asset.rest.spine01).elements.every(Number.isFinite)).toBe(true);
 }
 expect(trainingFrame3d(type,0).body).not.toEqual(trainingFrame3d(type,1).body);
});
test("all 28 exercises stack the head along the upper spine, without a backward tilt inherited from 2D",()=>{
 for(const type of MOTION_TYPES){let previous:number[]|undefined;
  for(let i=0;i<=40;i++){
   const b=trainingFrame3d(type,i/40).body,head=sub3(b.head,b.shoulder),upper=sub3(b.spine.at(-1)!,b.spine.at(-2)!);
   expect(length3(head)).toBeCloseTo(8.4,7);expect(dot3(unit3(head),unit3(upper))).toBeGreaterThan(.995);
   if(previous)expect(length3(sub3(b.head,previous as [number,number,number]))).toBeLessThan(3);
   previous=[...b.head];
  }
 }
});
test("the neutral lumbar hollow is modest while anatomical waist/rib depth remains visible",()=>{
 const h=createRealisticHuman(new THREE.Group()),f=trainingFrame3d("chest-press",0);f.muscles=[];
 try{h.draw(f,false);const out=h.mesh.geometry.attributes.position,b=new Float32Array(Uint8Array.from(atob(asset.positions),c=>c.charCodeAt(0)).buffer),m=Uint8Array.from(atob(asset.materials),c=>c.charCodeAt(0));
  const rear=(lo:number,hi:number)=>{const values:number[]=[];for(let i=0;i<m.length;i++)if(m[i]===0&&Math.abs(b[i*3])<.35&&b[i*3+1]>lo&&b[i*3+1]<hi)values.push(out.getZ(i));expect(values.length).toBeGreaterThan(5);return Math.min(...values);};
  const indentation=rear(2.2,2.8)-rear(4.5,5.2);
  expect(indentation).toBeLessThan(1);expect(indentation).toBeGreaterThan(-.5);
 }finally{h.dispose();}
});
