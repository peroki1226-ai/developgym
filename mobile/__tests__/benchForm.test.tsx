import React from "react";
import * as THREE from "three";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { trainingFrame3d, sub3, length3, dot3, HUMAN_SEGMENTS } from "../src/domain/training3d";
import { chestMotionPaths } from "../src/domain/chestMotion";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { createPectoralFibres } from "../src/three/pectoralFibres";
import { guidePose, projectPhotoChest } from "../src/domain/photoChestProjection";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { EQUIPMENTS } from "../src/data/equipment";
import { LocaleProvider, translate } from "../src/i18n";
let model: any;
jest.mock("../src/components/Motion3DView", () => ({ Motion3DView: (props: any) => {
  model = props; require("react").useEffect(() => props.onReady(), [props.onReady]); return null;
} }));

test("bottom forearms stack in front and side views with moderate elbow flare and a bar stop over the chest", () => {
  const f = trainingFrame3d("barbell-bench-press", 0);
  f.body.arms.forEach(([shoulder, elbow, hand]) => {
    const forearm = sub3(hand, elbow);
    expect(forearm[1] / length3(forearm)).toBeGreaterThan(Math.cos(5 * Math.PI / 180));
    expect(hand[1]).toBeGreaterThan(elbow[1]);
    const upper = sub3(elbow, shoulder), flare = Math.atan2(Math.abs(upper[0]), upper[2]) * 180 / Math.PI;
    expect(flare).toBeGreaterThan(45); expect(flare).toBeLessThan(70);
    // Never lower toward the abdomen/neck or extend the upper arm excessively.
    expect(hand[2]).toBeLessThan(-14); expect(hand[2]).toBeGreaterThan(-20);
    expect(Math.asin(Math.abs(upper[1]) / length3(upper)) * 180 / Math.PI).toBeLessThan(45);
  });
});

test("the bottom bar aligns with the actual skinned lower sternum, not the abdomen", () => {
  const parent = new THREE.Group(), human = createRealisticHuman(parent), guide = createPectoralFibres(parent, human.mesh.geometry);
  try {
    const f = trainingFrame3d("barbell-bench-press", 0);
    human.draw(f, true); guide.draw(f, true, false, 0);
    const paths = guide.group.userData.paths as THREE.Vector3[][];
    const lowerSternum = paths[8][0].clone().add(paths[17][0]).multiplyScalar(.5);
    const bar = f.equipment.find(e => e.id === "free-barbell")!;
    expect(Math.abs(bar.a[2] - lowerSternum.z)).toBeLessThan(.5);
    expect(bar.a[1]).toBeGreaterThan(lowerSternum.y);
    expect(bar.a[1] - lowerSternum.y).toBeLessThan(3.5);
  } finally { guide.dispose(); human.dispose(); }
});

test("the free bar moves up and slightly back, finishes above the shoulder joints and returns on the same indicated path", () => {
  const first = trainingFrame3d("barbell-bench-press", 0), last = trainingFrame3d("barbell-bench-press", 1);
  let previous = first;
  for (let i = 0; i <= 100; i++) {
    const f = trainingFrame3d("barbell-bench-press", i / 100), hand = f.grips[0].centre;
    expect(hand[1]).toBeGreaterThanOrEqual(previous.grips[0].centre[1]); expect(hand[2]).toBeLessThanOrEqual(previous.grips[0].centre[2]);
    expect(length3(sub3(hand, previous.grips[0].centre))).toBeLessThan(.3);
    const work = chestMotionPaths(f.type, i / 100, false), back = chestMotionPaths(f.type, i / 100, true);
    expect(work[0].tip[1]).toBeCloseTo(hand[1], 7); expect(work[0].tip[2]).toBeCloseTo(hand[2], 7);
    expect(dot3(work[0].direction, back[0].direction)).toBeCloseTo(-1, 7);
    previous = f;
  }
  expect(last.grips[0].centre[2]).toBeCloseTo(last.body.arms[0][0][2], 7);
  const early = trainingFrame3d("barbell-bench-press", .25), late = trainingFrame3d("barbell-bench-press", .75);
  expect(first.grips[0].centre[2] - early.grips[0].centre[2]).toBeGreaterThan(late.grips[0].centre[2] - last.grips[0].centre[2]);
});

test("all poses retain horizontal support, head/back/buttocks and feet while real fingers stay on the synchronized free bar", () => {
  const human = createRealisticHuman(new THREE.Group()), start = trainingFrame3d("barbell-bench-press", 0);
  try { for (let i = 0; i <= 40; i++) {
    const f = trainingFrame3d("barbell-bench-press", i / 40), bar = f.equipment.find(e => e.id === "free-barbell")!;
    expect(f.body.spine).toEqual(start.body.spine); expect(f.body.hip).toEqual(start.body.hip);
    expect(f.body.head).toEqual(start.body.head); expect(f.body.legs).toEqual(start.body.legs); expect(f.feet).toEqual(start.feet);
    expect(f.equipment.find(e => e.id === "free-bench-back")).toEqual(start.equipment.find(e => e.id === "free-bench-back"));
    f.body.arms.forEach((arm, j) => {
      expect(length3(sub3(arm[1], arm[0]))).toBeCloseTo(HUMAN_SEGMENTS.upperArm, 7);
      expect(length3(sub3(arm[2], arm[1]))).toBeCloseTo(HUMAN_SEGMENTS.forearmGrip, 7);
      expect(length3(sub3(arm[2], f.grips[j].centre))).toBeLessThan(1e-7);
      expect(bar.a[1]).toBeCloseTo(arm[2][1], 7); expect(bar.a[2]).toBeCloseTo(arm[2][2], 7);
      const u = sub3(arm[0], arm[1]), v = sub3(arm[2], arm[1]);
      const angle = Math.acos(dot3(u, v) / (length3(u) * length3(v))) * 180 / Math.PI;
      expect(angle).toBeGreaterThan(45); expect(angle).toBeLessThan(175);
    });
    human.draw(f, true); human.mesh.userData.handContacts.forEach((c: any) => expect(c.error).toBeLessThan(1e-6));
    expect(Array.from(human.mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
    expect(guidePose(f.type, i / 40).grips).toEqual(f.body.arms.map(a => projectPhotoChest(f.type, a[2])));
  } } finally { human.dispose(); }
});

test.each(["ja", "en"] as const)("%s: manual bottom/top/return and camera changes keep the form cue in sync", async language => {
  const t = (k: string) => translate(language, k), e = EQUIPMENTS.find(e => e.id === "barbell-bench-press")!;
  await render(<LocaleProvider language={language} setLanguage={() => {}}><ExerciseDiagram type={e.id} label={e.name} muscleTag={e.muscleTag} beginner beginnerGuide={e}/></LocaleProvider>);
  const press = async (key: string) => fireEvent.press(screen.getByRole("button", { name: t(key) }));
  await press("anatomy.inspectLong"); expect(model.progress).toBe(0);
  expect(screen.getByTestId("bench-form-phase").props.children).toBe(t("bench.form.bottom"));
  await press("anatomy.inspectShort"); expect(model.progress).toBe(1);
  expect(screen.getByTestId("bench-form-phase").props.children).toBe(t("bench.form.top"));
  await fireEvent.press(screen.getByRole("radio", { name: t("scene.above") })); expect(model.progress).toBe(1);
  await fireEvent(screen.getByTestId("chest-motion-scrubber"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  expect(screen.getByTestId("bench-form-phase").props.children).toBe(t("bench.form.lower"));
  expect(screen.getByTestId("bench-form-coaching").props.children[1].props.children).toBe(t("bench.form.support"));
});
