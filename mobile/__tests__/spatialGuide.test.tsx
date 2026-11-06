import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import * as THREE from "three";
import { MOTION_TYPES } from "../src/domain/exerciseMotion";
import {
  trainingFrame3d,
  body3d,
  length3,
  sub3,
  dot3,
  average3,
  camera3d,
} from "../src/domain/training3d";
import { createTrainingScene } from "../src/three/trainingScene";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { LocaleProvider, translate } from "../src/i18n";

function fakeRenderer() {
  let scene: THREE.Scene, camera: THREE.Camera;
  const renderer = {
    setPixelRatio: jest.fn(),
    setSize: jest.fn(),
    shadowMap: {},
    render: jest.fn((s: THREE.Scene, c: THREE.Camera) => {
      scene = s;
      camera = c;
    }),
    dispose: jest.fn(),
  };
  return {
    renderer: renderer as unknown as THREE.WebGLRenderer,
    getScene: () => scene!,
    getCamera: () => camera!,
    dispose: renderer.dispose,
  };
}

test.each(MOTION_TYPES)(
  "%s: spatial body, equipment and contact points are finite without camera mutations",
  (type) => {
    for (let i = 0; i <= 20; i++) {
      const frame = trainingFrame3d(type, i / 20),
        snapshot = JSON.stringify(frame);
      expect(frame.body.arms).toHaveLength(2);
      expect(frame.body.legs).toHaveLength(2);
      expect(new Set(frame.equipment.map((p) => p.id)).size).toBe(
        frame.equipment.length,
      );
      expect(frame.equipment.length).toBeGreaterThan(10);
      expect(
        frame.equipment.every(
          (p) =>
            [...p.a, ...(p.b ?? []), ...p.size].every(Number.isFinite) &&
            p.size.every((s) => s > 0),
        ),
      ).toBe(true);
      expect(
        frame.body.arms
          .flat()
          .concat(frame.body.legs.flat())
          .every((p) => p.every(Number.isFinite)),
      ).toBe(true);
      expect(frame.contacts[1].points).toEqual(
        frame.body.arms.map((a) => a[2]),
      );
      for (const p of frame.equipment)
        if (p.axes) {
          expect(Math.abs(dot3(p.axes[0], p.axes[1]))).toBeLessThan(1e-6);
          expect(length3(p.axes[2])).toBeCloseTo(1);
        }
      for (const view of ["front", "side", "back"] as const)
        expect(
          camera3d(frame, view, "whole").position.every(Number.isFinite),
        ).toBe(true);
      expect(JSON.stringify(frame)).toBe(snapshot);
    }
  },
);

test("moving bars clear the face, assistance grips stay fixed, and sled rails do not telescope", () => {
  const pull = body3d("assisted-pull-up", 0).arms.map((a) => a[2]);
  for (let i = 0; i <= 20; i++) {
    for (const type of ["lat-pulldown", "assisted-pull-up"]) {
      const b = body3d(type, i / 20);
      b.arms.forEach((a) =>
        expect(a[2][2] - b.head[2]).toBeGreaterThanOrEqual(7.5),
      );
    }
    body3d("assisted-pull-up", i / 20).arms.forEach((a, n) =>
      a[2].forEach((v, k) => expect(v).toBeCloseTo(pull[n][k], 10)),
    );
    for (const type of ["leg-press", "hack-squat"]) {
      const f = trainingFrame3d(type, i / 20),
        start = trainingFrame3d(type, 0);
      expect(f.equipment.filter((p) => p.id.startsWith("sled-rail"))).toEqual(
        start.equipment.filter((p) => p.id.startsWith("sled-rail")),
      );
    }
    expect(
      trainingFrame3d("abdominal-crunch", i / 20).equipment.find(
        (p) => p.id === "backrest",
      ),
    ).toEqual(
      trainingFrame3d("abdominal-crunch", 0).equipment.find(
        (p) => p.id === "backrest",
      ),
    );
  }
});

test("seats meet the pelvis, platforms meet the soles, and assistance pads meet the knees", () => {
  for (const type of [
    "chest-press",
    "pec-fly",
    "lat-pulldown",
    "lateral-raise",
    "hip-abduction",
    "hip-adduction",
  ]) {
    const f = trainingFrame3d(type, 0.5),
      seat = f.equipment.find((p) => p.id === "seat")!;
    expect(f.body.hip[1] - (seat.a[1] + seat.size[1] / 2)).toBeCloseTo(4);
  }
  for (const type of ["leg-press", "hack-squat"]) {
    const f = trainingFrame3d(type, 0.5),
      plate = f.equipment.find((p) => p.id === "footplate")!;
    expect(length3(sub3(plate.a, average3(f.contacts[2].points)))).toBeCloseTo(
      1.5,
    );
  }
  const f = trainingFrame3d("assisted-pull-up", 0.5);
  expect(f.contacts[2].points).toEqual(f.body.legs.map((l) => l[1]));
});

test("renderer reuses meshes, fits all views, keeps shoes solid and disposes once", () => {
  const fake = fakeRenderer(),
    handle = createTrainingScene(fake.renderer, 320, 350);
  for (const type of MOTION_TYPES)
    for (const view of ["front", "side", "back"] as const) {
      handle.draw({
        type,
        progress: 0.5,
        view,
        focus: "whole",
        anatomy: true,
        transparent: false,
      });
      const group = fake
        .getScene()
        .children.find((n) => n instanceof THREE.Group)!;
      const bounds = new THREE.Box3().setFromObject(group);
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(fake.getCamera());
            expect(Math.abs(p.x)).toBeLessThan(1);
            expect(Math.abs(p.y)).toBeLessThan(1);
          }
      fake.getScene().traverse((n) => {
        if (n instanceof THREE.Mesh && n.geometry.attributes.normal)
          expect(
            Array.from(n.geometry.attributes.normal.array).every(
              Number.isFinite,
            ),
          ).toBe(true);
      });
    }
  const before = handle.stats();
  handle.draw({
    type: "rear-delt-fly",
    progress: 0.8,
    view: "side",
    focus: "whole",
    anatomy: false,
    transparent: true,
  });
  expect(handle.stats().nodes).toBe(before.nodes);
  expect(
    (fake.getScene().getObjectByName("shoe0") as THREE.Mesh).material,
  ).toHaveProperty("opacity", 1);
  handle.dispose();
  handle.dispose();
  expect(fake.dispose).toHaveBeenCalledTimes(1);
  expect(handle.stats().nodes).toBe(0);
});

test.each(["ja", "en"] as const)(
  "%s: camera/focus changes retain the pose, and lesson stages can be inspected without auto-play",
  async (language) => {
    const t = (k: string) => translate(language, k),
      view = await render(
        <LocaleProvider language={language} setLanguage={() => {}}>
          <ExerciseDiagram type="chest-press" muscleTag="胸" />
        </LocaleProvider>,
      );
    expect(view.getByRole("adjustable").props.accessibilityValue.now).toBe(0);
    await fireEvent.press(view.getByRole("button", { name: t("scene.move") }));
    expect(view.getByRole("adjustable").props.accessibilityValue.now).toBe(100);
    for (const camera of ["front", "side", "back"]) {
      await fireEvent.press(
        view.getByRole("radio", { name: t("scene." + camera) }),
      );
      expect(view.getByRole("adjustable").props.accessibilityValue.now).toBe(
        100,
      );
    }
    await fireEvent.press(view.getByRole("radio", { name: t("scene.hands") }));
    expect(view.getByText(t("scene.handsHint"))).toBeTruthy();
    await fireEvent.press(
      view.getByRole("button", { name: t("scene.return") }),
    );
    expect(view.getByRole("adjustable").props.accessibilityValue.now).toBe(50);
    expect(view.getByTestId("muscle-phase").props.children).toBe(
      t("muscle.eccentric"),
    );
    await fireEvent.press(
      view.getByRole("radio", { name: t("scene.diagram") }),
    );
    expect(view.getByTestId("muscle-overlay")).toBeTruthy();
  },
);

test("graphics initialization failure falls back to the diagram without losing the inspected pose", async () => {
  const view = await render(
    <LocaleProvider language="ja" setLanguage={() => {}}>
      <ExerciseDiagram type="chest-press" muscleTag="胸" />
    </LocaleProvider>,
  );
  await fireEvent.press(
    view.getByRole("button", { name: translate("ja", "scene.move") }),
  );
  const errors = jest.spyOn(console, "error").mockImplementation(() => {});
  await fireEvent(view.getByTestId("training-3d-canvas"), "contextCreate", {
    drawingBufferWidth: 320,
    drawingBufferHeight: 350,
  });
  errors.mockRestore();
  expect(view.getByRole("alert")).toBeTruthy();
  expect(view.getByTestId("muscle-overlay")).toBeTruthy();
  expect(view.getByRole("adjustable").props.accessibilityValue.now).toBe(100);
});
