import React from 'react';
import * as THREE from 'three';
import {Alert,AccessibilityInfo} from 'react-native';
import {act,render,fireEvent,screen,within,waitFor} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LEG_LESSONS,LEG_MENU_GUIDES,legCyclePose,legCyclePosition} from '../src/domain/legLessons';
import {CHEST_LESSONS} from '../src/domain/chestLessons';
import {EQUIPMENTS} from '../src/data/equipment';
import {TrainingScreen} from '../src/screens/TrainingScreen';
import {ExerciseDiagram} from '../src/components/ExerciseDiagram';
import {LocaleProvider,translate} from '../src/i18n';
import {FitnessProvider} from '../src/state';
import {FITNESS_STORAGE_KEY} from '../src/domain/fitnessStorage';
import {trainingFrame3d,HUMAN_SEGMENTS,SMITH_SQUAT,length3,sub3} from '../src/domain/training3d';
import {createRealisticHuman} from '../src/three/realisticHuman';
import {muscleSpec} from '../src/domain/muscleMotion';
import {menus} from '../src/domain/matching';
let model:any;
jest.mock('../src/components/Motion3DView',()=>({Motion3DView:(p:any)=>{model=p;require('react').useEffect(()=>p.onReady(),[p.onReady]);return require('react').createElement(require('react-native').View,{testID:'leg-live-model'});}}));

test('seven distinct leg lessons preserve existing IDs, all seven menu links and the chest course',()=>{
 expect(LEG_LESSONS.map(l=>l.id)).toEqual(['power-rack','smith-squat','leg-press','leg-extension','seated-calf-raise','hip-adduction','hack-squat']);
 for(const l of [...LEG_LESSONS,...CHEST_LESSONS])expect(EQUIPMENTS.filter(e=>e.id===l.id)).toHaveLength(1);
 for(const [id,guide] of Object.entries(LEG_MENU_GUIDES)){expect(menus.some(m=>m.id===id)).toBe(true);expect(LEG_LESSONS.some(l=>l.id===guide)).toBe(true);}
});
test.each(LEG_LESSONS)('$id manual full cycle starts and finishes in the setup posture and changes direction without jumping',l=>{
 for(let i=0;i<=40;i++){const value=i/40,p=legCyclePose(l.id,value);expect(legCyclePosition(l.id,{progress:p.progress,phase:p.direction},p.completed)).toBeCloseTo(value,8);}
 expect(legCyclePose(l.id,0).progress).toBe(l.startsStanding?1:0);expect(legCyclePose(l.id,.5).progress).toBe(l.startsStanding?0:1);
});
test('Smith squat keeps its feet and fixed rails still, moves the bar vertically and preserves adult bone lengths',()=>{
 const first=trainingFrame3d('smith-squat',0),last=trainingFrame3d('smith-squat',1);
 expect(last.body.hip[1]).toBeGreaterThan(first.body.hip[1]+8);
 const fixed=first.equipment.filter(e=>e.id.includes('guide')||e.id.includes('stop'));
 for(let i=0;i<=40;i++){const f=trainingFrame3d('smith-squat',i/40),bar=f.equipment.find(e=>e.id==='smith-squat-bar')!;
 expect(f.equipment.filter(e=>e.id.includes('guide')||e.id.includes('stop'))).toEqual(fixed);expect(bar.a[2]).toBe(SMITH_SQUAT.guideZ);
 f.body.legs.forEach((l,j)=>{expect(length3(sub3(l[1],l[0]))).toBeCloseTo(HUMAN_SEGMENTS.thigh,6);expect(length3(sub3(l[2],l[1]))).toBeCloseTo(HUMAN_SEGMENTS.shin,6);expect(length3(sub3(l[2],first.body.legs[j][2]))).toBeLessThan(.001);});
 for(const a of f.body.arms){expect(a[2][2]).toBeCloseTo(SMITH_SQUAT.guideZ,6);expect(a[2][1]).toBeCloseTo(bar.a[1],6);}
 }
 const h=createRealisticHuman(new THREE.Group());try{for(const p of [0,.5,1]){h.draw(trainingFrame3d('smith-squat',p),true);for(const contact of h.mesh.userData.handContacts)expect(contact.error).toBeLessThan(1e-6);expect(Array.from(h.mesh.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);}}finally{h.dispose();}
});
test.each(['ja','en'] as const)('%s: seven lessons show their own setup, target, corrections and tips while retaining the chest selector',async language=>{
 const t=(k:string,v={})=>translate(language,k,v);
 await render(<FitnessProvider><LocaleProvider language={language} setLanguage={()=>{}}><TrainingScreen/></LocaleProvider></FitnessProvider>);
 for(const l of LEG_LESSONS){await fireEvent.press(screen.getByRole('button',{name:t('leg.course.choose')}));await fireEvent.press(screen.getByRole('radio',{name:t('leg.course.select',{0:t(`${l.prefix}.name`)})}));
 expect(screen.getByTestId('leg-live-model')).toBeTruthy();expect(model.type).toBe(l.id);expect(model.progress).toBe(l.startsStanding?1:0);expect(screen.getByText(t(`${l.prefix}.setup`))).toBeTruthy();
 expect(screen.getByRole('button',{name:t('chest.course.choose')})).toBeTruthy();expect(screen.queryByLabelText(t('chest.map.label'))).toBeNull();
 const content=within(screen.getByTestId('leg-coaching-content'));expect(content.getByText(t(`${l.prefix}.target`))).toBeTruthy();
 await fireEvent.press(screen.getByRole('tab',{name:t('leg.tab.focus')}));expect(content.getByText(t(`${l.prefix}.focus1`),{exact:false})).toBeTruthy();
 await fireEvent.press(screen.getByRole('tab',{name:t('leg.tab.cautions')}));expect(content.getByText(t(`${l.prefix}.fix1`))).toBeTruthy();
 await fireEvent.press(screen.getByRole('tab',{name:t('leg.tab.tips')}));expect(content.getByText(t(`${l.prefix}.tip2`))).toBeTruthy();
 await fireEvent.changeText(screen.getByLabelText(t('重量kg')),'12');await fireEvent.press(screen.getByRole('button',{name:t('leg.course.choose')}));await fireEvent.press(screen.getByRole('radio',{name:t('leg.course.select',{0:t(`${l.prefix}.name`)})}));expect(screen.getByLabelText(t('重量kg')).props.value).toBe('12');
 }
},25000);
test('manual leg inspection remains available with reduced motion, keeps a single nearby slider and highlights leg muscles',async()=>{
 jest.spyOn(AccessibilityInfo,'isReduceMotionEnabled').mockResolvedValue(true);
 try{const l=LEG_LESSONS[1],t=(k:string)=>translate('en',k),e=EQUIPMENTS.find(e=>e.id===l.id)!;
 await render(<LocaleProvider language="en" setLanguage={()=>{}}><ExerciseDiagram type={l.id} muscleTag={e.muscleTag} beginner beginnerGuide={e}/></LocaleProvider>);
 const slider=screen.getByRole('adjustable',{name:t('leg.live.scrub')});expect(screen.getAllByRole('adjustable',{name:t('leg.live.scrub')})).toHaveLength(1);
 await fireEvent(slider,'accessibilityAction',{nativeEvent:{actionName:'increment'}});expect(model.progress).toBeCloseTo(.9);expect(screen.getByTestId('leg-phase-caption').props.children).toBe(t('learn.phase.return'));expect(model.anatomy).toBe(true);expect(muscleSpec(model.type).primary).toContain('quads');
 expect(screen.getByRole('button',{name:t('leg.live.resume')}).props.accessibilityState.disabled).toBe(true);
 await fireEvent(screen.getByRole('adjustable',{name:t('leg.live.scrub')}),'accessibilityAction',{nativeEvent:{actionName:'decrement'}});
 expect(screen.getByTestId('leg-phase-caption').props.children).toBe(t('learn.phase.start'));
 for(let i=0;i<20;i++)await fireEvent(screen.getByRole('adjustable',{name:t('leg.live.scrub')}),'accessibilityAction',{nativeEvent:{actionName:'increment'}});
 expect(screen.getByRole('adjustable',{name:t('leg.live.scrub')}).props.accessibilityValue.now).toBe(100);expect(model.progress).toBe(1);
 }finally{jest.restoreAllMocks();}
});
test('leg sets persist under the existing gym history without clearing records when changing categories',async()=>{
 jest.spyOn(Alert,'alert').mockImplementation(()=>{});try{const t=(k:string)=>translate('en',k);await render(<FitnessProvider><LocaleProvider language="en" setLanguage={()=>{}}><TrainingScreen initialEquipmentId="smith-squat"/></LocaleProvider></FitnessProvider>);
 await fireEvent.changeText(screen.getByLabelText(t('重量kg')),'20');await fireEvent.changeText(screen.getByLabelText(t('回数')),'8');await fireEvent.changeText(screen.getByLabelText(t('セット数')),'3');await fireEvent.press(screen.getByRole('button',{name:t('ジムトレーニングを記録')}));
 await waitFor(async()=>{const raw=await AsyncStorage.getItem(FITNESS_STORAGE_KEY);expect(raw).not.toBeNull();expect(JSON.stringify(JSON.parse(raw!))).toContain('leg.smith.name');});
 }finally{jest.restoreAllMocks();}
});
