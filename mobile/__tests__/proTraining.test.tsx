import React from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { MOTION_TYPES } from "../src/domain/exerciseMotion";
import { PRO_TRAINING, proTraining, effortAdvice, FinishMethod } from "../src/domain/proTraining";
import { ProTrainingCoach } from "../src/components/ProTrainingCoach";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { EQUIPMENTS } from "../src/data/equipment";
import { LocaleProvider, translate } from "../src/i18n";
let model: any;
jest.mock("../src/components/Motion3DView", () => ({ Motion3DView: (props: any) => { model = props; require("react").useEffect(() => props.onReady(), [props.onReady]); return null; } }));
const locale = (children: React.ReactNode, language: "ja" | "en" = "ja") => <LocaleProvider language={language} setLanguage={() => {}}>{children}</LocaleProvider>;
const originalAppState = Object.getOwnPropertyDescriptor(AppState, "currentState")!;
let frames: Map<number, (time: number) => void>, frameId: number;
beforeEach(() => {
  frames = new Map(); frameId = 0;
  Object.defineProperty(AppState, "currentState", { configurable: true, writable: true, value: "active" });
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  jest.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(id => { if (typeof id === "number") frames.delete(id); });
});
afterEach(() => { jest.restoreAllMocks(); Object.defineProperty(AppState, "currentState", originalAppState); });

test.each(MOTION_TYPES)("%s has specific form/return/compensation cues and complete pure-language advice", type => {
  const p = proTraining(type)!; expect(p).toBe(PRO_TRAINING[type]);
  for (const language of ["ja", "en"] as const) for (const key of [p.work, p.return, p.avoid, p.guard, `pro.method.${p.method}.body`, ...([0, 1, 2, 3] as const).map(r => effortAdvice(p.method, r))]) {
    const text = translate(language, key); expect(text).not.toBe(key); expect(text.length).toBeGreaterThan(8);
    expect(text.normalize("NFKC")).not.toMatch(language === "ja" ? /\p{Script=Latin}/u : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
  }
});
test("finish methods distinguish free loads, lower-body compounds and assistance; unknown IDs do not get an invented prescription", () => {
  expect(Object.keys(PRO_TRAINING)).toHaveLength(28);
  for (const id of ["barbell-bench-press", "power-rack", "dumbbell-heavy", "leg-press", "hack-squat"]) expect(proTraining(id)!.method).toBe("backoff");
  for (const id of ["chest-dip", "assisted-dip", "assisted-pull-up"]) expect(proTraining(id)!.method).toBe("assist");
  expect(proTraining("pec-fly")!.method).toBe("drop");
  expect(proTraining("unknown")).toBeUndefined(); expect(proTraining("constructor")).toBeUndefined();
});
test.each(["drop", "backoff", "assist"] as FinishMethod[])("%s: zero reserve switches to ending the set, not adding more work", async method => {
  const type = Object.entries(PRO_TRAINING).find(([, p]) => p.method === method)![0], t = (k: string) => translate("en", k);
  await render(locale(<ProTrainingCoach type={type} phase="start" canPlay running={false} onInspect={() => {}} onPause={() => {}}/>, "en"));
  await fireEvent.press(screen.getByRole("tab", { name: t("pro.tab.finish") }));
  await fireEvent.press(screen.getByRole("radio", { name: t("pro.reserve.0") }));
  expect(screen.getByTestId("pro-effort-advice").props.children).toBe(t(`pro.effort.stop.${method}`));
  expect(screen.getByTestId("pro-finish-method").props.children).toBe(t("pro.method.noExtra"));
  await fireEvent.press(screen.getByRole("radio", { name: t("pro.reserve.3") }));
  expect(screen.getByTestId("pro-effort-advice").props.children).toBe(t("pro.effort.more"));
});
test("changing display language retains reserve selection and translates the active advice", async () => {
  const props = { type: "pec-fly", phase: "return" as const, canPlay: true, running: false, onInspect: jest.fn(), onPause: jest.fn() };
  const app = await render(locale(<ProTrainingCoach {...props}/>));
  await fireEvent.press(screen.getByRole("tab", { name: translate("ja", "pro.tab.finish") }));
  await fireEvent.press(screen.getByRole("radio", { name: translate("ja", "pro.reserve.1") }));
  await app.rerender(locale(<ProTrainingCoach {...props}/>, "en"));
  expect(screen.getByRole("radio", { name: translate("en", "pro.reserve.1") }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId("pro-effort-advice").props.children).toBe(translate("en", "pro.effort.close"));
});
test("inspection controls use the existing clock callbacks and respect unavailable playback", async () => {
  const onInspect = jest.fn(), onPause = jest.fn(), t = (k: string) => translate("en", k);
  const props = { type: "barbell-bench-press", phase: "return" as const, canPlay: true, running: true, onInspect, onPause };
  const app = await render(locale(<ProTrainingCoach {...props}/>, "en"));
  expect(screen.getByTestId("pro-live-cue").props.children).toBe(t(PRO_TRAINING[props.type as "barbell-bench-press"].return));
  await fireEvent.press(screen.getByRole("button", { name: t("pro.model.work") })); await fireEvent.press(screen.getByRole("button", { name: t("pro.model.return") }));
  expect(onInspect.mock.calls).toEqual([["work"], ["return"]]);
  await fireEvent.press(screen.getByRole("button", { name: t("pro.model.pause") })); expect(onPause).toHaveBeenCalledTimes(1);
  await app.rerender(locale(<ProTrainingCoach {...props} canPlay={false} running={false}/>, "en"));
  await fireEvent.press(screen.getByRole("button", { name: t("pro.model.work") })); expect(onInspect).toHaveBeenCalledTimes(2);
});
test.each(["ja", "en"] as const)("%s: beginner stays simple; advanced mode opens the coach and changing exercise resets its effort state", async language => {
  const e = EQUIPMENTS.find(e => e.id === "barbell-bench-press")!, next = EQUIPMENTS.find(e => e.id === "pec-fly")!, t = (k: string) => translate(language, k);
  const view = (item: typeof e) => locale(<ExerciseDiagram type={item.id} label={item.name} muscleTag={item.muscleTag} beginner beginnerGuide={item}/>, language);
  const app = await render(view(e)); expect(screen.queryByTestId("pro-training-coach")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: t("learn.advanced") })); expect(screen.getByTestId("pro-training-coach")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("pro.model.return") })); expect(model.progress).toBe(1); expect(model.returning).toBe(true); expect(model.focus).toBe("muscles");
  expect(frames.size).toBe(1);
  await fireEvent.press(screen.getByRole("button", { name: t("pro.model.pause") }));
  expect(frames.size).toBe(0);
  await fireEvent.press(screen.getByRole("tab", { name: t("pro.tab.finish") })); await fireEvent.press(screen.getByRole("radio", { name: t("pro.reserve.0") }));
  await app.rerender(view(next)); expect(screen.queryByTestId("pro-training-coach")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: t("learn.advanced") })); await fireEvent.press(screen.getByRole("tab", { name: t("pro.tab.finish") }));
  expect(screen.getByRole("radio", { name: t("pro.reserve.2") }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId("pro-finish-method").props.children).toBe(t("pro.method.drop.body"));
});
