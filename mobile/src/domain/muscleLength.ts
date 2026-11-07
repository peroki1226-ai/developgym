import { clampProgress } from "./exerciseMotion";

/** Deliberately exaggerated educational distances, not measured muscle lengths. */
export function muscleLengthPicture(progress: number, stabilizing = false) {
  const p = stabilizing ? 0.45 : clampProgress(progress);
  return {
    start: 42,
    end: 278 - 110 * p,
    referenceEnd: 278,
    radius: 19 + 15 * p,
    distance: 236 - 110 * p,
  };
}
