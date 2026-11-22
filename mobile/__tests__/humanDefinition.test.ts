import * as THREE from "three";
import asset from "../src/data/human/makehuman.json";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { chestDivisionHeight } from "../src/three/humanDefinition";
import { trainingFrame3d } from "../src/domain/training3d";
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const material=bytes(asset.materials);

test('the oblique chest division stays under the clavicle, above the abdomen, and rises symmetrically toward the armpits',()=>{
 const centre=chestDivisionHeight(.2),outer=chestDivisionHeight(1.6);
 expect(centre).toBeGreaterThan(5);expect(outer).toBeGreaterThan(centre+.05);
 expect(outer).toBeLessThan(asset.rest['clavicle.L'].head[1]-.3);
 expect(chestDivisionHeight(-1.6)).toBe(outer);
});
test.each(['chest-press','incline-smith','pec-fly','chest-dip','barbell-bench-press'])('%s: moving chest exposes exercise-specific upper/lower target colours without moving the hands or uncoloured body',type=>{
 const human=createRealisticHuman(new THREE.Group());
 try{
  const fields=human.mesh.geometry.getAttribute('anatomyDefinition');
  expect(fields.count).toBe(human.mesh.geometry.getAttribute('position').count);expect(Array.from(fields.array).every(Number.isFinite)).toBe(true);
  for(let i=0;i<fields.count;i++)if(material[i]!==0){expect(fields.getY(i)).toBe(0);expect(fields.getZ(i)).toBe(0);}
  for(const progress of [0,.5,1]){
   const frame=trainingFrame3d(type,progress);human.draw(frame,false);
   const neutral=human.mesh.geometry.getAttribute('color').array.slice(),positions=human.mesh.geometry.getAttribute('position').array.slice();
   human.draw(frame,true);
   const coloured=human.mesh.geometry.getAttribute('color');const upper:number[]=[],lower:number[]=[];
   for(let i=0;i<fields.count;i++)if(fields.getY(i)>.8){
    if(fields.getX(i)>.10)upper.push(coloured.getY(i)/coloured.getX(i));
    if(fields.getX(i)<-.13)lower.push(coloured.getY(i)/coloured.getX(i));
   }
   expect(upper.length).toBeGreaterThan(5);expect(lower.length).toBeGreaterThan(5);
   const upperRatio=upper.reduce((a,b)=>a+b)/upper.length,lowerRatio=lower.reduce((a,b)=>a+b)/lower.length;
   if(type==='incline-smith')expect(lowerRatio-upperRatio).toBeGreaterThan(.12);
   else if(type==='pec-fly')expect(Math.abs(upperRatio-lowerRatio)).toBeLessThan(.1);
   else expect(upperRatio-lowerRatio).toBeGreaterThan(.08);
   expect(human.mesh.geometry.getAttribute('position').array).toEqual(positions);
   for(const contact of human.mesh.userData.handContacts)expect(contact.error).toBeLessThan(1e-6);
   human.draw(frame,false);expect(human.mesh.geometry.getAttribute('color').array).toEqual(neutral);
  }
 }finally{human.dispose();}
});
