import { proTraining } from "./proTraining";

export type RecordedSet = { weight: number; reps: number; rir: number | null };
export type DropSet = RecordedSet & { afterSet: number };
export type AdvancedWorkout = { version: 1; exerciseId: string; main: RecordedSet[]; drops: DropSet[] };
export const MAX_MAIN_SETS = 20, MAX_DROP_SETS = 20;
export type LoadBasis = "external" | "perHand" | "assistance" | "added";
export function loadBasis(id: string): LoadBasis {
  if (id === "dumbbell-heavy") return "perHand";
  if (["assisted-pull-up", "assisted-dip"].includes(id)) return "assistance";
  if (["chest-dip", "back-extension"].includes(id)) return "added";
  return "external";
}
export function advancedLoadType(id: string, weight: number): "dumbbell"|"bodyweight"|"weight" {
  const basis=loadBasis(id);
  return basis==='perHand'?'dumbbell':basis==='added'&&weight===0?'bodyweight':'weight';
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const bounded = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
function recordedSet(v: unknown): v is RecordedSet {
  return object(v) && bounded(v.weight,0,1000) && bounded(v.reps,1,100) && Number.isInteger(v.reps)
    && (v.rir === null || bounded(v.rir,0,4) && Number.isInteger(v.rir));
}
/** A drop reduces resistance: assisted machines use the inverse weight direction. */
export function isAdvancedWorkout(v: unknown): v is AdvancedWorkout {
  if (!object(v) || v.version !== 1 || typeof v.exerciseId !== "string" || !proTraining(v.exerciseId)
    || !Array.isArray(v.main) || v.main.length < 1 || v.main.length > MAX_MAIN_SETS || !v.main.every(recordedSet)
    || !Array.isArray(v.drops) || v.drops.length > MAX_DROP_SETS) return false;
  const lastWeights = v.main.map(s => s.weight);
  for (const stage of v.drops) {
    if (!object(stage)) return false;
    const afterSet = stage.afterSet;
    if (!recordedSet(stage) || !Number.isInteger(afterSet)
      || typeof afterSet !== "number" || afterSet < 0 || afterSet >= v.main.length) return false;
    const previous = lastWeights[afterSet];
    if (loadBasis(v.exerciseId) === "assistance" ? stage.weight <= previous : stage.weight >= previous) return false;
    lastWeights[afterSet] = stage.weight;
  }
  return true;
}
/** Input-weight volume only: no estimate of muscle force, activation or growth. */
export function setVolume(id: string, set: Pick<RecordedSet,"weight"|"reps">): number | null {
  const basis = loadBasis(id);
  if (basis === "assistance" || basis === "added" && set.weight === 0) return null;
  return set.weight * set.reps * (basis === "perHand" ? 2 : 1);
}
export function workoutVolume(workout: AdvancedWorkout) {
  const sum = (sets: RecordedSet[]) => {
    const values = sets.map(s => setVolume(workout.exerciseId,s)).filter((v): v is number => v !== null);
    return values.length ? values.reduce((a,b)=>a+b,0) : null;
  };
  const main = sum(workout.main), drops = sum(workout.drops);
  return { main, drops, total: main === null && drops === null ? null : (main ?? 0)+(drops ?? 0),
    reps: [...workout.main,...workout.drops].reduce((n,s)=>n+s.reps,0) };
}
export function effortKey(rir: number | null) {
  return rir === null ? "advanced.effort.unknown" : rir === 0 ? "advanced.effort.limit"
    : rir <= 2 ? "advanced.effort.close" : "advanced.effort.reserve";
}
export type SetDraft = { weight: string; reps: string; rir: number | null };
export type DropDraft = SetDraft & { afterSet: number };
export function parseAdvancedWorkout(exerciseId: string, main: SetDraft[], drops: DropDraft[]): AdvancedWorkout | null {
  const parse = (s: SetDraft): RecordedSet | null => {
    // Decimal notation only; reject empty strings, exponent syntax and locale ambiguity.
    if (!/^\d+(?:\.\d+)?$/.test(s.weight.trim()) || !/^\d+$/.test(s.reps.trim())) return null;
    const value = { weight: Number(s.weight), reps: Number(s.reps), rir: s.rir };
    return recordedSet(value) ? value : null;
  };
  const parsedMain = main.map(parse), parsedDrops = drops.map(s => ({ value: parse(s), afterSet: s.afterSet }));
  if (parsedMain.some(s=>s===null) || parsedDrops.some(s=>s.value===null)) return null;
  const result = { version: 1 as const, exerciseId, main: parsedMain as RecordedSet[],
    drops: parsedDrops.map(s => ({ ...s.value!, afterSet:s.afterSet })) };
  return isAdvancedWorkout(result) ? result : null;
}
