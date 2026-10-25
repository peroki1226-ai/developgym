import {
  alternativesFor,
  bodyParts,
  canPerform,
  defaultHomeProfile,
  homeExercises,
  HomeProfile,
  parseDumbbellMax,
  recommendHome,
  validateHomeLog,
} from "../src/domain/homeTraining";
const equipped: HomeProfile = {
  gear: ["dumbbell", "bench", "pullup-bar", "band"],
  maxDumbbellKg: 20,
  bodyweightOnly: false,
};
test("all six parts have a bodyweight fallback and never require unowned gear", () => {
  for (const p of bodyParts) {
    const result = recommendHome(defaultHomeProfile, p.id);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.requires.length === 0)).toBe(true);
  }
  expect(recommendHome(equipped, "chest")[0].id).toBe("bench-press");
  expect(
    recommendHome({ ...equipped, gear: ["bench"] }, "chest").map((e) => e.id),
  ).toEqual(["pushup"]);
  expect(
    recommendHome({ ...equipped, gear: ["dumbbell"] }, "chest").map(
      (e) => e.id,
    ),
  ).toEqual(["floor-press", "pushup"]);
});
test("bodyweight-only ignores registered equipment without mutating it", () => {
  const profile = { ...equipped, bodyweightOnly: true };
  for (const p of bodyParts)
    expect(
      recommendHome(profile, p.id).every((e) => e.requires.length === 0),
    ).toBe(true);
  expect(profile.gear).toHaveLength(4);
  expect(
    canPerform(
      homeExercises.find((e) => e.id === "floor-press")!,
      { ...equipped, maxDumbbellKg: 0 },
    ),
  ).toBe(false);
});
test("reverse alternatives respect all requirements and have an honest empty state", () => {
  expect(alternativesFor("chest-press", equipped).map((e) => e.id)).toEqual([
    "bench-press",
    "floor-press",
    "pushup",
  ]);
  expect(alternativesFor("lat-pulldown", equipped)[0].id).toBe("pullup");
  expect(
    alternativesFor("leg-press", defaultHomeProfile).map((e) => e.id),
  ).toEqual(["squat"]);
  expect(alternativesFor("cable-curl", defaultHomeProfile)).toEqual([]);
  expect(alternativesFor("unknown", equipped)).toEqual([]);
});
test("log validation rejects malformed counts and weights beyond owned maximum; bodyweight ignores stale weight", () => {
  const dumbbell = homeExercises.find((e) => e.id === "floor-press")!;
  expect(validateHomeLog(dumbbell, equipped, "20", "10", "3")).toBeNull();
  for (const weight of ["", "0", "-1", "20.1", "NaN", "Infinity", "1e1"])
    expect(
      validateHomeLog(dumbbell, equipped, weight, "10", "3"),
    ).not.toBeNull();
  for (const count of ["", "0", "-1", "1.5", "101", "NaN"])
    expect(validateHomeLog(dumbbell, equipped, "5", count, "3")).not.toBeNull();
  expect(
    validateHomeLog(dumbbell, defaultHomeProfile, "5", "10", "3"),
  ).not.toBeNull();
  expect(
    validateHomeLog(homeExercises[0], defaultHomeProfile, "invalid", "10", "3"),
  ).toBeNull();
  expect(parseDumbbellMax("20.5")).toBe(20.5);
  for (const input of ["0", "101", "NaN", "Infinity", ""])
    expect(parseDumbbellMax(input)).toBeNull();
});
