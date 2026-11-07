import React from "react";
import Svg from "react-native-svg";
import * as THREE from "three";
import { render } from "@testing-library/react-native";
import { createTrainingScene } from "../src/three/trainingScene";
import {
  BodySurfaces,
  createAnatomicalMuscles,
  MusclePatchState,
} from "../src/three/anatomicalMuscles";
import { exercisePose, MOTION_TYPES } from "../src/domain/exerciseMotion";
import { muscleSpec } from "../src/domain/muscleMotion";
import { HumanFigure } from "../src/components/HumanFigure";
import { LocaleProvider } from "../src/i18n";

function setup() {
  let scene: THREE.Scene;
  const fake = {
    setPixelRatio: jest.fn(),
    setSize: jest.fn(),
    shadowMap: {},
    render: jest.fn((s: THREE.Scene) => {
      scene = s;
    }),
    dispose: jest.fn(),
  };
  const handle = createTrainingScene(
    fake as unknown as THREE.WebGLRenderer,
    320,
    350,
  );
  const mesh = () =>
    scene!.getObjectByName(
      "anatomical-muscles",
    ) as THREE.Mesh<THREE.BufferGeometry>;
  const lines = () =>
    scene!.getObjectByName(
      "anatomical-fibres",
    ) as THREE.LineSegments<THREE.BufferGeometry>;
  const sources = () =>
    Object.fromEntries(
      ["torso", "pelvis", "arm0", "arm1", "leg0", "leg1"].map((k) => [
        k,
        (scene!.getObjectByName(k) as THREE.Mesh).geometry,
      ]),
    ) as BodySurfaces;
  return { handle, mesh, lines, sources };
}
const input = {
  type: "chest-press",
  progress: 0.5,
  view: "front" as const,
  focus: "whole" as const,
  anatomy: true,
  transparent: false,
};

test.each(MOTION_TYPES)(
  "%s: distinct muscle surfaces follow finite body geometry at start, middle and end",
  (type) => {
    const app = setup();
    for (const progress of [0, 0.5, 1]) {
      const frame = app.handle.draw({ ...input, type, progress })!;
      const parts = app.mesh().userData.patches as MusclePatchState[];
      expect(parts.length).toBeGreaterThan(50);
      expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length);
      for (const m of muscleSpec(type).primary)
        expect(parts.some((p) => p.muscle === m && p.active)).toBe(true);
      expect(
        parts.every((p) => Number.isFinite(p.fibreSpan) && p.fibreSpan > 0),
      ).toBe(true);
      for (const geometry of [app.mesh().geometry, app.lines().geometry])
        for (const name of ["position", "color"])
          expect(
            Array.from(geometry.attributes[name].array).every(Number.isFinite),
          ).toBe(true);
      expect(
        Array.from(app.mesh().geometry.attributes.normal.array).every(
          Number.isFinite,
        ),
      ).toBe(true);
      expect(frame.body.arms.map((a) => a[2])).toEqual(
        frame.contacts[1].points,
      );
    }
    app.handle.dispose();
  },
);

test("only the selected anatomical group is coloured; colouring off retains the muscle volumes and fibres", () => {
  const app = setup();
  for (const type of MOTION_TYPES)
    for (const muscle of muscleSpec(type).primary) {
      app.handle.draw({
        ...input,
        type,
        muscle,
        anatomy: true,
        transparent: true,
      });
      const active = (app.mesh().userData.patches as MusclePatchState[]).filter(
        (p) => p.active,
      );
      expect(active.length).toBeGreaterThan(0);
      expect(
        active.every(
          (p) =>
            p.muscle === muscle ||
            (muscle === "chest" && p.muscle === "upperChest"),
        ),
      ).toBe(true);
      const positions = Array.from(
        app.mesh().geometry.attributes.position.array,
      );
      app.handle.draw({
        ...input,
        type,
        muscle,
        anatomy: false,
        transparent: true,
      });
      expect(Array.from(app.mesh().geometry.attributes.position.array)).toEqual(
        positions,
      );
      const c = app.mesh().geometry.attributes.color as THREE.BufferAttribute;
      expect(
        Array.from(
          { length: c.count },
          (_, i) => c.getX(i) === c.getY(i) && c.getY(i) === c.getZ(i),
        ).every(Boolean),
      ).toBe(true);
      expect((app.mesh().material as THREE.Material).transparent).toBe(false);
    }
  app.handle.dispose();
});

test("on a fixed body pose, active muscle bellies and fibre spans shorten and restore without moving the skeleton", () => {
  const app = setup(),
    frame = app.handle.draw({
      ...input,
      type: "preacher-curl",
      muscle: "biceps",
    })!,
    before = JSON.stringify(frame);
  const group = new THREE.Group(),
    muscles = createAnatomicalMuscles(group),
    sources = app.sources();
  muscles.draw(frame, sources, 0, true);
  const mesh = group.getObjectByName(
    "anatomical-muscles",
  ) as THREE.Mesh<THREE.BufferGeometry>;
  const lines = group.getObjectByName(
    "anatomical-fibres",
  ) as THREE.LineSegments<THREE.BufferGeometry>;
  const long = Array.from(mesh.geometry.attributes.position.array),
    strands = Array.from(lines.geometry.attributes.position.array);
  const spans = (mesh.userData.patches as MusclePatchState[])
    .filter((p) => p.active)
    .map((p) => p.fibreSpan);
  muscles.draw(frame, sources, 1, true);
  expect(Array.from(mesh.geometry.attributes.position.array)).not.toEqual(long);
  expect(Array.from(lines.geometry.attributes.position.array)).not.toEqual(
    strands,
  );
  (mesh.userData.patches as MusclePatchState[])
    .filter((p) => p.active)
    .forEach((p, i) => expect(p.fibreSpan).toBeLessThan(spans[i]));
  expect(JSON.stringify(frame)).toBe(before);
  muscles.draw(frame, sources, 0, true);
  expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(long);
  muscles.dispose();
  app.handle.dispose();
});

test("postural muscles keep their belly and fibre geometry constant on a fixed pose", () => {
  const app = setup(),
    frame = app.handle.draw({
      ...input,
      type: "back-extension",
      muscle: "erectors",
    })!;
  const group = new THREE.Group(),
    muscles = createAnatomicalMuscles(group),
    sources = app.sources();
  muscles.draw(frame, sources, 0, true);
  const mesh = group.getObjectByName(
    "anatomical-muscles",
  ) as THREE.Mesh<THREE.BufferGeometry>;
  const before = Array.from(mesh.geometry.attributes.position.array);
  muscles.draw(frame, sources, 1, true);
  expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(before);
  expect(
    (mesh.userData.patches as MusclePatchState[])
      .filter((p) => p.active)
      .every((p) => p.shortened === 0.45),
  ).toBe(true);
  muscles.dispose();
  app.handle.dispose();
});

test("all muscles use two persistent objects and release GPU buffers exactly once", () => {
  const app = setup();
  app.handle.draw(input);
  const mesh = app.mesh(),
    lines = app.lines();
  const geo = jest.spyOn(mesh.geometry, "dispose"),
    fibre = jest.spyOn(lines.geometry, "dispose");
  app.handle.draw({ ...input, progress: 0.8 });
  expect(app.mesh()).toBe(mesh);
  expect(app.lines()).toBe(lines);
  app.handle.draw({ ...input, type: "lat-pulldown" });
  expect(app.mesh()).toBe(mesh);
  expect(app.lines()).toBe(lines);
  expect(app.handle.stats().anatomy.objects).toBe(2);
  app.handle.dispose();
  app.handle.dispose();
  expect(geo).toHaveBeenCalledTimes(1);
  expect(fibre).toHaveBeenCalledTimes(1);
  expect(app.handle.stats().anatomy.vertices).toBe(0);
});

test.each(["ja", "en"] as const)(
  "%s: SVG fallback also retains neutral muscle surfaces when colouring is off",
  async (language) => {
    const wrap = (coloured: boolean) => (
      <LocaleProvider language={language} setLanguage={() => {}}>
        <Svg>
          <HumanFigure
            type="preacher-curl"
            pose={exercisePose("preacher-curl", 0.5)}
            progress={0.5}
            anatomy={coloured}
            selectedMuscle="biceps"
          />
        </Svg>
      </LocaleProvider>
    );
    const app = await render(wrap(true));
    expect(
      app.queryAllByTestId(/anatomy-neutral-region-/).length,
    ).toBeGreaterThan(10);
    expect(app.queryAllByTestId(/muscle-region-biceps/).length).toBeGreaterThan(
      0,
    );
    await app.rerender(wrap(false));
    expect(app.getByTestId("anatomy-neutral")).toBeTruthy();
    expect(app.queryByTestId("muscle-overlay")).toBeNull();
    expect(app.queryAllByTestId(/^muscle-region-/)).toHaveLength(0);
  },
);
