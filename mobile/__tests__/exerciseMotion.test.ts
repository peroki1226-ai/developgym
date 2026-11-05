import { EQUIPMENTS } from "../src/data/equipment";
import { exercisePose, MOTION_TYPES, MOTION_CYCLE_MS, sampleMotion, solveLimb } from "../src/domain/exerciseMotion";

const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
test("every catalogue diagram has its own motion model", () => {
  expect(EQUIPMENTS.map((e) => e.svgType).sort()).toEqual([...MOTION_TYPES].sort());
});
test.each(MOTION_TYPES)("%s: continuous bounded poses keep bone lengths and grip contacts", (type) => {
  const start = exercisePose(type, 0), end = exercisePose(type, 1);
  expect(end).not.toEqual(start);
  for (let step = 0; step <= 100; step++) {
    const pose = exercisePose(type, step / 100);
    const baseline = [...start.arms, ...start.legs];
    [...pose.arms, ...pose.legs].forEach((limb, i) => {
      expect(distance(limb[0], limb[1])).toBeCloseTo(distance(baseline[i][0], baseline[i][1]), 5);
      expect(distance(limb[1], limb[2])).toBeCloseTo(distance(baseline[i][1], baseline[i][2]), 5);
    });
    pose.grips.forEach((grip, i) => expect(grip).toEqual(pose.arms[i][2]));
    for (const p of [pose.head, pose.hip, pose.shoulder, ...pose.arms.flat(), ...pose.legs.flat()]) {
      expect(Number.isFinite(p[0]) && Number.isFinite(p[1])).toBe(true);
      expect(p[0]).toBeGreaterThan(4);
      expect(p[0]).toBeLessThan(116);
      expect(p[1]).toBeGreaterThan(4);
      expect(p[1]).toBeLessThan(94);
    }
    if (step > 0) {
      const previous = exercisePose(type, (step - 1) / 100);
      [...pose.arms.flat(), ...pose.legs.flat()].forEach((p, i) => {
        expect(distance(p, [...previous.arms.flat(), ...previous.legs.flat()][i])).toBeLessThan(2);
      });
    }
  }
});
test("press rail remains vertical, leg-press pelvis and squat feet stay anchored", () => {
  for (let step = 0; step <= 20; step++) {
    const p = step / 20;
    expect(exercisePose("incline-smith", p).grips[0][0]).toBeCloseTo(65);
    expect(exercisePose("leg-press", p).hip).toEqual(exercisePose("leg-press", 0).hip);
    for (const type of ["hack-squat", "power-rack"]) {
      expect(exercisePose(type, p).legs.map((l) => l[2])).toEqual(exercisePose(type, 0).legs.map((l) => l[2]));
    }
  }
});
test("presses and squats reach a visibly extended position without locking the elbow or knee", () => {
  const jointAngle = ([a, b, c]: readonly (readonly number[])[]) => Math.acos(
    Math.max(-1, Math.min(1, ((a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1])) / (distance(a, b) * distance(c, b)))),
  ) * 180 / Math.PI;
  for (const type of ["chest-press", "incline-smith", "dumbbell-heavy", "shoulder-press", "leg-press", "hack-squat", "power-rack"]) {
    const getLimb = (p: number) => {
      const pose = exercisePose(type, p);
      return ["leg-press", "hack-squat", "power-rack"].includes(type) ? pose.legs[0] : pose.arms[0];
    };
    const end = jointAngle(getLimb(1));
    expect(end).toBeGreaterThan(150);
    expect(end).toBeLessThan(175);
    expect(end).toBeGreaterThan(jointAngle(getLimb(0)) + 30);
  }
});
test("fly models preserve elbow angle while shoulders sweep instead of pressing", () => {
  for (const type of ["pec-fly", "cable-machine"]) {
    const angle = (p: number) => {
      const [s, e, h] = exercisePose(type, p).arms[0];
      return ((s[0] - e[0]) * (h[0] - e[0]) + (s[1] - e[1]) * (h[1] - e[1])) / (distance(s, e) * distance(h, e));
    };
    for (let step = 0; step <= 20; step++) expect(angle(step / 20)).toBeCloseTo(angle(0), 8);
  }
});
test("cycle eases continuously into reversal, returns more slowly, and loops without jumping", () => {
  expect(sampleMotion(0)).toEqual({ progress: 0, phase: "start" });
  expect(sampleMotion(1800)).toEqual({ progress: 1, phase: "hold" });
  expect(sampleMotion(2250).phase).toBe("return");
  expect(sampleMotion(3450).progress).toBeCloseTo(0.5);
  expect(sampleMotion(MOTION_CYCLE_MS)).toEqual(sampleMotion(0));
  for (const boundary of [1800, 2250, 4650, MOTION_CYCLE_MS]) {
    expect(Math.abs(sampleMotion(boundary - 1).progress - sampleMotion(boundary + 1).progress)).toBeLessThan(0.00001);
  }
});
test("invalid progress and coincident IK targets remain finite", () => {
  for (const n of [NaN, Infinity, -100]) expect(exercisePose("chest-press", n)).toEqual(exercisePose("chest-press", 0));
  expect(exercisePose("chest-press", 100)).toEqual(exercisePose("chest-press", 1));
  expect(solveLimb([0, 0], [0, 0], 20, 19).flat().every(Number.isFinite)).toBe(true);
});
