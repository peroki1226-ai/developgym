import { MotionPhase, MotionType, motionType } from "./exerciseMotion";
import { contractionFrame, Muscle, muscleSpec } from "./muscleMotion";

export const LOAD_SOURCES: Record<
  MotionType,
  "machine" | "cable" | "gravity" | "body" | "assist"
> = {
  "chest-press": "machine",
  "pec-fly": "machine",
  "incline-smith": "gravity",
  "cable-machine": "cable",
  "lat-pulldown": "cable",
  "seated-row": "cable",
  "shoulder-press": "machine",
  "dumbbell-heavy": "gravity",
  "leg-press": "machine",
  "hack-squat": "machine",
  "power-rack": "gravity",
  "abdominal-crunch": "machine",
  "leg-extension": "machine",
  "seated-leg-curl": "machine",
  "hip-abduction": "machine",
  "hip-adduction": "machine",
  "seated-calf-raise": "machine",
  "lateral-raise": "machine",
  "preacher-curl": "machine",
  "triceps-pushdown": "cable",
  "assisted-pull-up": "assist",
  "assisted-dip": "assist",
  "back-extension": "body",
  "rear-delt-fly": "machine",
};

/** Qualitative teaching cues, not force, EMG or measured muscle/fascicle length. */
export function muscleLoadLesson(
  type: string,
  requested: Muscle,
  progress: number,
  phase: MotionPhase,
) {
  const id = motionType(type),
    spec = muscleSpec(id);
  const muscle = spec.primary.includes(requested) ? requested : spec.focus;
  const frame = contractionFrame(id, muscle, progress, phase);
  const state = frame.isometric
    ? "stabilizing"
    : phase === "return"
      ? "lengthening"
      : phase === "work"
        ? "shortening"
        : phase === "hold"
          ? "holding"
          : "setup";
  return {
    muscle,
    frame,
    state,
    action: `load.action.${id}.${phase === "return" ? "return" : "work"}`,
    source: `load.source.${LOAD_SOURCES[id]}`,
    explanation: `load.explain.${state}`,
    movement: frame.isometric
      ? "still"
      : phase === "return"
        ? "outward"
        : phase === "work"
          ? "inward"
          : "still",
    // During controlled lengthening the muscle keeps pulling; only the movement reverses.
    muscleForce: "inward" as const,
    resistance: "outward" as const,
  };
}

export const rearMuscles: readonly Muscle[] = [
  "lats",
  "midBack",
  "rearShoulder",
  "hamstrings",
  "glutes",
  "soleus",
  "erectors",
  "hipAbductors",
];
