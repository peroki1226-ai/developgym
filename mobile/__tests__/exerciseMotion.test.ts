import { EQUIPMENTS } from "../src/data/equipment";
import { exercisePose, motionContact, MOTION_TYPES, MOTION_CYCLE_MS, sampleMotion, solveLimb } from "../src/domain/exerciseMotion";

const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
test("every catalogue diagram has its own motion model", () => {
  expect(EQUIPMENTS.map((e) => e.svgType).sort()).toEqual([...MOTION_TYPES].sort());
});
test.each(MOTION_TYPES)("%s: continuous bounded poses keep bone lengths and grip contacts", (type) => {
  const start = exercisePose(type, 0), end = exercisePose(type, 1);
  expect(end).not.toEqual(start);
  expect(distance(motionContact(type, end), motionContact(type, start))).toBeGreaterThan(5);
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
  for (const type of ["pec-fly", "cable-machine", "rear-delt-fly", "lateral-raise"]) {
    const angle = (p: number) => {
      const [s, e, h] = exercisePose(type, p).arms[0];
      return ((s[0] - e[0]) * (h[0] - e[0]) + (s[1] - e[1]) * (h[1] - e[1])) / (distance(s, e) * distance(h, e));
    };
    for (let step = 0; step <= 20; step++) expect(angle(step / 20)).toBeCloseTo(angle(0), 8);
  }
});
test("leg extension and seated curl keep their hip and knee pivots anchored", () => {
  for (const type of ["leg-extension", "seated-leg-curl"]) {
    const start = exercisePose(type, 0);
    for (let step = 0; step <= 20; step++) {
      const pose = exercisePose(type, step / 20);
      expect(pose.hip).toEqual(start.hip);
      expect(pose.legs[0][1]).toEqual(start.legs[0][1]);
    }
  }
  expect(exercisePose("leg-extension", 1).legs[0][2][1]).toBeLessThan(exercisePose("leg-extension", 0).legs[0][2][1]);
  expect(exercisePose("seated-leg-curl", 1).legs[0][2][0]).toBeLessThan(exercisePose("seated-leg-curl", 0).legs[0][2][0]);
});
test("abduction opens and adduction closes while the torso remains still", () => {
  for (const type of ["hip-abduction", "hip-adduction"]) {
    expect(exercisePose(type, 0).shoulder).toEqual(exercisePose(type, 1).shoulder);
    expect(exercisePose(type, 0).hip).toEqual(exercisePose(type, 1).hip);
    for (const p of [0, 0.5, 1]) exercisePose(type, p).legs.forEach((leg) => expect(leg[2][1]).toBeLessThanOrEqual(88));
  }
  const spread = (type: string, p: number) => exercisePose(type, p).legs[1][1][0] - exercisePose(type, p).legs[0][1][0];
  expect(spread("hip-abduction", 1)).toBeGreaterThan(spread("hip-abduction", 0));
  expect(spread("hip-adduction", 1)).toBeLessThan(spread("hip-adduction", 0));
});
test("curl and pushdown use a fixed elbow rather than swinging the upper arm", () => {
  for (const type of ["preacher-curl", "triceps-pushdown"]) {
    const start = exercisePose(type, 0);
    for (let step = 0; step <= 20; step++) {
      const pose = exercisePose(type, step / 20);
      expect(pose.arms[0][0]).toEqual(start.arms[0][0]);
      expect(pose.arms[0][1]).toEqual(start.arms[0][1]);
    }
  }
});
test("assisted movements raise the body against fixed grips with the knee pad following the body", () => {
  for (const type of ["assisted-pull-up", "assisted-dip"]) {
    const start = exercisePose(type, 0);
    for (let step = 0; step <= 20; step++) {
      const pose = exercisePose(type, step / 20);
      pose.grips.forEach((p, i) => expect(distance(p, start.grips[i])).toBeLessThan(0.000001));
      expect(pose.legs[0][1][1] - pose.hip[1]).toBeCloseTo(start.legs[0][1][1] - start.hip[1]);
    }
    expect(exercisePose(type, 1).shoulder[1]).toBeLessThan(start.shoulder[1]);
  }
});
test("calf raise rotates around the supported toes and back extension finishes in alignment", () => {
  const start = exercisePose("seated-calf-raise", 0), toe = [82, 88];
  for (let step = 0; step <= 20; step++) {
    const p = step / 20;
    expect(distance(exercisePose("seated-calf-raise", p).legs[0][2], toe)).toBeCloseTo(distance(start.legs[0][2], toe), 6);
    expect(exercisePose("back-extension", p).hip).toEqual([62, 58]);
  }
  const end = exercisePose("back-extension", 1), thigh = end.legs[0][1];
  const dot = ((end.shoulder[0] - end.hip[0]) * (thigh[0] - end.hip[0]) + (end.shoulder[1] - end.hip[1]) * (thigh[1] - end.hip[1])) / (distance(end.shoulder, end.hip) * distance(thigh, end.hip));
  expect(dot).toBeLessThan(-0.99);
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
