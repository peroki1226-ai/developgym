import React from "react";
import * as THREE from "three";
import { Alert } from "react-native";
import { fireEvent,render,screen,waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import App from "../App";
import { SMITH_INCLINE,trainingFrame3d,sub3,length3,HUMAN_SEGMENTS } from "../src/domain/training3d";
import { CHEST_LESSONS,CHEST_MENU_GUIDES } from "../src/domain/chestLessons";
import { calculateMatch,gyms,menus } from "../src/domain/matching";
import { FITNESS_STORAGE_KEY,initialFitnessData,decodeFitnessData } from "../src/domain/fitnessStorage";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { PhotoChestEquipment } from "../src/components/PhotoChestEquipment";
import { translate } from "../src/i18n";
jest.mock("react-native-safe-area-context",()=>require("react-native-safe-area-context/jest/mock").default);

test("photo incline guide has fixed silver Smith rails and a 30 degree black bench; hands, carriages and plates move vertically together",()=>{
 const first=trainingFrame3d("incline-bench-press",0);
 const fixed=first.equipment.filter(e=>e.id.startsWith("smith-")&&!/smith-(carriage|sleeve|plate|collar|bar-grip)/.test(e.id));
 for(let i=0;i<=40;i++){
  const f=trainingFrame3d("incline-bench-press",i/40),bar=f.equipment.find(e=>e.id==="barbell")!;
  expect(f.equipment.some(e=>e.id.startsWith("free-")||e.id.startsWith("stack"))).toBe(false);
  expect(f.equipment.filter(e=>fixed.some(p=>p.id===e.id))).toEqual(fixed);expect(f.body.legs).toEqual(first.body.legs);
  expect(bar.a[2]).toBe(SMITH_INCLINE.guideZ);expect(bar.b![2]).toBe(bar.a[2]);expect(bar.a[1]).toBeCloseTo(SMITH_INCLINE.startY+SMITH_INCLINE.travelY*i/40,8);
  const pad=f.equipment.find(e=>e.id==="smith-incline-back")!;expect(pad.color).toBe("pad");expect(Math.asin(pad.axes![1][1])*180/Math.PI).toBeCloseTo(30,7);
  expect(f.equipment.find(e=>e.id==="smith-upright1")!.color).toBe("satin");expect(f.grips).toHaveLength(2);
  for(const [j,side] of [-1,1].entries()){
   const arm=f.body.arms[j],guide=f.equipment.find(e=>e.id==="smith-guide"+side)!,carriage=f.equipment.find(e=>e.id==="smith-carriage"+side)!,post=f.equipment.find(e=>e.id==="smith-upright"+side)!;
   expect(arm[2]).toEqual(f.grips[j].centre);expect(arm[2][0]).toBeCloseTo(side*SMITH_INCLINE.gripHalfWidth,8);expect(arm[2][1]).toBeCloseTo(bar.a[1],8);expect(arm[2][2]).toBeCloseTo(bar.a[2],8);
   expect(length3(sub3(arm[1],arm[0]))).toBeCloseTo(HUMAN_SEGMENTS.upperArm,7);expect(length3(sub3(arm[2],arm[1]))).toBeCloseTo(HUMAN_SEGMENTS.forearmGrip,7);
   expect(carriage.a[0]).toBe(guide.a[0]);expect(carriage.a[2]).toBe(guide.a[2]);expect(carriage.a[1]).toBe(bar.a[1]);
   for(let plate=0;plate<2;plate++){
    const p=f.equipment.find(e=>e.id==="smith-plate"+side+plate)!;expect(p.a[1]).toBe(bar.a[1]);expect(p.a[2]).toBe(bar.a[2]);
    // Moving plates stay outboard of the five-unit-wide frame posts.
    expect(Math.abs(p.a[0])-p.size[1]/2).toBeGreaterThan(Math.abs(post.a[0])+2.5);
   }
  }
 }
});
test("authored fingers stay wrapped on the guided bar throughout the press without moving the planted feet",()=>{
 const human=createRealisticHuman(new THREE.Group());try{for(const p of [0,.25,.5,.75,1]){
  const f=trainingFrame3d("incline-bench-press",p);human.draw(f,true);expect(human.mesh.userData.handContacts).toHaveLength(2);
  human.mesh.userData.handContacts.forEach((g:any)=>expect(g.error).toBeLessThan(1e-6));expect(Array.from(human.mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
  const bar=f.equipment.find(e=>e.id==="barbell")!;expect(bar.a[2]-f.body.head[2]).toBeGreaterThan(10);
 }}finally{human.dispose();}
});
test("both incline menu entry points open the photo Smith guide, and matching requires Smith rather than a free incline bench",()=>{
 expect(CHEST_LESSONS.filter(e=>e.id==="incline-bench-press")).toHaveLength(1);expect(CHEST_MENU_GUIDES['m-incline-smith']).toBe('incline-bench-press');expect(CHEST_MENU_GUIDES['m-incline-bench']).toBe('incline-bench-press');
 expect(menus.find(m=>m.id==="m-incline-bench")!.reqEquip).toBe("incline-smith");
 const pref={menuIds:["m-incline-bench"],partIds:[],requiredDumbbellKg:0};
 expect(calculateMatch({...gyms[0],installed:["incline-bench-press","power-rack"]},pref).available).toHaveLength(0);
 expect(calculateMatch({...gyms[0],installed:["incline-smith"]},pref).available).toHaveLength(1);
});
test("SVG fallback projects the angled pad and horizontal silver crossbar from the actual Smith frame",async()=>{
 const app=await render(<PhotoChestEquipment type="incline-bench-press" progress={.5}/>);
 const points=(id:string)=>{const p=app.getByTestId(id).props;const v=String(p.points??p.d).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number);return Array.from({length:v.length/2},(_,i)=>v.slice(i*2,i*2+2));};
 for(const id of ["photo-gear-smith-incline-back-top","photo-gear-smith-top-top"]){const v=points(id);expect(v).toHaveLength(4);expect(v.flat().every(Number.isFinite)).toBe(true);}
 const cross=points("photo-gear-smith-top-top");expect(Math.max(...cross.map(p=>p[0]))-Math.min(...cross.map(p=>p[0]))).toBeGreaterThan(10);
});
test.each(["ja","en"] as const)("%s: save a Smith press with its own name while retaining old free-barbell history exactly",async language=>{
 jest.spyOn(Alert,"alert").mockImplementation(()=>{});const data=initialFitnessData();data.language=language;
 const old={id:"old-free-incline",name:"chest.inclineBench.name",weight:40,reps:10,sets:3,date:"2026-11-01T00:00:00.000Z",location:"gym" as const,loadType:"weight" as const};data.logs=[old];
 expect(decodeFitnessData(JSON.stringify(data)).logs[0]).toEqual(old);await AsyncStorage.setItem(FITNESS_STORAGE_KEY,JSON.stringify(data));await render(<App/>);
 const t=(k:string,v={})=>translate(language,k,v);await fireEvent.press(await screen.findByRole("button",{name:t("chest.course.open")}));await fireEvent.press(screen.getByRole("button",{name:t("chest.course.choose")}));
 const name=t("chest.inclineSmith.name");await fireEvent.press(screen.getByRole("radio",{name:t("chest.course.select",{0:name})}));
 expect(screen.getByRole("image",{name:t("guide.diagramLabel",{0:name})})).toBeTruthy();await fireEvent.changeText(screen.getByLabelText(t("重量kg")),"25");await fireEvent.press(screen.getByRole("button",{name:t("ジムトレーニングを記録")}));
 await waitFor(async()=>{const saved=JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!);expect(saved.logs).toHaveLength(2);expect(saved.logs.find((l:any)=>l.id===old.id)).toEqual(old);expect(saved.logs.find((l:any)=>l.id!==old.id)).toMatchObject({name:"chest.inclineSmith.name",weight:25,location:"gym"});});
 expect(t("chest.inclineBench.name")).not.toBe(name);
});
