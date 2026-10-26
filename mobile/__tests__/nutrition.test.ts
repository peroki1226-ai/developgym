import {
  dailyTotals,
  initialDiet,
  isDietData,
  localDateKey,
  mockMeal,
  parseNumber,
  pfcPercent,
  upsertWeight,
  validDate,
  weightChart,
  Meal,
} from "../src/domain/nutrition";
import {
  decodeFitnessData,
  initialFitnessData,
} from "../src/domain/fitnessStorage";
const meal: Meal = {
  ...mockMeal,
  id: "m1",
  date: "2026-01-01",
  name: "食事",
  slot: "lunch",
  source: "mock",
};
test("daily totals isolate days; PFC ratios use energy, not gram proportions, with zero-safe empty state", () => {
  expect(
    dailyTotals(
      [meal, { ...meal, id: "m2", date: "2026-01-02" }],
      "2026-01-01",
    ),
  ).toEqual(mockMeal);
  expect(dailyTotals([], "2026-01-01")).toEqual({ kcal: 0, p: 0, f: 0, c: 0 });
  const ratio = pfcPercent(mockMeal);
  expect(ratio.p).toBeCloseTo((208 / 572) * 100);
  expect(ratio.f).toBeCloseTo((144 / 572) * 100);
  expect(ratio.p + ratio.f + ratio.c).toBeCloseTo(100);
  expect(pfcPercent({ kcal: 0, p: 0, f: 0, c: 0 })).toEqual({
    p: 0,
    f: 0,
    c: 0,
  });
});
test("weight upsert replaces the same date without changing other dates or input", () => {
  const before = [{ date: "2026-01-02", kg: 70 }];
  const result = upsertWeight(before, { date: "2026-01-01", kg: 71 });
  expect(result.map((w) => w.date)).toEqual(["2026-01-01", "2026-01-02"]);
  expect(before).toHaveLength(1);
  expect(upsertWeight(result, { date: "2026-01-02", kg: 69 })).toEqual([
    { date: "2026-01-01", kg: 71 },
    { date: "2026-01-02", kg: 69 },
  ]);
});
test("graph handles empty, single and flat data and spaces points by calendar dates", () => {
  expect(weightChart([], null)).toBeNull();
  expect(weightChart([{ date: "2026-01-01", kg: 70 }], 70)?.points).toEqual([
    { x: 160, y: 80 },
  ]);
  const chart = weightChart(
    [
      { date: "2026-01-01", kg: 70 },
      { date: "2026-01-02", kg: 70 },
      { date: "2026-01-10", kg: 70 },
    ],
    65,
  )!;
  expect(chart.points[1].x).toBeCloseTo(24 + 272 / 9);
  expect(chart.targetY).not.toBeNull();
  expect(
    chart.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  ).toBe(true);
});
test("date and numeric validation reject rollover, blank, negative and non-finite entries", () => {
  expect(validDate("2024-02-29")).toBe(true);
  for (const d of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-1"])
    expect(validDate(d)).toBe(false);
  expect(localDateKey(new Date(2026, 0, 2, 0, 5))).toBe("2026-01-02");
  expect(parseNumber("70.5", 20, 400)).toBe(70.5);
  for (const n of ["", "-1", "Infinity", "NaN", "1e2", "401"])
    expect(parseNumber(n, 20, 400)).toBeNull();
});
test("v1 migrates to v2 preserving workouts, home profile and favorites without invented diet logs", () => {
  const { diet, ...base } = initialFitnessData();
  const old = { ...base, version: 1 };
  old.favorites = ["gold"];
  old.homeProfile.gear = ["band"];
  old.logs = [
    {
      id: "log",
      name: "自重",
      date: "2026/1/1",
      location: "home",
      loadType: "bodyweight",
      weight: 0,
      reps: 10,
      sets: 3,
    },
  ];
  const migrated = decodeFitnessData(JSON.stringify(old));
  expect(migrated).toEqual({ ...old, version: 2, diet: initialDiet() });
  expect(decodeFitnessData(JSON.stringify(migrated))).toEqual(migrated);
});
test("v2 validation rejects corrupt diet data, duplicates and future schemas without resetting it", () => {
  const valid = {
    ...initialFitnessData(),
    diet: {
      ...initialDiet(),
      weights: [{ date: "2026-01-01", kg: 70 }],
      meals: [meal],
    },
  };
  expect(decodeFitnessData(JSON.stringify(valid))).toEqual(valid);
  for (const data of [
    { ...valid, version: 3 },
    { ...valid, diet: undefined },
    { ...valid, diet: { ...valid.diet, calorieGoal: 0 } },
    {
      ...valid,
      diet: {
        ...valid.diet,
        weights: [...valid.diet.weights, ...valid.diet.weights],
      },
    },
    { ...valid, diet: { ...valid.diet, meals: [meal, meal] } },
  ])
    expect(() => decodeFitnessData(JSON.stringify(data))).toThrow();
  expect(isDietData({ ...valid.diet, meals: [{ ...meal, p: Infinity }] })).toBe(
    false,
  );
});
