import { clampProgress, ExercisePose, MotionPhase, motionType, MotionType, Point } from "./exerciseMotion";
import { between, boneDirection } from "./humanFigure";

export type Muscle = "chest" | "upperChest" | "lats" | "midBack" | "frontShoulder" | "sideShoulder" | "rearShoulder"
  | "biceps" | "triceps" | "quads" | "glutes" | "hamstrings" | "hipAbductors" | "adductors" | "soleus" | "abs" | "erectors";
export type MuscleSpec = { primary: readonly Muscle[]; focus: Muscle; stabilizing?: readonly Muscle[] };
export const MUSCLE_SPECS: Record<MotionType, MuscleSpec> = {
  "chest-press": { primary: ["chest"], focus: "chest" },
  "pec-fly": { primary: ["chest"], focus: "chest" },
  "incline-smith": { primary: ["upperChest"], focus: "upperChest" },
  "cable-machine": { primary: ["chest"], focus: "chest" },
  "lat-pulldown": { primary: ["lats"], focus: "lats" },
  "seated-row": { primary: ["midBack", "lats"], focus: "midBack" },
  "shoulder-press": { primary: ["frontShoulder"], focus: "frontShoulder" },
  "dumbbell-heavy": { primary: ["upperChest"], focus: "upperChest" },
  "leg-press": { primary: ["quads", "glutes"], focus: "quads" },
  "hack-squat": { primary: ["quads", "glutes"], focus: "quads" },
  "power-rack": { primary: ["quads", "glutes"], focus: "quads" },
  "abdominal-crunch": { primary: ["abs"], focus: "abs" },
  "leg-extension": { primary: ["quads"], focus: "quads" },
  "seated-leg-curl": { primary: ["hamstrings"], focus: "hamstrings" },
  "hip-abduction": { primary: ["hipAbductors"], focus: "hipAbductors" },
  "hip-adduction": { primary: ["adductors"], focus: "adductors" },
  "seated-calf-raise": { primary: ["soleus"], focus: "soleus" },
  "lateral-raise": { primary: ["sideShoulder"], focus: "sideShoulder" },
  "preacher-curl": { primary: ["biceps"], focus: "biceps" },
  "triceps-pushdown": { primary: ["triceps"], focus: "triceps" },
  "assisted-pull-up": { primary: ["lats"], focus: "lats" },
  "assisted-dip": { primary: ["chest", "triceps"], focus: "triceps" },
  "back-extension": { primary: ["erectors", "glutes"], focus: "glutes", stabilizing: ["erectors"] },
  "rear-delt-fly": { primary: ["rearShoulder"], focus: "rearShoulder" },
};
export const muscleSpec = (type: string) => MUSCLE_SPECS[motionType(type)];
export function contractionFrame(type: string, muscle: Muscle, progress: number, phase: MotionPhase) {
  const isometric = muscleSpec(type).stabilizing?.includes(muscle) ?? false;
  const shortened = isometric ? 0.45 : clampProgress(progress);
  return {
    shortened, isometric,
    // Educational drawing dimensions, never an estimate of force or measured fibre length.
    length: 108 - 30 * shortened,
    radius: 9 + 4 * shortened,
    zLeft: 22 + 18 * shortened, zRight: 158 - 18 * shortened,
    label: isometric ? "muscle.isometric" : phase === "return" ? "muscle.eccentric" : phase === "hold" ? "muscle.hold"
      : phase === "work" ? "muscle.concentric" : "muscle.start",
  };
}

export type MuscleRegion = { muscle: Muscle; a: Point; b: Point; radius: number; fan?: boolean; clip: "torso" | "arm" | "leg" };
export function muscleRegions(type: string, pose: ExercisePose): MuscleRegion[] {
  const regions: MuscleRegion[] = [];
  const { shoulder: s, hip: h } = pose;
  const axis = boneDirection(s, h), front = pose.camera !== "side";
  const local = (x: number, y: number): Point => {
    // Interpolate the curved trunk as well as straight standing/seated torsos.
    const spine = pose.spine ? [...pose.spine].reverse() : [s, h];
    const index = Math.min(spine.length - 2, Math.floor(y * (spine.length - 1)));
    const centre = between(spine[index], spine[index + 1], y * (spine.length - 1) - index);
    return [centre[0] + axis.normal[0] * x, centre[1] + axis.normal[1] * x];
  };
  const torso = (muscle: Muscle, x: number, y1: number, y2: number, r: number, fan = false) => regions.push({ muscle, a: local(x, y1), b: local(x, y2), radius: r, fan, clip: "torso" });
  const limb = (muscle: Muscle, bones: typeof pose.arms, from: number, to: number, r: number, offset = 0) => bones.forEach(([a, b]) => {
    const n = boneDirection(a, b).normal;
    const shift = (p: Point): Point => [p[0] + n[0] * offset, p[1] + n[1] * offset];
    regions.push({ muscle, a: shift(between(a, b, from)), b: shift(between(a, b, to)), radius: r, clip: bones === pose.arms ? "arm" : "leg" });
  });
  for (const muscle of muscleSpec(type).primary) {
    switch (muscle) {
      case "chest": case "upperChest":
        if (front) for (const sign of [-1, 1]) regions.push({ muscle, a: local(sign * 0.8, 0.3), b: local(sign * 8, 0.14), radius: pose.camera === "top" ? 2 : 3.4, fan: true, clip: "torso" });
        else regions.push({ muscle, a: local(-0.4, muscle === "upperChest" ? 0.3 : 0.43), b: local(-3.1, 0.08), radius: 3, fan: true, clip: "torso" });
        break;
      case "lats":
        for (const sign of front ? [-1, 1] : [1]) {
          regions.push({ muscle, a: local(sign * (front ? 7 : 3), 0.16), b: local(sign * (front ? 3.5 : 2.5), 0.78), radius: front ? 2.5 : 2, fan: true, clip: "torso" });
        }
        break;
      case "midBack":
        for (const sign of front ? [-1, 1] : [1]) torso(muscle, sign * 2.3, 0.12, 0.48, 1.9);
        break;
      case "erectors":
        for (const sign of front ? [-1, 1] : [1]) torso(muscle, sign * 2.5, 0.18, 0.85, 1.3);
        break;
      case "abs":
        for (const sign of front ? [-1, 1] : [-1]) torso(muscle, sign * 2, 0.35, 0.86, front ? 1.6 : 2.2);
        break;
      case "frontShoulder": case "sideShoulder": case "rearShoulder":
        limb(muscle, pose.arms, 0.02, 0.34, 3.1);
        break;
      case "biceps": limb(muscle, pose.arms, 0.25, 0.85, 1.7, -0.6); break;
      case "triceps": limb(muscle, pose.arms, 0.2, 0.82, 1.8, 0.7); break;
      case "quads": limb(muscle, pose.legs, 0.15, 0.88, 2.7, -0.4); break;
      case "hamstrings": limb(muscle, pose.legs, 0.13, 0.83, 2.5, 0.7); break;
      case "adductors": limb(muscle, pose.legs, 0.1, 0.68, 2.1); break;
      case "glutes": case "hipAbductors":
        limb(muscle, pose.legs, 0, muscle === "glutes" ? 0.25 : 0.18, muscle === "glutes" ? 4 : 3.2);
        break;
      case "soleus":
        pose.legs.forEach(([, knee, ankle]) => regions.push({ muscle, a: between(knee, ankle, 0.25), b: between(knee, ankle, 0.83), radius: 1.8, clip: "leg" }));
        break;
    }
  }
  return regions;
}
