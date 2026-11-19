import React from "react";
import {render} from "@testing-library/react-native";
import {PhotoChestEquipment} from "../src/components/PhotoChestEquipment";
import {projectPhotoChest} from "../src/domain/photoChestProjection";
import * as THREE from 'three';
import asset from '../src/data/human/makehuman.json';
import {upperArmBaseline as baseline,outsideUpperArm} from '../test-utils/upperArmBaseline';
import {createRealisticHuman} from '../src/three/realisticHuman';
import {trainingFrame3d,SUPER_FLY,sub3,length3,dot3,unit3,add3,mul3} from '../src/domain/training3d';
const {createHash}=require('node:crypto');
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const p=new Float32Array(bytes(asset.positions).buffer),n=new Float32Array(bytes(asset.normals).buffer),indices=new Uint16Array(bytes(asset.indices).buffer);
const original=p.slice(),saved=new Float32Array(bytes(baseline.originalPositions).buffer);
baseline.allowedVertices.forEach((v,i)=>original.set(saved.subarray(i*3,i*3+3),v*3));
const mean=(a:number[])=>a.reduce((s,x)=>s+x,0)/a.length;

test('only the authorised upper-arm surface changes from v13; chest, hands, joints and the other regions retain their accepted bytes',()=>{
 const h=createHash('sha256');let count=0;
 for(const[key,stride]of [['positions',12],['normals',12],['surfaceOcclusion',1]]as const){const raw=bytes(asset[key]);for(let v=0;v<asset.vertexCount;v++)if(outsideUpperArm(v)){h.update(raw.subarray(v*stride,(v+1)*stride));if(key==='positions')count++;}}
 expect(count).toBe(22692);expect(h.digest('hex')).toBe('172e2afcd9e3cfe97c5cc4402703ffde44d3851b59b9789ca652319d2d6dc7e9');
});

test.each(Object.entries(baseline.cores))('%s: the upper-arm surface itself is smoother, with a broad muscular belly', (side,core)=>{
 const counts=new Uint16Array(asset.vertexCount),sums=[new Float64Array(p.length),new Float64Array(p.length),new Float64Array(n.length)];
 for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++)for(const v of [indices[i+(j+1)%3],indices[i+(j+2)%3]]){const at=indices[i+j];counts[at]++;for(let k=0;k<3;k++){sums[0][at*3+k]+=original[v*3+k];sums[1][at*3+k]+=p[v*3+k];sums[2][at*3+k]+=n[v*3+k];}}
 const residual=(a:Float32Array,sum:Float64Array)=>mean(core.map(v=>Math.hypot(...[0,1,2].map(k=>a[v*3+k]-sum[v*3+k]/counts[v]))));
 expect(residual(p,sums[1])).toBeLessThan(residual(original,sums[0])*.98);
 expect(residual(n,sums[2])).toBeLessThan((side==='L'?.03068396:.02893974)*.75);
 const rest=asset.rest[side==='L'?'upperarm.L':'upperarm.R'],axis=unit3(sub3(rest.tail as [number,number,number],rest.head as [number,number,number]));
 const radius=(a:Float32Array)=>mean(core.map(v=>{const d=sub3([a[v*3],a[v*3+1],a[v*3+2]],rest.head as [number,number,number]);return Math.sqrt(Math.max(0,dot3(d,d)-dot3(d,axis)**2));}));
 expect(radius(p)/radius(original)).toBeGreaterThan(.94);expect(radius(p)/radius(original)).toBeLessThan(1.06);
 const distances=core.map(v=>Math.hypot(...[0,1,2].map(k=>p[v*3+k]-original[v*3+k])));
 expect(mean(distances)).toBeLessThan(.06);expect(Math.max(...distances)).toBeLessThan(.15);
});

test('the upper-arm envelope preserves face orientation through the shoulder transition',()=>{
 let min=Infinity;
 for(let i=0;i<indices.length;i+=3){const face=(a:Float32Array)=>{const q=Array.from(indices.slice(i,i+3),v=>new THREE.Vector3().fromArray(a,v*3));return q[1].sub(q[0]).cross(q[2].sub(q[0]));},before=face(original),after=face(p);if(before.length()>1e-9)min=Math.min(min,before.dot(after)/before.lengthSq());}
 expect(min).toBeGreaterThan(.04);
});

test('the photo Super Fly has four inclined pads, a separate seat, front access step and bilateral plate horns instead of a selector stack',()=>{
 const f=trainingFrame3d('super-fly',0),up=unit3(sub3(f.body.shoulder,f.body.hip));
 const panels=f.equipment.filter(x=>x.kind==='pad'&&x.id.startsWith('super-fly-back-panel'));
 expect(panels).toHaveLength(4);for(const panel of panels)expect(dot3(panel.axes![1],up)).toBeCloseTo(1,7);
 expect(Math.asin(up[1])*180/Math.PI).toBeCloseTo(SUPER_FLY.backDegrees,7);
 expect(f.equipment.filter(x=>x.kind==='plate')).toHaveLength(4);
 expect(f.equipment.filter(x=>/^super-fly-loading-horn/.test(x.id))).toHaveLength(2);
 expect(f.equipment.some(x=>x.id==='super-fly-front-step')).toBe(true);
 expect(f.equipment.some(x=>/stack|resistance|cable|cam/.test(x.id))).toBe(false);
 expect(f.equipment.find(x=>x.id==='super-fly-bench')!.axes![1][1]).toBe(0);
});

test('the weighted levers rotate rigidly around the inclined bearings while the pads, pelvis and feet stay fixed',()=>{
 const start=trainingFrame3d('super-fly',0);
 for(let step=0;step<=20;step++){
  const frame=trainingFrame3d('super-fly',step/20);expect(frame.body.hip).toEqual(start.body.hip);expect(frame.body.legs).toEqual(start.body.legs);
  for(const part of frame.equipment){const old=start.equipment.find(x=>x.id===part.id)!;if(/back-panel|base|front-step|seat-post|back-spine/.test(part.id))expect(part).toEqual(old);}
  for(const side of [-1,1]){
   const find=(f:typeof frame,id:string)=>f.equipment.find(x=>x.id===id+side)!;
   const pivot=find(frame,'super-fly-axis').a,oldPivot=find(start,'super-fly-axis').a;
   for(const id of ['super-fly-lever','super-fly-grip-link','super-fly-loading-arm']){const x=find(frame,id),y=find(start,id);expect(length3(sub3(x.a,x.b!))).toBeCloseTo(length3(sub3(y.a,y.b!)),6);}
   const horn=find(frame,'super-fly-loading-horn'),oldHorn=find(start,'super-fly-loading-horn');
   expect(length3(sub3(horn.a,pivot))).toBeCloseTo(length3(sub3(oldHorn.a,oldPivot)),6);
   expect(dot3(horn.axes![1],unit3(sub3(frame.body.shoulder,frame.body.hip)))).toBeCloseTo(0,6);
  }
 }
});

test('the posed human grips the photo handles through the whole fly without invalid skin or an extra model mesh',()=>{
 const parent=new THREE.Group(),human=createRealisticHuman(parent);
 try{for(const progress of [0,.5,1]){human.draw(trainingFrame3d('super-fly',progress),true);for(const grip of human.mesh.userData.handContacts)expect(grip.error).toBeLessThan(1e-6);for(const grip of human.mesh.userData.gripSurfaces)expect(grip.minimumClearance).toBeGreaterThanOrEqual(.024);expect(Array.from(human.mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);expect(parent.children).toHaveLength(1);}}finally{human.dispose();}expect(parent.children).toHaveLength(0);
});


test('the lightweight diagram projects the four actual inclined panel planes',async()=>{
 const ui=await render(React.createElement(PhotoChestEquipment,{type:'super-fly',progress:.5}));
 for(const panel of trainingFrame3d('super-fly',.5).equipment.filter(x=>x.kind==='pad'&&x.id.startsWith('super-fly-back-panel'))){
  const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>projectPhotoChest('super-fly',add3(panel.a,add3(mul3(panel.axes![0],u*panel.size[0]/2),add3(mul3(panel.axes![1],v*panel.size[1]/2),mul3(panel.axes![2],panel.size[2]/2))))).join(',')).join(' ');
  expect(ui.getByTestId('photo-gear-'+panel.id+'-top').props.d).toBe('M'+points.replace(/,/g,' ')+'z');
 }
});
