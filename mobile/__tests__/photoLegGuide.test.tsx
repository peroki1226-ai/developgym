import React from "react";
import * as THREE from "three";
import { fireEvent, render } from "@testing-library/react-native";
import { trainingFrame3d, length3, sub3 } from "../src/domain/training3d";
import { createRealisticHuman, musclePathLength } from "../src/three/realisticHuman";
import { createTrainingScene } from "../src/three/trainingScene";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { LocaleProvider, translate } from "../src/i18n";

const part = (frame: ReturnType<typeof trainingFrame3d>, id: string) => frame.equipment.find(p => p.id === id)!;

test("the horizontal press moves the seat while the plate and guide rails stay fixed", () => {
  const start = trainingFrame3d("leg-press", 0, "seated"), end = trainingFrame3d("leg-press", 1, "seated");
  expect(part(end, "footplate")).toEqual(part(start, "footplate"));
  for (const side of [-1, 1]) expect(part(end, "seated-press-guide" + side)).toEqual(part(start, "seated-press-guide" + side));
  expect(end.equipment.some(p => p.id === "backrest-support" || p.id === "bench-seat-support")).toBe(false);
  expect(part(end, "seated-press-back-spine").a[1]).toBeGreaterThan(20);
  expect(end.body.hip[2]).toBeLessThan(start.body.hip[2] - 9);
  expect(part(end, "bench-seat").a[2]).toBeLessThan(part(start, "bench-seat").a[2] - 9);
  expect(end.equipment.some(p => p.kind === "plate")).toBe(false);
  expect(part(end, "seated-press-stack-weight6").a[1]).toBeGreaterThan(part(start, "seated-press-stack-weight6").a[1]);
});

test("the 45-degree profile moves its loaded foot carriage and keeps the seat fixed", () => {
  const start = trainingFrame3d("leg-press", 0, "incline"), end = trainingFrame3d("leg-press", 1, "incline");
  expect(end.body.hip).toEqual(start.body.hip);
  expect(part(end, "footplate").a[1]).toBeGreaterThan(part(start, "footplate").a[1] + 9);
  expect(end.equipment.some(p => p.kind === "plate")).toBe(true);
  expect(end.equipment.some(p => p.id.startsWith("seated-press-stack"))).toBe(false);
});

test("extension pivots stay at the knees while the roller lifts with the shin and the quadriceps shorten", () => {
  const start = trainingFrame3d("leg-extension", 0), end = trainingFrame3d("leg-extension", 1);
  for (const side of [-1, 1]) expect(part(end, "extension-knee-axis" + side)).toEqual(part(start, "extension-knee-axis" + side));
  expect(part(end, "extension-roller").a[1]).toBeGreaterThan(part(start, "extension-roller").a[1] + 15);
  expect(musclePathLength(end, "quads")).toBeLessThan(musclePathLength(start, "quads"));
});

test("adduction closes the inner pads and feet together, keeps the torso fixed and shortens the inner-thigh path", () => {
  const start = trainingFrame3d("hip-adduction", 0), end = trainingFrame3d("hip-adduction", 1);
  expect(end.body.hip).toEqual(start.body.hip);
  expect(end.body.shoulder).toEqual(start.body.shoulder);
  const gap = (f: typeof start) => length3(sub3(part(f, "adductor-inner-pad0").a, part(f, "adductor-inner-pad1").a));
  expect(gap(end)).toBeLessThan(gap(start) * .4);
  expect(musclePathLength(end, "adductors")).toBeLessThan(musclePathLength(start, "adductors"));
});

test.each(["seated", "incline"] as const)("%s press keeps thigh/shin lengths and planted soles consistent through every inspection pose", variant => {
  for (let i = 0; i <= 40; i++) {
    const f = trainingFrame3d("leg-press", i / 40, variant);
    for (const leg of f.body.legs) {
      expect(length3(sub3(leg[1], leg[0]))).toBeCloseTo(20, 7);
      expect(length3(sub3(leg[2], leg[1]))).toBeCloseTo(21, 7);
    }
    expect(f.grips).toHaveLength(2);
  }
});

test.each(["chest-press", "pec-fly"])("%s hand-skin grip channels meet the actual bars at every sampled pose", type => {
  const human = createRealisticHuman(new THREE.Group());
  for (const p of [0, .25, .5, .75, 1]) {
    human.draw(trainingFrame3d(type, p), true);
    expect(human.mesh.userData.handContacts).toHaveLength(2);
    for (const grip of human.mesh.userData.handContacts) expect(grip.error).toBeLessThan(1e-7);
  }
  human.dispose();
});

test("muscle arrows follow the legs, reverse on return, and disappear with muscle colouring", () => {
  let scene: THREE.Scene;
  const renderer = { setPixelRatio: jest.fn(), setSize: jest.fn(), shadowMap: {}, render: jest.fn((s: THREE.Scene) => { scene = s; }), dispose: jest.fn() };
  const handle = createTrainingScene(renderer as unknown as THREE.WebGLRenderer, 320, 350);
  const input = { type: "leg-extension", progress: .5, view: "front" as const, focus: "whole" as const, anatomy: true, transparent: false };
  handle.draw(input);
  const arrow = scene!.getObjectByName("muscle-flow-tip-0--1")!;
  expect(arrow.visible).toBe(true);
  expect((arrow as THREE.Mesh).material).toHaveProperty("depthTest", false);
  expect(arrow.renderOrder).toBeGreaterThan(0);
  const work = arrow.quaternion.clone();
  handle.draw({ ...input, returning: true });
  expect(arrow.quaternion.angleTo(work)).toBeGreaterThan(3);
  handle.draw({ ...input, anatomy: false });
  expect(arrow.visible).toBe(false);
  handle.dispose();
});

test.each(["ja", "en"] as const)("%s exposes both press types and a live thigh cue without changing the lesson ID", async language => {
  const t = (key: string) => translate(language, key);
  const view = await render(<LocaleProvider language={language} setLanguage={() => {}}><ExerciseDiagram type="leg-press" muscleTag="Quadriceps & Glutes" /></LocaleProvider>);
  expect(view.getByRole("radio", { name: t("machine.seated") }).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(view.getByRole("radio", { name: t("machine.incline") }));
  expect(view.getByRole("radio", { name: t("machine.incline") }).props.accessibilityState.checked).toBe(true);
  expect(view.getByTestId("muscle-quick-cue")).toBeTruthy();
  expect(view.getByText(t("quick.quads") + " · " + t("quick.long"))).toBeTruthy();
});


test.each(["seated", "incline"] as const)("%s press depicts glute shortening on hip extension rather than the inverse", variant => {
  const start = trainingFrame3d("leg-press", 0, variant), end = trainingFrame3d("leg-press", 1, variant);
  expect(musclePathLength(end, "glutes")).toBeLessThan(musclePathLength(start, "glutes"));
});
