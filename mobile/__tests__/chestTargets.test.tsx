import { outsideArmBack } from "../test-utils/armBackBaseline";
import React from "react";
import * as THREE from "three";
import { render, within } from "@testing-library/react-native";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { CHEST_LESSONS } from "../src/domain/chestLessons";
import { CHEST_REGIONS, chestTargets } from "../src/domain/chestTargets";
import { trainingFrame3d } from "../src/domain/training3d";
import { chestRegionWeights } from "../src/three/humanDefinition";
import { ChestRegionTargets } from "../src/components/ChestRegionTargets";
import { LocaleProvider, translate } from "../src/i18n";
import asset from "../src/data/human/makehuman.json";
const {createHash}=require("node:crypto");
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const rest=new Float32Array(bytes(asset.positions).buffer),materials=bytes(asset.materials),weights=chestRegionWeights(rest,materials);

test("all incline variants prioritize clavicular chest, flat presses the middle and dips the lower portion",()=>{
 for(const id of ["incline-bench-press","incline-hammer-press","incline-smith","dumbbell-heavy"])expect(chestTargets(id)).toEqual({upper:"primary",middle:"assisting",lower:"context"});
 for(const id of ["barbell-bench-press","chest-press"])expect(chestTargets(id).middle).toBe("primary");
 expect(chestTargets("chest-dip").lower).toBe("primary");
 for(const id of ["pec-fly","super-fly","cable-machine"])expect(Object.values(chestTargets(id))).toEqual(["primary","primary","primary"]);
});
test("three smooth bilateral rest-surface regions form a partition on skin without painting clothes",()=>{
 for(let i=0;i<materials.length;i++){
  const w=Array.from(weights.slice(i*3,i*3+3));expect(w.every(x=>Number.isFinite(x)&&x>=0&&x<=1)).toBe(true);
  expect(w.reduce((a,b)=>a+b,0)).toBeCloseTo(materials[i]===0?1:0,6);
 }
});
test("the v12 posed positions/normals outside the authorised arms/back and dip / photo Super Fly / incline-grip revisions retain the accepted geometry and grips",()=>{
 const h=createRealisticHuman(new THREE.Group()),digest=createHash('sha256');
 try{for(const l of CHEST_LESSONS.filter(l=>!["chest-dip","super-fly","incline-bench-press"].includes(l.id)))for(const p of [0,.5,1]){
  h.draw(trainingFrame3d(l.id,p),true);for(const key of ['position','normal']){
   const a=h.mesh.geometry.attributes[key].array;for(let v=0;v<asset.vertexCount;v++)if(outsideArmBack(v))digest.update(new Uint8Array(a.buffer,v*12,12));
  }
  for(const g of h.mesh.userData.handContacts)expect(g.error).toBeLessThan(1e-6);
 }}finally{h.dispose();}
 expect(digest.digest('hex')).toBe('c6d2cab8317c8c623fde8391fcaa706073833e4aa9cd579b3143e7f49642bf6f');
});
test.each(CHEST_LESSONS)("$id: actual vertex colours emphasize the intended region throughout motion, without a stale palette after switching",lesson=>{
 const h=createRealisticHuman(new THREE.Group());
 try{for(const p of [0,.5,1]){
  h.draw(trainingFrame3d(lesson.id,p),true);const c=h.mesh.geometry.attributes.color,field=h.mesh.geometry.attributes.anatomyDefinition;
  const redness=CHEST_REGIONS.map((_,r)=>{const values:number[]=[];for(let i=0;i<materials.length;i++)if(field.getY(i)>.9&&weights[i*3+r]>.9)values.push(c.getX(i)-(c.getY(i)+c.getZ(i))/2);expect(values.length).toBeGreaterThan(5);return values.reduce((a,b)=>a+b,0)/values.length;});
  const roles=chestTargets(lesson.id);for(let r=0;r<3;r++)if(roles[CHEST_REGIONS[r]]==='primary')for(let j=0;j<3;j++)if(roles[CHEST_REGIONS[j]]!=='primary')expect(redness[r]-redness[j]).toBeGreaterThan(.06);
  const original=Array.from(c.array);h.draw(trainingFrame3d(lesson.id==='chest-dip'?'pec-fly':'chest-dip',p),true);h.draw(trainingFrame3d(lesson.id,p),true);expect(Array.from(c.array)).toEqual(original);
 }}finally{h.dispose();}
});
test.each(['ja','en'] as const)('%s: legend changes with the exercise and pro mode retains only its concise target note',async language=>{
 const t=(k:string)=>translate(language,k),view=(type:string,detailed=true)=><LocaleProvider language={language} setLanguage={()=>{}}><ChestRegionTargets type={type} detailed={detailed}/></LocaleProvider>;
 const ui=await render(view('incline-bench-press'));
 expect(within(ui.getByTestId('target-upper')).getByText(t('targets.role.primary'))).toBeTruthy();
 await ui.rerender(view('chest-dip',false));expect(within(ui.getByTestId('target-lower')).getByText(t('targets.role.primary'))).toBeTruthy();
 expect(ui.queryByText(t('targets.note'))).toBeNull();expect(ui.getByText(t('targets.shortNote'))).toBeTruthy();
 for(const prefix of ['chest.inclineSmith','chest.hammer'])for(const suffix of ['setup','start','work','return','focus1','focus2','focus3']){
  const text=t(`${prefix}.${suffix}`);expect(text).not.toBe(`${prefix}.${suffix}`);expect(text.normalize('NFKC')).not.toMatch(language==='ja'?/\p{Script=Latin}/u:/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
 }
 expect(t('chest.inclineSmith.setup').normalize('NFKC')).toMatch(language==='ja'?/30〜45/:/thirty to forty-five/);
});
