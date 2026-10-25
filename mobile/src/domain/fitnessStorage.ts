import { defaultHomeProfile, homeGear, HomeProfile } from "./homeTraining";
export type Workout = {
  id: string;
  name: string;
  weight: number;
  reps: number;
  sets: number;
  date: string;
  location: "home" | "gym";
  loadType: "bodyweight" | "dumbbell" | "band" | "weight";
};
export type FitnessData = {
  version: 1;
  logs: Workout[];
  favorites: string[];
  homeProfile: HomeProfile;
};
export const FITNESS_STORAGE_KEY = "@gymfinder/fitness/v1";
export const initialFitnessData = (): FitnessData => ({
  version: 1,
  logs: [],
  favorites: [],
  homeProfile: { ...defaultHomeProfile, gear: [] },
});
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function decodeFitnessData(raw: string | null): FitnessData {
  if (raw === null) return initialFitnessData();
  const d: unknown = JSON.parse(raw);
  if (
    !record(d) ||
    d.version !== 1 ||
    !Array.isArray(d.logs) ||
    !d.logs.every(
      (l) =>
        record(l) &&
        typeof l.id === "string" &&
        typeof l.name === "string" &&
        typeof l.date === "string" &&
        num(l.weight, 0, 1000) &&
        num(l.reps, 1, 100) &&
        Number.isInteger(l.reps) &&
        num(l.sets, 1, 100) &&
        Number.isInteger(l.sets) &&
        ["home", "gym"].includes(String(l.location)) &&
        ["bodyweight", "dumbbell", "band", "weight"].includes(
          String(l.loadType),
        ),
    ) ||
    !Array.isArray(d.favorites) ||
    !d.favorites.every((f) => typeof f === "string") ||
    !record(d.homeProfile) ||
    !Array.isArray(d.homeProfile.gear) ||
    !d.homeProfile.gear.every((g) => homeGear.some((item) => item.id === g)) ||
    !num(d.homeProfile.maxDumbbellKg, Number.MIN_VALUE, 100) ||
    typeof d.homeProfile.bodyweightOnly !== "boolean"
  )
    throw new Error("Invalid fitness storage");
  return d as FitnessData;
}
