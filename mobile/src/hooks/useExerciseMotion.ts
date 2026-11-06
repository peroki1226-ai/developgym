import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import {
  clampProgress,
  elapsedForProgress,
  framePosition,
  inspectionFrame,
  MotionFrame,
  MOTION_CYCLE_MS,
  MOTION_FRAME_COUNT,
  PLAYBACK_SPEEDS,
  PlaybackSpeed,
  sampleMotion,
} from "../domain/exerciseMotion";

export function useExerciseMotion(
  active: boolean,
  resetKey?: string,
  autoPlay = true,
) {
  const [requested, setRequested] = useState(autoPlay);
  const [speed, setSpeedValue] = useState<PlaybackSpeed>(1);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [foreground, setForeground] = useState(
    (AppState.currentState ?? "active") === "active",
  );
  const [frame, setFrame] = useState<MotionFrame>(() => sampleMotion(0));
  const current = useRef(frame);
  const elapsed = useRef(0);
  const running = active && foreground && reduced === false && requested;
  function publish(next: MotionFrame) {
    current.current = next;
    setFrame(next);
  }

  useLayoutEffect(() => {
    elapsed.current = 0;
    publish(sampleMotion(0));
    setRequested(autoPlay);
  }, [resetKey, autoPlay]);

  useEffect(() => {
    let alive = true,
      changed = false;
    const reduceSub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        changed = true;
        if (alive) setReduced(value);
      },
    );
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then((value) => {
        if (alive && !changed)
          setReduced(typeof value === "boolean" ? value : true);
      })
      .catch(() => {
        if (alive && !changed) setReduced(true);
      });
    const appSub = AppState.addEventListener("change", (value) => {
      if (alive) setForeground(value === "active");
    });
    return () => {
      alive = false;
      reduceSub.remove();
      appSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    let previous: number | null = null,
      alive = true,
      id: number;
    const tick = (now: number) => {
      if (!alive) return;
      const delta =
        previous === null ? 0 : Math.min(64, Math.max(0, now - previous));
      previous = now;
      elapsed.current += delta * speed;
      publish(sampleMotion(elapsed.current));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(id);
    };
  }, [running, speed, resetKey]);

  function seek(value: number, direction?: "work" | "return") {
    const progress = clampProgress(value);
    const returning = direction
      ? direction === "return"
      : current.current.phase === "return" ||
        (current.current.phase === "start" &&
          elapsed.current % MOTION_CYCLE_MS >= 4650);
    setRequested(false);
    elapsed.current =
      progress === 0
        ? returning
          ? 4650
          : 0
        : progress === 1
          ? 1800
          : elapsedForProgress(progress, returning ? "return" : "work");
    publish({
      progress,
      phase:
        progress === 0
          ? "start"
          : progress === 1
            ? "hold"
            : returning
              ? "return"
              : "work",
    });
  }
  function step(direction: -1 | 1) {
    const position = framePosition(current.current, elapsed.current);
    const next =
      direction === 1
        ? Math.floor(position + 1e-7) + 1
        : Math.ceil(position - 1e-7) - 1;
    const selected = inspectionFrame(next);
    setRequested(false);
    elapsed.current = selected.elapsed;
    publish(selected.frame);
  }
  const position = framePosition(frame, elapsed.current);
  return {
    ...frame,
    running,
    speed,
    reduced: reduced === true,
    canPlay: active && foreground && reduced === false,
    frameNumber: Math.round(position) + 1,
    frameCount: MOTION_FRAME_COUNT,
    canStepBack: position > 1e-7,
    canStepForward: position < 40 - 1e-7,
    toggle: () => setRequested((value) => !value),
    setSpeed: (value: PlaybackSpeed) => {
      if (PLAYBACK_SPEEDS.includes(value)) setSpeedValue(value);
    },
    seek,
    step,
  };
}
