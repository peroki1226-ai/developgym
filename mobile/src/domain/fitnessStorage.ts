import { Language, isLanguage } from "../i18n";
import { CommunityData, initialCommunity, isCommunityData } from "./community";
import { DietData, initialDiet, isDietData } from "./nutrition";
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
  version: 4;
  language: Language;
  community: CommunityData;
  diet: DietData;
  logs: Workout[];
  favorites: string[];
  homeProfile: HomeProfile;
};
// Keep the v1 key so existing installations can be migrated in place after validation.
export const FITNESS_STORAGE_KEY = "@gymfinder/fitness/v1";
export const initialFitnessData = (): FitnessData => ({
  version: 4,
  language: "ja",
  community: initialCommunity(),
  diet: initialDiet(),
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
    (d.version !== 1 &&
      d.version !== 2 &&
      d.version !== 3 &&
      d.version !== 4) ||
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
  if (d.version !== 1 && !isDietData(d.diet))
    throw new Error("Invalid diet storage");
  if ((d.version === 3 || d.version === 4) && !isCommunityData(d.community))
    throw new Error("Invalid community storage");
  return {
    ...d,
    version: 4,
    language: d.version === 4 && isLanguage(d.language) ? d.language : "ja",
    community:
      d.version === 3 || d.version === 4 ? d.community : initialCommunity(),
    diet: d.version === 1 ? initialDiet() : d.diet,
  } as FitnessData;
}
