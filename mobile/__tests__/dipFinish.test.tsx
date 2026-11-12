import React from "react";
import * as THREE from "three";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DIP_FINISH, dipFinishAmount, trainingFrame3d, sub3, length3, dot3, unit3, HUMAN_SEGMENTS } from "../src/domain/training3d";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { createPectoralFibres } from "../src/three/pectoralFibres";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { EQUIPMENTS } from "../src/data/equipment";
import { LocaleProvider, translate } from "../src/i18n";
let model: any;
jest.mock("../src/components/Motion3DView", () => ({ Motion3DView: (props: any) => {
  model = props; require("react").useEffect(() => props.onReady(), [props.onReady]); return null;
} }));

test("deeper dips retain fixed grips, suspended feet and exact arm lengths throughout the continuous path", () => {
  const bottom = trainingFrame3d("chest-dip", 0), top = trainingFrame3d("chest-dip", 1);
  expect(bottom.body.hip[1]).toBe(43);
  expect(top.body.hip[1]).toBeCloseTo(57.8);
  expect((top.body.hip[1] - bottom.body.hip[1]) / 11.8).toBeGreaterThan(1.25);
  let previous = bottom;
  for (let i = 0; i <= 100; i++) {
    const f = trainingFrame3d("chest-dip", i / 100);
    expect(f.grips).toEqual(bottom.grips); expect(f.equipment).toEqual(bottom.equipment);
    expect(f.feet.every(foot => foot.contact[1] > 20)).toBe(true);
    f.body.arms.forEach((a, j) => {
      expect(length3(sub3(a[1], a[0]))).toBeCloseTo(HUMAN_SEGMENTS.upperArm, 7);
      expect(length3(sub3(a[2], a[1]))).toBeCloseTo(HUMAN_SEGMENTS.forearmGrip, 7);
      expect(length3(sub3(a[2], f.grips[j].centre))).toBeLessThan(1e-7);
    });
    expect(length3(sub3(f.body.shoulder, previous.body.shoulder))).toBeLessThan(.25);
    previous = f;
  }
});

test("finishing motion smoothly bends only the upper spine, leaving the lower spine orientation and segment lengths stable", () => {
  expect(dipFinishAmount(0)).toBe(0); expect(dipFinishAmount(.65)).toBe(0); expect(dipFinishAmount(1)).toBe(1);
  const reference = trainingFrame3d("chest-dip", 0).body.spine;
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const amount = dipFinishAmount(i / 100), spine = trainingFrame3d("chest-dip", i / 100).body.spine;
    expect(amount).toBeGreaterThanOrEqual(previous); expect(amount - previous).toBeLessThan(.05); previous = amount;
    const lower = sub3(spine[1], spine[0]), upper = sub3(spine[2], spine[1]);
    expect(lower).toEqual(reference[1].map((n, j) => expect.closeTo(n - reference[0][j], 7)));
    expect(length3(lower)).toBeCloseTo(13, 7); expect(length3(upper)).toBeCloseTo(13, 7);
    const degrees = Math.acos(Math.min(1, dot3(unit3(lower), unit3(upper)))) * 180 / Math.PI;
    expect(degrees).toBeCloseTo(amount * DIP_FINISH.maxUpperBackDegrees, 5);
  }
});

test("the finishing attention cue follows actual lower pectoral skin, hides on return and reuses disposable geometry", () => {
  const parent = new THREE.Group(), human = createRealisticHuman(parent), guide = createPectoralFibres(parent, human.mesh.geometry);
  const focus = guide.group.getObjectByName("dip-finish-attention")!, ring = focus.getObjectByName("dip-attention-ring")!;
  const lines = focus.children[0] as THREE.LineSegments, geometry = lines.geometry;
  const dispose = jest.spyOn(geometry, "dispose"), ringDispose = jest.spyOn((ring as THREE.Mesh).geometry, "dispose");
  try {
    for (const p of [0, .5, .7, 1]) {
      const frame = trainingFrame3d("chest-dip", p); human.draw(frame, true); guide.draw(frame, true, false, p);
      expect(focus.visible).toBe(dipFinishAmount(p) > .05); expect(lines.geometry).toBe(geometry);
      expect(Array.from(human.mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      human.mesh.userData.handContacts.forEach((c: any) => expect(c.error).toBeLessThan(1e-6));
      if (focus.visible) {
        const paths = guide.group.userData.paths as THREE.Vector3[][];
        const centre = paths[8][0].clone().add(paths[17][0]).multiplyScalar(.5);
        expect(ring.position.distanceTo(centre)).toBeLessThan(1e-7);
        expect(guide.group.userData.dipAttention.meaning).toBe("attention");
        expect(geometry.drawRange.count).toBeGreaterThan(0);
        expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      }
    }
    const frame = trainingFrame3d("chest-dip", 1);
    guide.draw(frame, true, true, 1); expect(focus.visible).toBe(false);
    guide.draw(frame, false, false, 1); expect(guide.group.visible).toBe(false);
    guide.draw(trainingFrame3d("pec-fly", 1), true, false, 1); expect(focus.visible).toBe(false);
  } finally { guide.dispose(); guide.dispose(); human.dispose(); }
  expect(dispose).toHaveBeenCalledTimes(1); expect(ringDispose).toHaveBeenCalledTimes(1); expect(parent.children).toHaveLength(0);
});

test.each(["ja", "en"] as const)("%s: model inspection synchronizes the finish coaching, skin marker caption and manual pose", async language => {
  const t = (k: string) => translate(language, k), e = EQUIPMENTS.find(e => e.id === "chest-dip")!;
  await render(<LocaleProvider language={language} setLanguage={() => {}}><ExerciseDiagram type={e.id} label={e.name} muscleTag={e.muscleTag} beginner beginnerGuide={e}/></LocaleProvider>);
  const press = async (key: string) => fireEvent.press(screen.getByRole("button", { name: t(key) }));
  await press("anatomy.inspectShort"); expect(model.progress).toBe(1);
  expect(screen.getByTestId("dip-attention-caption").props.children).toBe(t("dip.finish.marker"));
  expect(screen.getByTestId("dip-finish-coaching").props.children[0].props.children).toBe(t("dip.finish.active"));
  await press("anatomy.inspectLong"); expect(model.progress).toBe(0);
  expect(screen.queryByTestId("dip-attention-caption")).toBeNull();
  expect(screen.getByTestId("dip-finish-coaching").props.children[0].props.children).toBe(t("dip.finish.path"));
});
