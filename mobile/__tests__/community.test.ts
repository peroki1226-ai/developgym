import {
  applySpecs,
  initialCommunity,
  isCommunityData,
  reviewSummary,
  validateReview,
  validateSpec,
  validPhotoName,
  SpecPost,
} from "../src/domain/community";
import { calculateMatch, findGyms, gyms } from "../src/domain/matching";
import {
  decodeFitnessData,
  initialFitnessData,
} from "../src/domain/fitnessStorage";
const anytime = gyms.find((g) => g.id === "anytime")!;
const pref = {
  menuIds: ["m-incline-db", "m-incline-smith", "m-hack-squat", "m-squat"],
  partIds: [],
  requiredDumbbellKg: 60,
};
const spec: SpecPost = {
  id: "s1",
  gymId: "anytime",
  createdAt: "2026-10-27T00:00:00.000Z",
  previousMaxDumbbellKg: 40,
  maxDumbbellKg: 60,
  equipmentIds: ["hack-squat"],
  note: "確認",
};
test("local specs change matching and weight filters without mutating base data", () => {
  const effective = applySpecs(gyms, [spec]);
  const changed = effective.find((g) => g.id === "anytime")!;
  expect(changed.maxDumbbellKg).toBe(60);
  expect(changed.installed).toContain("hack-squat");
  expect(changed.dumbbellRange).toContain("60kg");
  expect(changed.dumbbellRange).not.toContain("40kg");
  expect(findGyms(pref, "Anytime", "all", 60)).toHaveLength(0);
  expect(findGyms(pref, "Anytime", "all", 60, effective)).toHaveLength(1);
  expect(calculateMatch(changed, pref).percent).toBe(99);
  expect(anytime.maxDumbbellKg).toBe(40);
  expect(anytime.installed).not.toContain("hack-squat");
});
test("latest weight wins, added equipment is preserved, and zero removes dumbbell availability", () => {
  const effective = applySpecs(gyms, [
    spec,
    { ...spec, id: "s2", maxDumbbellKg: 0, equipmentIds: [] },
  ]).find((g) => g.id === "anytime")!;
  expect(effective.maxDumbbellKg).toBe(0);
  expect(effective.installed).toContain("hack-squat");
  expect(effective.installed).not.toContain("dumbbell-heavy");
  expect(
    calculateMatch(effective, pref).missing.map((m) => m.reqEquip),
  ).toContain("dumbbell-heavy");
});
test("spec validation rejects invalid, duplicate and unchanged requests", () => {
  expect(validateSpec(anytime, 60, ["hack-squat"], "")).toBeNull();
  for (const weight of [-1, 201, Infinity, NaN])
    expect(validateSpec(anytime, weight, [], "")).not.toBeNull();
  expect(validateSpec(anytime, 40, [], "")).not.toBeNull();
  expect(validateSpec(anytime, null, ["unknown"], "")).not.toBeNull();
  expect(
    validateSpec(anytime, null, ["hack-squat", "hack-squat"], ""),
  ).not.toBeNull();
  const compact = gyms.find((g) => g.id === "compact")!;
  expect(validateSpec(compact, null, ["dumbbell-heavy"], "")).not.toBeNull();
});
test("reviews require a 1-5 integer and comment; averages are local and zero-safe", () => {
  expect(validateReview(5, "清潔でした")).toBeNull();
  for (const score of [0, 6, 1.5, NaN])
    expect(validateReview(score, "test")).not.toBeNull();
  expect(validateReview(4, "  ")).not.toBeNull();
  expect(validateReview(4, "a".repeat(1001))).not.toBeNull();
  expect(reviewSummary([])).toEqual({ count: 0, average: null });
  expect(
    reviewSummary([
      {
        id: "r1",
        gymId: "gold",
        createdAt: spec.createdAt,
        rating: 5,
        comment: "A",
      },
      {
        id: "r2",
        gymId: "gold",
        createdAt: spec.createdAt,
        rating: 3,
        comment: "B",
      },
    ]),
  ).toEqual({ count: 2, average: 4 });
});
test("v1/v2 migration preserves old data and current schema roundtrips community posts", () => {
  const latest = initialFitnessData();
  latest.favorites = ["gold"];
  latest.homeProfile.gear = ["band"];
  latest.diet.weights = [{ date: "2026-10-26", kg: 70 }];
  const { community, ...old } = latest;
  expect(decodeFitnessData(JSON.stringify({ ...old, version: 2 }))).toEqual(
    latest,
  );
  const { diet, ...v1 } = old;
  expect(
    decodeFitnessData(JSON.stringify({ ...v1, version: 1 })).favorites,
  ).toEqual(["gold"]);
  latest.community.specs = [spec];
  latest.community.photos = [
    {
      id: "p1",
      gymId: "anytime",
      createdAt: spec.createdAt,
      fileName: "safe-123.jpg",
      caption: "ラック",
      equipmentId: "power-rack",
    },
  ];
  expect(decodeFitnessData(JSON.stringify(latest))).toEqual(latest);
});
test("unknown gyms, unsafe paths, duplicate IDs and invalid stored posts are rejected", () => {
  expect(validPhotoName("../secrets.jpg")).toBe(false);
  expect(validPhotoName("file:///private/photo.jpg")).toBe(false);
  expect(validPhotoName("safe-123.jpg")).toBe(true);
  for (const specs of [
    [{ ...spec, gymId: "unknown" }],
    [spec, spec],
    [{ ...spec, equipmentIds: ["unknown"] }],
    [{ ...spec, maxDumbbellKg: NaN }],
  ])
    expect(isCommunityData({ ...initialCommunity(), specs })).toBe(false);
  const data = initialFitnessData();
  expect(() =>
    decodeFitnessData(JSON.stringify({ ...data, version: 5 })),
  ).toThrow();
  expect(() =>
    decodeFitnessData(
      JSON.stringify({
        ...data,
        community: {
          ...data.community,
          photos: [
            {
              id: "p1",
              gymId: "gold",
              createdAt: spec.createdAt,
              fileName: "../bad.jpg",
              caption: "x",
              equipmentId: null,
            },
          ],
        },
      }),
    ),
  ).toThrow();
});
