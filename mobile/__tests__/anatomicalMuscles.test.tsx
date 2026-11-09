import React from "react";
import Svg from "react-native-svg";
import * as THREE from "three";
import { render } from "@testing-library/react-native";
import { createTrainingScene } from "../src/three/trainingScene";
import { createRealisticHuman, musclePathLength, HumanMuscleState } from "../src/three/realisticHuman";
import { exercisePose, MOTION_TYPES } from "../src/domain/exerciseMotion";
import { trainingFrame3d } from "../src/domain/training3d";
import { muscleSpec } from "../src/domain/muscleMotion";
import { HumanFigure } from "../src/components/HumanFigure";
import { LocaleProvider } from "../src/i18n";
import asset from "../src/data/human/makehuman.json";
function setup() {
  let scene: THREE.Scene, camera: THREE.PerspectiveCamera;
  const fake = {
    setPixelRatio: jest.fn(),
    setSize: jest.fn(),
    shadowMap: {},
    render: jest.fn((s: THREE.Scene, c: THREE.PerspectiveCamera) => {
      scene = s;
      camera = c;
    }),
    dispose: jest.fn()
  };
  const handle = createTrainingScene(fake as unknown as THREE.WebGLRenderer, 320, 350);
  return {
    handle,
    camera: () => camera!,
    mesh: () => scene!.getObjectByName("human-surface") as THREE.Mesh<THREE.BufferGeometry>
  };
}
const input = {
  type: "chest-press",
  progress: .5,
  view: "front" as const,
  focus: "whole" as const,
  anatomy: true,
  transparent: false
};
test.each(MOTION_TYPES)("%s: the authored human surface follows start, middle and end without corrupting geometry or contacts", type => {
  const app = setup();
  for (const progress of [0, .5, 1]) {
    const frame = app.handle.draw({
      ...input,
      type,
      progress
    })!;
    const mesh = app.mesh();
    expect(mesh.geometry.attributes.position.count).toBeGreaterThan(10000);
    for (const name of ["position", "normal", "color"]) expect(Array.from(mesh.geometry.attributes[name].array).every(Number.isFinite)).toBe(true);
    const states = mesh.userData.muscles as HumanMuscleState[];
    for (const muscle of muscleSpec(type).primary) expect(states.find(s => s.muscle === muscle)!.colouredVertices).toBeGreaterThan(0);
    expect(frame.body.arms.map(a => a[2])).toEqual(frame.contacts[1].points);
    expect(mesh.geometry.boundingBox!.isEmpty()).toBe(false);
  }
  app.handle.dispose();
});
test("the bundled base, morphs, skeleton and weights have pinned CC0 provenance", () => {
  expect(asset.source.license).toBe("CC0-1.0");
  expect(asset.source.commit).toMatch(/^[a-f0-9]{40}$/);
  for (const entry of asset.source.files) expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(asset.source.files.map(f => f.file)).toEqual(expect.arrayContaining(["3dobjs/base.obj", "rigs/default.mhskel", "rigs/default_weights.mhw"]));
  const bytes = Uint8Array.from(atob(asset.skinWeights), c => c.charCodeAt(0));
  const weights = new Float32Array(bytes.buffer);
  for (let i = 0; i < asset.vertexCount; i++) {
    const sum = weights[i * 4] + weights[i * 4 + 1] + weights[i * 4 + 2] + weights[i * 4 + 3];
    if (Math.abs(sum - 1) > 1e-5) throw Error("Unweighted/disconnected human vertex: " + i);
  }
});
test("colour selection and transparency never change human shape or make the body transparent", () => {
  const app = setup();
  for (const type of MOTION_TYPES) for (const muscle of muscleSpec(type).primary) {
    app.handle.draw({
      ...input,
      type,
      muscle,
      anatomy: true,
      transparent: true
    });
    const before = Array.from(app.mesh().geometry.attributes.position.array);
    expect((app.mesh().userData.muscles as HumanMuscleState[]).filter(s => s.colouredVertices > 0).map(s => s.muscle)).toEqual([muscle]);
    app.handle.draw({
      ...input,
      type,
      muscle,
      anatomy: false,
      transparent: true
    });
    expect(Array.from(app.mesh().geometry.attributes.position.array)).toEqual(before);
    const c = app.mesh().geometry.attributes.color;
    expect(Array.from({
      length: c.count
    }, (_, i) => c.getX(i) === c.getY(i) && c.getY(i) === c.getZ(i)).every(Boolean)).toBe(true);
    expect((app.mesh().material as THREE.Material).transparent).toBe(false);
  }
  app.handle.dispose();
});
test("a held joint pose does not pulse the muscle belly or mutate skeletal contacts", () => {
  const parent = new THREE.Group(),
    human = createRealisticHuman(parent),
    frame = trainingFrame3d("preacher-curl", .5),
    copy = JSON.stringify(frame);
  human.draw(frame, true);
  const before = Array.from(human.mesh.geometry.attributes.position.array),
    state = human.stats().muscles;
  for (let i = 0; i < 5; i++) human.draw(frame, true);
  expect(Array.from(human.mesh.geometry.attributes.position.array)).toEqual(before);
  expect(human.stats().muscles).toEqual(state);
  expect(JSON.stringify(frame)).toBe(copy);
  human.dispose();
});
test("elbow flexion shortens the front muscle path while lengthening its antagonist", () => {
  const frame = trainingFrame3d("preacher-curl", 0);
  frame.body.arms = [[[0, 40, 0], [0, 20, 0], [0, 0, 0]], [[10, 40, 0], [10, 20, 0], [10, 0, 0]]];
  const biceps = musclePathLength(frame, "biceps"),
    triceps = musclePathLength(frame, "triceps");
  frame.body.arms = [[[0, 40, 0], [0, 20, 0], [0, 20, 20]], [[10, 40, 0], [10, 20, 0], [10, 20, 20]]];
  expect(musclePathLength(frame, "biceps")).toBeLessThan(biceps);
  expect(musclePathLength(frame, "triceps")).toBeGreaterThan(triceps);
});
test("one persistent human surface releases its buffers and material exactly once", () => {
  const app = setup();
  app.handle.draw(input);
  const mesh = app.mesh(),
    dispose = jest.spyOn(mesh.geometry, "dispose"),
    mat = jest.spyOn(mesh.material as THREE.Material, "dispose");
  for (const type of MOTION_TYPES) {
    app.handle.draw({
      ...input,
      type
    });
    expect(app.mesh()).toBe(mesh);
  }
  expect(app.handle.stats().anatomy.objects).toBe(1);
  app.handle.dispose();
  app.handle.dispose();
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(mat).toHaveBeenCalledTimes(1);
  expect(app.handle.stats().anatomy.vertices).toBe(0);
});
test.each(["ja", "en"] as const)("%s: SVG fallback also retains neutral muscle surfaces when colouring is off", async language => {
  const wrap = (coloured: boolean) => <LocaleProvider language={language} setLanguage={() => {}}>
        <Svg>
          <HumanFigure type="preacher-curl" pose={exercisePose("preacher-curl", 0.5)} progress={0.5} anatomy={coloured} selectedMuscle="biceps" />
        </Svg>
      </LocaleProvider>;
  const app = await render(wrap(true));
  expect(app.queryAllByTestId(/anatomy-neutral-region-/).length).toBeGreaterThan(10);
  expect(app.queryAllByTestId(/muscle-region-biceps/).length).toBeGreaterThan(0);
  await app.rerender(wrap(false));
  expect(app.getByTestId("anatomy-neutral")).toBeTruthy();
  expect(app.queryByTestId("muscle-overlay")).toBeNull();
  expect(app.queryAllByTestId(/^muscle-region-/)).toHaveLength(0);
});
test("all 24 weighted human motions remain continuous through 41 inspected poses", () => {
  const human = createRealisticHuman(new THREE.Group());
  for (const type of MOTION_TYPES) {
    let previous: Float32Array | null = null;
    for (let step = 0; step <= 40; step++) {
      human.draw(trainingFrame3d(type, step / 40), true);
      const positions = human.mesh.geometry.attributes.position.array as Float32Array;
      let largest = 0;
      if (previous) for (let i = 0; i < positions.length; i += 3) largest = Math.max(largest, Math.hypot(positions[i] - previous[i], positions[i + 1] - previous[i + 1], positions[i + 2] - previous[i + 2]));
      // A sign flip used to jump the skin by 12 units in a single inspection step.
      expect(largest).toBeLessThan(4);
      previous = positions.slice();
    }
  }
  human.dispose();
});
test("floor-supported feet touch the floor instead of floating in a guessed shoe volume", () => {
  const human = createRealisticHuman(new THREE.Group());
  for (const type of ["chest-press", "preacher-curl", "lat-pulldown", "triceps-pushdown"]) for (const progress of [0, .5, 1]) {
    human.draw(trainingFrame3d(type, progress), true);
    expect(human.mesh.geometry.boundingBox!.min.y).toBeCloseTo(.1, 3);
  }
  human.dispose();
});
test("the muscle inspection camera stays fixed while the elbow moves", () => {
  const app = setup();
  app.handle.draw({
    ...input,
    type: "preacher-curl",
    focus: "muscles",
    muscle: "biceps",
    progress: 0
  });
  const position = app.camera().position.clone(),
    rotation = app.camera().quaternion.clone();
  for (const progress of [.1, .3, .5, .8, 1]) {
    app.handle.draw({
      ...input,
      type: "preacher-curl",
      focus: "muscles",
      muscle: "biceps",
      progress
    });
    expect(app.camera().position.distanceTo(position)).toBeLessThan(1e-7);
    expect(app.camera().quaternion.angleTo(rotation)).toBeLessThan(1e-7);
  }
  app.handle.dispose();
});
