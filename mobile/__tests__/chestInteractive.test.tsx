import React from "react";
import * as THREE from "three";
import { AccessibilityInfo, AppState } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { EQUIPMENTS } from "../src/data/equipment";
import { CHEST_LESSONS } from "../src/domain/chestLessons";
import { chestCyclePose, chestCyclePosition, chestMotionPaths } from "../src/domain/chestMotion";
import { LocaleProvider, translate } from "../src/i18n";
import { createTrainingScene } from "../src/three/trainingScene";
let model:any;
jest.mock("../src/components/Motion3DView",()=>({Motion3DView:(props:any)=>{
 model=props;require("react").useEffect(()=>props.onReady(),[props.onReady]);return require("react").createElement(require("react-native").View,{testID:"live-model"});
}}));
let queue:Map<number,(time:number)=>void>, now:number, next:number;
const original=Object.getOwnPropertyDescriptor(AppState,"currentState")!;
beforeEach(()=>{
 queue=new Map();now=0;next=0;
 Object.defineProperty(AppState,"currentState",{configurable:true,writable:true,value:"active"});
 jest.spyOn(AccessibilityInfo,"isReduceMotionEnabled").mockResolvedValue(false);
 jest.spyOn(globalThis,"requestAnimationFrame").mockImplementation(callback=>{queue.set(++next,callback);return next;});
 jest.spyOn(globalThis,"cancelAnimationFrame").mockImplementation(id=>{if(typeof id==="number")queue.delete(id);});
});
afterEach(()=>{jest.restoreAllMocks();Object.defineProperty(AppState,"currentState",original);});
async function frames(count:number){await act(()=>{for(let i=0;i<count;i++){now+=50;const callbacks=[...queue.values()];queue.clear();callbacks.forEach(f=>f(now));}});}
const press=async(name:string)=>fireEvent.press(screen.getByRole("button",{name}));
function renderLesson(id:string,language:"ja"|"en",active=true){const e=EQUIPMENTS.find(e=>e.id===id)!;return <LocaleProvider language={language} setLanguage={()=>{}}><ExerciseDiagram type={id} label={e.name} muscleTag={e.muscleTag} beginner beginnerGuide={e} active={active}/></LocaleProvider>;}

test.each(CHEST_LESSONS)("$id: full cycle maps every manual position and has reversible bounded direction arrows",lesson=>{
 for(let i=0;i<=40;i++){
  const position=i/40,p=chestCyclePose(lesson.id,position);
  const phase=p.progress===0?"start":p.progress===1?"hold":p.direction;
  expect(chestCyclePosition(lesson.id,{progress:p.progress,phase},p.completed)).toBeCloseTo(position,8);
  const paths=chestMotionPaths(lesson.id,p.progress,false), reverse=chestMotionPaths(lesson.id,p.progress,true);
  expect(paths).toHaveLength(2);
  paths.forEach((path,n)=>{
   expect(path.points.flat().every(Number.isFinite)).toBe(true);
   expect(reverse[n].points).toEqual(path.points);
   path.direction.forEach((v,k)=>expect(v).toBeCloseTo(-reverse[n].direction[k],8));
  });
 }
});
test.each(["ja","en"] as const)("%s: five actual models move, pause/resume without resetting, complete one repetition and scrub manually",async language=>{
 const t=(key:string)=>translate(language,key);
 for(const lesson of CHEST_LESSONS){
  const app=await render(renderLesson(lesson.id,language));
  expect(queue.size).toBe(0);
  await press(t("chest.live.watch"));expect(model.guidance).toBe(true);
  expect(model.progress).toBe(lesson.id==="chest-dip"?1:0);
  await frames(28);const moved=model.progress;
  expect(moved).toBeGreaterThan(0);expect(moved).toBeLessThan(1);
  await press(t("chest.live.pause"));await frames(20);expect(model.progress).toBe(moved);expect(queue.size).toBe(0);
  await press(t("chest.live.resume"));await frames(1);expect(model.progress).toBe(moved);
  await frames(500);expect(queue.size).toBe(0);expect(model.progress).toBe(lesson.id==="chest-dip"?1:0);
  expect(screen.getByText(t("chest.live.complete"))).toBeTruthy();
  await press(t("chest.live.previous"));expect(queue.size).toBe(0);
  const slider=screen.getByRole("adjustable",{name:t("chest.live.scrub")});
  expect(slider.props.accessibilityValue.now).toBe(95);
  await fireEvent(slider,"accessibilityAction",{nativeEvent:{actionName:"decrement"}});
  expect(screen.getByRole("adjustable",{name:t("chest.live.scrub")}).props.accessibilityValue.now).toBe(90);
  expect(model.progress).toBeCloseTo(lesson.id==="chest-dip"?.8:.2);
  for(const view of ["front","side","back"]){await fireEvent.press(screen.getByRole("radio",{name:t(`scene.${view}`)}));expect(model.view).toBe(view);}
  await press(t("chest.live.focus"));expect(model.focus).toBe("muscles");
  await press(t("chest.live.whole"));expect(model.focus).toBe("whole");
  await fireEvent.press(screen.getByRole("radio",{name:t("chest.live.speed.0.25")}));
  await press(t("chest.live.restart"));expect(model.progress).toBe(lesson.id==="chest-dip"?1:0);
  await frames(20);if(lesson.id==="chest-dip"){expect(model.progress).toBeGreaterThan(.9);expect(model.progress).toBeLessThan(1);}else{expect(model.progress).toBeGreaterThan(0);expect(model.progress).toBeLessThan(.1);}
  await app.unmount();expect(queue.size).toBe(0);
 }
},25000);
test("reduced motion keeps manual model adjustment and cue changes while replay stays disabled",async()=>{
 jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
 const t=(k:string)=>translate("en",k);await render(renderLesson("chest-press","en"));
 expect(screen.getByRole("button",{name:t("chest.live.watch")}).props.accessibilityState.disabled).toBe(true);
 for(let i=0;i<5;i++)await press(t("chest.live.next"));
 expect(model.progress).toBeCloseTo(.5);expect(queue.size).toBe(0);
 expect(screen.getByText(t("chest.live.work"))).toBeTruthy();
 for(let i=0;i<10;i++)await press(t("chest.live.next"));
 expect(model.returning).toBe(true);expect(screen.getByText(t("chest.live.return"))).toBeTruthy();
});
test("leaving the guide stops animation and language changes retain its paused position",async()=>{
 const app=await render(renderLesson("pec-fly","ja"));await press(translate("ja","chest.live.watch"));await frames(30);
 await press(translate("ja","chest.live.pause"));const p=model.progress;
 await app.rerender(renderLesson("pec-fly","en"));expect(model.progress).toBe(p);
 await press(translate("en","chest.live.resume"));await frames(10);
 await app.rerender(renderLesson("pec-fly","en",false));expect(queue.size).toBe(0);
});
test("native direction paths reuse nodes during playback and dispose with the model",()=>{
 const renderer={setPixelRatio:jest.fn(),setSize:jest.fn(),shadowMap:{},render:jest.fn(),dispose:jest.fn()} as unknown as THREE.WebGLRenderer;
 const scene=createTrainingScene(renderer,320,350);
 for(const type of CHEST_LESSONS.map(e=>e.id)){
  scene.draw({type,progress:0,anatomy:true,view:"front",focus:"whole",transparent:false,guidance:true});const n=scene.stats().nodes;
  for(let i=0;i<=40;i++)scene.draw({type,progress:i/40,anatomy:true,view:"side",focus:"whole",transparent:false,guidance:true,returning:i>20});
  expect(scene.stats().nodes).toBe(n);
 }
 scene.dispose();expect(scene.stats().nodes).toBe(0);
});
