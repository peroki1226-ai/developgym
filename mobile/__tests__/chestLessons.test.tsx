import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import App from "../App";
import { TrainingScreen } from "../src/screens/TrainingScreen";
import { FitnessProvider } from "../src/state";
import { LocaleProvider, translate } from "../src/i18n";
import { CHEST_LESSONS } from "../src/domain/chestLessons";
import { EQUIPMENTS } from "../src/data/equipment";
import { body3d, trainingFrame3d, length3, sub3, dot3, unit3, HUMAN_SEGMENTS } from "../src/domain/training3d";
import { guidePose, projectPhotoChest } from "../src/domain/photoChestProjection";
import { FITNESS_STORAGE_KEY } from "../src/domain/fitnessStorage";

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
const suffixes = ["name","category","target","secondary","action","summary","setup","hands","feet","start","work","hold","return","why","load","practice","record", ...[1,2,3].flatMap(n => ["wrong","fix","focus","tip"].map(s => s+n))];
test.each(CHEST_LESSONS)("$id: complete localized chest coaching and unchanged stable identifiers", lesson => {
  const equipment = EQUIPMENTS.find(e => e.id === lesson.id)!;
  expect(equipment.bodyPart).toBe("chest");
  expect(equipment.svgType).toBe(lesson.id);
  for (const suffix of suffixes) for (const language of ["ja", "en"] as const) {
    const key = `${lesson.prefix}.${suffix}`, text = translate(language, key);
    expect(text).not.toBe(key);
    expect(text.trim().length).toBeGreaterThan(3);
    expect(text.normalize("NFKC")).not.toMatch(language === "ja" ? /\p{Script=Latin}/u : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
  }
  expect(translate("en", equipment.name)).not.toMatch(/curl|rear delt/i);
});
test.each(CHEST_LESSONS)("$id: both hands remain on real grips, segments retain length and fallback matches the 3D pose", lesson => {
  for (let i = 0; i <= 40; i++) {
    const frame = trainingFrame3d(lesson.id, i / 40), b = frame.body;
    expect(frame.grips).toHaveLength(2);
    b.arms.forEach((arm, n) => {
      expect(length3(sub3(arm[1],arm[0]))).toBeCloseTo(HUMAN_SEGMENTS.upperArm, 7);
      expect(length3(sub3(arm[2],arm[1]))).toBeCloseTo(HUMAN_SEGMENTS.forearmGrip, 7);
      expect(length3(sub3(arm[2],frame.grips[n].centre))).toBeLessThan(1e-7);
    });
    b.legs.forEach(leg => {
      expect(length3(sub3(leg[1],leg[0]))).toBeCloseTo(20,7);
      expect(length3(sub3(leg[2],leg[1]))).toBeCloseTo(21,7);
    });
    const pose = guidePose(lesson.id, i / 40);
    expect(pose.grips).toEqual(b.arms.map(arm => projectPhotoChest(lesson.id, arm[2])));
  }
});
test("incline dumbbells use a 30 degree supported torso and vertical forearms instead of a curl", () => {
  const base = body3d("dumbbell-heavy",0);
  const rest = trainingFrame3d("dumbbell-heavy",0).equipment.find(e=>e.id==="backrest")!;
  const up = unit3(sub3(base.shoulder,base.hip));
  expect(dot3(sub3(base.head,rest.a),up)).toBeLessThan(rest.size[1]/2);
  expect(rest.size[0]).toBeLessThan(18);
  for (let i=0; i<=40; i++) {
    const b=body3d("dumbbell-heavy",i/40), up=sub3(b.shoulder,b.hip);
    expect(Math.atan2(up[1],-up[2])*180/Math.PI).toBeCloseTo(30,7);
    expect(b.hip).toEqual(base.hip);
    expect(b.legs).toEqual(base.legs);
    for (const arm of b.arms) { expect(arm[2][0]).toBeCloseTo(arm[1][0]);expect(arm[2][2]).toBeCloseTo(arm[1][2]);expect(arm[2][1]).toBeGreaterThan(arm[1][1]); }
  }
  expect(body3d("dumbbell-heavy",1).arms[0][2][1]).toBeGreaterThan(base.arms[0][2][1]+14);
});
test("chest dips raise the torso against fixed bars with suspended feet and no assist knee pad or seat", () => {
  const start=trainingFrame3d("chest-dip",0), end=trainingFrame3d("chest-dip",1);
  expect(start.grips).toEqual(end.grips);
  expect(end.body.shoulder[1]).toBeGreaterThan(start.body.shoulder[1]+8);
  for(let i=0;i<=40;i++) {
    const f=trainingFrame3d("chest-dip",i/40);
    expect(f.equipment.some(e=>/stack|knee-pad|seat|backrest/.test(e.id))).toBe(false);
    expect(f.feet.every(foot=>foot.contact[1]>20)).toBe(true);
  }
});
test("incline Hammer arms rotate about fixed bearings and plates travel rigidly with each lever", () => {
  const start=trainingFrame3d("incline-hammer-press",0);
  for (const arm of start.body.arms) expect(arm[1][1]).toBeLessThan(arm[0][1]-5);
  for(let i=0;i<=40;i++) {
    const frame=trainingFrame3d("incline-hammer-press",i/40);
    expect(frame.body.hip).toEqual(start.body.hip);
    expect(frame.equipment.some(e=>e.id.startsWith("stack"))).toBe(false);
    for (const side of [-1,1]) {
      const find=(id:string)=>frame.equipment.find(e=>e.id===id)!, initial=(id:string)=>start.equipment.find(e=>e.id===id)!;
      expect(find("hammer-pivot"+side)).toEqual(initial("hammer-pivot"+side));
      const axis=find("hammer-pivot"+side).a;
      for(const id of ["hammer-plate"+side+0,"hammer-loading-horn"+side,"hammer-grip-link"+side]) {
        expect(length3(sub3(find(id).a,axis))).toBeCloseTo(length3(sub3(initial(id).a,axis)),7);
      }
    }
  }
});

test.each(["ja","en"] as const)("%s: all chest lessons switch, show targets and paired corrections, and translate their hand/foot cues", async language => {
  const t=(key:string,values={})=>translate(language,key,values);
  await render(<FitnessProvider><LocaleProvider language={language} setLanguage={()=>{}}><TrainingScreen /></LocaleProvider></FitnessProvider>);
  for(const lesson of CHEST_LESSONS) {
    await fireEvent.press(screen.getByRole("button",{name:t("chest.course.choose")}));
    await fireEvent.press(screen.getByRole("radio",{name:t("chest.course.select",{0:t(`${lesson.prefix}.name`)})}));
    expect(screen.getByRole("image",{name:t("guide.diagramLabel",{0:t(`${lesson.prefix}.name`)})})).toBeTruthy();
    expect(screen.getByLabelText(t("重量kg")).props.value).toBe(lesson.id === "chest-dip" ? "0" : "");
    await fireEvent.changeText(screen.getByLabelText(t("重量kg")),"4");
    await fireEvent.press(screen.getByRole("button",{name:t("chest.course.choose")}));
    await fireEvent.press(screen.getByRole("radio",{name:t("chest.course.select",{0:t(`${lesson.prefix}.name`)})}));
    expect(screen.getByLabelText(t("重量kg")).props.value).toBe("4");
    expect(screen.getByRole("tab",{name:t("chest.tab.target")}).props.accessibilityState.selected).toBe(true);
    expect(screen.getByText(t(`${lesson.prefix}.why`))).toBeTruthy();
    for(const step of ["hands","feet"]) {
      await fireEvent.press(screen.getByRole("radio",{name:t(`learn.${step}`)}));
      expect(screen.getByTestId("beginner-step-hint").props.children).toBe(t(`${lesson.prefix}.${step}`));
    }
    await fireEvent.press(screen.getByRole("tab",{name:t("chest.tab.cautions")}));
    for(const n of [1,2,3]) expect(screen.getByText(t(`${lesson.prefix}.fix${n}`))).toBeTruthy();
    await fireEvent.press(screen.getByRole("tab",{name:t("chest.tab.focus")}));
    expect(screen.getByText(t(`${lesson.prefix}.focus1`))).toBeTruthy();
    await fireEvent.press(screen.getByRole("tab",{name:t("chest.tab.tips")}));
    expect(screen.getAllByText(t(`${lesson.prefix}.record`)).length).toBeGreaterThan(0);
  }
});

test("new chest entry preserves search, records bodyweight as zero and links to assisted practice", async () => {
  jest.spyOn(Alert,"alert").mockImplementation(()=>{});
  const t=(key:string,values={})=>translate("ja",key,values);
  await render(<App/>);
  await screen.findByText("理想のジムを探そう。");
  await fireEvent.changeText(screen.getByLabelText("ジム検索"),"千葉");
  await fireEvent.press(screen.getByRole("button",{name:t("chest.course.open")}));
  await fireEvent.press(screen.getByRole("button",{name:t("chest.course.choose")}));
  await fireEvent.press(screen.getByRole("radio",{name:t("chest.course.select",{0:t("chest.dip.name")})}));
  expect(screen.getByLabelText("重量キログラム").props.value).toBe("0");
  await fireEvent.press(screen.getByRole("button",{name:"ジムトレーニングを記録"}));
  await waitFor(async()=>expect(JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).logs[0]).toMatchObject({name:"chest.dip.name",weight:0,loadType:"bodyweight",location:"gym"}));
  await fireEvent.press(screen.getByRole("tab",{name:t("chest.tab.tips")}));
  await fireEvent.press(screen.getByRole("button",{name:t("chest.assisted")}));
  const assisted=EQUIPMENTS.find(e=>e.id==="assisted-dip")!;
  expect(screen.getByRole("image",{name:t("guide.diagramLabel",{0:t(assisted.name)})})).toBeTruthy();
  await fireEvent.press(screen.getByRole("button",{name:t("guide.back")}));
  expect(screen.getByLabelText("ジム検索").props.value).toBe("千葉");
});
