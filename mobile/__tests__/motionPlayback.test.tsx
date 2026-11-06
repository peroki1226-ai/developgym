import React from "react";
import { AccessibilityInfo, AppState, AppStateStatus } from "react-native";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { useExerciseMotion } from "../src/hooks/useExerciseMotion";
import { LocaleProvider, translate } from "../src/i18n";

let callbacks: Map<number, (time: number) => void>, nextId: number, now: number;
let appChange: (state: AppStateStatus) => void, reduceChange: (value: boolean) => void;
const appRemove = jest.fn(), reduceRemove = jest.fn();
const originalAppState = Object.getOwnPropertyDescriptor(AppState, "currentState")!;
beforeEach(() => {
  callbacks = new Map(); nextId = 0; now = 0;
  Object.defineProperty(AppState, "currentState", { configurable: true, writable: true, value: "active" });
  jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => { callbacks.set(++nextId, callback); return nextId; });
  jest.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => { if (typeof id === "number") callbacks.delete(id); });
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_, callback) => { reduceChange = callback; return { remove: reduceRemove }; });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, callback) => { appChange = callback; return { remove: appRemove }; });
});
afterEach(() => { jest.restoreAllMocks(); Object.defineProperty(AppState, "currentState", originalAppState); appRemove.mockClear(); reduceRemove.mockClear(); });
async function frames(count = 1, delta = 16) {
  await act(() => {
    for (let i = 0; i < count; i++) {
      now += delta;
      const queue = [...callbacks.values()]; callbacks.clear(); queue.forEach((callback) => callback(now));
    }
  });
}
test("play, pause, resume, manual seeking and half-speed advance actual pose progress", async () => {
  const { result, unmount } = await renderHook(() => useExerciseMotion(true));
  await frames(1);
  await frames(20, 50);
  expect(result.current.progress).toBeGreaterThan(0.5);
  await act(() => result.current.toggle());
  const paused = result.current.progress;
  await frames(30);
  expect(result.current.progress).toBe(paused);
  expect(callbacks.size).toBe(0);
  await act(() => result.current.seek(0));
  await act(() => { result.current.setSpeed(0.5); result.current.toggle(); });
  await frames(1); await frames(20, 50);
  expect(result.current.progress).toBeLessThan(paused);
  expect(result.current.progress).toBeGreaterThan(0);
  await act(() => result.current.seek(0.75));
  expect(result.current.progress).toBe(0.75);
  expect(result.current.running).toBe(false);
  await unmount();
});
test("background, inactive screen and unmount cancel frames without skipping forward on resume", async () => {
  const { result, rerender, unmount } = await renderHook(({ active }: { active: boolean }) => useExerciseMotion(active), { initialProps: { active: true } });
  await frames(8, 50);
  await act(() => appChange("background"));
  const position = result.current.progress;
  expect(callbacks.size).toBe(0);
  await act(() => appChange("active"));
  await frames(1, 100000);
  expect(result.current.progress).toBe(position);
  await rerender({ active: false });
  expect(callbacks.size).toBe(0);
  await rerender({ active: true });
  expect(callbacks.size).toBe(1);
  await unmount();
  expect(callbacks.size).toBe(0);
  expect(appRemove).toHaveBeenCalled(); expect(reduceRemove).toHaveBeenCalled();
});
test("reduced motion suppresses auto-play but still allows manual inspection", async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  const { result } = await renderHook(() => useExerciseMotion(true));
  expect(callbacks.size).toBe(0);
  await act(() => result.current.seek(0.5));
  expect(result.current.progress).toBe(0.5);
  expect(result.current.running).toBe(false);
  await act(() => reduceChange(false));
  await act(() => result.current.toggle());
  expect(callbacks.size).toBe(1);
  await act(() => reduceChange(true));
  expect(callbacks.size).toBe(0);
});
test("a late initial reduced-motion query cannot override a newer preference change", async () => {
  let resolve!: (enabled: boolean) => void;
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(new Promise((r) => { resolve = r; }));
  const { result } = await renderHook(() => useExerciseMotion(true));
  await act(() => { reduceChange(true); resolve(false); });
  expect(result.current.reduced).toBe(true); expect(callbacks.size).toBe(0);
});
test("compact cards never create an animation clock or subscribe to motion settings", async () => {
  await render(<ExerciseDiagram type="chest-press" muscleTag="胸" compact />);
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  expect(AccessibilityInfo.isReduceMotionEnabled).not.toHaveBeenCalled();
});
test("quarter speed is slower than half speed and preserves pose when speed changes", async () => {
  const { result } = await renderHook(() => useExerciseMotion(true));
  await act(() => result.current.setSpeed(0.25));
  await frames(1); await frames(20, 50);
  const quarter = result.current.progress;
  expect(quarter).toBeGreaterThan(0);
  expect(quarter).toBeLessThan(0.1);
  await act(() => result.current.setSpeed(0.5));
  await frames(1);
  expect(result.current.progress).toBe(quarter);
  await act(() => result.current.seek(0, "work"));
  await act(() => result.current.toggle());
  await frames(1); await frames(20, 50);
  expect(result.current.progress).toBeGreaterThan(quarter);
});
test("41 manual frames traverse both directions and handle rapid taps and boundaries", async () => {
  const { result } = await renderHook(() => useExerciseMotion(true));
  await act(() => { result.current.step(1); result.current.step(1); result.current.step(1); });
  expect(result.current.frameNumber).toBe(4);
  expect(result.current.progress).toBeCloseTo(0.15);
  expect(result.current.running).toBe(false);
  await act(() => { for (let i = 0; i < 17; i++) result.current.step(1); });
  expect(result.current.frameNumber).toBe(21);
  expect(result.current.phase).toBe("hold");
  await act(() => result.current.step(1));
  expect(result.current.progress).toBeCloseTo(0.95);
  expect(result.current.phase).toBe("return");
  await act(() => { for (let i = 0; i < 30; i++) result.current.step(1); });
  expect(result.current.frameNumber).toBe(41);
  expect(result.current.progress).toBe(0);
  expect(result.current.canStepForward).toBe(false);
  await act(() => { for (let i = 0; i < 50; i++) result.current.step(-1); });
  expect(result.current.frameNumber).toBe(1);
  expect(result.current.canStepBack).toBe(false);
});
test("resume after arbitrary forward and return seeking keeps the inspected pose", async () => {
  const { result } = await renderHook(() => useExerciseMotion(true));
  for (const direction of ["work", "return"] as const) for (const value of [0.13, 0.37, 0.82]) {
    await act(() => result.current.seek(value, direction));
    await act(() => result.current.toggle());
    await frames(1);
    expect(result.current.progress).toBeCloseTo(value, 9);
    expect(result.current.phase).toBe(direction);
    await frames(1, 16);
    if (direction === "return") expect(result.current.progress).toBeLessThan(value);
    else expect(result.current.progress).toBeGreaterThan(value);
  }
});
test.each(["ja", "en"] as const)("%s: controls inspect endpoints and adjustable position, then reset for a new machine", async (language) => {
  const t = (key: string) => translate(language, key);
  const view = (type: string) => <LocaleProvider language={language} setLanguage={() => {}}><ExerciseDiagram type={type} muscleTag="胸" /></LocaleProvider>;
  const app = await render(view("chest-press"));
  await fireEvent.press(screen.getByRole("button", { name: t("motion.endPose") }));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(100);
  await fireEvent(screen.getByRole("adjustable"), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(95);
  await fireEvent(screen.getByRole("adjustable"), "layout", { nativeEvent: { layout: { width: 200 } } });
  await fireEvent(screen.getByRole("adjustable"), "responderMove", { nativeEvent: { locationX: 50 } });
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(25);
  expect(screen.getByRole("button", { name: t("motion.play") })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("motion.startPose") }));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(0);
  await fireEvent.press(screen.getByRole("button", { name: t("motion.endPose") }));
  await fireEvent.press(screen.getByRole("radio", { name: t("motion.extraSlow") }));
  await app.rerender(view("leg-press"));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(0);
  expect(screen.getByRole("radio", { name: t("motion.extraSlow") }).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: t("motion.stepForward") }));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(5);
  const zoomLabel = t("teaching.zoomLabel").replace("{0}", t("膝の曲げ伸ばし"));
  expect(screen.getByRole("image", { name: zoomLabel })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("teaching.details") }));
  expect(screen.queryByRole("image", { name: zoomLabel })).toBeNull();
  expect(screen.getByTestId("muscle-contraction-panel")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("muscle.toggle") }));
  expect(screen.queryByTestId("muscle-contraction-panel")).toBeNull();
  expect(screen.queryByTestId("muscle-overlay")).toBeNull();
  expect(screen.getAllByRole("image")).toHaveLength(1);
  await fireEvent.press(screen.getByRole("button", { name: t("muscle.toggle") }));
  expect(screen.getByTestId("muscle-overlay")).toBeTruthy();
});
