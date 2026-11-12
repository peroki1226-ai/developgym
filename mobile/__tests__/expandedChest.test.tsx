import React from "react";
import { Alert } from "react-native";
import { fireEvent,render,screen,waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import App from "../App";
import { CHEST_LESSONS,CHEST_MENU_GUIDES } from "../src/domain/chestLessons";
import { EQUIPMENTS } from "../src/data/equipment";
import { trainingFrame3d,sub3,length3,dot3 } from "../src/domain/training3d";
import { menus,gyms,calculateMatch } from "../src/domain/matching";
import { defaultSearch,decodeSearch,SEARCH_STORAGE_KEY } from "../src/domain/discovery";
import { FITNESS_STORAGE_KEY } from "../src/domain/fitnessStorage";
import { translate } from "../src/i18n";
jest.mock("react-native-safe-area-context",()=>require("react-native-safe-area-context/jest/mock").default);
test("eight chest lessons include all four requested names without duplicate cable or Hammer guides",()=>{
 expect(CHEST_LESSONS).toHaveLength(8);expect(new Set(CHEST_LESSONS.map(e=>e.id)).size).toBe(8);
 for(const id of ["barbell-bench-press","incline-bench-press","cable-machine","incline-hammer-press"])expect(EQUIPMENTS.filter(e=>e.id===id)).toHaveLength(1);
 expect(CHEST_MENU_GUIDES["m-bench"]).toBe("barbell-bench-press");
 expect(CHEST_MENU_GUIDES["m-cable-cross"]).toBe("cable-machine");
});
test.each(["barbell-bench-press","incline-bench-press"])("%s: free bar, both hands and plates move together while rack and feet remain fixed",type=>{
 const start=trainingFrame3d(type,0);let lastY=0;
 for(let i=0;i<=40;i++){
  const f=trainingFrame3d(type,i/40),up=sub3(f.body.shoulder,f.body.hip),bar=f.equipment.find(e=>e.id==="free-barbell")!;
  expect(Math.atan2(up[1],-up[2])*180/Math.PI).toBeCloseTo(type==="incline-bench-press"?30:0,7);
  expect(f.equipment.some(e=>/smith|stack|guide-rod/.test(e.id))).toBe(false);
  expect(f.body.legs).toEqual(start.body.legs);
  for(const id of ["free-rack-post-1","free-rack-post1","free-safety-1","free-safety1"])expect(f.equipment.find(e=>e.id===id)).toEqual(start.equipment.find(e=>e.id===id));
  for(const arm of f.body.arms){expect(arm[2][1]).toBeCloseTo(bar.a[1],7);expect(arm[2][2]).toBeCloseTo(bar.a[2],7);}
  for(const side of [-1,1]){
    const post=f.equipment.find(e=>e.id==="free-rack-post"+side)!,plate=f.equipment.find(e=>e.id==="free-bar-plate"+side+0)!;
    expect(Math.abs(plate.a[0]-post.a[0])).toBeGreaterThan(post.size[0]/2+plate.size[1]/2);
  }
  for(const plate of f.equipment.filter(e=>e.id.startsWith("free-bar-plate"))){expect(plate.a[1]).toBeCloseTo(bar.a[1],7);expect(plate.a[2]).toBeCloseTo(bar.a[2],7);}
  expect(bar.a[2]-f.body.head[2]).toBeGreaterThan(7);expect(bar.a[1]).toBeGreaterThanOrEqual(lastY);lastY=bar.a[1];
 }
});
test("standing cable crossover keeps elbow bend, staggered feet and tower positions as the hands close without crossing",()=>{
 const start=trainingFrame3d("cable-machine",0);let distance=Infinity;
 for(let i=0;i<=40;i++){
  const f=trainingFrame3d("cable-machine",i/40),hands=f.body.arms.map(a=>a[2]);
  expect(f.body.hip).toEqual(start.body.hip);expect(f.body.legs).toEqual(start.body.legs);
  expect(f.body.legs[0][2][2]).toBeGreaterThan(f.body.legs[1][2][2]+15);
  expect(hands[0][0]).toBeLessThan(hands[1][0]);expect(length3(sub3(hands[0],hands[1]))).toBeLessThanOrEqual(distance+1e-9);distance=length3(sub3(hands[0],hands[1]));
  for(const arm of f.body.arms){const u=sub3(arm[0],arm[1]),v=sub3(arm[2],arm[1]);expect(Math.acos(dot3(u,v)/(length3(u)*length3(v)))*180/Math.PI).toBeCloseTo(155,7);}
  for(const side of [-1,1]){const cable=f.equipment.find(e=>e.id==="crossover"+side)!;expect(cable.b).toEqual(f.equipment.find(e=>e.id==="crossover-handle-top"+side)!.a);expect(cable.b).not.toEqual(hands[side===-1?0:1]);expect(f.equipment.find(e=>e.id==="tower"+side+"-top")).toEqual(start.equipment.find(e=>e.id==="tower"+side+"-top"));}
 }
});
test("new matching choices retain old saved menu IDs and do not infer Hammer or incline bench from a chest press",()=>{
 const profile={...defaultSearch(),menuIds:["m-bench","m-incline-bench","m-incline-hammer","m-cable-cross"]};
 expect(decodeSearch(JSON.stringify({version:1,profile}))).toEqual(profile);
 const pref={menuIds:["m-incline-bench","m-incline-hammer"],partIds:[],requiredDumbbellKg:0};
 const missing=calculateMatch({...gyms[0],installed:["chest-press","power-rack"]},pref);
 expect(missing.available).toHaveLength(0);expect(missing.missing).toHaveLength(2);
 expect(menus.filter(m=>m.id==="m-bench")).toHaveLength(1);
 const verified=calculateMatch({...gyms[0],installed:["incline-bench-press","incline-hammer-press"]},pref);expect(verified.available).toHaveLength(2);
});
test.each(["ja","en"] as const)("%s: normal chest menu opens the exact moving barbell guide, logs it and preserves search/selection on return",async language=>{
 jest.spyOn(Alert,"alert").mockImplementation(()=>{});const t=(k:string,v={})=>translate(language,k,v);
 await render(<App/>);await screen.findByText("理想のジムを探そう。");if(language==="en")await fireEvent.press(screen.getByRole("button",{name:/🇺🇸/}));
 await fireEvent.press(screen.getByRole("button",{name:t("travel.nav.menu")}));
 const name=t("chest.inclineBench.name");await fireEvent.changeText(screen.getByLabelText(t("travel.menuSearch")),name);
 await fireEvent.press(screen.getByRole("button",{name}));await fireEvent.press(screen.getByRole("button",{name:t("chest.menu.form",{0:name})}));
 expect(screen.getByRole("button",{name:t("chest.live.watch")})).toBeTruthy();
 expect(screen.getByRole("image",{name:t("guide.diagramLabel",{0:name})})).toBeTruthy();
 await fireEvent.changeText(screen.getByLabelText(t("重量kg")),"20");await fireEvent.press(screen.getByRole("button",{name:t("ジムトレーニングを記録")}));
 await waitFor(async()=>expect(JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).logs[0]).toMatchObject({name:"chest.inclineBench.name",weight:20,location:"gym"}));
 await fireEvent.press(screen.getByRole("button",{name:t("guide.back")}));expect(screen.getByLabelText(t("travel.menuSearch")).props.value).toBe(name);
 expect(screen.getByRole("button",{name:t("travel.removeMenu",{0:name})})).toBeTruthy();
 await waitFor(async()=>expect(JSON.parse((await AsyncStorage.getItem(SEARCH_STORAGE_KEY))!).profile.menuIds).toContain("m-incline-bench"));
});
