export const mealSlots = [
  { id: "breakfast", label: "朝食" },
  { id: "lunch", label: "昼食" },
  { id: "dinner", label: "夕食" },
  { id: "snack", label: "間食" },
] as const;
export type MealSlot = (typeof mealSlots)[number]["id"];
export type Nutrition = { kcal: number; p: number; f: number; c: number };
export type Meal = Nutrition & {
  id: string;
  date: string;
  slot: MealSlot;
  name: string;
  source: "manual" | "mock";
};
export type WeightEntry = { date: string; kg: number };
export type DietData = {
  targetWeightKg: number | null;
  calorieGoal: number;
  weights: WeightEntry[];
  meals: Meal[];
};
export const initialDiet = (): DietData => ({
  targetWeightKg: null,
  calorieGoal: 2000,
  weights: [],
  meals: [],
});
export const mockMeal: Nutrition = { kcal: 580, p: 52, f: 16, c: 55 };
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === date;
}
export function parseNumber(
  text: string,
  min: number,
  max: number,
): number | null {
  if (!/^\d+(\.\d+)?$/.test(text.trim())) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}
export function upsertWeight(weights: WeightEntry[], entry: WeightEntry) {
  return [...weights.filter((w) => w.date !== entry.date), entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
export function dailyTotals(meals: Meal[], date: string): Nutrition {
  return meals
    .filter((m) => m.date === date)
    .reduce(
      (sum, m) => ({
        kcal: sum.kcal + m.kcal,
        p: sum.p + m.p,
        f: sum.f + m.f,
        c: sum.c + m.c,
      }),
      { kcal: 0, p: 0, f: 0, c: 0 },
    );
}
export function pfcPercent(n: Nutrition) {
  const energy = n.p * 4 + n.f * 9 + n.c * 4;
  return {
    p: energy ? ((n.p * 4) / energy) * 100 : 0,
    f: energy ? ((n.f * 9) / energy) * 100 : 0,
    c: energy ? ((n.c * 4) / energy) * 100 : 0,
  };
}
/** Calendar-time x axis, padded kg range, including the goal. Single/flat series remain finite. */
export function weightChart(weights: WeightEntry[], target: number | null) {
  const entries = [...weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
  if (!entries.length) return null;
  const values = entries.map((e) => e.kg);
  if (target !== null) values.push(target);
  const min = Math.min(...values) - 1,
    max = Math.max(...values) + 1;
  const first = Date.parse(entries[0].date),
    last = Date.parse(entries[entries.length - 1].date);
  const y = (kg: number) => 16 + ((max - kg) / (max - min)) * 128;
  return {
    entries,
    min,
    max,
    targetY: target === null ? null : y(target),
    points: entries.map((e) => ({
      x:
        last === first
          ? 160
          : 24 + ((Date.parse(e.date) - first) / (last - first)) * 272,
      y: y(e.kg),
    })),
  };
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const number = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function isDietData(value: unknown): value is DietData {
  if (
    !record(value) ||
    !(value.targetWeightKg === null || number(value.targetWeightKg, 20, 400)) ||
    !number(value.calorieGoal, 100, 10000) ||
    !Array.isArray(value.weights) ||
    !Array.isArray(value.meals)
  )
    return false;
  const dates = new Set<string>();
  const ids = new Set<string>();
  return (
    value.weights.every((w) => {
      if (
        !record(w) ||
        !validDate(w.date) ||
        !number(w.kg, 20, 400) ||
        dates.has(w.date)
      )
        return false;
      dates.add(w.date);
      return true;
    }) &&
    value.meals.every((m) => {
      if (
        !record(m) ||
        typeof m.id !== "string" ||
        !m.id ||
        ids.has(m.id) ||
        !validDate(m.date) ||
        !mealSlots.some((s) => s.id === m.slot) ||
        typeof m.name !== "string" ||
        !m.name.trim() ||
        m.name.length > 80 ||
        !["manual", "mock"].includes(String(m.source)) ||
        !number(m.kcal, 0, 10000) ||
        !number(m.p, 0, 1000) ||
        !number(m.f, 0, 1000) ||
        !number(m.c, 0, 1000)
      )
        return false;
      ids.add(m.id);
      return true;
    })
  );
}
