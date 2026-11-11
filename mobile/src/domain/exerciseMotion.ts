/** Local schematic kinematics; no network assets or exercise records are involved. */
export type Point = readonly [number, number];
export type Limb = readonly [Point, Point, Point];
export type MotionPhase = "start" | "work" | "hold" | "return";
export type MotionFrame = { progress: number; phase: MotionPhase };
export type PlaybackSpeed = 1 | 0.5 | 0.25;
export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [1, 0.5, 0.25];
export const MOTION_FRAME_COUNT = 41;
export const MOTION_CYCLE_MS = 5100;
export const MOTION_TYPES = [
  "chest-press", "pec-fly", "incline-smith", "cable-machine",
  "lat-pulldown", "seated-row", "shoulder-press", "dumbbell-heavy",
  "leg-press", "hack-squat", "power-rack", "abdominal-crunch",
  "leg-extension", "seated-leg-curl", "hip-abduction", "hip-adduction",
  "seated-calf-raise", "lateral-raise", "preacher-curl", "triceps-pushdown",
  "assisted-pull-up", "assisted-dip", "back-extension", "rear-delt-fly",
  "chest-dip", "incline-hammer-press",
] as const;
export type MotionType = typeof MOTION_TYPES[number];

export function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
export function motionType(type: string): MotionType {
  return MOTION_TYPES.includes(type as MotionType) ? type as MotionType : "abdominal-crunch";
}
export function sampleMotion(elapsed: number): MotionFrame {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) % MOTION_CYCLE_MS : 0;
  const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;
  if (time === 0 || time >= 4650) return { progress: 0, phase: "start" };
  if (time < 1800) return { progress: ease(time / 1800), phase: "work" };
  if (time < 2250) return { progress: 1, phase: "hold" };
  return { progress: 1 - ease((time - 2250) / 2400), phase: "return" };
}
/** Invert the easing so inspection -> playback never jumps to a different pose. */
export function elapsedForProgress(value: number, direction: "work" | "return") {
  const p = clampProgress(value);
  const inverseEase = (x: number) => Math.acos(1 - 2 * x) / Math.PI;
  return direction === "return" ? 2250 + inverseEase(1 - p) * 2400 : inverseEase(p) * 1800;
}
export function framePosition(frame: MotionFrame, elapsed: number) {
  if (frame.phase === "return") return 20 + (1 - frame.progress) * 20;
  if (frame.phase === "hold") return 20;
  if (frame.phase === "start") return elapsed % MOTION_CYCLE_MS >= 4650 ? 40 : 0;
  return frame.progress * 20;
}
export function inspectionFrame(value: number): { frame: MotionFrame; elapsed: number } {
  const index = Math.max(0, Math.min(40, Number.isFinite(value) ? Math.round(value) : 0));
  if (index === 0 || index === 40) return { frame: { progress: 0, phase: "start" }, elapsed: index === 40 ? 4650 : 0 };
  if (index === 20) return { frame: { progress: 1, phase: "hold" }, elapsed: 1800 };
  const direction = index > 20 ? "return" : "work";
  const progress = index > 20 ? (40 - index) / 20 : index / 20;
  return { frame: { progress, phase: direction }, elapsed: elapsedForProgress(progress, direction) };
}
export const motionAction: Record<MotionType, string> = {
  "chest-dip": "motion.push", "incline-hammer-press": "motion.push",
  "chest-press": "motion.push", "pec-fly": "motion.close",
  "incline-smith": "motion.push", "cable-machine": "motion.close",
  "lat-pulldown": "motion.pull", "seated-row": "motion.pull",
  "shoulder-press": "motion.push", "dumbbell-heavy": "motion.push",
  "leg-press": "motion.push", "hack-squat": "motion.stand",
  "power-rack": "motion.stand", "abdominal-crunch": "motion.curl",
  "leg-extension": "motion.extendKnees", "seated-leg-curl": "motion.bendKnees",
  "hip-abduction": "motion.openLegs", "hip-adduction": "motion.closeLegs",
  "seated-calf-raise": "motion.raiseHeels", "lateral-raise": "motion.raiseArms",
  "preacher-curl": "motion.bendElbows", "triceps-pushdown": "motion.extendElbows",
  "assisted-pull-up": "motion.pull", "assisted-dip": "motion.push",
  "back-extension": "motion.raiseTorso", "rear-delt-fly": "motion.openArms",
};
const mix = (a: Point, b: Point, p: number): Point => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
const offset = (a: Point, x: number, y: number): Point => [a[0] + x, a[1] + y];
const rotate = (origin: Point, vector: Point, degrees: number): Point => {
  const r = degrees * Math.PI / 180;
  return offset(origin, vector[0] * Math.cos(r) - vector[1] * Math.sin(r), vector[0] * Math.sin(r) + vector[1] * Math.cos(r));
};
/** Two bones of fixed length. Clamp unreachable targets before solving the joint. */
export function solveLimb(a: Point, target: Point, upper: number, lower: number, bend = 1): Limb {
  const dx = target[0] - a[0], dy = target[1] - a[1];
  const requested = Math.hypot(dx, dy);
  const d = Math.min(upper + lower - 0.02, Math.max(Math.abs(upper - lower) + 0.02, requested));
  const ux = requested > 0 ? dx / requested : 1, uy = requested > 0 ? dy / requested : 0;
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return [a, [a[0] + ux * along - uy * height * bend, a[1] + uy * along + ux * height * bend], [a[0] + ux * d, a[1] + uy * d]];
}
export interface ExercisePose {
  head: Point;
  shoulder: Point;
  hip: Point;
  arms: Limb[];
  legs: Limb[];
  grips: Point[];
  camera: "side" | "front" | "top";
  highlight: readonly [Point, Point];
  spine?: readonly Point[];
}
export function exercisePose(rawType: string, rawProgress: number): ExercisePose {
  const type = motionType(rawType), p = clampProgress(rawProgress);
  let head: Point = [51, 29], shoulder: Point = [54, 40], hip: Point = [54, 65];
  let arms: Limb[] = [], legs: Limb[] = [[[54, 65], [75, 66], [78, 86]]];
  let camera: ExercisePose["camera"] = "side";
  let spine: Point[] | undefined;
  switch (type) {
    case "chest-press": {
      const hand = rotate([65, 18], [30, 0], 90 - p * 62);
      arms = [solveLimb(shoulder, hand, 20, 19)];
      break;
    }
    case "pec-fly":
    case "cable-machine":
    case "rear-delt-fly": {
      // Overhead projection keeps the slight elbow bend constant during adduction.
      camera = "top"; head = [60, 29]; shoulder = [60, 38]; hip = [60, 47]; legs = [];
      const sweep = type === "rear-delt-fly" ? 1 - p : p;
      arms = [
        [[48, 38], rotate([48, 38], [-22, 0], -90 * sweep), rotate([48, 38], [-36, 8], -90 * sweep)],
        [[72, 38], rotate([72, 38], [22, 0], 90 * sweep), rotate([72, 38], [36, 8], 90 * sweep)],
      ];
      break;
    }
    case "incline-hammer-press":
    case "incline-smith":
    case "dumbbell-heavy":
      head = [37, 38]; shoulder = [46, 48]; hip = [63, 68];
      legs = [[hip, [79, 67], [84, 86]]];
      arms = [solveLimb(shoulder, type === "incline-smith" ? [65, 48 - 33 * p] : mix([69, 49], [63, 14], p), 20, 19)];
      break;
    case "lat-pulldown":
      camera = "front"; head = [60, 33]; shoulder = [60, 44]; hip = [60, 65];
      arms = [solveLimb([50, 43], [33, 10 + 34 * p], 19, 19, -1), solveLimb([70, 43], [87, 10 + 34 * p], 19, 19, 1)];
      legs = [[[54, 65], [45, 75], [42, 87]], [[66, 65], [75, 75], [78, 87]]];
      break;
    case "seated-row":
      head = [36, 31]; shoulder = [37, 42]; hip = [38, 65];
      legs = [[hip, [59, 69], [77, 79]]];
      arms = [solveLimb(shoulder, mix([76, 45], [46, 54], p), 21, 19)];
      break;
    case "shoulder-press":
      head = [50, 33]; shoulder = [52, 44]; hip = [52, 65];
      legs = [[hip, [71, 67], [77, 87]]];
      arms = [solveLimb(shoulder, rotate([26, 34], [41, 0], 10 - 53 * p), 20, 19)];
      break;
    case "leg-press":
      head = [24, 36]; shoulder = [29, 46]; hip = [44, 69];
      arms = [solveLimb(shoulder, [48, 60], 18, 16)];
      legs = [solveLimb(hip, mix([73, 48], [90, 31], p), 30, 30, -1)];
      break;
    case "hack-squat":
      hip = mix([49, 58], [64.5, 42.5], p); shoulder = offset(hip, 18, -20); head = offset(shoulder, 6, -9);
      arms = [solveLimb(shoulder, offset(shoulder, -9, 9), 15, 14)];
      legs = [solveLimb(hip, [34, 80], 24, 25, 1)];
      break;
    case "power-rack":
      camera = "front"; hip = [60, 66 - 27 * p]; shoulder = offset(hip, 0, -20); head = offset(shoulder, 0, -11);
      arms = [solveLimb(offset(shoulder, -9, 0), [36, shoulder[1] - 3], 14, 14, -1), solveLimb(offset(shoulder, 9, 0), [84, shoulder[1] - 3], 14, 14, 1)];
      legs = [solveLimb(offset(hip, -6, 0), [42, 87], 25, 25, 1), solveLimb(offset(hip, 6, 0), [78, 87], 25, 25, -1)];
      break;
    case "abdominal-crunch": {
      hip = [51, 65];
      const lumbar: Point = [51, 55];
      const mid = rotate(lumbar, [0, -9], 25 * p);
      shoulder = rotate(mid, [0, -9], 45 * p);
      head = rotate(shoulder, [0, -10], 50 * p);
      spine = [hip, lumbar, mid, shoulder];
      arms = [solveLimb(shoulder, offset(shoulder, 12, 6), 15, 14)];
      legs = [[hip, [69, 66], [74, 87]]];
      break;
    }
    case "leg-extension":
    case "seated-leg-curl": {
      head = [43, 30]; shoulder = [46, 41]; hip = [47, 64];
      const knee: Point = [73, 64];
      const angle = type === "leg-extension" ? 90 - 78 * p : 12 + 103 * p;
      legs = [[hip, knee, rotate(knee, [24, 0], angle)]];
      arms = [solveLimb(shoulder, [53, 61], 18, 16)];
      break;
    }
    case "hip-abduction":
    case "hip-adduction": {
      camera = "front"; head = [60, 23]; shoulder = [60, 34]; hip = [60, 52];
      const angle = 15 + 40 * (type === "hip-abduction" ? p : 1 - p);
      const left: Point = [54, 52], right: Point = [66, 52];
      const lk = rotate(left, [0, 18], angle), rk = rotate(right, [0, 18], -angle);
      legs = [[left, lk, offset(lk, 0, 18)], [right, rk, offset(rk, 0, 18)]];
      arms = [solveLimb([50, 34], [45, 54], 18, 16), solveLimb([70, 34], [75, 54], 18, 16, -1)];
      break;
    }
    case "seated-calf-raise":
      head = [38, 29]; shoulder = [41, 40]; hip = [44, 64];
      legs = [solveLimb(hip, rotate([82, 88], [-12, -2], 30 * p), 25, 23, -1)];
      arms = [solveLimb(shoulder, [61, 57], 19, 17)];
      break;
    case "lateral-raise":
      camera = "front"; head = [60, 24]; shoulder = [60, 36]; hip = [60, 61];
      arms = [
        [[49, 38], rotate([49, 38], [0, 19], 10 + 65 * p), rotate([49, 38], [-3, 34], 10 + 65 * p)],
        [[71, 38], rotate([71, 38], [0, 19], -10 - 65 * p), rotate([71, 38], [3, 34], -10 - 65 * p)],
      ];
      legs = [[[54, 61], [46, 73], [44, 88]], [[66, 61], [74, 73], [76, 88]]];
      break;
    case "preacher-curl":
      head = [39, 27]; shoulder = [42, 38]; hip = [42, 65];
      arms = [[shoulder, [61, 54], rotate([61, 54], [23, 0], 30 - 110 * p)]];
      legs = [[hip, [68, 67], [76, 86]]];
      break;
    case "triceps-pushdown":
      head = [43, 26]; shoulder = [45, 38]; hip = [45, 64];
      arms = [[shoulder, [49, 57], rotate([49, 57], [19, 0], -20 + 80 * p)]];
      legs = [[hip, [43, 75], [42, 88]], [hip, [56, 76], [62, 88]]];
      break;
    case "assisted-pull-up":
      camera = "front"; shoulder = [60, 42 - 17 * p]; head = offset(shoulder, 0, -11); hip = offset(shoulder, 0, 23);
      arms = [solveLimb(offset(shoulder, -10, 0), [33, 10], 19, 19, -1), solveLimb(offset(shoulder, 10, 0), [87, 10], 19, 19, 1)];
      legs = [[offset(hip, -6, 0), [46, 78 - 17 * p], [59, 83 - 17 * p]], [offset(hip, 6, 0), [74, 78 - 17 * p], [61, 83 - 17 * p]]];
      break;
    case "chest-dip":
    case "assisted-dip":
      shoulder = [52, 42 - 22 * p]; head = offset(shoulder, 0, -11); hip = offset(shoulder, 0, 24);
      arms = [solveLimb(shoulder, [65, 48], 16, 15)];
      legs = [[hip, offset(hip, 16, 12), offset(hip, 26, 6)]];
      break;
    case "back-extension": {
      hip = [62, 58]; const angle = 170 + 40 * p;
      shoulder = rotate(hip, [27, 0], angle); head = rotate(hip, [37, 0], angle);
      arms = [[shoulder, rotate(hip, [23, 6], angle), rotate(hip, [28, 3], angle)]];
      legs = [[hip, [80, 68], [94, 83]]];
      break;
    }
  }
  const highlight: ExercisePose["highlight"] = type === "seated-calf-raise" ? [legs[0][1], legs[0][2]]
    : ["leg-press", "hack-squat", "power-rack", "leg-extension", "seated-leg-curl", "hip-abduction", "hip-adduction"].includes(type)
    ? [legs[0][0], legs[0][1]]
    : ["preacher-curl", "triceps-pushdown", "assisted-dip", "lateral-raise"].includes(type) ? [arms[0][0], arms[0][1]]
    : ["lat-pulldown", "seated-row", "abdominal-crunch", "back-extension", "assisted-pull-up"].includes(type)
      ? [mix(shoulder, hip, 0.3), mix(shoulder, hip, 0.75)]
      : [offset(shoulder, -5, 3), offset(shoulder, 5, 3)];
  return { head, shoulder, hip, arms, legs, grips: arms.map((arm) => arm[2]), camera, highlight, spine };
}

/** The moving body/equipment contact used by the trajectory and direction cue. */
export function motionContact(type: string, pose: ExercisePose): Point {
  if (type === "lateral-raise") return pose.arms[0][1];
  if (["leg-press", "leg-extension", "seated-leg-curl", "seated-calf-raise"].includes(type)) return pose.legs[0][2];
  if (["hip-abduction", "hip-adduction"].includes(type)) return pose.legs[0][1];
  if (["hack-squat", "power-rack", "assisted-pull-up", "assisted-dip", "chest-dip", "back-extension"].includes(type)) return pose.shoulder;
  return pose.grips[0];
}
