import {outsideGrip} from "../test-utils/gripBaseline";
import {outsideUpperArm} from "../test-utils/upperArmBaseline";
import * as THREE from 'three';
import asset from '../src/data/human/makehuman.json';
import { armBackBaseline as baseline, outsideArmBack } from '../test-utils/armBackBaseline';
import { createRealisticHuman } from '../src/three/realisticHuman';
import { trainingFrame3d } from '../src/domain/training3d';
const {createHash}=require('node:crypto');
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const p=new Float32Array(bytes(asset.positions).buffer),n=new Float32Array(bytes(asset.normals).buffer);
const indices=new Uint16Array(bytes(asset.indices).buffer),original=p.slice();
const saved=new Float32Array(bytes(baseline.originalPositions).buffer);
baseline.allowedVertices.forEach((v,i)=>original.set(saved.subarray(i*3,i*3+3),v*3));
const mean=(a:number[])=>a.reduce((x,y)=>x+y,0)/a.length;

test('the accepted chest, head, legs and clothing outside the requested grip revision keep their exact v12 position, normal and AO bytes',()=>{
 const digest=createHash('sha256');let count=0;
 for(const [key,stride]of [['positions',12],['normals',12],['surfaceOcclusion',1]]as const){
  const raw=bytes(asset[key]);for(let v=0;v<asset.vertexCount;v++)if(outsideArmBack(v)&&outsideGrip(v)){
   digest.update(raw.subarray(v*stride,(v+1)*stride));if(key==='positions')count++;
  }
 }
 expect(count).toBe(15807);expect(digest.digest('hex')).toBe('66e705a9cbb0815e684787cc4261e188a0cd392b7a04d494537537da5e854a27');
 expect(asset.vertexCount).toBe(24000);expect(indices.length/3).toBe(47910);expect(asset.bones).toHaveLength(22);
});

test('fairing preserves oriented triangles rather than hiding foldovers with smoothed normals',()=>{
 let minRatio=Infinity;
 for(let i=0;i<indices.length;i+=3){
  const points=(a:Float32Array)=>Array.from(indices.slice(i,i+3),v=>new THREE.Vector3().fromArray(a,v*3));
  const [a,b,c]=points(original),[x,y,z]=points(p),before=b.sub(a).cross(c.sub(a)),after=y.sub(x).cross(z.sub(x));
  if(before.length()>1e-9)minRatio=Math.min(minRatio,before.dot(after)/before.lengthSq());
 }
 expect(minRatio).toBeGreaterThan(.04);
});

test.each(Object.entries(baseline.cores))('%s: broad muscle bulk remains while short-wavelength normal variation falls', (name,core)=>{
 const sum=new Float64Array(n.length),counts=new Uint16Array(asset.vertexCount);
 for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){
  const v=indices[i+j];for(const other of [indices[i+(j+1)%3],indices[i+(j+2)%3]]){
   for(let k=0;k<3;k++)sum[v*3+k]+=n[other*3+k];counts[v]++;
  }
 }
 const residuals=core.map(v=>Math.hypot(...[0,1,2].map(k=>n[v*3+k]-sum[v*3+k]/counts[v])));
 const previous={rightArm:.05012728,leftArm:.05078046,back:.04494705}[name]!;
 expect(mean(residuals)).toBeLessThan(previous*.65);
 residuals.sort((a,b)=>a-b);expect(residuals[Math.floor(residuals.length*.95)]).toBeLessThan(.065);
 // The user has now resculpted the upper arm in TASK-059; its v13-relative
 // bounds are tested separately. Keep the v12 bounds on the other vertices.
 const distances=core.filter(outsideUpperArm).map(v=>Math.hypot(...[0,1,2].map(k=>p[v*3+k]-original[v*3+k])));
 expect(mean(distances)).toBeLessThan(.025);expect(Math.max(...distances)).toBeLessThan(.13);
 // Broad extents must survive the removal of small ridges; a thin smooth tube
 // or a flattened back is not a valid fix for a muscular teaching model.
 for(let k=0;k<(name==='back'?2:3);k++){
  const extent=(a:Float32Array)=>{const values=core.map(v=>a[v*3+k]);return Math.max(...values)-Math.min(...values);};
  expect(extent(p)/extent(original)).toBeGreaterThan(.96);expect(extent(p)/extent(original)).toBeLessThan(1.04);
 }
 if(name==='back'){
  // Posterior depth range includes the small ridges being removed. Measure
  // the broad tissue thickness from the torso plane instead of locking them.
  const depth=(a:Float32Array)=>mean(core.map(v=>Math.abs(a[v*3+2])));
  expect(depth(p)/depth(original)).toBeGreaterThan(.98);expect(depth(p)/depth(original)).toBeLessThan(1.02);
 }
});

test('press, fly, dip, pull, row and curl retain smooth finite skin, active colouring and real handle contacts through motion',()=>{
 const parent=new THREE.Group(),human=createRealisticHuman(parent);
 try{for(const type of ['chest-press','pec-fly','chest-dip','lat-pulldown','seated-row','preacher-curl'])for(const progress of [0,.5,1]){
  const frame=trainingFrame3d(type,progress);human.draw(frame,false);
  const neutral=(human.mesh.geometry.attributes.position.array as Float32Array).slice();human.draw(frame,true);
  const geometry=human.mesh.geometry;
  expect(geometry.attributes.position.array).toEqual(neutral);
  for(const key of ['position','normal','color'])expect(Array.from(geometry.attributes[key].array).every(Number.isFinite)).toBe(true);
  for(const contact of human.mesh.userData.handContacts)expect(contact.error).toBeLessThan(1e-6);
  for(const grip of human.mesh.userData.gripSurfaces)expect(grip.minimumClearance).toBeGreaterThanOrEqual(.024);
 }}finally{human.dispose();}expect(parent.children).toHaveLength(0);
});
