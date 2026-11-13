import { MotionType } from "./exerciseMotion";

export type FinishMethod = "drop" | "backoff" | "assist";
export type Reserve = 0 | 1 | 2 | 3;
export type ProTraining = { work: string; return: string; avoid: string; method: FinishMethod; compound: boolean; guard: string };
const guide = (type: MotionType, method: FinishMethod, compound = false, guard = "pro.guard.machine"): ProTraining => ({
  work: `pro.form.${type}.work`, return: `pro.form.${type}.return`, avoid: `pro.form.${type}.avoid`, method, compound, guard,
});
/** Methods suit the equipment and stable posture; failure does not unlock extra reps. */
export const PRO_TRAINING = {
  "chest-press": guide("chest-press", "drop", true),
  "pec-fly": guide("pec-fly", "drop"),
  "incline-smith": guide("incline-smith", "backoff", true, "pro.guard.smith"),
  "cable-machine": guide("cable-machine", "drop"),
  "lat-pulldown": guide("lat-pulldown", "backoff", true),
  "seated-row": guide("seated-row", "backoff", true),
  "shoulder-press": guide("shoulder-press", "backoff", true),
  "dumbbell-heavy": guide("dumbbell-heavy", "backoff", true, "pro.guard.free"),
  "leg-press": guide("leg-press", "backoff", true, "pro.guard.legs"),
  "hack-squat": guide("hack-squat", "backoff", true, "pro.guard.legs"),
  "power-rack": guide("power-rack", "backoff", true, "pro.guard.free"),
  "abdominal-crunch": guide("abdominal-crunch", "drop"),
  "leg-extension": guide("leg-extension", "drop"),
  "seated-leg-curl": guide("seated-leg-curl", "drop"),
  "hip-abduction": guide("hip-abduction", "drop"),
  "hip-adduction": guide("hip-adduction", "drop"),
  "seated-calf-raise": guide("seated-calf-raise", "backoff"),
  "lateral-raise": guide("lateral-raise", "backoff"),
  "preacher-curl": guide("preacher-curl", "drop"),
  "triceps-pushdown": guide("triceps-pushdown", "drop"),
  "assisted-pull-up": guide("assisted-pull-up", "assist", true, "pro.guard.assist"),
  "assisted-dip": guide("assisted-dip", "assist", true, "pro.guard.assist"),
  "back-extension": guide("back-extension", "backoff", false, "pro.guard.body"),
  "rear-delt-fly": guide("rear-delt-fly", "drop"),
  "chest-dip": guide("chest-dip", "assist", true, "pro.guard.body"),
  "incline-hammer-press": guide("incline-hammer-press", "backoff", true, "pro.guard.smith"),
  "incline-bench-press": guide("incline-bench-press", "backoff", true, "pro.guard.smith"),
  "barbell-bench-press": guide("barbell-bench-press", "backoff", true, "pro.guard.free"),
} satisfies Record<MotionType, ProTraining>;
export function proTraining(type: string): ProTraining | undefined {
  return Object.prototype.hasOwnProperty.call(PRO_TRAINING, type) ? PRO_TRAINING[type as MotionType] : undefined;
}
export function effortAdvice(method: FinishMethod, reserve: Reserve) {
  return reserve === 0 ? `pro.effort.stop.${method}` : reserve === 1 ? "pro.effort.close" : reserve === 2 ? "pro.effort.target" : "pro.effort.more";
}
