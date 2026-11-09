import React from "react";
import * as THREE from "three";
import { createTrainingScene } from "../src/three/trainingScene";
import { render } from "@testing-library/react-native";
import { trainingFrame3d, length3, sub3, dot3, unit3 } from "../src/domain/training3d";
import { guidePose, projectPhotoChest } from "../src/domain/photoChestProjection";
import { EQUIPMENTS } from "../src/data/equipment";
import { muscleSpec } from "../src/domain/muscleMotion";
import { PhotoChestEquipment } from "../src/components/PhotoChestEquipment";
import { translate } from "../src/i18n";

const types = ["pec-fly", "chest-press"] as const;
const elbowAngle = (a: ReturnType<typeof trainingFrame3d>["body"]["arms"][number]) =>
  Math.acos(Math.max(-1, Math.min(1, dot3(unit3(sub3(a[0], a[1])), unit3(sub3(a[2], a[1]))))));

test.each(types)("%s uses a selectorised tower, fixed seat and bearings with no plate-loading hardware", type => {
  const prefix = type === "pec-fly" ? "fly" : "press";
  const first = trainingFrame3d(type, 0);
  const fixed = (p: typeof first.equipment[number]) => /stack-(back|frame|guide|foot|base|instruction-panel)/.test(p.id) || p.id === "seat" || p.id === "backrest" || p.id.startsWith(prefix + "-axis");
  expect(first.equipment.filter(p => new RegExp(prefix + "-stack-weight\\d+$").test(p.id))).toHaveLength(15);
  expect(first.equipment.some(p => p.kind === "plate" || /loading-horn|storage-horn|stored-plate/.test(p.id))).toBe(false);
  expect(first.equipment.find(p => p.id === "backrest")!.size[0]).toBe(14);
  expect(new Set(first.equipment.map(p => p.id)).size).toBe(first.equipment.length);
  for (let i = 0; i <= 40; i++) {
    const f = trainingFrame3d(type, i / 40);
    expect(f.equipment.filter(fixed)).toEqual(first.equipment.filter(fixed));
    for (const weight of [0, 5]) expect(f.equipment.find(p => p.id === prefix + "-stack-weight" + weight)).toEqual(first.equipment.find(p => p.id === prefix + "-stack-weight" + weight));
  }
  const end = trainingFrame3d(type, 1);
  expect(end.equipment.find(p => p.id === prefix + "-stack-weight6")!.a[1]).toBeGreaterThan(first.equipment.find(p => p.id === prefix + "-stack-weight6")!.a[1] + 4);
});

test("the fly closes through a horizontal arc with constant elbow bend, vertical hanging arms and overhead pivots", () => {
  const start = trainingFrame3d("pec-fly", 0);
  for (let i = 0; i <= 40; i++) {
    const f = trainingFrame3d("pec-fly", i / 40);
    for (const [index, side] of [-1, 1].entries()) {
      const a = f.body.arms[index], pivot = f.equipment.find(p => p.id === "fly-axis" + side)!;
      expect(pivot.a[1]).toBeGreaterThan(f.body.head[1] + 20);
      expect(Math.hypot(a[2][0] - pivot.a[0], a[2][2] - pivot.a[2])).toBeCloseTo(28.5, 7);
      expect(elbowAngle(a)).toBeCloseTo(elbowAngle(start.body.arms[index]), 7);
      const hanger = f.equipment.find(p => p.id === "fly-hanger" + side)!;
      expect(hanger.a[0]).toBeCloseTo(a[2][0], 7);
      expect(hanger.a[2]).toBeCloseTo(a[2][2], 7);
      expect(hanger.a[0]).toBe(hanger.b![0]);
      expect(hanger.a[2]).toBe(hanger.b![2]);
      expect(f.equipment.find(p => p.id === "fly-grip" + side)!.a[1]).toBeLessThan(a[2][1]);
    }
  }
  const end = trainingFrame3d("pec-fly", 1);
  expect(length3(sub3(end.body.arms[0][2], end.body.arms[1][2]))).toBeLessThan(7);
  expect(length3(sub3(start.body.arms[0][2], start.body.arms[1][2]))).toBeGreaterThan(55);
  expect(end.body.arms[0][2][0]).toBeLessThan(end.body.arms[1][2][0]);
});

test("the press has low fixed bearings, bent arms and an offset tower; elbows extend without a fly motion", () => {
  const start = trainingFrame3d("chest-press", 0), end = trainingFrame3d("chest-press", 1);
  expect(start.equipment.find(p => p.id === "press-stack-frame")!.a[0]).toBeLessThan(-20);
  for (const [index, side] of [-1, 1].entries()) {
    const pivot = start.equipment.find(p => p.id === "press-axis" + side)!;
    expect(pivot.a[1]).toBeLessThan(10);
    expect(elbowAngle(end.body.arms[index])).toBeGreaterThan(elbowAngle(start.body.arms[index]) + .7);
    expect(end.body.arms[index][2][0]).toBe(start.body.arms[index][2][0]);
    expect(end.body.arms[index][2][2]).toBeGreaterThan(start.body.arms[index][2][2] + 10);
    const arm = end.equipment.find(p => p.id === "press-arm" + side)!;
    expect(arm.kind).toBe("curve");
    expect(arm.points!.length).toBeGreaterThan(3);
    expect(arm.points).toEqual(start.equipment.find(p => p.id === arm.id)!.points);
  }
});

test.each(types)("%s SVG fallback uses the same selector stack and projected hands as the native guide", async type => {
  const frame = trainingFrame3d(type, .5), pose = guidePose(type, .5);
  expect(pose.grips).toEqual(frame.body.arms.map(a => projectPhotoChest(type, a[2])));
  const view = await render(<PhotoChestEquipment type={type} progress={.5} />);
  expect(view.getByTestId("photo-chest-equipment")).toBeTruthy();
  expect(view.getAllByTestId(/photo-gear-.*stack-weight\d+$/)).toHaveLength(15);
});

test("both photo machines stay registered as separate chest lessons with pure Japanese and English names", () => {
  for (const type of types) {
    const item = EQUIPMENTS.find(p => p.id === type)!;
    expect(item.bodyPart).toBe("chest");
    expect(muscleSpec(type).primary).toEqual(["chest"]);
    expect(translate("ja", item.name)).not.toMatch(/[A-Za-z]/);
    expect(translate("en", item.name)).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  }
  expect(translate("ja", "ペックフライ / リアデルト")).toBe("ペックフライ");
  expect(translate("en", "ペックフライ / リアデルト")).toBe("Pec Fly");
  expect(EQUIPMENTS.find(p => p.id === "pec-fly")!.primaryMuscles).toEqual(["大胸筋（内転作用）"]);
});


test("rigid curved arm/tower geometry is reused while moving and released once on machine change or close", () => {
  let scene: THREE.Scene;
  const renderer = { setPixelRatio: jest.fn(), setSize: jest.fn(), shadowMap: {}, render: jest.fn((s: THREE.Scene) => { scene = s; }), dispose: jest.fn() };
  const handle = createTrainingScene(renderer as unknown as THREE.WebGLRenderer, 320, 350);
  const input = { type: "chest-press", progress: 0, view: "front" as const, focus: "whole" as const, anatomy: true, transparent: false };
  handle.draw(input);
  const owned: THREE.Mesh[] = [];
  scene!.traverse(n => { if (n instanceof THREE.Mesh && n.userData.ownsGeometry) owned.push(n); });
  expect(owned).toHaveLength(3);
  const geometries = owned.map(n => n.geometry), disposals = geometries.map(g => jest.spyOn(g, "dispose"));
  handle.draw({ ...input, progress: 1 });
  owned.forEach((n, i) => expect(n.geometry).toBe(geometries[i]));
  disposals.forEach(fn => expect(fn).not.toHaveBeenCalled());
  handle.draw({ ...input, type: "pec-fly" });
  disposals.forEach(fn => expect(fn).toHaveBeenCalledTimes(1));
  const tower = scene!.getObjectByName("gear-fly-stack-frame") as THREE.Mesh;
  const release = jest.spyOn(tower.geometry, "dispose");
  handle.dispose(); handle.dispose();
  expect(release).toHaveBeenCalledTimes(1);
  disposals.forEach(fn => expect(fn).toHaveBeenCalledTimes(1));
});
