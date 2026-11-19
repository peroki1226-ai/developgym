import React from "react";
import * as THREE from "three";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { DIP_SETUP, DIP_FINISH, dipOpenAmount, dipFinishAmount, trainingFrame3d, length3, sub3, dot3, unit3, HUMAN_SEGMENTS } from "../src/domain/training3d";
import { guidePose, projectPhotoChest } from "../src/domain/photoChestProjection";
import { EQUIPMENTS } from "../src/data/equipment";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { LocaleProvider, translate } from "../src/i18n";
let model:any;
jest.mock("../src/components/Motion3DView",()=>({Motion3DView:(props:any)=>{model=props;require('react').useEffect(()=>props.onReady(),[props.onReady]);return null;}}));

test('entry-side grips stay fixed clear of the rear supports while crossed legs keep their lengths and relative posture',()=>{
 const start=trainingFrame3d('chest-dip',0);
 for(let i=0;i<=100;i++){
  const f=trainingFrame3d('chest-dip',i/100),b=f.body;
  expect(f.equipment).toEqual(start.equipment);expect(f.grips).toEqual(start.grips);
  for(const[j,side]of [-1,1].entries()){
   const hand=b.arms[j][2];expect(hand).toEqual([side*DIP_SETUP.gripHalfWidth,DIP_SETUP.gripY,DIP_SETUP.gripZ]);
   const bar=f.equipment.find(e=>e.id==='dip-parallel-bar'+side)!;
   expect(bar.b![2]-hand[2]).toBeGreaterThan(3);expect(hand[2]-bar.a[2]).toBeGreaterThan((bar.b![2]-bar.a[2])*2/3);
   expect(hand[2]-f.equipment.find(e=>e.id==='dip-front-post'+side)!.a[2]).toBeGreaterThan(10);
   for(const limb of [b.arms[j],b.legs[j]]){
    expect(length3(sub3(limb[1],limb[0]))).toBeCloseTo(limb===b.arms[j]?HUMAN_SEGMENTS.upperArm:20,7);
    expect(length3(sub3(limb[2],limb[1]))).toBeCloseTo(limb===b.arms[j]?HUMAN_SEGMENTS.forearmGrip:21,7);
   }
   b.legs[j].forEach((p,k)=>expect(sub3(p,b.hip)).toEqual(start.body.legs[j].map(q=>sub3(q,start.body.hip))[k].map(v=>expect.closeTo(v,7))));
  }
  expect(b.legs[0][1][0]).toBeLessThan(b.legs[1][1][0]);
  expect(b.legs[0][2][0]).toBeGreaterThan(0);expect(b.legs[1][2][0]).toBeLessThan(0);
  expect(Math.abs(b.legs[0][2][2]-b.legs[1][2][2])).toBeGreaterThan(6);
  expect(f.feet.every(v=>v.contact[1]>20)).toBe(true);
  expect(guidePose('chest-dip',i/100).grips).toEqual(b.arms.map(a=>projectPhotoChest('chest-dip',a[2])));
 }
});
test('the chest opens gently at the bottom then the upper back flexes near the top without a lumbar fold or neck kink',()=>{
 let previous=-Infinity;
 for(let i=0;i<=100;i++){
  const p=i/100,b=trainingFrame3d('chest-dip',p).body,lower=sub3(b.spine[1],b.spine[0]),upper=sub3(b.spine[2],b.spine[1]);
  const bend=(Math.atan2(upper[2],upper[1])-Math.atan2(lower[2],lower[1]))*180/Math.PI;
  expect(bend).toBeGreaterThanOrEqual(previous-1e-7);previous=bend;
  expect(bend).toBeCloseTo(dipFinishAmount(p)*DIP_FINISH.maxUpperBackDegrees-dipOpenAmount(p)*DIP_FINISH.openChestDegrees,7);
  expect(Math.atan2(lower[2],lower[1])*180/Math.PI).toBeCloseTo(15,7);
  expect(dot3(unit3(sub3(b.head,b.shoulder)),unit3(upper))).toBeCloseTo(1,7);
 }
 expect(dipOpenAmount(0)).toBe(1);expect(dipOpenAmount(1)).toBe(0);
});
test('authored fingers remain on the front grips and the crossed-leg skin remains finite at all teaching phases',()=>{
 const h=createRealisticHuman(new THREE.Group());
 try{for(const p of [0,.25,.5,.75,1]){
  h.draw(trainingFrame3d('chest-dip',p),true);expect(h.mesh.userData.handContacts).toHaveLength(2);
  for(const g of h.mesh.userData.handContacts)expect(g.error).toBeLessThan(1e-6);
  expect(Array.from(h.mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
 }}finally{h.dispose();}
});
test.each(['ja','en'] as const)('%s: beginner hand/foot steps and manual end poses show the same front-grip/cross/rounding instructions as the model',async language=>{
 const t=(k:string)=>translate(language,k),e=EQUIPMENTS.find(e=>e.id==='chest-dip')!;
 await render(<LocaleProvider language={language} setLanguage={()=>{}}><ExerciseDiagram type={e.id} label={e.name} muscleTag={e.muscleTag} beginner beginnerGuide={e}/></LocaleProvider>);
 for(const [step,key]of [['hands','chest.dip.hands'],['feet','chest.dip.feet']]){
  await fireEvent.press(screen.getByRole('radio',{name:t('learn.'+step)}));expect(screen.getByTestId('beginner-step-hint').props.children).toBe(t(key));
 }
 await fireEvent.press(screen.getByRole('button',{name:t('anatomy.inspectLong')}));expect(model.progress).toBe(0);
 await fireEvent.press(screen.getByRole('button',{name:t('anatomy.inspectShort')}));expect(model.progress).toBe(1);
 expect(screen.getByTestId('dip-finish-coaching')).toBeTruthy();
 expect(t('chest.dip.hands')).toMatch(language==='ja'?/手前/:/entry-side/);expect(t('chest.dip.feet')).toMatch(language==='ja'?/クロス/:/cross/);expect(t('chest.dip.work')).toMatch(language==='ja'?/上背部/:/upper back/);
});
