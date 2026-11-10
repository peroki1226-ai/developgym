import React from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { EQUIPMENTS } from "../src/data/equipment";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { LocaleProvider, translate } from "../src/i18n";

// Inspect the props delivered to the real renderer, while exercising the real
// playback hook. Geometry/rendering is covered by spatialGuide and browser QA.
let model: any;
jest.mock("../src/components/Motion3DView", () => ({
  Motion3DView: (props: any) => {
    model = props;
    require("react").useEffect(() => { props.onReady(); }, [props.onReady]);
    return require("react").createElement(require("react-native").View, { testID: "existing-moving-model" });
  },
}));
let callbacks: Map<number, (time: number) => void>, now: number, nextId: number;
const originalAppState = Object.getOwnPropertyDescriptor(AppState, "currentState")!;
beforeEach(() => {
  callbacks = new Map(); now = 0; nextId = 0;
  Object.defineProperty(AppState, "currentState", { configurable: true, writable: true, value: "active" });
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation(callback => { callbacks.set(++nextId, callback); return nextId; });
  jest.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(id => { if (typeof id === "number") callbacks.delete(id); });
});
afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(AppState, "currentState", originalAppState);
});
async function frames(count: number) {
  await act(() => {
    for (let i = 0; i < count; i++) {
      now += 50;
      const queue = [...callbacks.values()]; callbacks.clear(); queue.forEach(callback => callback(now));
    }
  });
}
function lesson(language: "ja" | "en", type = "chest-press", beginner = true) {
  return <LocaleProvider language={language} setLanguage={() => {}}>
    <ExerciseDiagram type={type} muscleTag="胸" beginner={beginner} beginnerGuide={EQUIPMENTS.find(eq => eq.svgType === type)} />
  </LocaleProvider>;
}
const press = async (role: "button" | "radio", name: string) => fireEvent.press(screen.getByRole(role, { name }));

test.each(["ja", "en"] as const)("%s: the four steps control the existing model, then play each direction once at quarter speed", async language => {
  const t = (key: string, values = {}) => translate(language, key, values);
  await render(lesson(language));
  expect(screen.getAllByTestId("existing-moving-model")).toHaveLength(1);
  expect(model.focus).toBe("whole");
  expect(model.progress).toBe(0);
  expect(callbacks.size).toBe(0);
  expect(screen.queryByRole("radio", { name: t("scene.spatial") })).toBeNull();
  await press("button", t("learn.next", { 0: t("learn.hands") }));
  expect(model.focus).toBe("hands");
  expect(model.view).toBe("front");
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(t("learn.handsHint"));
  await press("button", t("learn.next", { 0: t("learn.feet") }));
  expect(model.focus).toBe("feet");
  await press("button", t("learn.next", { 0: t("learn.move") }));
  expect(model.focus).toBe("whole");
  expect(model.view).toBe("side");
  await press("button", t("learn.playWork"));
  await frames(21); // 1000 ms at .25x, still early in the working movement.
  expect(model.progress).toBeGreaterThan(0);
  expect(model.progress).toBeLessThan(.1);
  await press("button", t("learn.pause"));
  const paused = model.progress;
  await frames(30);
  expect(model.progress).toBe(paused);
  expect(callbacks.size).toBe(0);
  await press("button", t("learn.playWork"));
  await frames(160);
  expect(model.progress).toBe(1);
  expect(callbacks.size).toBe(0);
  await press("button", t("learn.playReturn"));
  expect(model.progress).toBe(1);
  await frames(80);
  expect(model.returning).toBe(true);
  expect(model.progress).toBeGreaterThan(0);
  expect(model.progress).toBeLessThan(1);
  await frames(140);
  expect(model.progress).toBe(0);
  expect(callbacks.size).toBe(0);
});

test("advanced view preserves the same model and manual controls; returning restores the guided step", async () => {
  const t = (key: string) => translate("ja", key);
  await render(lesson("ja"));
  await press("radio", t("learn.hands"));
  await press("button", t("learn.advanced"));
  expect(screen.queryByTestId("beginner-machine-lesson")).toBeNull();
  expect(screen.getByRole("radio", { name: t("scene.spatial") })).toBeTruthy();
  await press("button", t("motion.endPose"));
  expect(model.progress).toBe(1);
  await press("button", t("learn.simple"));
  expect(model.progress).toBe(0);
  expect(model.focus).toBe("hands");
  expect(screen.getByRole("radio", { name: t("learn.hands") }).props.accessibilityState.checked).toBe(true);
  expect(screen.getAllByTestId("existing-moving-model")).toHaveLength(1);
});

test.each([
  ["leg-extension", "learn.extensionFeet"], ["seated-leg-curl", "learn.curlFeet"],
  ["hip-adduction", "learn.adductionFeet"], ["hip-abduction", "learn.abductionFeet"],
  ["back-extension", "learn.backExtensionFeet"], ["assisted-pull-up", "scene.kneeHint"],
])("%s: foot placement instructions follow the machine", async (type, hint) => {
  await render(lesson("en", type));
  await press("radio", translate("en", "learn.feet"));
  expect(model.focus).toBe("feet");
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(translate("en", hint));
});

test("reduced motion keeps preparation and endpoint inspection usable without starting a clock", async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  const t = (key: string) => translate("ja", key);
  await render(lesson("ja"));
  await press("radio", t("learn.move"));
  expect(screen.getByRole("button", { name: t("learn.playWork") }).props.accessibilityState.disabled).toBe(true);
  await press("button", t("motion.endPose"));
  expect(model.progress).toBe(1);
  await press("button", t("motion.startPose"));
  expect(model.progress).toBe(0);
  expect(screen.getByText(t("motion.reducedHint"))).toBeTruthy();
  expect(callbacks.size).toBe(0);
});

test("switching machine or reentering beginner mode resets preparation and cancels playback", async () => {
  const t = (key: string) => translate("en", key);
  const app = await render(lesson("en"));
  await press("radio", t("learn.move"));
  await press("button", t("learn.playWork"));
  await frames(20);
  await app.rerender(lesson("en", "leg-press"));
  expect(model.type).toBe("leg-press");
  expect(model.progress).toBe(0);
  expect(screen.getByRole("radio", { name: t("learn.posture") }).props.accessibilityState.checked).toBe(true);
  expect(callbacks.size).toBe(0);
  await press("radio", t("machine.incline"));
  expect(model.variant).toBe("incline");
  await app.rerender(lesson("en", "leg-press", false));
  expect(screen.queryByTestId("beginner-machine-lesson")).toBeNull();
  await press("button", t("motion.endPose"));
  await app.rerender(lesson("en", "leg-press"));
  expect(model.progress).toBe(0);
  expect(model.variant).toBe("incline");
});

test("switching language translates the open lesson without changing its step or camera", async () => {
  const app = await render(lesson("ja"));
  await press("radio", translate("ja", "learn.hands"));
  await app.rerender(lesson("en"));
  expect(screen.getByRole("radio", { name: "Hands" }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(translate("en", "learn.handsHint"));
  expect(model.focus).toBe("hands");
  expect(model.progress).toBe(0);
  await app.rerender(lesson("ja"));
  expect(screen.getByRole("radio", { name: "手" }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(translate("ja", "learn.handsHint"));
});

test.each(["ja", "en"] as const)("%s: setup badges, cautions, breathing and instructions follow the actual animation phase", async language => {
  const t = (key: string, values = {}) => translate(language, key, values);
  const equipment = EQUIPMENTS[0];
  await render(lesson(language));
  expect(screen.getByTestId("beginner-setup-notes")).toBeTruthy();
  expect(screen.getByText(t("男性: ") + t(equipment.startWeightMale))).toBeTruthy();
  expect(screen.getByText(t("learn.femaleWeight", { 0: t(equipment.startWeightFemale) }))).toBeTruthy();
  for (const point of equipment.ngPoints) expect(screen.getByText(t("learn.caution", { 0: t(point) }))).toBeTruthy();
  await press("radio", t("learn.move"));
  expect(screen.queryByTestId("beginner-setup-notes")).toBeNull();
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(t(equipment.beginnerSteps[0]));
  expect(screen.getByTestId("beginner-breathing").props.children).toBe(t("learn.breath.start"));
  await press("button", t("learn.playWork"));
  await frames(21);
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(t(equipment.beginnerSteps[1]));
  expect(screen.getByTestId("beginner-breathing").props.children).toBe(t("learn.breath.work"));
  expect(screen.getByTestId("beginner-phase-overlay")).toBeTruthy();
  await frames(160);
  expect(screen.getByTestId("beginner-breathing").props.children).toBe(t("learn.breath.hold"));
  expect(model.progress).toBe(1);
  await press("button", t("learn.playReturn"));
  await frames(80);
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(t(equipment.beginnerSteps[2]));
  expect(screen.getByTestId("beginner-breathing").props.children).toBe(t("learn.breath.return"));
  await frames(160);
  expect(model.progress).toBe(0);
  expect(screen.getByTestId("beginner-breathing").props.children).toBe(t("learn.breath.start"));
});
