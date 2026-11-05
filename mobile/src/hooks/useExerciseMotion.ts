import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { clampProgress, sampleMotion } from "../domain/exerciseMotion";

export function useExerciseMotion(active: boolean) {
  const [requested, setRequested] = useState(true);
  const [slow, setSlow] = useState(false);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [foreground, setForeground] = useState((AppState.currentState ?? "active") === "active");
  const [frame, setFrame] = useState(() => sampleMotion(0));
  const elapsed = useRef(0);
  const running = active && foreground && reduced === false && requested;

  useEffect(() => {
    let alive = true, changed = false;
    const reduceSub = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      changed = true;
      if (alive) setReduced(value);
    });
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled()).then((value) => {
      if (alive && !changed) setReduced(typeof value === "boolean" ? value : true);
    }).catch(() => { if (alive && !changed) setReduced(true); });
    const appSub = AppState.addEventListener("change", (value) => { if (alive) setForeground(value === "active"); });
    return () => { alive = false; reduceSub.remove(); appSub.remove(); };
  }, []);

  useEffect(() => {
    if (!running) return;
    let previous: number | null = null, alive = true, id: number;
    const tick = (now: number) => {
      if (!alive) return;
      // Do not jump ahead after a delayed frame or a background suspension.
      const delta = previous === null ? 0 : Math.min(64, Math.max(0, now - previous));
      previous = now;
      elapsed.current += delta * (slow ? 0.5 : 1);
      setFrame(sampleMotion(elapsed.current));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(id); };
  }, [running, slow]);

  function seek(value: number) {
    const progress = clampProgress(value);
    setRequested(false);
    elapsed.current = progress * 1800;
    setFrame({ progress, phase: progress === 0 ? "start" : progress === 1 ? "hold" : "work" });
  }
  return {
    ...frame, running, slow, reduced: reduced === true,
    canPlay: active && foreground && reduced === false,
    toggle: () => setRequested((value) => !value),
    toggleSlow: () => setSlow((value) => !value),
    seek,
  };
}
