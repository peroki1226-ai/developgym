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
  await act(() => { result.current.toggleSlow(); result.current.toggle(); });
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
test.each(["ja", "en"] as const)("%s: controls inspect endpoints and adjustable position, then reset for a new machine", async (language) => {
  const t = (key: string) => translate(language, key);
  const view = (type: string) => <LocaleProvider language={language} setLanguage={() => {}}><ExerciseDiagram type={type} muscleTag="胸" /></LocaleProvider>;
  const app = await render(view("chest-press"));
  await fireEvent.press(screen.getByRole("button", { name: t("motion.endPose") }));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(100);
  await fireEvent(screen.getByRole("adjustable"), "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(90);
  await fireEvent(screen.getByRole("adjustable"), "layout", { nativeEvent: { layout: { width: 200 } } });
  await fireEvent(screen.getByRole("adjustable"), "responderMove", { nativeEvent: { locationX: 50 } });
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(25);
  expect(screen.getByRole("button", { name: t("motion.play") })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: t("motion.startPose") }));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(0);
  await fireEvent.press(screen.getByRole("button", { name: t("motion.endPose") }));
  await app.rerender(view("leg-press"));
  expect(screen.getByRole("adjustable").props.accessibilityValue.now).toBe(0);
});
