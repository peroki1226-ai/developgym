import React from "react";
import * as THREE from "three";
import { render } from "@testing-library/react-native";
import { PhotoChestEquipment } from "../src/components/PhotoChestEquipment";
import { FLAT_BENCH, trainingFrame3d, add3, mul3, benchViews } from "../src/domain/training3d";
import { projectPhotoChest } from "../src/domain/photoChestProjection";
import { createTrainingScene } from "../src/three/trainingScene";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { createPectoralFibres } from "../src/three/pectoralFibres";
import * as lessons from "../src/domain/chestLessons";
import asset from "../src/data/human/makehuman.json";

test("flat bench pad, shell, seams and frame remain horizontal and motionless through every bar position",()=>{
 const start=trainingFrame3d("barbell-bench-press",0);
 expect(FLAT_BENCH.foot[1]).toBe(FLAT_BENCH.head[1]);
 for(let i=0;i<=40;i++){
  const f=trainingFrame3d("barbell-bench-press",i/40);
  for(const id of ["free-bench-back","free-bench-back-shell"]){
   const p=f.equipment.find(e=>e.id===id)!;expect(p).toEqual(start.equipment.find(e=>e.id===id));
   expect(p.axes![0][1]).toBe(0);expect(p.axes![1][1]).toBe(0);p.axes![2].forEach((v,i)=>expect(v).toBeCloseTo(i===1?1:0,8));
   const y:number[]=[];for(const x of [-1,1])for(const z of [-1,1])y.push(add3(p.a,add3(mul3(p.axes![0],x*p.size[0]/2),mul3(p.axes![1],z*p.size[1]/2)))[1]);
   expect(new Set(y).size).toBe(1);
  }
  for(const id of ["free-bench-back-seam-1","free-bench-back-seam1","free-bench-spine"]){const p=f.equipment.find(e=>e.id===id)!;expect(p.a[1]).toBe(p.b![1]);expect(p).toEqual(start.equipment.find(e=>e.id===id));}
  const supports=f.equipment.filter(e=>e.id.startsWith("free-bench-support"));expect(supports).toHaveLength(2);expect(supports[0].b![1]).toBe(supports[1].b![1]);
 }
 const incline=trainingFrame3d("incline-bench-press",0).equipment.find(e=>e.id==="free-bench-back")!;
 expect(Math.asin(incline.axes![1][1])*180/Math.PI).toBeCloseTo(30,7);
});
test("SVG fallback projects the actual flat pad plane rather than an upright screen rectangle",async()=>{
 const frame=trainingFrame3d("barbell-bench-press",.5),pad=frame.equipment.find(e=>e.id==="free-bench-back")!;
 const view=await render(<PhotoChestEquipment type="barbell-bench-press" progress={.5}/>);
 const shape=view.getByTestId("photo-gear-free-bench-back-top").props;
 const values=String(shape.points??shape.d).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number);
 const points=Array.from({length:values.length/2},(_,i)=>values.slice(i*2,i*2+2));
 expect(points).toHaveLength(4);expect(points.flat().every(Number.isFinite)).toBe(true);
 const length=Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]));
 const height=Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]));expect(length).toBeGreaterThan(height*10);
 const centre=projectPhotoChest("barbell-bench-press",add3(pad.a,mul3(pad.axes![2],pad.size[2]/2)));
 expect(points.reduce((n,p)=>n+p[0],0)/4).toBeCloseTo(centre[0],8);expect(points.reduce((n,p)=>n+p[1],0)/4).toBeCloseTo(centre[1],8);
});
test("closer cameras retain the complete bench and equipment in every view at both phone widths",()=>{
 let scene:THREE.Scene,camera:THREE.Camera;
 const renderer={setPixelRatio:jest.fn(),setSize:jest.fn(),shadowMap:{},render:(s:THREE.Scene,c:THREE.Camera)=>{scene=s;camera=c;},dispose:jest.fn()} as unknown as THREE.WebGLRenderer;
 for(const width of [320,390]){
  const handle=createTrainingScene(renderer,width,350);
  try{for(const view of benchViews("barbell-bench-press")){
   handle.draw({type:"barbell-bench-press",progress:.5,view,focus:"whole",anatomy:true,transparent:false});
   const group=scene!.children.find(n=>n instanceof THREE.Group)!,bounds=new THREE.Box3().setFromObject(group);let max=0;
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new THREE.Vector3(x,y,z).project(camera!);max=Math.max(max,Math.abs(p.x),Math.abs(p.y));expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1);
   }expect(max).toBeGreaterThan(.92);
  }}finally{handle.dispose();}
 }
});
test.each(["chest-dip","pec-fly"])("%s: stronger chest deformation and shorter fibre segment keep all non-chest vertices and real grips unchanged",type=>{
 const parent=new THREE.Group(),human=createRealisticHuman(parent),guide=createPectoralFibres(parent,human.mesh.geometry);
 const mask=Uint8Array.from(atob(asset.muscleMasks.chest),c=>c.charCodeAt(0));
 const frame=trainingFrame3d(type,1);
 try{
  human.draw(frame,true);guide.draw(frame,true,false,1);
  const strong=(human.mesh.geometry.attributes.position.array as Float32Array).slice();
  const length=()=> (guide.group.userData.contractilePaths as THREE.Vector3[][]).reduce((sum,path)=>sum+path.slice(1).reduce((s,p,i)=>s+p.distanceTo(path[i]),0),0);
  const strongLength=length(),shortening=human.stats().muscles.find(m=>m.muscle==="chest")!.shortening;
  const override=jest.spyOn(lessons,"chestContractionEmphasis").mockReturnValue(1);
  try{
   human.draw(frame,true);guide.draw(frame,true,false,1);
   const normal=human.mesh.geometry.attributes.position.array;let difference=0;
   for(let i=0;i<asset.vertexCount;i++)for(let j=0;j<3;j++){const d=Math.abs(strong[i*3+j]-normal[i*3+j]);if(mask[i]===0)expect(d).toBeLessThan(1e-6);else difference=Math.max(difference,d);}
   expect(difference).toBeGreaterThan(.02);expect(strongLength).toBeLessThan(length()*.8);
   expect(human.stats().muscles.find(m=>m.muscle==="chest")!.shortening).toBe(shortening);
   human.mesh.userData.handContacts.forEach((p:any)=>expect(p.error).toBeLessThan(1e-6));
  }finally{override.mockRestore();}
 }finally{guide.dispose();human.dispose();}
});
