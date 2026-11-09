import { clampProgress, exercisePose, motionType, Point } from "./exerciseMotion";
import { Muscle, muscleSpec } from "./muscleMotion";
export type V3 = readonly [number, number, number];
export type Bone3 = readonly [V3, V3, V3];
export type View3 = "front" | "side" | "back";
export type Focus3 = "whole" | "hands" | "feet" | "muscles";
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul3 = (a: V3, t: number): V3 => [a[0] * t, a[1] * t, a[2] * t];
export const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length3 = (a: V3) => Math.hypot(...a);
export const unit3 = (a: V3): V3 => length3(a) > 1e-8 ? mul3(a, 1 / length3(a)) : [0, 1, 0];
export const mix3 = (a: V3, b: V3, t: number): V3 => add3(a, mul3(sub3(b, a), t));
export const average3 = (points: readonly V3[]): V3 => mul3(points.reduce<V3>((a, b) => add3(a, b), [0, 0, 0]), 1 / Math.max(1, points.length));
export interface Body3 {
  head: V3;
  shoulder: V3;
  hip: V3;
  arms: Bone3[];
  legs: Bone3[];
  spine: V3[];
  right: V3;
  forward: V3;
  facing: number;
}
export interface Foot3 {
  ankle: V3;
  centre: V3;
  up: V3;
  toe: V3;
  contact: V3;
}
export type Contact3 = {
  key: "seat" | "hands" | "feet";
  points: V3[];
};
export type Primitive3 = {
  id: string;
  kind: "box" | "beam" | "sphere";
  a: V3;
  b?: V3;
  size: V3;
  color: "metal" | "pad" | "rubber" | "chrome";
  axes?: readonly [V3, V3, V3];
};
export interface TrainingFrame3 {
  type: string;
  body: Body3;
  feet: Foot3[];
  equipment: Primitive3[];
  contacts: Contact3[];
  muscles: readonly Muscle[];
}

// Approximate segment dimensions of the bundled adult reference mesh at its
// display scale. Wrist endpoints include the centre of the hand grip.
export const HUMAN_SEGMENTS = {
  torso: 26,
  headOffset: 8.4,
  upperArm: 12.8,
  forearmGrip: 13.7,
  thigh: 20,
  shin: 21
};
export const SMITH_PRESS = {
  startY: 40,
  travelY: 12,
  gripHalfWidth: 17,
  guideZ: 11
};
function chestPressArc(shoulder: V3, progress: number) {
  const startY = -3,
    endY = -.5,
    startZ = 17,
    endZ = 26.2;
  const centreY = 21,
    centreZ = (startZ + endZ) / 2 - (endY - startY) * (centreY - (startY + endY) / 2) / (endZ - startZ);
  const radius = Math.hypot(startY - centreY, startZ - centreZ);
  const a = Math.atan2(startY - centreY, startZ - centreZ),
    b = Math.atan2(endY - centreY, endZ - centreZ);
  const angle = a + (b - a) * progress;
  const pivot = add3(shoulder, [0, centreY, centreZ]);
  return {
    pivot,
    hand: add3(pivot, [0, radius * Math.sin(angle), radius * Math.cos(angle)])
  };
}

/** Retarget the schematic's joint directions onto a consistently sized human.
 * The old 2D drawings must not stretch an authored arm to reach a machine. */
function proportionedBody(raw: Body3, type: string, p: number): Body3 {
  const up = unit3(sub3(raw.shoulder, raw.hip));
  const offsets = raw.legs.map((leg, i) => {
    const hip: V3 = [i === 0 ? -5.2 : 5.2, 0, 0];
    const knee = add3(hip, mul3(unit3(sub3(leg[1], leg[0])), HUMAN_SEGMENTS.thigh));
    const ankle = add3(knee, mul3(unit3(sub3(leg[2], leg[1])), HUMAN_SEGMENTS.shin));
    return [hip, knee, ankle] as Bone3;
  });
  const assisted = ["assisted-pull-up", "assisted-dip"].includes(type);
  let hip = assisted ? raw.hip : sub3(average3(raw.legs.map(l => l[2])), average3(offsets.map(l => l[2])));
  let spineLength = 0;
  for (let i = 1; i < raw.spine.length; i++) spineLength += length3(sub3(raw.spine[i], raw.spine[i - 1]));
  const scale = HUMAN_SEGMENTS.torso / Math.max(1, spineLength);
  const shoulderOffset = mul3(sub3(raw.shoulder, raw.hip), scale);
  const armOffset = add3(mul3(up, -4.8), mul3(raw.forward, .4));
  if (assisted) {
    const angle = (type === "assisted-pull-up" ? 165 - 110 * p : 90 + 65 * p) * Math.PI / 180;
    const reachSquared = HUMAN_SEGMENTS.upperArm ** 2 + HUMAN_SEGMENTS.forearmGrip ** 2 - 2 * HUMAN_SEGMENTS.upperArm * HUMAN_SEGMENTS.forearmGrip * Math.cos(angle);
    const hand: V3 = type === "assisted-pull-up" ? [17, 78, 8] : [9, 40, 11];
    const armStart = add3(add3(hip, shoulderOffset), add3([9, 0, 0], armOffset));
    const vertical = Math.sqrt(Math.max(1, reachSquared - (hand[0] - armStart[0]) ** 2 - (hand[2] - armStart[2]) ** 2));
    const requiredY = hand[1] + (type === "assisted-pull-up" ? -vertical : vertical);
    hip = add3(hip, [0, requiredY - armStart[1], 0]);
  }
  const shoulder = add3(hip, shoulderOffset);
  const head = add3(shoulder, mul3(unit3(sub3(raw.head, raw.shoulder)), HUMAN_SEGMENTS.headOffset));
  const spine = raw.spine.map(point => add3(hip, mul3(sub3(point, raw.hip), scale)));
  const legs = offsets.map(leg => leg.map(point => add3(hip, point)) as unknown as Bone3);
  const arms = raw.arms.map((old, i) => {
    const sign = i === 0 ? -1 : 1;
    const start = add3(add3(shoulder, [sign * 9, 0, 0]), armOffset);
    let hand: V3 | undefined;
    let hint: V3 = [sign, 0, -.25];
    if (type === "chest-press") {
      hand = chestPressArc(start, p).hand;
      hint = [sign * .8, -.5, -.2];
    } else if (type === "incline-smith") {
      hand = [sign * SMITH_PRESS.gripHalfWidth, SMITH_PRESS.startY + SMITH_PRESS.travelY * p, SMITH_PRESS.guideZ];
    } else if (type === "lat-pulldown") {
      hand = [sign * 17, start[1] + 23.5 - 25.5 * p, start[2] + 8];
      hint = [sign * .3, -1, .2];
    } else if (type === "assisted-pull-up") {
      hand = [sign * 17, 78, 8];
      hint = [sign * .3, -1, .2];
    } else if (type === "assisted-dip") {
      hand = [sign * 9, 40, 11];
      hint = [0, -1, 1];
    }
    if (hand) return solveBone3(start, hand, HUMAN_SEGMENTS.upperArm, HUMAN_SEGMENTS.forearmGrip, hint);
    const elbow = add3(start, mul3(unit3(sub3(old[1], old[0])), HUMAN_SEGMENTS.upperArm));
    return [start, elbow, add3(elbow, mul3(unit3(sub3(old[2], old[1])), HUMAN_SEGMENTS.forearmGrip))] as Bone3;
  });
  return {
    ...raw,
    hip,
    shoulder,
    head,
    spine,
    arms,
    legs
  };
}

/** A spatial knee solution used where a frontal schematic omits sagittal depth. */
export function solveBone3(a: V3, c: V3, upper: number, lower: number, hint: V3): Bone3 {
  const u = unit3(sub3(c, a)),
    d = Math.min(upper + lower - 0.01, Math.max(Math.abs(upper - lower) + 0.01, length3(sub3(c, a))));
  const bend = unit3(sub3(hint, mul3(u, dot3(hint, u))));
  const along = (upper * upper - lower * lower + d * d) / (2 * d),
    height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return [a, add3(add3(a, mul3(u, along)), mul3(bend, height)), add3(a, mul3(u, d))];
}
export function body3d(raw: string, value: number): Body3 {
  const type = motionType(raw),
    p = clampProgress(value),
    pose = exercisePose(type, p);
  const facing = ["hack-squat", "back-extension"].includes(type) ? -1 : 1;
  const map = (point: Point, depth = 0): V3 => pose.camera === "side" ? [depth, 88 - point[1], point[0] - 54] : [point[0] - 60, 88 - point[1], depth];
  let head = map(pose.head),
    shoulder = map(pose.shoulder),
    hip = map(pose.hip),
    spine = (pose.spine ?? [pose.hip, pose.shoulder]).map(v => map(v));
  let arms: Bone3[] = [],
    legs: Bone3[] = [];
  if (pose.camera === "top") {
    const standing = type === "cable-machine",
      height = standing ? 43 : 30;
    hip = [0, height, 0];
    shoulder = [0, height + 25, 0];
    head = [0, height + 36, 0];
    spine = [hip, shoulder];
    arms = pose.arms.map(l => l.map(v => [v[0] - 60, shoulder[1], v[1] - 38] as V3) as unknown as Bone3);
    legs = [-1, 1].map(s => standing ? [[s * 6, height, 0], [s * 8, 21, 2], [s * 10, 1.2, 5]] : [[s * 6, height, 0], [s * 7, height - 1, 21], [s * 8, 1.2, 23]]);
  } else if (pose.camera === "side") {
    arms = [-1, 1].map(s => pose.arms[0].map(v => map(v, s * 9)) as unknown as Bone3);
    legs = [-1, 1].map((s, i) => (pose.legs[i] ?? pose.legs[0]).map(v => map(v, s * 6)) as unknown as Bone3);
  } else {
    arms = pose.arms.map(l => l.map(v => map(v)) as unknown as Bone3);
    legs = pose.legs.map(l => l.map(v => map(v)) as unknown as Bone3);
    if (type === "lat-pulldown") arms = [-1, 1].map(s => solveBone3([s * 10, shoulder[1], 0], [s * 27, 74 - 30 * p, 8], 18.5, 18.5, [s, 0, 1]));
    if (type === "lat-pulldown" || type === "lateral-raise") legs = [-1, 1].map(s => [[s * 6, hip[1], 0], [s * 7, hip[1] - 1, 22], [s * 8, 1.2, 23]]);
    if (type === "hip-abduction" || type === "hip-adduction") {
      const angle = (15 + 40 * (type === "hip-abduction" ? p : 1 - p)) * Math.PI / 180;
      legs = [-1, 1].map(s => {
        const x = s * (6 + 18 * Math.sin(angle)),
          z = 18 * Math.cos(angle);
        return [[s * 6, hip[1], 0], [x, hip[1] - 1, z], [x, hip[1] - 20, z + 1]];
      });
    }
    if (type === "power-rack") {
      hip = [0, hip[1], -10 * (1 - p)];
      shoulder = [0, shoulder[1], -5 * (1 - p)];
      head = add3(shoulder, [0, 11, 0]);
      spine = [hip, shoulder];
      legs = [-1, 1].map(s => solveBone3(add3(hip, [s * 6, 0, 0]), [s * 18, 1.2, 0], 25.5, 25.5, [0, 0, 1]));
      arms = [-1, 1].map(s => solveBone3(add3(shoulder, [s * 9, 0, 0]), add3(shoulder, [s * 24, 3, -4]), 14, 14, [0, -1, 1]));
    }
    if (type === "assisted-pull-up") {
      hip = add3(hip, [0, 10 * p, 0]);
      shoulder = add3(shoulder, [0, 10 * p, 0]);
      head = add3(head, [0, 10 * p, 0]);
      spine = [hip, shoulder];
      arms = [-1, 1].map(s => solveBone3([s * 10, shoulder[1], 0], [s * 27, 78, 8], 19.5, 19.5, [s, 0, 1]));
      legs = [-1, 1].map(s => [[s * 6, hip[1], 0], [s * 14, hip[1] - 13, 8], [s, hip[1] - 18, -8]]);
    }
  }
  if (["chest-press", "shoulder-press", "incline-smith", "dumbbell-heavy"].includes(type)) {
    arms = arms.map((a, i) => solveBone3(a[0], a[2], 20, 19, [i === 0 ? -1 : 1, 0, -0.25]));
  }
  if (type === "preacher-curl") {
    arms = arms.map(([a, e, h]) => {
      const elbow = add3(a, mul3(unit3(sub3(e, a)), 18));
      return [a, elbow, add3(elbow, mul3(unit3(sub3(h, e)), 17))];
    });
  }
  if (type === "back-extension") {
    const up = unit3(sub3(shoulder, hip)),
      front = unit3(cross3([-1, 0, 0], up));
    arms = [-1, 1].map(side => {
      const a = add3(shoulder, [side * 9, 0, 0]),
        target = add3(add3(add3(shoulder, mul3(up, -8)), mul3(front, 5)), [-side * 4, 0, 0]);
      return solveBone3(a, target, 17, 16, [side * 0.6, -up[1], -up[2]]);
    });
  }
  if (type === "triceps-pushdown") {
    hip = add3(hip, [0, 20, 0]);
    shoulder = add3(shoulder, [0, 20, 0]);
    head = add3(head, [0, 20, 0]);
    spine = [hip, shoulder];
    arms = arms.map(l => l.map(v => add3(v, [0, 20, 0])) as unknown as Bone3);
    legs = [-1, 1].map(side => [add3(hip, [side * 6, 0, 0]), [side * 8, 22, hip[2] + 2], [side * 10, 1.2, hip[2] + 4]]);
  }
  if (type === "leg-extension" || type === "seated-leg-curl") legs = legs.map(([a, b, c]) => [a, add3(b, [0, 1.2, 0]), add3(c, [0, 1.2, 0])]);
  const right: V3 = [facing, 0, 0],
    forward = unit3(cross3(right, unit3(sub3(shoulder, hip))));
  return proportionedBody({
    head,
    shoulder,
    hip,
    arms,
    legs,
    spine,
    right,
    forward,
    facing
  }, type, p);
}
export function feet3d(type: string, body: Body3): Foot3[] {
  return body.legs.map(([, knee, ankle]) => {
    let up: V3 = [0, 1, 0],
      toe: V3 = [0, 0, body.facing];
    if (type === "seated-row") {
      up = unit3([0, 0.8, -0.6]);
      toe = unit3([0, 0.6, 0.8]);
    }
    if (type === "leg-press") {
      up = unit3([0, -1, -1]);
      toe = unit3([0, 1, -1]);
    }
    if (type === "hack-squat") {
      up = unit3([0, 1, 1]);
      toe = unit3([0, 1, -1]);
    }
    if (type === "leg-extension" || type === "seated-leg-curl") {
      up = unit3(sub3(knee, ankle));
      toe = unit3(cross3(body.right, up));
    }
    if (type === "seated-calf-raise") {
      const tip: V3 = [ankle[0], 3, 28];
      toe = unit3(sub3(tip, ankle));
      up = unit3(cross3(toe, body.right));
      const centre = mix3(ankle, tip, 0.55);
      return {
        ankle,
        up,
        toe,
        centre,
        contact: tip
      };
    }
    const centre = add3(ankle, mul3(toe, 1.8));
    return {
      ankle,
      up,
      toe,
      centre,
      contact: add3(centre, mul3(up, -1.1))
    };
  });
}

/** Full equipment is generated around explicit contact surfaces, not placed behind a flat picture. */
export function trainingFrame3d(raw: string, progress: number): TrainingFrame3 {
  const type = motionType(raw),
    p = clampProgress(progress),
    body = body3d(type, p),
    feet = feet3d(type, body),
    equipment: Primitive3[] = [];
  const {
      hip,
      shoulder,
      right,
      forward
    } = body,
    up = unit3(sub3(shoulder, hip));
  const box = (id: string, a: V3, size: V3, color: Primitive3["color"] = "metal", axes?: Primitive3["axes"]) => equipment.push({
    id,
    kind: "box",
    a,
    size,
    color,
    axes
  });
  const beam = (id: string, a: V3, b: V3, r = 1.4, color: Primitive3["color"] = "metal") => equipment.push({
    id,
    kind: "beam",
    a,
    b,
    size: [r, r, r],
    color
  });
  const ball = (id: string, a: V3, size: V3, color: Primitive3["color"] = "chrome") => equipment.push({
    id,
    kind: "sphere",
    a,
    size,
    color
  });
  const pad = (id: string, a: V3, b: V3, width = 25, thickness = 4, post = true) => {
    const along = unit3(sub3(b, a));
    box(id, mix3(a, b, 0.5), [width, length3(sub3(b, a)), thickness], "pad", [right, along, unit3(cross3(right, along))]);
    if (post) beam(id + "-support", mix3(a, b, 0.5), [mix3(a, b, 0.5)[0], 2, mix3(a, b, 0.5)[2]], 1.5);
  };
  const floorFrame = (id: string, z: number, width = 36, depth = 30) => {
    for (const s of [-1, 1]) {
      beam(id + "-foot" + s, [s * width / 2, 1, z - depth / 2], [s * width / 2, 1, z + depth / 2], 1.5);
      box(id + "-rubber" + s, [s * width / 2, 0.7, z + depth / 2], [5, 1.4, 6], "rubber");
    }
    beam(id + "-cross", [-width / 2, 2, z], [width / 2, 2, z], 1.5);
  };
  const seat = () => {
    const c = add3(hip, mul3(forward, 3));
    box("seat", [c[0], hip[1] - 6, c[2]], [25, 4, 18], "pad");
    beam("seat-post", [0, 2, c[2]], [0, hip[1] - 8, c[2]], 2);
    floorFrame("seat-base", c[2]);
  };
  const back = () => {
    const rest = type === "abdominal-crunch" ? body3d(type, 0) : body,
      u = unit3(sub3(rest.shoulder, rest.hip));
    pad("backrest", add3(add3(rest.hip, mul3(u, 2)), mul3(rest.forward, -7.2)), add3(add3(rest.shoulder, mul3(u, 2)), mul3(rest.forward, -7.2)), type === "incline-smith" ? 14 : 25, 4, type !== "hack-squat");
  };
  const stack = (id: string, x: number, z: number, lift = p * 9, height = 75) => {
    box(id + "-back", [x, height / 2, z - 2.5], [14, height, 2]);
    beam(id + "-rod-a", [x - 4, 3, z], [x - 4, height - 3, z], 0.6, "chrome");
    beam(id + "-rod-b", [x + 4, 3, z], [x + 4, height - 3, z], 0.6, "chrome");
    for (let i = 0; i < 10; i++) box(id + "-weight" + i, [x, 4 + i * 2.2 + lift, z], [11, 1.8, 7], "metal");
    box(id + "-top", [x, height, z], [16, 3, 12]);
    floorFrame(id + "-floor", z, 20, 18);
  };
  const cable = (id: string, a: V3, b: V3) => beam(id, a, b, 0.18, "rubber");
  const handle = (id: string, hand: V3, axis: V3 = right) => {
    const a = add3(hand, mul3(axis, -3)),
      b = add3(hand, mul3(axis, 3));
    beam(id, a, b, 1.05, "rubber");
    for (let i = -2; i <= 2; i++) ball(id + "-rib" + i, add3(hand, mul3(axis, i)), [1.12, 0.13, 1.12], "rubber");
  };
  const pivot = (id: string, a: V3) => {
    ball(id, a, [2.8, 2.8, 2.8]);
    ball(id + "-bolt", add3(a, mul3(right, 2)), [0.7, 0.7, 0.7], "rubber");
  };
  const platform = (id: string, contact: V3, normal: V3, toe: V3, width = 27, depth = 15) => {
    const lateral = unit3(cross3(normal, toe));
    box(id, add3(contact, mul3(normal, -1.5)), [width, 3, depth], "rubber", [lateral, normal, toe]);
    if (contact[1] > 4 && type !== "leg-press" && type !== "hack-squat") beam(id + "-support", add3(contact, mul3(normal, -3)), [contact[0], 1, contact[2]], 1.4);
    for (let i = -2; i <= 2; i++) beam(id + "-tread" + i, add3(add3(contact, mul3(toe, i * 2)), mul3(lateral, -width * 0.4)), add3(add3(contact, mul3(toe, i * 2)), mul3(lateral, width * 0.4)), 0.16, "metal");
  };
  const hands = body.arms.map(a => a[2]);
  const seated = ["chest-press", "pec-fly", "lat-pulldown", "seated-row", "shoulder-press", "abdominal-crunch", "leg-extension", "seated-leg-curl", "hip-abduction", "hip-adduction", "seated-calf-raise", "lateral-raise", "preacher-curl", "rear-delt-fly"].includes(type);
  if (seated) seat();
  if (["chest-press", "pec-fly", "lat-pulldown", "shoulder-press", "abdominal-crunch", "leg-extension", "seated-leg-curl", "hip-abduction", "hip-adduction"].includes(type)) back();
  if (type === "incline-smith" || type === "dumbbell-heavy" || type === "leg-press") {
    back();
    pad("bench-seat", add3(hip, mul3(forward, -3)), add3(hip, mul3(forward, 10)), type === "incline-smith" ? 16 : 25, 4);
    floorFrame("bench", hip[2]);
  }
  const cabinetZ = hip[2] - 18;
  if (!["cable-machine", "power-rack", "incline-smith", "dumbbell-heavy", "hack-squat", "leg-press", "back-extension", "assisted-pull-up", "assisted-dip"].includes(type)) stack("stack", 26, cabinetZ);
  switch (type) {
    case "chest-press":
    case "shoulder-press":
    case "abdominal-crunch":
      {
        const axle: V3 = type === "chest-press" ? [0, chestPressArc(body.arms[0][0], 0).pivot[1], chestPressArc(body.arms[0][0], 0).pivot[2]] : type === "shoulder-press" ? [0, 54, -28] : [0, 60, -22];
        for (const s of [-1, 1]) {
          const a = add3(axle, [s * 9, 0, 0]),
            hand = hands[s === -1 ? 0 : 1];
          beam("press-post" + s, [s * 18, 2, axle[2]], a, 2);
          if (type === "abdominal-crunch") cable("press-lever" + s, a, hand);else beam("press-lever" + s, a, hand, 1.6);
          pivot("press-axis" + s, a);
          handle("press-grip" + s, hand);
        }
        cable("press-cable", add3(axle, [10, 0, 0]), [26, 55, cabinetZ]);
        break;
      }
    case "pec-fly":
    case "rear-delt-fly":
      {
        for (const s of [-1, 1]) {
          const a: V3 = [s * 12, shoulder[1] + 8, 0];
          beam("fly-column" + s, [s * 20, 2, -12], a, 2);
          beam("fly-arm" + s, a, hands[s === -1 ? 0 : 1], 1.5);
          pivot("fly-axis" + s, a);
          handle("fly-grip" + s, hands[s === -1 ? 0 : 1], [0, 1, 0]);
        }
        if (type === "rear-delt-fly") pad("chest-pad", add3(hip, [0, 5, 7]), add3(shoulder, [0, -4, 7]), 17, 4);
        break;
      }
    case "cable-machine":
      {
        for (const s of [-1, 1]) {
          stack("tower" + s, s * 47, -18, p * 8, 86);
          const a: V3 = [s * 47, shoulder[1] + 2, -15];
          pivot("pulley" + s, a);
          cable("crossover" + s, a, hands[s === -1 ? 0 : 1]);
          handle("crossover-grip" + s, hands[s === -1 ? 0 : 1], [0, 1, 0]);
        }
        beam("tower-bridge", [-47, 86, -18], [47, 86, -18], 2);
        break;
      }
    case "lat-pulldown":
    case "assisted-pull-up":
      {
        const barY = type === "lat-pulldown" ? hands[0][1] : 78;
        for (const s of [-1, 1]) beam("lat-column" + s, [s * 33, 2, -12], [s * 33, 83, -12], 2);
        beam("lat-top", [-33, 83, -12], [33, 83, -12], 2);
        beam("lat-bar", hands[0], hands[1], 1);
        if (type === "lat-pulldown") {
          cable("lat-cable", [0, 83, -12], [0, barY, hands[0][2]]);
          for (const s of [-1, 1]) beam("thigh-pad" + s, [s * 6 - 4, hip[1] + 3, 12], [s * 6 + 4, hip[1] + 3, 12], 2.8, "pad");
        } else {
          stack("assist-stack", 43, -18, -p * 8, 84);
          const k = average3(body.legs.map(l => l[1]));
          box("knee-pad", add3(k, [0, -4, 0]), [35, 3, 15], "pad");
          beam("knee-slider", [0, 2, -10], add3(k, [0, -5, -8]), 2);
        }
        hands.forEach((h, i) => handle("lat-grip" + i, h));
        break;
      }
    case "seated-row":
      {
        const anchor: V3 = [0, shoulder[1] - 10, hip[2] + 55];
        cable("row-cable", anchor, average3(hands));
        beam("row-pulley-post", [0, 2, anchor[2]], anchor, 2);
        pivot("row-pulley", anchor);
        feet.forEach((f, i) => platform("row-foot" + i, f.contact, f.up, f.toe, 11, 10));
        hands.forEach((h, i) => handle("row-handle" + i, h, [0, 1, 0]));
        break;
      }
    case "incline-smith":
      {
        const bar = average3(hands);
        const steel = (id: string, a: V3, b: V3, width = 3.5, depth = width) => {
          const along = unit3(sub3(b, a));
          const side = Math.abs(along[0]) < 0.9 ? unit3(cross3(along, [1, 0, 0])) : unit3(cross3(along, [0, 1, 0]));
          box(id, mix3(a, b, 0.5), [width, length3(sub3(b, a)), depth], "metal", [side, along, unit3(cross3(side, along))]);
        };
        steel("smith-top", [-40, 89, 11], [40, 89, 11], 5);
        steel("smith-base-cross", [-40, 2, -24], [40, 2, -24], 5);
        for (const side of [-1, 1]) {
          steel("smith-upright" + side, [side * 39, 2, 11], [side * 39, 89, 11], 5);
          steel("smith-base" + side, [side * 39, 2, -28], [side * 39, 2, 37], 5);
          steel("smith-brace" + side, [side * 39, 4, -25], [side * 39, 70, 11], 3.5);
          beam("smith-guide" + side, [side * 33, 14, 11], [side * 33, 83, 11], 0.75, "chrome");
          // Fixed catches and lower safety stops, separate from the moving carriage.
          for (let y = 20; y <= 78; y += 6) box("smith-catch" + side + y, [side * 36, y, 8], [3, 1.5, 4], "chrome");
          box("smith-stop" + side, [side * 33, 20, 11], [4.5, 4, 5], "rubber");
          box("smith-carriage" + side, [side * 33, bar[1], 11], [4, 8, 4], "metal");
          steel("smith-carriage-link" + side, [side * 29, bar[1], 11], [side * 33, bar[1], 11], 2);
          beam("smith-sleeve" + side, [side * 34, bar[1], 11], [side * 47, bar[1], 11], 1.1, "chrome");
          for (let i = 0; i < 2; i++) {
            const x = side * (37 + i * 2.1);
            beam("smith-plate" + side + i, [x - 0.9, bar[1], 11], [x + 0.9, bar[1], 11], 9.5, "rubber");
          }
          beam("smith-collar" + side, [side * 43, bar[1], 11], [side * 44.5, bar[1], 11], 1.8, "metal");
          for (const y of [23, 48]) {
            beam("smith-storage-horn" + side + y, [side * 39, y, -19], [side * 48, y, -19], 0.9, "chrome");
            beam("smith-storage-plate" + side + y, [side * 41, y, -19], [side * 43, y, -19], 8, "rubber");
          }
          for (const z of [-27, 36]) box("smith-foot" + side + z, [side * 39, 0.7, z], [8, 1.4, 8], "rubber");
        }
        beam("barbell", [-47, bar[1], 11], [47, bar[1], 11], 0.65, "chrome");
        // Bench adjustment hardware stays fixed while the guided bar moves.
        const rest = mix3(hip, shoulder, 0.65);
        steel("smith-bench-spine", add3(hip, [0, -7, -7]), add3(rest, [0, -5, -9]), 3);
        steel("smith-bench-adjuster", [0, 4, hip[2] - 5], add3(rest, [0, -7, -9]), 2.5);
        pivot("smith-bench-hinge", add3(hip, [0, -7, -7]));
        break;
      }
    case "power-rack":
      {
        const z = average3(hands)[2],
          height = 94;
        for (const x of [-34, 34]) for (const dz of [-16, 16]) beam("rack-post" + x + dz, [x, 1, z + dz], [x, height, z + dz], 1.9);
        for (const x of [-34, 34]) {
          beam("rack-side" + x, [x, height, z - 16], [x, height, z + 16], 1.9);
          beam("safety" + x, [x, 24, z - 16], [x, 24, z + 16], 1.1);
        }
        beam("rack-cross", [-34, height, z - 16], [34, height, z - 16], 1.9);
        const centre = average3(hands);
        beam("barbell", add3(centre, [-42, 0, 0]), add3(centre, [42, 0, 0]), 0.65, "chrome");
        for (const s of [-1, 1]) {
          box("j-hook" + s, [s * 34, centre[1] - 2, z], [3, 3, 4], "rubber");
          for (let i = 0; i < 3; i++) ball("plate" + s + i, add3(centre, [s * (33 + i * 1.6), 0, 0]), [1, 8, 8], "rubber");
        }
        floorFrame("rack-base", z, 70, 40);
        break;
      }
    case "dumbbell-heavy":
      {
        hands.forEach((h, i) => {
          beam("dumbbell-bar" + i, add3(h, [-7, 0, 0]), add3(h, [7, 0, 0]), 0.7, "chrome");
          for (const s of [-1, 1]) box("dumbbell" + i + s, add3(h, [s * 6, 0, 0]), [4, 9, 9], "rubber");
        });
        break;
      }
    case "leg-press":
    case "hack-squat":
      {
        const f = feet[0],
          centre = average3(feet.map(v => v.contact));
        platform("footplate", centre, f.up, f.toe, 38, 26);
        const a: V3 = type === "leg-press" ? [0, 7, 0] : [0, 2, -28],
          b: V3 = type === "leg-press" ? [0, 59, 52] : [0, 75, 45];
        for (const s of [-1, 1]) {
          beam("sled-rail" + s, add3(a, [s * 20, 0, 0]), add3(b, [s * 20, 0, 0]), 1.8);
          if (type === "leg-press") beam("sled-carriage" + s, add3(centre, [s * 15, 0, 0]), add3(centre, [s * 20, -8.5, 8.5]), 1.8);
        }
        if (type === "hack-squat") {
          back();
          for (const s of [-1, 1]) box("shoulder-pad" + s, add3(shoulder, [s * 8, 2, -2]), [6, 4, 9], "pad");
        }
        floorFrame("sled", hip[2] + 8, 50, 75);
        for (const s of [-1, 1]) ball("sled-weight" + s, add3(centre, [s * 26, -3, 5]), [2, 9, 9], "rubber");
        break;
      }
    case "leg-extension":
    case "seated-leg-curl":
      {
        body.legs.forEach((l, i) => {
          const a = l[1],
            f = l[2];
          beam("leg-lever" + i, a, f, 1.8);
          pivot("knee-axis" + i, add3(a, [i === 0 ? -6 : 6, 0, 0]));
          beam("ankle-roller" + i, add3(f, [-4, 0, 0]), add3(f, [4, 0, 0]), 2.6, "pad");
          if (type === "seated-leg-curl") beam("curl-thigh" + i, add3(mix3(l[0], a, 0.8), [-4, 3, 0]), add3(mix3(l[0], a, 0.8), [4, 3, 0]), 2.6, "pad");
        });
        hands.forEach((h, i) => handle("leg-hand" + i, h));
        break;
      }
    case "hip-abduction":
    case "hip-adduction":
      {
        body.legs.forEach((l, i) => {
          const side = i === 0 ? -1 : 1;
          beam("hip-lever" + i, [side * 6, hip[1] - 8, 0], add3(l[1], [0, -4, 0]), 1.5);
          box("hip-pad" + i, add3(l[1], [side * (type === "hip-abduction" ? 3 : -3), 1, 0]), [3, 8, 9], "pad");
          platform("hip-foot" + i, feet[i].contact, [0, 1, 0], feet[i].toe, 11, 10);
        });
        hands.forEach((h, i) => handle("hip-grip" + i, h));
        break;
      }
    case "seated-calf-raise":
      {
        body.legs.forEach((l, i) => {
          box("calf-pad" + i, add3(l[1], [0, 4, 0]), [9, 4, 10], "pad");
          beam("calf-lever" + i, [i === 0 ? -18 : 18, 12, l[1][2] + 8], add3(l[1], [0, 6, 0]), 1.6);
          platform("calf-foot" + i, feet[i].contact, [0, 1, 0], [0, 0, 1], 11, 7);
        });
        hands.forEach((h, i) => handle("calf-grip" + i, h));
        break;
      }
    case "lateral-raise":
      {
        body.arms.forEach((a, i) => {
          const side = i === 0 ? -1 : 1,
            pivotAt: V3 = [side * 23, shoulder[1] + 2, -5];
          beam("lateral-column" + i, [side * 23, 2, -5], pivotAt, 1.8);
          beam("lateral-arm" + i, pivotAt, a[1], 1.5);
          pivot("lateral-axis" + i, pivotAt);
          box("upperarm-pad" + i, add3(a[1], [0, -2, 0]), [8, 4, 9], "pad");
        });
        break;
      }
    case "preacher-curl":
      {
        const e = average3(body.arms.map(a => a[1]));
        pad("preacher-pad", add3(shoulder, [0, -4, 3]), add3(e, [0, -2, 1]), 27, 4);
        body.arms.forEach((a, i) => {
          beam("curl-lever" + i, a[1], a[2], 1.2);
          handle("curl-grip" + i, a[2]);
        });
        break;
      }
    case "triceps-pushdown":
      {
        stack("pushdown-stack", 25, hip[2] + 30, p * 9, 96);
        const a: V3 = [0, 94, hip[2] + 28];
        beam("pushdown-top", [25, 94, hip[2] + 30], a, 1.8);
        pivot("pushdown-pulley", a);
        cable("pushdown-cable", a, average3(hands));
        beam("pushdown-handle", hands[0], hands[1], 0.9, "rubber");
        break;
      }
    case "assisted-dip":
      {
        stack("dip-stack", 34, hip[2] - 15, -p * 8, 83);
        hands.forEach((h, i) => {
          beam("dip-post" + i, [h[0], 2, h[2] - 15], [h[0], 70, h[2] - 15], 2);
          beam("dip-bar" + i, add3(h, [0, 0, -15]), add3(h, [0, 0, 6]), 1.2);
          handle("dip-grip" + i, h, [0, 0, 1]);
        });
        const k = average3(body.legs.map(l => l[1]));
        box("dip-knee", add3(k, [0, -4, 0]), [27, 3, 15], "pad");
        floorFrame("dip", hip[2], 46, 42);
        break;
      }
    case "back-extension":
      {
        const support = body3d(type, 1),
          supportUp = unit3(sub3(support.shoulder, support.hip)),
          centre = add3(hip, mul3(support.forward, 7));
        box("hip-support", centre, [27, 10, 4], "pad", [support.right, supportUp, support.forward]);
        beam("backext-post", [0, 2, hip[2]], centre, 2);
        body.legs.forEach((l, i) => {
          beam("backext-rail" + i, add3(hip, [i === 0 ? -10 : 10, -4, 0]), l[2], 1.8);
          beam("ankle-hold" + i, add3(l[2], [-5, 1, 0]), add3(l[2], [5, 1, 0]), 2.5, "pad");
        });
        floorFrame("backext", hip[2] + 15, 43, 57);
        break;
      }
  }
  return {
    type,
    body,
    feet,
    equipment,
    contacts: [{
      key: "seat",
      points: [body.hip, body.shoulder]
    }, {
      key: "hands",
      points: hands
    }, {
      key: "feet",
      points: ["assisted-pull-up", "assisted-dip"].includes(type) ? body.legs.map(l => l[1]) : feet.map(f => f.contact)
    }],
    muscles: muscleSpec(type).primary
  };
}
export function camera3d(frame: TrainingFrame3, view: View3, focus: Focus3) {
  const body = frame.body,
    whole: V3 = [0, 42, 8];
  const target = focus === "hands" ? average3(body.arms.map(a => a[2])) : focus === "feet" ? average3(frame.contacts[2].points) : focus === "muscles" ? mix3(body.hip, body.shoulder, 0.6) : whole;
  const angle = (view === "front" ? -25 : view === "side" ? -90 : -155) * Math.PI / 180;
  const radius = focus === "whole" ? frame.type === "cable-machine" ? 160 : 135 : focus === "hands" ? 65 : focus === "feet" ? 65 : 75;
  return {
    target,
    position: add3(target, [Math.sin(angle) * radius * body.facing, radius * 0.24, Math.cos(angle) * radius * body.facing]),
    radius
  };
}
