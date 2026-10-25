import {
  calculateMatch,
  findGyms,
  gyms,
  menus,
  MatchPreferences,
} from "../src/domain/matching";
const anytime = gyms.find((g) => g.id === "anytime")!;
const all: MatchPreferences = {
  menuIds: menus.map((m) => m.id),
  partIds: [],
  requiredDumbbellKg: 0,
};

test("65/20/15 weighting gives 92% for 7 of 8 exercises; available/missing are exact", () => {
  const ids = [
    "m-bench",
    "m-incline-db",
    "m-incline-smith",
    "m-cable-cross",
    "m-pec-fly",
    "m-deadlift",
    "m-lat-mag",
    "m-hack-squat",
  ];
  const result = calculateMatch(anytime, { ...all, menuIds: ids });
  expect(result.percent).toBe(92);
  expect(result.available.map((m) => m.id)).toEqual(ids.slice(0, 7));
  expect(result.missing.map((m) => m.id)).toEqual(["m-hack-squat"]);
  expect(result.missingEquipment).toEqual(["hack-squat"]);
});

test("full match preserves the prototype 99% rule; zero preferences is unscored", () => {
  expect(calculateMatch(gyms[0], all).percent).toBe(99);
  expect(calculateMatch(gyms[0], { ...all, menuIds: [] }).percent).toBeNull();
  expect(
    calculateMatch(gyms[0], { ...all, menuIds: ["m-bench", "m-bench"] })
      .available,
  ).toHaveLength(1);
});

test("part coverage preserves per-exercise weights, and fully missing results keep the 15% floor", () => {
  // quads: squat/rack, hack squat, leg press => 2/3 on Anytime
  expect(
    calculateMatch(anytime, {
      menuIds: ["m-bench"],
      partIds: ["quads"],
      requiredDumbbellKg: 40,
    }).percent,
  ).toBe(93);
  const noEquipment = { ...anytime, installed: [], maxDumbbellKg: 0 };
  const result = calculateMatch(noEquipment, {
    ...all,
    partIds: ["quads"],
    requiredDumbbellKg: 60,
  });
  expect(result.percent).toBe(15);
  expect(result.available).toHaveLength(0);
  expect(result.missing).toHaveLength(menus.length);
  expect(result.missingEquipment.length).toBe(
    new Set(result.missingEquipment).size,
  );
});

test("dumbbell boundary is inclusive; insufficient weight makes the exercise unavailable", () => {
  const pref = {
    menuIds: ["m-incline-db"],
    partIds: [],
    requiredDumbbellKg: 40,
  };
  expect(calculateMatch(anytime, pref).percent).toBe(99);
  const result = calculateMatch(anytime, { ...pref, requiredDumbbellKg: 60 });
  expect(result.dbOk).toBe(false);
  expect(result.percent).toBe(20);
  expect(result.available).toHaveLength(0);
  expect(result.missingEquipment).toEqual(["dumbbell-heavy"]);
});

test("search, region and minimum weight intersect without fallback, sorted by match", () => {
  expect(
    findGyms(all, "　ANYTIME　", "tokyo", 40).map((r) => r.gym.id),
  ).toEqual(["anytime"]);
  expect(findGyms(all, "Anytime", "tokyo", 60)).toEqual([]);
  expect(findGyms(all, "", "tokyo", 60).map((r) => r.gym.id)).toEqual(["gold"]);
  expect(findGyms(all, "", "all", 90).map((r) => r.gym.id)).toEqual([
    "global-la",
  ]);
  expect(findGyms(all, "not-a-gym")).toEqual([]);
  const results = findGyms(all);
  expect(results[results.length - 1].gym.id).toBe("compact");
  expect(findGyms(all, "Life Fitness").map((r) => r.gym.id)).toContain(
    "anytime",
  );
});
