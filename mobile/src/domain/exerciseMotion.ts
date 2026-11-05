/** Local schematic kinematics; no network assets or exercise records are involved. */
export type Point = readonly [number, number];
export type Limb = readonly [Point, Point, Point];
export type MotionPhase = "start" | "work" | "hold" | "return";
export const MOTION_CYCLE_MS = 5100;
export const MOTION_TYPES = [
  "chest-press", "pec-fly", "incline-smith", "cable-machine",
  "lat-pulldown", "seated-row", "shoulder-press", "dumbbell-heavy",
  "leg-press", "hack-squat", "power-rack", "abdominal-crunch",
] as const;
export type MotionType = typeof MOTION_TYPES[number];

export function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
export function motionType(type: string): MotionType {
  return MOTION_TYPES.includes(type as MotionType) ? type as MotionType : "abdominal-crunch";
}
export function sampleMotion(elapsed: number): { progress: number; phase: MotionPhase } {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) % MOTION_CYCLE_MS : 0;
  const ease = (p: number) => (1 - Math.cos(Math.PI * p)) / 2;
  if (time === 0 || time >= 4650) return { progress: 0, phase: "start" };
  if (time < 1800) return { progress: ease(time / 1800), phase: "work" };
  if (time < 2250) return { progress: 1, phase: "hold" };
  return { progress: 1 - ease((time - 2250) / 2400), phase: "return" };
}
export const motionAction: Record<MotionType, string> = {
  "chest-press": "motion.push", "pec-fly": "motion.close",
  "incline-smith": "motion.push", "cable-machine": "motion.close",
  "lat-pulldown": "motion.pull", "seated-row": "motion.pull",
  "shoulder-press": "motion.push", "dumbbell-heavy": "motion.push",
  "leg-press": "motion.push", "hack-squat": "motion.stand",
  "power-rack": "motion.stand", "abdominal-crunch": "motion.curl",
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
}
export function exercisePose(rawType: string, rawProgress: number): ExercisePose {
  const type = motionType(rawType), p = clampProgress(rawProgress);
  let head: Point = [51, 29], shoulder: Point = [54, 40], hip: Point = [54, 65];
  let arms: Limb[] = [], legs: Limb[] = [[[54, 65], [75, 66], [78, 86]]];
  let camera: ExercisePose["camera"] = "side";
  switch (type) {
    case "chest-press": {
      const hand = rotate([65, 18], [30, 0], 90 - p * 62);
      arms = [solveLimb(shoulder, hand, 20, 19)];
      break;
    }
    case "pec-fly":
    case "cable-machine": {
      // Overhead projection keeps the slight elbow bend constant during adduction.
      camera = "top"; head = [60, 29]; shoulder = [60, 38]; hip = [60, 47]; legs = [];
      arms = [
        [[48, 38], rotate([48, 38], [-22, 0], -90 * p), rotate([48, 38], [-36, 8], -90 * p)],
        [[72, 38], rotate([72, 38], [22, 0], 90 * p), rotate([72, 38], [36, 8], 90 * p)],
      ];
      break;
    }
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
    case "abdominal-crunch":
      hip = [51, 65]; shoulder = rotate(hip, [27, 0], -90 + 38 * p); head = rotate(hip, [38, 0], -90 + 38 * p);
      arms = [solveLimb(shoulder, offset(shoulder, 12, 6), 15, 14)];
      legs = [[hip, [69, 66], [74, 87]]];
      break;
  }
  const highlight: ExercisePose["highlight"] = type === "leg-press" || type === "hack-squat" || type === "power-rack"
    ? [legs[0][0], legs[0][1]]
    : type === "lat-pulldown" || type === "seated-row" || type === "abdominal-crunch"
      ? [mix(shoulder, hip, 0.3), mix(shoulder, hip, 0.75)]
      : [offset(shoulder, -5, 3), offset(shoulder, 5, 3)];
  return { head, shoulder, hip, arms, legs, grips: arms.map((arm) => arm[2]), camera, highlight };
}
