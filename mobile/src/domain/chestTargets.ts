/** Qualitative coaching targets, never EMG, measured force or equal regional loading.
 * Middle/lower are teaching subdivisions of the continuous sternocostal portion. */
export const CHEST_REGIONS = ["upper", "middle", "lower"] as const;
export type ChestRegion = typeof CHEST_REGIONS[number];
export type TargetRole = "primary" | "assisting" | "context";
export type ChestTargets = Readonly<Record<ChestRegion, TargetRole>>;
export const CHEST_TARGET_COLOURS: Readonly<Record<TargetRole,string>> = {
  primary: "#c64638", assisting: "#d4ad7d", context: "#c7b7aa",
};
const upper: ChestTargets = { upper: "primary", middle: "assisting", lower: "context" };
const middle: ChestTargets = { upper: "assisting", middle: "primary", lower: "assisting" };
const lower: ChestTargets = { upper: "context", middle: "assisting", lower: "primary" };
const whole: ChestTargets = { upper: "primary", middle: "primary", lower: "primary" };
export function chestTargets(type: string): ChestTargets {
  if (["incline-bench-press","incline-hammer-press","incline-smith","dumbbell-heavy"].includes(type)) return upper;
  if (["barbell-bench-press","chest-press"].includes(type)) return middle;
  if (["chest-dip","assisted-dip"].includes(type)) return lower;
  return whole;
}
export const chestTargetColour = (type: string, region: ChestRegion) => CHEST_TARGET_COLOURS[chestTargets(type)[region]];
