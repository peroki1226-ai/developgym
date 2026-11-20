import React from 'react';
import * as THREE from 'three';
import {render,fireEvent} from '@testing-library/react-native';
import {trainingFrame3d,body3d,length3,sub3,ChestPressVariant} from '../src/domain/training3d';
import {chestTargets} from '../src/domain/chestTargets';
import {createRealisticHuman} from '../src/three/realisticHuman';
import {ExerciseDiagram} from '../src/components/ExerciseDiagram';
import {LocaleProvider,translate} from '../src/i18n';
const variants:ChestPressVariant[]=['upper','middle','lower'];
test('three seat positions keep the machine path fixed, and the hands reach it without stretching bones',()=>{
 for(const p of [0,.5,1]){
  const frames=variants.map(v=>trainingFrame3d('chest-press',p,v));
  expect(frames[0].body.hip[1]).toBeLessThan(frames[1].body.hip[1]);expect(frames[2].body.hip[1]).toBeGreaterThan(frames[1].body.hip[1]);
  for(const f of frames){f.body.legs.forEach((l,i)=>expect(length3(sub3(l[2],frames[0].body.legs[i][2]))).toBeLessThan(1e-6));expect(f.grips).toEqual(frames[0].grips);expect(f.body).toEqual(body3d('chest-press',p,f.variant));
   f.body.arms.forEach((arm,i)=>{expect(length3(sub3(arm[2],f.grips[i].centre))).toBeLessThan(1e-6);expect(length3(sub3(arm[1],arm[0]))).toBeCloseTo(12.8,6);expect(length3(sub3(arm[2],arm[1]))).toBeCloseTo(17.3,6);});
   for(const part of f.equipment.filter(e=>e.id.startsWith('seat-base'))){expect(part).toEqual(frames[0].equipment.find(e=>e.id===part.id));}expect(f.equipment.find(e=>e.id==='seat-post')!.a).toEqual(frames[0].equipment.find(e=>e.id==='seat-post')!.a);
   expect(f.equipment.find(e=>e.id==='seat')!.a[1]).toBeCloseTo(f.body.hip[1]-6,6);
  }
 }
});
test.each(variants)('%s changes both the legend and actual human chest colours, including after switching back',v=>{
 const h=createRealisticHuman(new THREE.Group());try{const draw=(s:ChestPressVariant)=>{h.draw(trainingFrame3d('chest-press',.5,s),true);return Array.from(h.mesh.geometry.attributes.color.array);};const a=draw(v);draw(v==='upper'?'lower':'upper');expect(draw(v)).toEqual(a);expect(chestTargets('chest-press',v)[v]).toBe('primary');expect(draw(v==='upper'?'lower':'upper')).not.toEqual(a);
 for(const contact of h.mesh.userData.handContacts)expect(contact.error).toBeLessThan(1e-6);
 }finally{h.dispose();}
});
test.each(['ja','en'] as const)('%s exposes the target selector in the beginner guide',async language=>{
 const t=(k:string)=>translate(language,k),ui=await render(<LocaleProvider language={language} setLanguage={()=>{}}><ExerciseDiagram type="chest-press" muscleTag="muscle.chest" beginner /></LocaleProvider>);
 for(const v of variants){await fireEvent.press(ui.getByLabelText(t('press.variant.'+v)));expect(ui.getByTestId('press-position-cue').props.children).toBe(t('press.variant.'+v+'.cue'));}
});
