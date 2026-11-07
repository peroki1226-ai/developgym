import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import * as THREE from "three";
import { MOTION_TYPES } from "../src/domain/exerciseMotion";
import { muscleSpec } from "../src/domain/muscleMotion";
import { muscleLoadLesson } from "../src/domain/muscleLoad";
import { createTrainingScene } from "../src/three/trainingScene";
import { MuscleContractionPanel } from "../src/components/MuscleContractionPanel";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { LocaleProvider, translate } from "../src/i18n";

jest.mock("../src/components/Motion3DView", () => ({
  Motion3DView: jest.fn((props) => {
    const React = require("react");
    React.useEffect(() => props.onReady(), [props.onReady]);
    return React.createElement(require("react-native").View, {
      testID: "lesson-model",
      muscle: props.muscle,
    });
  }),
}));

test.each(MOTION_TYPES)(
  "%s: distinguish fibre motion from muscle pull and external resistance in both languages",
  (type) => {
    for (const muscle of muscleSpec(type).primary) {
      const work = muscleLoadLesson(type, muscle, 0.5, "work"),
        back = muscleLoadLesson(type, muscle, 0.5, "return");
      expect(work.frame.length).toBe(back.frame.length);
      expect(work.muscleForce).toBe("inward");
      expect(back.muscleForce).toBe("inward");
      expect(work.resistance).toBe("outward");
      expect(back.resistance).toBe("outward");
      expect(work.movement).toBe(work.frame.isometric ? "still" : "inward");
      expect(back.movement).toBe(back.frame.isometric ? "still" : "outward");
      for (const lang of ["ja", "en"] as const) {
        for (const state of [work, back])
          for (const key of [state.action, state.source, state.explanation]) {
            const text = translate(lang, key);
            expect(text).not.toBe(key);
            expect(text).not.toMatch(
              lang === "ja" ? /[A-Za-z]/ : /[\u3040-\u30ff\u3400-\u9fff]/,
            );
          }
      }
    }
  },
);

test("assistance is distinguished from free weights, invalid muscles fall back, and stabilizers do not change length", () => {
  expect(muscleLoadLesson("assisted-pull-up", "lats", 0.5, "work").source).toBe(
    "load.source.assist",
  );
  expect(
    muscleLoadLesson("incline-smith", "upperChest", 0.5, "work").source,
  ).toBe("load.source.gravity");
  expect(muscleLoadLesson("leg-press", "biceps", 0.5, "work").muscle).toBe(
    "quads",
  );
  const a = muscleLoadLesson("back-extension", "erectors", 0, "work"),
    b = muscleLoadLesson("back-extension", "erectors", 1, "return");
  expect(a.frame).toEqual(b.frame);
  expect(a.state).toBe("stabilizing");
});

test.each(["ja", "en"] as const)(
  "%s: comparison buttons drive the model, and force arrows keep pulling during return",
  async (language) => {
    const t = (key: string) => translate(language, key),
      inspect = jest.fn(),
      select = jest.fn(),
      slow = jest.fn();
    const wrap = (phase: "work" | "return") => (
      <LocaleProvider language={language} setLanguage={() => {}}>
        <MuscleContractionPanel
          type="leg-press"
          progress={0.5}
          phase={phase}
          onInspect={inspect}
          onSelect={select}
          onSlowPlay={slow}
          canPlay
        />
      </LocaleProvider>
    );
    const view = await render(wrap("work"));
    await fireEvent.press(
      view.getByRole("radio", { name: t("muscle.glutes") }),
    );
    expect(select).toHaveBeenCalledWith("glutes");
    await fireEvent.press(
      view.getByRole("button", { name: t("load.lengthen") }),
    );
    expect(inspect).toHaveBeenCalledWith("return");
    await fireEvent.press(
      view.getByRole("button", { name: t("load.slowPlay") }),
    );
    expect(slow).toHaveBeenCalledTimes(1);
    const arrowCoordinates = () =>
      view
        .getByTestId("muscle-pull-arrows")
        .props.children.map((node: any) => [
          node.props.a,
          node.props.b,
          node.props.y,
        ]);
    const arrows = arrowCoordinates();
    await view.rerender(wrap("return"));
    expect(view.getByText(t("load.returnTension"))).toBeTruthy();
    expect(arrowCoordinates()).toEqual(arrows);
    await fireEvent.press(
      view.getByRole("button", { name: t("load.details") }),
    );
    expect(view.getByTestId("sarcomere-filaments")).toBeTruthy();
  },
);

test("muscle selection drives both 3D focus and SVG selection without resetting the pose", async () => {
  const view = await render(
    <LocaleProvider language="ja" setLanguage={() => {}}>
      <ExerciseDiagram type="leg-press" muscleTag="legs" />
    </LocaleProvider>,
  );
  await fireEvent.press(
    view.getByRole("button", { name: translate("ja", "load.lengthen") }),
  );
  const slider = () =>
    view.getByRole("adjustable", { name: translate("ja", "motion.position") });
  expect(slider().props.accessibilityValue.now).toBe(100);
  await fireEvent.press(
    view.getByRole("radio", { name: translate("ja", "muscle.glutes") }),
  );
  expect(slider().props.accessibilityValue.now).toBe(100);
  expect(view.getByTestId("lesson-model").props.muscle).toBe("glutes");
  await fireEvent.press(
    view.getByRole("radio", { name: translate("ja", "scene.diagram") }),
  );
  expect(view.getByTestId("muscle-overlay")).toBeTruthy();
  expect(view.queryAllByTestId(/muscle-region-quads/)).toHaveLength(0);
  expect(view.queryAllByTestId(/muscle-region-glutes/).length).toBeGreaterThan(
    0,
  );
});

test("renderer highlights only a valid selected muscle and fits that muscle group", () => {
  const fake = {
    setPixelRatio: jest.fn(),
    setSize: jest.fn(),
    shadowMap: {},
    render: jest.fn(),
    dispose: jest.fn(),
  };
  const scene = createTrainingScene(
    fake as unknown as THREE.WebGLRenderer,
    320,
    350,
  );
  const input = {
    type: "back-extension",
    progress: 0.5,
    view: "back" as const,
    focus: "muscles" as const,
    anatomy: true,
    transparent: true,
  };
  expect(scene.draw({ ...input, muscle: "erectors" })!.muscles).toEqual([
    "erectors",
  ]);
  expect(scene.draw({ ...input, muscle: "glutes" })!.muscles).toEqual([
    "glutes",
  ]);
  expect(scene.draw({ ...input, muscle: "biceps" })!.muscles).toEqual(
    muscleSpec("back-extension").primary,
  );
  scene.dispose();
});
