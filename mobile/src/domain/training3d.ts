import { Orbit, normaliseOrbit, orbitForView } from "./guideCamera";
import { clampProgress, exercisePose, motionType, Point } from "./exerciseMotion";
import { Muscle, muscleSpec } from "./muscleMotion";
export type V3 = readonly [number, number, number];
export type Bone3 = readonly [V3, V3, V3];
export type View3 = "front" | "side" | "back" | "right" | "above" | "below";
// Retained public name for existing guide callers; all machines now have six directions.
export const benchViews = (_type: string): readonly View3[] => ["front", "side", "back", "right", "above", "below"];
export type Focus3 = "whole" | "hands" | "feet" | "muscles";
export type LegPressVariant = "incline" | "seated";
export type HandGrip3 = { centre: V3; axis: V3; radius: number };
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
  kind: "box" | "beam" | "sphere" | "tube" | "pad" | "cylinder" | "plate" | "pulley" | "bolt" | "curve";
  a: V3;
  b?: V3;
  size: V3;
  color: "metal" | "satin" | "pad" | "rubber" | "chrome";
  axes?: readonly [V3, V3, V3];
  points?: readonly V3[];
  section?: number;
};
export interface TrainingFrame3 {
  type: string;
  body: Body3;
  feet: Foot3[];
  equipment: Primitive3[];
  contacts: Contact3[];
  muscles: readonly Muscle[];
  grips: HandGrip3[];
  variant?: LegPressVariant;
}

// Approximate segment dimensions of the bundled adult reference mesh at its
// display scale. Wrist endpoints include the centre of the hand grip.
export const HUMAN_SEGMENTS = {
  torso: 26,
  headOffset: 8.4,
  upperArm: 12.8,
  forearmGrip: 17.3,
  thigh: 20,
  shin: 21
};
export const SMITH_PRESS = {
  startY: 40,
  travelY: 12,
  gripHalfWidth: 17,
  guideZ: 11
};
/** Photo-reference Smith: about 30-degree bench, fixed vertical bar plane. */
export const SMITH_INCLINE = Object.freeze({ startY:47, travelY:18, gripHalfWidth:24, guideZ:-9.16, hipY:29, hipZ:6 });
export const smithInclineGrip = (side:number,value:number):V3 => [side*SMITH_INCLINE.gripHalfWidth,SMITH_INCLINE.startY+SMITH_INCLINE.travelY*clampProgress(value),SMITH_INCLINE.guideZ];
function chestPressArc(shoulder: V3, progress: number) {
  // The supplied selectorised press has its lever bearings near the floor.
  // All handles and bent lever segments share this one rigid rotation.
  const startY = -1,
    endY = -6,
    startZ = 12,
    endZ = 28.5;
  const centreY = 7 - shoulder[1],
    centreZ = (startZ + endZ) / 2 - (endY - startY) * (centreY - (startY + endY) / 2) / (endZ - startZ);
  const radius = Math.hypot(startY - centreY, startZ - centreZ);
  const a = Math.atan2(startY - centreY, startZ - centreZ),
    b = Math.atan2(endY - centreY, endZ - centreZ);
  const angle = a + (b - a) * progress;
  const pivot = add3(shoulder, [0, centreY, centreZ]);
  return {
    pivot,
    angle,
    startAngle: a,
    hand: add3(pivot, [0, radius * Math.sin(angle), radius * Math.cos(angle)])
  };
}

export const PEC_FLY = Object.freeze({ startDegrees: 95, endDegrees: -11.5, radius: 28.5 });
function pecFlyArc(shoulder: V3, side: number, progress: number) {
  // A constant-radius horizontal sweep about the overhead vertical bearing.
  const angle = (PEC_FLY.startDegrees + (PEC_FLY.endDegrees - PEC_FLY.startDegrees) * progress) * Math.PI / 180;
  return {
    pivot: [shoulder[0], 83, shoulder[2]] as V3,
    angle,
    hand: add3(shoulder, [side * PEC_FLY.radius * Math.sin(angle), -1, PEC_FLY.radius * Math.cos(angle)])
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
      const grip = chestPressArc(start, p).hand;
      hand = [sign * 14, grip[1], grip[2]];
      hint = [sign * .8, -.5, -.2];
    } else if (type === "pec-fly") {
      hand = pecFlyArc(start, sign, p).hand;
      hint = [sign * .1, -1, -.1];
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
/** Supported postures for the chest lessons; educational proportions, not manufacturer CAD. */
export function inclineHammerGrip(side: number, p: number): V3 {
  const a = p * Math.PI / 12;
  return [side * 15, 86 - 30 * Math.cos(a) + 21 * Math.sin(a), -9 + 21 * Math.cos(a) + 30 * Math.sin(a)];
}
/** Fixed world-space bed for the flat bench, independent of animated bones. */
export const FLAT_BENCH = Object.freeze({
  foot: Object.freeze([0, 16.8, 8] as const), head: Object.freeze([0, 16.8, -35.4] as const),
  frameY: 13.5,
});
/** A free bar follows a shallow arc over the chest, with no Smith rails. */
export function freeBenchGrip(type: string, side: number, value: number): V3 {
  const p=clampProgress(value),incline=type==="incline-bench-press",angle=(incline?30:0)*Math.PI/180;
  const up:V3=[0,Math.sin(angle),-Math.cos(angle)],forward=unit3(cross3([1,0,0],up));
  const shoulder=add3([0,24,0],mul3(up,26));
  const root=add3(shoulder,add3(mul3(up,-4.8),mul3(forward,.4)));
  return [side*20,root[1]+12+15.6*p,root[2]+9*(1-p)];
}
function addedChestBody(base: Body3,type: string,p: number): Body3 {
  const bar=["incline-bench-press","barbell-bench-press"].includes(type),cable=type==="cable-machine";
  if(!bar&&!cable)return base;
  const angle=(cable?82:type==="incline-bench-press"?30:0)*Math.PI/180;
  const up:V3=[0,Math.sin(angle),(cable?1:-1)*Math.cos(angle)],hip:V3=[0,cable?38:type === "incline-bench-press"?SMITH_INCLINE.hipY:24,type === "incline-bench-press"?SMITH_INCLINE.hipZ:0];
  const shoulder=add3(hip,mul3(up,26)),forward=unit3(cross3([1,0,0],up));
  const arms=[-1,1].map(side=>{
    const root=add3(add3(shoulder,[side*9,0,0]),add3(mul3(up,-4.8),mul3(forward,.4)));
    if(bar)return solveBone3(root,type === "incline-bench-press" ? smithInclineGrip(side,p) : freeBenchGrip(type,side,p),HUMAN_SEGMENTS.upperArm,HUMAN_SEGMENTS.forearmGrip,[side*.5,-1,.4]);
    const a=(65-61.5*p)*Math.PI/180,b=a-25*Math.PI/180;
    const direction=(angle:number):V3=>add3([side*Math.sin(angle),0,0],mul3(forward,Math.cos(angle)));
    const elbow=add3(root,mul3(direction(a),HUMAN_SEGMENTS.upperArm));
    return [root,elbow,add3(elbow,mul3(direction(b),HUMAN_SEGMENTS.forearmGrip))] as Bone3;
  });
  const legs=[-1,1].map(side=>solveBone3(add3(hip,[side*5.2,0,0]),[side*8,2,cable?(side===-1?12:-7):19],20,21,[0,.3,1]));
  return {...base,hip,shoulder,head:add3(shoulder,mul3(up,8.4)),spine:[hip,shoulder],arms,legs,right:[1,0,0],forward};
}
export const DIP_FINISH = Object.freeze({ bottomY:43, topY:57.8, maxUpperBackDegrees:8 });
export function dipFinishAmount(value: number) {
  const t=clampProgress((clampProgress(value)-.65)/.35);
  return t*t*(3-2*t);
}
function chestLessonBody(base: Body3, type: string, p: number): Body3 {
  if (!["dumbbell-heavy", "chest-dip", "incline-hammer-press"].includes(type)) return base;
  const dip = type === "chest-dip", dumbbell = type === "dumbbell-heavy";
  const angle = (dip ? 75 : dumbbell ? 30 : 70) * Math.PI / 180;
  const up: V3 = [0, Math.sin(angle), (dip ? 1 : -1) * Math.cos(angle)];
  const hip: V3 = dip ? [0, DIP_FINISH.bottomY + (DIP_FINISH.topY-DIP_FINISH.bottomY)*p, -4] : [0, dumbbell ? 24 : 30, 0];
  const finish=dip?dipFinishAmount(p):0;
  const upperAngle=angle-finish*DIP_FINISH.maxUpperBackDegrees*Math.PI/180;
  const upperUp:V3=dip?[0,Math.sin(upperAngle),Math.cos(upperAngle)]:up;
  const middle=add3(hip,mul3(up,HUMAN_SEGMENTS.torso*.5));
  const shoulder=dip?add3(middle,mul3(upperUp,HUMAN_SEGMENTS.torso*.5)):add3(hip,mul3(up,HUMAN_SEGMENTS.torso));
  const forward = unit3(cross3([1, 0, 0], upperUp));
  const arms = [-1, 1].map(side => {
    const root = add3(add3(shoulder, [side * 9, 0, 0]), add3(mul3(upperUp, -4.8), mul3(forward, .4)));
    if (dumbbell) {
      const direction = unit3(mix3([side * 10, -3.5, 6], [side * 1.6, 12.4, 2.6], p));
      const elbow = add3(root, mul3(direction, HUMAN_SEGMENTS.upperArm));
      return [root, elbow, add3(elbow, [0, HUMAN_SEGMENTS.forearmGrip, 0])] as Bone3;
    }
    return solveBone3(root, dip ? [side * 13, 50, 8] : inclineHammerGrip(side, p),
      HUMAN_SEGMENTS.upperArm, HUMAN_SEGMENTS.forearmGrip, dip ? [side * .4, 0, -1] : [side * .3, -1, 0]);
  });
  const legs = [-1, 1].map(side => {
    const root = add3(hip, [side * 5.2, 0, 0]);
    if (dip) {
      const knee = add3(root, [0, -19, -Math.sqrt(39)]);
      return [root, knee, add3(knee, [0, Math.sqrt(39), -Math.sqrt(402)])] as Bone3;
    }
    return solveBone3(root, [side * 8, 2, dumbbell ? 19 : 20], 20, 21, [0, .3, 1]);
  });
  return { ...base, hip, shoulder, head: add3(shoulder, mul3(upperUp, 8.4)), spine: dip ? [hip,middle,shoulder] : [hip, shoulder],
    arms, legs, right: [1, 0, 0], forward };
}
function photoLegBody(base: Body3, type: string, p: number, variant?: LegPressVariant): Body3 {
  if (type !== "leg-press" && type !== "leg-extension" && type !== "hip-adduction") return base;
  const seated = type === "leg-press" && variant === "seated";
  const hip: V3 = type === "leg-press" ? seated ? [0, 30 + 2 * p, 12 - 10 * p] : [0, 21, 0] : type === "leg-extension" ? [0, 29, 0] : [0, 32, 0];
  const up = type === "hip-adduction" ? [0, 1, 0] as V3 : type === "leg-press" && !seated ? unit3([0, 1, -.7]) : unit3([0, 1, -.28]);
  const shoulder = add3(hip, mul3(up, HUMAN_SEGMENTS.torso));
  const forward = unit3(cross3([1, 0, 0], up));
  const legs = [-1, 1].map(side => {
    const root = add3(hip, [side * 5.2, 0, 0]);
    if (type === "leg-press") return solveBone3(root, seated ? [side * 8, 12, 37] : [side * 8, 37 + 10 * p, 19 + 10 * p], 20, 21, [0, 1, -.25]);
    if (type === "leg-extension") {
      const knee = add3(root, [0, -1, Math.sqrt(399)]);
      const angle = (8 + 72 * p) * Math.PI / 180;
      return [root, knee, add3(knee, [0, -21 * Math.cos(angle), 21 * Math.sin(angle)])] as Bone3;
    }
    const angle = (55 - 47 * p) * Math.PI / 180;
    const knee = add3(root, [side * Math.sqrt(399) * Math.sin(angle), -1, Math.sqrt(399) * Math.cos(angle)]);
    return [root, knee, add3(knee, [0, -21, 0])] as Bone3;
  });
  const arms = [-1, 1].map(side => {
    const start = add3(add3(shoulder, [side * 9, 0, 0]), add3(mul3(up, -4.8), mul3(forward, .4)));
    return solveBone3(start, add3(hip, [side * 11, 1, 4]), HUMAN_SEGMENTS.upperArm, HUMAN_SEGMENTS.forearmGrip, [side, -1, 0]);
  });
  return { ...base, hip, shoulder, head: add3(shoulder, mul3(up, 8.4)), spine: [hip, shoulder], arms, legs, right: [1, 0, 0], forward };
}
export function body3d(raw: string, value: number, variant?: LegPressVariant): Body3 {
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
  return photoLegBody(addedChestBody(chestLessonBody(proportionedBody({
    head,
    shoulder,
    hip,
    arms,
    legs,
    spine,
    right,
    forward,
    facing
  }, type, p), type, p), type, p), type, p, variant);
}
export function feet3d(type: string, body: Body3, variant?: LegPressVariant): Foot3[] {
  return body.legs.map(([, knee, ankle]) => {
    let up: V3 = [0, 1, 0],
      toe: V3 = [0, 0, body.facing];
    if (type === "seated-row") {
      up = unit3([0, 0.8, -0.6]);
      toe = unit3([0, 0.6, 0.8]);
    }
    if (type === "leg-press") {
      up = variant === "seated" ? unit3([0, .1, -1]) : unit3([0, -1, -1]);
      toe = variant === "seated" ? unit3([0, 1, .1]) : unit3([0, 1, -1]);
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
export function trainingFrame3d(raw: string, progress: number, variant?: LegPressVariant): TrainingFrame3 {
  const type = motionType(raw),
    p = clampProgress(progress),
    body = body3d(type, p, variant),
    feet = feet3d(type, body, variant),
    equipment: Primitive3[] = [];
  const {
      hip,
      shoulder,
      right,
      forward
    } = body,
    up = unit3(sub3(shoulder, hip));
  const grips: HandGrip3[] = [];
  const box = (id: string, a: V3, size: V3, color: Primitive3["color"] = "metal", axes?: Primitive3["axes"]) => equipment.push({
    id,
    kind: color === "pad" ? "pad" : "box",
    a,
    size,
    color,
    axes
  });
  const beam = (id: string, a: V3, b: V3, r = 1.4, color: Primitive3["color"] = "metal") => equipment.push({
    id,
    kind: color === "metal" || color === "satin" ? "tube" : "beam",
    a,
    b,
    size: color === "metal" || color === "satin" ? [r * 2, r * 2, r * 2] : [r, r, r],
    color
  });
  const axial = (id: string, kind: "cylinder" | "plate" | "pulley" | "bolt", a: V3, axis: V3, radius: number, thickness: number, color: Primitive3["color"] = "metal") => {
    const y = unit3(axis);
    const x = unit3(cross3(y, Math.abs(y[2]) < .9 ? [0, 0, 1] : [0, 1, 0]));
    equipment.push({ id, kind, a, size: [radius, thickness, radius], color, axes: [x, y, unit3(cross3(x, y))] });
  };
  const curve = (id: string, origin: V3, points: readonly V3[], section: number, color: Primitive3["color"], axes?: Primitive3["axes"]) => equipment.push({ id, kind: "curve", a: origin, points, section, size: [1, 1, 1], color, axes });
  const plate = (id: string, centre: V3, radius = 9.5, thickness = 1.7) => {
    axial(id, "plate", centre, right, radius, thickness, "rubber");
    axial(id + "-hub", "cylinder", centre, right, radius * .14, thickness + .25, "chrome");
  };
  const pad = (id: string, a: V3, b: V3, width = 25, thickness = 4, post = true) => {
    const along = unit3(sub3(b, a));
    box(id, mix3(a, b, 0.5), [width, length3(sub3(b, a)), thickness], "pad", [right, along, unit3(cross3(right, along))]);
    // A shallow rear shell and edge piping give upholstery a visible depth.
    const normal = unit3(cross3(right, along));
    const outward = Math.abs(normal[1]) > .7 && normal[1] < 0 ? mul3(normal, -1) : normal;
    box(id + "-shell", add3(mix3(a, b, .5), mul3(outward, -thickness * .44)), [width * .96, length3(sub3(b, a)) * .97, .8], "metal", [right, along, normal]);
    for (const side of [-1, 1]) {
      const edge = add3(mul3(right, side * width * .43), mul3(outward, thickness * .46));
      beam(id + "-seam" + side, add3(a, edge), add3(b, edge), .11, "rubber");
    }
    if (post) beam(id + "-support", mix3(a, b, 0.5), [mix3(a, b, 0.5)[0], 2, mix3(a, b, 0.5)[2]], 1.5);
  };
  const floorFrame = (id: string, z: number, width = 36, depth = 30, x = 0) => {
    for (const s of [-1, 1]) {
      beam(id + "-foot" + s, [x + s * width / 2, 1.8, z - depth / 2], [x + s * width / 2, 1.8, z + depth / 2], 1.5);
      for (const end of [-1, 1]) box(id + "-rubber" + s + end, [x + s * width / 2, .65, z + end * depth / 2], [5, 1.3, 6], "rubber");
    }
    beam(id + "-cross", [x - width / 2, 2, z], [x + width / 2, 2, z], 1.5);
  };
  const seat = () => {
    const c = add3(hip, mul3(forward, 3));
    box("seat", [c[0], hip[1] - 6, c[2]], [["chest-press", "pec-fly"].includes(type) ? 20 : 25, 4, 18], "pad");
    beam("seat-post", [0, 2, c[2]], [0, hip[1] - 8, c[2]], 2);
    box("seat-undertray", [c[0], hip[1] - 8.4, c[2]], [22, 1.2, 15]);
    axial("seat-adjustment-knob", "cylinder", [4, hip[1] - 11, c[2]], right, 1, 2, "rubber");
    floorFrame("seat-base", c[2]);
  };
  const back = () => {
    const rest = type === "abdominal-crunch" ? body3d(type, 0) : body,
      u = unit3(sub3(rest.shoulder, rest.hip));
    pad("backrest", add3(add3(rest.hip, mul3(u, 2)), mul3(rest.forward, -7.2)), add3(add3(type === "dumbbell-heavy" ? rest.head : rest.shoulder, mul3(u, type === "dumbbell-heavy" ? 1 : 2)), mul3(rest.forward, -7.2)), ["dumbbell-heavy", "incline-hammer-press", "incline-smith", "chest-press", "pec-fly"].includes(type) ? 14 : 25, 4, type !== "hack-squat" && !(type === "leg-press" && variant === "seated"));
  };
  const stack = (id: string, x: number, z: number, lift = p * 9, height = 75) => {
    box(id + "-back", [x, height / 2, z - 2.5], [14, height, 2]);
    beam(id + "-rod-a", [x - 4, 3, z], [x - 4, height - 3, z], 0.6, "chrome");
    beam(id + "-rod-b", [x + 4, 3, z], [x + 4, height - 3, z], 0.6, "chrome");
    for (let i = 0; i < 10; i++) box(id + "-weight" + i, [x, 4 + i * 2.2 + (i >= 4 ? lift : 0), z], [11, 1.8, 7], "metal");
    box(id + "-top", [x, height, z], [16, 3, 12]);
    for (const side of [-1, 1]) beam(id + "-side" + side, [x + side * 8, 2, z], [x + side * 8, height, z], 1.2);
    beam(id + "-lift-cable", [x, 25 + lift, z], [x, height - 3, z], .16, "rubber");
    axial(id + "-selector", "cylinder", [x + 1, 12.8 + lift, z + 4], [0, 0, 1], .65, 2, "chrome");
    axial(id + "-selector-knob", "cylinder", [x + 1, 12.8 + lift, z + 5], [0, 0, 1], 1.05, .8, "rubber");
    floorFrame(id + "-floor", z, 20, 18, x);
  };
  // Proportions traced from the two supplied photos, not manufacturer CAD.
  const photoStack = (id: string, x: number, z: number, height: number, lift: number) => {
    box(id + "-back", [x, height / 2, z - 3], [17, height - 4, 1.4], "satin");
    for (const side of [-1, 1]) {
      beam(id + "-guide" + side, [x + side * 3.5, 4, z + 1], [x + side * 3.5, height - 5, z + 1], .5, "chrome");
      box(id + "-foot" + side, [x + side * 9, .7, z], [7, 1.4, 12], "rubber");
    }
    curve(id + "-frame", [x, 0, z], [[-9, 3, 0], [-9, height, 0], [9, height, 0], [9, 3, 0]], 3.2, "satin");
    beam(id + "-base", [x - 9, 3, z], [x + 9, 3, z], 1.6, "satin");
    for (let i = 0; i < 15; i++) {
      const y = 5 + i * 1.55 + (i >= 6 ? lift : 0);
      box(id + "-weight" + i, [x, y, z + 1], [11.5, 1.22, 6], "metal");
      axial(id + "-pin-hole" + i, "cylinder", [x, y, z + 4.1], [0, 0, 1], .25, .12, "rubber");
    }
    const selectedY = 5 + 6 * 1.55 + lift;
    axial(id + "-selector", "cylinder", [x, selectedY, z + 4.8], [0, 0, 1], .65, 1.5, "chrome");
    axial(id + "-knob", "cylinder", [x, selectedY, z + 5.6], [0, 0, 1], .95, .7, "rubber");
    beam(id + "-lift-cable", [x, 28 + lift, z + 1], [x, height - 3, z + 1], .15, "rubber");
    box(id + "-instruction-panel", [x, height - 7, z + 3], [15, 6, .6], "rubber");
  };
  const cable = (id: string, a: V3, b: V3) => beam(id, a, b, 0.18, "rubber");
  const handle = (id: string, hand: V3, axis: V3 = right) => {
    grips.push({ centre: hand, axis: unit3(axis), radius: 1.05 });
    const a = add3(hand, mul3(axis, -3)),
      b = add3(hand, mul3(axis, 3));
    beam(id, a, b, 1.05, "rubber");
    for (let i = -2; i <= 2; i++) axial(id + "-rib" + i, "cylinder", add3(hand, mul3(axis, i)), axis, 1.09, .12, "rubber");
    for (const end of [-1, 1]) axial(id + "-end" + end, "cylinder", add3(hand, mul3(axis, end * 3)), axis, 1.15, .25, "chrome");
  };
  const pivot = (id: string, a: V3, axis: V3 = right) => {
    axial(id, "cylinder", a, axis, 2.6, 3.4);
    axial(id + "-bearing", "cylinder", a, axis, 1.7, 3.8, "rubber");
    for (const end of [-1, 1]) axial(id + "-bolt" + end, "bolt", add3(a, mul3(axis, end * 2)), axis, .9, .6, "chrome");
  };
  const pulley = (id: string, at: V3, axis: V3 = right) => {
    axial(id, "pulley", at, axis, 3, 1.5, "rubber");
    for (const end of [-1, 1]) {
      axial(id + "-cheek" + end, "cylinder", add3(at, mul3(axis, end * 1.2)), axis, 1.7, .3);
      axial(id + "-bolt" + end, "bolt", add3(at, mul3(axis, end * 1.5)), axis, .7, .4, "chrome");
    }
  };
  const platform = (id: string, contact: V3, normal: V3, toe: V3, width = 27, depth = 15) => {
    const lateral = unit3(cross3(normal, toe));
    box(id, add3(contact, mul3(normal, -1.5)), [width, 3, depth], "rubber", [lateral, normal, toe]);
    if (contact[1] > 4 && type !== "leg-press" && type !== "hack-squat") beam(id + "-support", add3(contact, mul3(normal, -3)), [contact[0], 1, contact[2]], 1.4);
    for (let i = -2; i <= 2; i++) beam(id + "-tread" + i, add3(add3(contact, mul3(toe, i * 2)), mul3(lateral, -width * 0.4)), add3(add3(contact, mul3(toe, i * 2)), mul3(lateral, width * 0.4)), 0.16, "metal");
  };
  const hands = body.arms.map(a => a[2]);
  const seated = ["incline-hammer-press", "chest-press", "pec-fly", "lat-pulldown", "seated-row", "shoulder-press", "abdominal-crunch", "leg-extension", "seated-leg-curl", "hip-abduction", "hip-adduction", "seated-calf-raise", "lateral-raise", "preacher-curl", "rear-delt-fly"].includes(type);
  if (seated) seat();
  if (["incline-hammer-press", "chest-press", "pec-fly", "lat-pulldown", "shoulder-press", "abdominal-crunch", "leg-extension", "seated-leg-curl", "hip-abduction", "hip-adduction"].includes(type)) back();
  if (type === "incline-smith" || type === "dumbbell-heavy" || type === "leg-press") {
    back();
    pad("bench-seat", add3(hip, mul3(forward, -3)), add3(hip, mul3(forward, 10)), ["incline-smith", "dumbbell-heavy"].includes(type) ? 16 : 25, 4, !(type === "leg-press" && variant === "seated"));
    if (!(type === "leg-press" && variant === "seated")) floorFrame("bench", hip[2]);
  }
  const cabinetZ = hip[2] - 18;
  if (!["incline-bench-press", "barbell-bench-press", "chest-dip", "incline-hammer-press", "chest-press", "pec-fly", "leg-extension", "hip-adduction", "cable-machine", "power-rack", "incline-smith", "dumbbell-heavy", "hack-squat", "leg-press", "back-extension", "assisted-pull-up", "assisted-dip"].includes(type)) stack("stack", 26, cabinetZ);
  switch (type) {
    case "chest-press": {
      const reference = body3d(type, 0);
      const arc = chestPressArc(reference.arms[0][0], p);
      const rest = chestPressArc(reference.arms[0][0], 0);
      const rotation = arc.angle - rest.angle;
      const towerX = -29, towerZ = reference.hip[2] - 17;
      const lift = Math.abs(rotation) * 14;
      photoStack("press-stack", towerX, towerZ, 70, lift);
      for (const side of [-1, 1]) {
        const axis: V3 = [side * 22, rest.pivot[1], rest.pivot[2]];
        const hand = hands[side === -1 ? 0 : 1];
        const tip: V3 = [side * 22, hand[1], hand[2]];
        const localTip: V3 = [0, rest.hand[1] - axis[1], rest.hand[2] - axis[2]];
        curve("press-arm" + side, axis, [[0, 0, 0], [0, 15, -2], [0, 27, 9], [0, localTip[1] - 3, localTip[2] + 3], localTip], 3.2, "metal", [[1, 0, 0], [0, Math.cos(rotation), -Math.sin(rotation)], [0, Math.sin(rotation), Math.cos(rotation)]]);
        beam("press-grip-link" + side, tip, hand, .8, "chrome");
        handle("press-grip" + side, hand, unit3([side * .9, .25, -.15]));
        pivot("press-axis" + side, axis);
        beam("press-bearing-support" + side, [side * 22, 3, axis[2]], axis, 2, "satin");
        beam("press-base" + side, [side * 22, 2, towerZ - 4], [side * 22, 2, 14], 1.8, "satin");
        for (const z of [towerZ - 4, 14]) box("press-foot" + side + z, [side * 22, .7, z], [7, 1.4, 8], "rubber");
        box("press-stop" + side, [side * 22, 4, axis[2] - 4], [4, 2, 5], "rubber");
      }
      beam("press-base-front", [-22, 3, 12], [22, 3, 12], 1.8, "satin");
      beam("press-base-rear", [towerX - 9, 3, towerZ], [22, 3, towerZ], 1.8, "satin");
      beam("press-seat-rail", [0, 3, towerZ], [0, 3, 20], 1.6, "satin");
      pulley("press-drive-pulley", [-22, 7, rest.pivot[2]]);
      pulley("press-stack-pulley", [towerX, 7, towerZ + 1]);
      cable("press-drive-cable", [-22, 7, rest.pivot[2] - 3], [towerX, 7, towerZ + 4]);
      beam("press-pedal-link", [-20, 5, rest.pivot[2]], [-12, 5, 18], .8);
      box("press-start-pedal", [-12, 5, 18], [6, 1.5, 7], "rubber");
      break;
    }
    case "shoulder-press":
    case "abdominal-crunch":
      {
        const axle: V3 = type === "shoulder-press" ? [0, 54, -28] : [0, 60, -22];
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
    case "pec-fly": {
      const reference = body3d(type, 0);
      const towerZ = reference.hip[2] - 18;
      const angle = pecFlyArc(reference.arms[0][0], -1, p).angle;
      photoStack("fly-stack", 0, towerZ, 84, (PEC_FLY.startDegrees * Math.PI / 180 - angle) * 6);
      for (const side of [-1, 1]) {
        const index = side === -1 ? 0 : 1;
        const arc = pecFlyArc(reference.arms[index][0], side, p);
        const axis = arc.pivot, hand = hands[index];
        const direction = unit3([side * Math.sin(arc.angle), 0, Math.cos(arc.angle)]);
        const root = add3(axis, add3(mul3(direction, 6), [0, 3, 0]));
        const tip: V3 = [hand[0], 83, hand[2]];
        beam("fly-overhead-support" + side, [side * 9, 86, towerZ], add3(axis, [0, 3, 0]), 1.7, "satin");
        beam("fly-arm-root" + side, axis, root, 1.4);
        beam("fly-arm" + side, root, tip, 1.4);
        beam("fly-hanger" + side, tip, [hand[0], hand[1] - 4, hand[2]], 1.15);
        const inward = unit3([-side * Math.cos(arc.angle), 0, Math.sin(arc.angle)]);
        beam("fly-lower-grip" + side, add3(hand, [0, -4, 0]), add3(add3(hand, [0, -4, 0]), mul3(inward, 2.2)), .8, "rubber");
        handle("fly-grip" + side, hand, [0, 1, 0]);
        pivot("fly-axis" + side, axis, [0, 1, 0]);
        axial("fly-cam" + side, "pulley", add3(axis, [0, 2, 0]), [0, 1, 0], 4, 1.2, "metal");
        axial("fly-moving-pin" + side, "bolt", add3(add3(axis, [0, 3, 0]), mul3(direction, 3)), [0, 1, 0], .65, .6, "chrome");
        cable("fly-upper-cable" + side, add3(axis, [0, 2.6, 0]), [0, 85.6, towerZ + 1]);
        beam("fly-rear-leg" + side, [side * 9, 3, towerZ], [side * 20, 2, towerZ - 15], 1.6, "satin");
        beam("fly-rear-brace" + side, [side * 9, 22, towerZ], [side * 20, 2, towerZ - 15], 1.4, "satin");
        box("fly-rear-foot" + side, [side * 20, .7, towerZ - 15], [7, 1.4, 8], "rubber");
      }
      beam("fly-seat-pedestal", [0, 3, 8], [0, hip[1] - 8, hip[2] + 3], 1.7, "satin");
      beam("fly-forward-base", [0, 2, towerZ], [0, 2, 23], 1.7, "satin");
      box("fly-forward-foot", [0, .7, 23], [8, 1.4, 7], "rubber");
      break;
    }
    case "rear-delt-fly":
      {
        for (const s of [-1, 1]) {
          const a: V3 = [s * 12, shoulder[1] + 8, 0];
          beam("fly-column" + s, [s * 20, 2, -12], a, 2);
          beam("fly-arm" + s, a, hands[s === -1 ? 0 : 1], 1.5);
          pivot("fly-axis" + s, a, [0, 1, 0]);
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
          pulley("pulley" + s, a);
          const hand=hands[s === -1 ? 0 : 1], eye=add3(hand,[s*4,1,-1]);
          cable("crossover" + s,a,eye);
          handle("crossover-grip" + s,hand,[0,1,0]);
          beam("crossover-handle-top"+s,eye,add3(hand,[0,3,0]),.45,"chrome");
          beam("crossover-handle-bottom"+s,eye,add3(hand,[0,-3,0]),.45,"chrome");
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
          const z = hands[0][2];
          beam("lat-overhead-boom", [0, 83, -12], [0, 83, z - 3], 1.7);
          pulley("lat-front-pulley", [0, 80, z - 3]);
          pulley("lat-rear-pulley", [0, 80, -12]);
          cable("lat-cable", [0, 80, z], [0, barY, z]);
          cable("lat-overhead-cable", [0, 83, z - 3], [0, 83, -12]);
          for (const s of [-1, 1]) {
            beam("thigh-pad" + s, [s * 6 - 4, hip[1] + 3, 12], [s * 6 + 4, hip[1] + 3, 12], 2.8, "pad");
            beam("thigh-bracket" + s, [s * 12, hip[1] + 3, 12], [s * 12, 5, 12], 1.4);
            beam("lat-bar-wing" + s, [s * 17, barY, z], [s * 24, barY - 2, z], .8, "chrome");
          }
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
        pulley("row-pulley", anchor);
        feet.forEach((f, i) => platform("row-foot" + i, f.contact, f.up, f.toe, 11, 10));
        hands.forEach((h, i) => handle("row-handle" + i, h, [0, 1, 0]));
        break;
      }
    case "incline-smith":
    case "incline-bench-press":
      {
        const photo = type === "incline-bench-press", bar = average3(hands);
        const guideZ = photo ? SMITH_INCLINE.guideZ : SMITH_PRESS.guideZ;
        const plateX=photo?44:37,barHalf=photo?54:47;
        const stopY=photo?SMITH_INCLINE.startY-6:20;
        const steel = (id: string, a: V3, b: V3, width = 3.5, depth = width) => {
          const along = unit3(sub3(b, a));
          const side = Math.abs(along[0]) < 0.9 ? unit3(cross3(along, [1, 0, 0])) : unit3(cross3(along, [0, 1, 0]));
          box(id, mix3(a, b, 0.5), [width, length3(sub3(b, a)), depth], photo ? "satin" : "metal", [side, along, unit3(cross3(side, along))]);
        };
        steel("smith-top", [-40, 89, guideZ], [40, 89, guideZ], 5);
        steel("smith-base-cross", [-40, 2, guideZ-35], [40, 2, guideZ-35], 5);
        for (const side of [-1, 1]) {
          steel("smith-upright" + side, [side * 39, 2, guideZ], [side * 39, 89, guideZ], 5);
          steel("smith-base" + side, [side * 39, 2, guideZ-39], [side * 39, 2, guideZ+26], 5);
          steel("smith-brace" + side, [side * 39, 4, guideZ-36], [side * 39, 70, guideZ], 3.5);
          beam("smith-guide" + side, [side * 33, 14, guideZ], [side * 33, 83, guideZ], 0.75, "chrome");
          // Fixed catches and lower safety stops, separate from the moving carriage.
          for (let y = 20; y <= 78; y += 6) box("smith-catch" + side + y, [side * 36, y, guideZ-3], [3, 1.5, 4], "chrome");
          box("smith-stop" + side, [side * 33, stopY, guideZ], [4.5, 4, 5], "rubber");
          box("smith-carriage" + side, [side * 33, bar[1], guideZ], [4, 8, 4], "metal");
          for (const end of [-1, 1]) axial("smith-carriage-bearing" + side + end, "cylinder", [side * 33, bar[1] + end * 4, guideZ], [0, 1, 0], 1.35, .5, "chrome");
          steel("smith-carriage-link" + side, [side * 29, bar[1], guideZ], [side * 33, bar[1], guideZ], 2);
          steel("smith-carriage-hook" + side, [side * 33, bar[1] - 1, guideZ-2], [side * 36, bar[1] - 1, guideZ-3], 1.2);
          beam("smith-sleeve" + side, [side * 34, bar[1], guideZ], [side * barHalf, bar[1], guideZ], 1.1, "chrome");
          for (let i = 0; i < 2; i++) {
            const x = side * (plateX + i * 2.1);
            plate("smith-plate" + side + i, [x, bar[1], guideZ]);
          }
          beam("smith-collar" + side, [side * (photo?50:43), bar[1], guideZ], [side * (photo?51.5:44.5), bar[1], guideZ], 1.8, "metal");
          for (const y of [23, 48]) {
            beam("smith-storage-horn" + side + y, [side * 39, y, guideZ-30], [side * (photo?54:48), y, guideZ-30], 0.9, "chrome");
            plate("smith-storage-plate" + side + y, [side * (photo?46:42), y, guideZ-30], 8);
          }
          for (const z of [guideZ-38, guideZ+25]) box("smith-foot" + side + z, [side * 39, 0.7, z], [8, 1.4, 8], "rubber");
          for (const y of [5, 85]) axial("smith-frame-bolt" + side + y, "bolt", [side * 41.7, y, guideZ], right, .8, .7, "chrome");
          if(photo)handle("smith-bar-grip"+side,hands[side === -1 ? 0 : 1]);
        }
        beam("barbell", [-barHalf, bar[1], guideZ], [barHalf, bar[1], guideZ], 0.65, "chrome");
        if(photo){
          // A full head/back pad and separate near-horizontal seat, as in the photo.
          const backStart=add3(add3(hip,mul3(up,-8)),mul3(forward,-7.2));
          const backEnd=add3(add3(body.head,mul3(up,1)),mul3(forward,-7.2));
          pad("smith-incline-back",backStart,backEnd,14,4,false);
          pad("smith-incline-seat",[0,hip[1]-5.6,hip[2]+6],[0,hip[1]-5.6,hip[2]-4],14,4,false);
          const lowerStart=add3(backStart,mul3(forward,-3.3)),lowerEnd=add3(backEnd,mul3(forward,-3.3));
          steel("smith-bench-spine",lowerStart,lowerEnd,2.5);
          steel("smith-bench-adjuster",[0,3,-24],mix3(lowerStart,lowerEnd,.7),2.3);
          steel("smith-bench-front-post",[0,2,8],[0,hip[1]-9,8],2.5);
          pivot("smith-bench-hinge",lowerStart);
          floorFrame("smith-bench-base",-8,26,55);
        }else{
        // Bench adjustment hardware stays fixed while the guided bar moves.
        const rest = mix3(hip, shoulder, 0.65);
        steel("smith-bench-spine", add3(hip, [0, -7, -7]), add3(rest, [0, -5, -9]), 3);
        steel("smith-bench-adjuster", [0, 4, hip[2] - 5], add3(rest, [0, -7, -9]), 2.5);
        pivot("smith-bench-hinge", add3(hip, [0, -7, -7]));
        }
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
          for (let i = 0; i < 3; i++) plate("plate" + s + i, add3(centre, [s * (33 + i * 1.6), 0, 0]), 8, 1.5);
        }
        floorFrame("rack-base", z, 70, 40);
        break;
      }
    case "barbell-bench-press": {
      const top=freeBenchGrip(type,1,1),bottom=freeBenchGrip(type,1,0);
      pad("free-bench-back",FLAT_BENCH.foot,FLAT_BENCH.head,14,4,false);
      beam("free-bench-spine",[0,FLAT_BENCH.frameY,8],[0,FLAT_BENCH.frameY,-35.4],1.5);
      for(const z of [-24,7])beam("free-bench-support"+z,[0,2,z],[0,FLAT_BENCH.frameY,z],2);
      floorFrame("free-bench-base",-8,28,55);
      for(const side of [-1,1]){
        const x=side*27,z=top[2]-7;
        beam("free-rack-post"+side,[x,2,z],[x,top[1]+12,z],2.8);
        floorFrame("free-rack-foot"+side,z,10,45,x);
        beam("free-jhook"+side,[x,top[1]-2,z],[x,top[1]-2,z+4],1.3,"rubber");
        beam("free-safety"+side,[x,bottom[1]-4,z],[x,bottom[1]-4,17],1.5,"satin");
        handle("free-bar-grip"+side,hands[side===-1?0:1]);
        for(let i=0;i<2;i++)plate("free-bar-plate"+side+i,[side*(32+i*1.6),hands[0][1],hands[0][2]],7.5,1.5);
      }
      beam("free-barbell",add3(average3(hands),[-41,0,0]),add3(average3(hands),[41,0,0]),.65,"chrome");
      break;
    }
    case "chest-dip": {
      for (const side of [-1, 1]) {
        const x = side * 13;
        beam("dip-front-post" + side, [x, 2, 16], [x, 50, 16], 2.4);
        beam("dip-back-post" + side, [x, 2, -10], [x, 50, -10], 2.4);
        beam("dip-parallel-bar" + side, [x, 50, -10], [x, 50, 20], 1.05, "chrome");
        handle("dip-grip" + side, [x, 50, 8], [0, 0, 1]);
        beam("dip-diagonal" + side, [x, 3, -10], [x, 38, 16], 1.6);
      }
      floorFrame("dip-base", 4, 40, 44);
      box("dip-entry-step", [0, 10, 23], [17, 3, 8], "rubber");
      break;
    }
    case "incline-hammer-press": {
      const angle = p * Math.PI / 12;
      const rotate = (side: number, y: number, z: number): V3 =>
        [side * 26, 86 + y * Math.cos(angle) + z * Math.sin(angle), -9 + z * Math.cos(angle) - y * Math.sin(angle)];
      for (const side of [-1, 1]) {
        const axis: V3 = [side * 26, 86, -9], hand = hands[side === -1 ? 0 : 1];
        beam("hammer-upright" + side, [side * 26, 2, -20], axis, 3.2);
        beam("hammer-brace" + side, [side * 26, 2, 24], [side * 26, 63, -12], 2.6);
        pivot("hammer-pivot" + side, axis);
        const tip = rotate(side, -30, 21), bend = rotate(side, -20, 7);
        beam("hammer-upper-arm" + side, axis, bend, 3);
        beam("hammer-lower-arm" + side, bend, tip, 3);
        beam("hammer-grip-link" + side, tip, hand, 1.4, "chrome");
        handle("hammer-grip" + side, hand);
        const horn = rotate(side, -15, 15);
        beam("hammer-loading-horn" + side, horn, add3(horn, [side * 11, 0, 0]), .8, "chrome");
        for (let i = 0; i < 2; i++) plate("hammer-plate" + side + i, add3(horn, [side * (5 + i * 1.6), 0, 0]), 7.5, 1.5);
      }
      floorFrame("hammer-base", 0, 64, 58);
      beam("hammer-top-cross", [-26, 86, -9], [26, 86, -9], 2.4);
      break;
    }
    case "dumbbell-heavy":
      {
        hands.forEach((h, i) => {
          handle("dumbbell-grip" + i, h);
          beam("dumbbell-bar" + i, add3(h, [-7, 0, 0]), add3(h, [7, 0, 0]), 0.7, "chrome");
          for (const s of [-1, 1]) box("dumbbell" + i + s, add3(h, [s * 6, 0, 0]), [4, 9, 9], "rubber");
        });
        break;
      }
    case "leg-press":
    case "hack-squat":
      {
        if (type === "leg-press" && variant === "seated") {
          photoStack("seated-press-stack", -27, -15, 72, p * 7.8);
          const direction = unit3([0, -.2, 1]);
          for (const side of [-1, 1]) {
            const a: V3 = [side * 15, 26, -8], b: V3 = [side * 15, 18.8, 28];
            beam("seated-press-rail" + side, a, b, 1.8, "satin");
            beam("seated-press-guide" + side, add3(a, [side * 2.5, 1.2, 0]), add3(b, [side * 2.5, 1.2, 0]), .8, "chrome");
            const carriage = [side * 17.5, hip[1] - 6.8, hip[2]] as V3;
            box("seated-press-bearing" + side, carriage, [4, 8, 4], "metal", [right, direction, unit3(cross3(right, direction))]);
            beam("seated-press-seat-link" + side, carriage, add3(hip, [side * 9, -7, 0]), 1.5);
            beam("seated-press-foot-post" + side, [side * 20, 2, 40], [side * 20, 26, 40], 1.7, "satin");
            beam("seated-press-brace" + side, [side * 20, 2, 40], b, 1.6, "satin");
          }
          beam("seated-press-back-spine", add3(hip, [0, -7, -3]), add3(mix3(hip, shoulder, .55), mul3(forward, -9)), 1.5);
          const f = feet[0], centre = average3(feet.map(f => f.contact));
          platform("footplate", centre, f.up, f.toe, 35, 26);
          floorFrame("seated-press-base", 12, 46, 64);
          hands.forEach((h, i) => handle("seated-press-grip" + i, h));
          break;
        }
        const f = feet[0],
          centre = average3(feet.map(v => v.contact));
        platform("footplate", centre, f.up, f.toe, 38, 26);
        const a: V3 = type === "leg-press" ? [0, 7, 0] : [0, 2, -28],
          b: V3 = type === "leg-press" ? [0, 59, 52] : [0, 75, 45];
        const carriageCentre = type === "leg-press" ? centre : add3(hip, mul3(body.forward, -8));
        const railDirection = unit3(sub3(b, a));
        for (const s of [-1, 1]) {
          beam("sled-rail" + s, add3(a, [s * 20, 0, 0]), add3(b, [s * 20, 0, 0]), 1.8);
          const guideStart = add3(a, [s * 24, 0, 0]);
          const guideEnd = add3(b, [s * 24, 0, 0]);
          const slide = add3(guideStart, mul3(railDirection, dot3(sub3(carriageCentre, guideStart), railDirection)));
          beam("sled-guide" + s, guideStart, guideEnd, .8, "chrome");
          box("sled-bearing" + s, slide, [4, 9, 4], "metal", [right, railDirection, unit3(cross3(right, railDirection))]);
          beam("sled-carriage" + s, add3(carriageCentre, [s * 15, 0, 0]), slide, 1.8);
          for (const end of [-1, 1]) axial("sled-bearing-seal" + s + end, "cylinder", add3(slide, mul3(railDirection, end * 4.5)), railDirection, 1.25, .35, "rubber");
        }
        if (type === "hack-squat") {
          back();
          for (const s of [-1, 1]) box("shoulder-pad" + s, add3(shoulder, [s * 8, 2, -2]), [6, 4, 9], "pad");
        }
        floorFrame("sled", hip[2] + 8, 50, 75);
        for (const s of [-1, 1]) {
          const hub = add3(carriageCentre, [s * 26, -3, 5]);
          beam("sled-loading-horn" + s, add3(hub, [-s * 7, 0, 0]), add3(hub, [s * 5, 0, 0]), .95, "chrome");
          plate("sled-weight" + s, hub, 9);
        }
        hands.forEach((h, i) => handle("sled-seat-grip" + i, h));
        break;
      }
    case "leg-extension": {
      photoStack("extension-stack", -27, -17, 72, p * 8);
      const knees = average3(body.legs.map(l => l[1]));
      const shin = unit3(sub3(body.legs[0][2], body.legs[0][1]));
      const outward = unit3([0, shin[2], -shin[1]]);
      const roller = add3(mix3(knees, average3(body.legs.map(l => l[2])), .88), mul3(outward, 2.4));
      for (const side of [-1, 1]) {
        const axis = add3(knees, [side * 15, 0, 0]);
        pivot("extension-knee-axis" + side, axis);
        beam("extension-fixed-support" + side, [side * 15, 3, knees[2]], axis, 1.7, "satin");
        beam("extension-moving-crank" + side, axis, add3(roller, [side * 15, 0, 0]), 1.5);
      }
      beam("extension-roller", add3(roller, [-14, 0, 0]), add3(roller, [14, 0, 0]), 2.6, "pad");
      pulley("extension-cam", add3(knees, [-17, 0, 0]));
      cable("extension-drive", add3(knees, [-17, 2, 0]), [-27, 5, -17]);
      floorFrame("extension-base", 9, 43, 46);
      hands.forEach((h, i) => handle("extension-grip" + i, h));
      break;
    }
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
    case "hip-adduction": {
      photoStack("adductor-stack", -30, -17, 72, p * 8);
      axial("adductor-turntable", "cylinder", add3(hip, [0, -9, 0]), [0, 1, 0], 12, 3, "chrome");
      body.legs.forEach((leg, i) => {
        const side = i === 0 ? -1 : 1;
        const radial = unit3([leg[1][0] - leg[0][0], 0, leg[1][2] - leg[0][2]]);
        const normal = unit3([side * radial[2], 0, -side * radial[0]]);
        const padCentre = add3(add3(leg[1], mul3(normal, -3.5)), [0, -2, 0]);
        box("adductor-inner-pad" + i, padCentre, [3, 12, 9], "pad", [normal, [0, 1, 0], unit3(cross3(normal, [0, 1, 0]))]);
        const pivotAt = add3(leg[0], [0, -9, 0]);
        pivot("adductor-axis" + i, pivotAt, [0, 1, 0]);
        beam("adductor-swing-arm" + i, pivotAt, add3(leg[1], [0, -8, 0]), 1.6);
        beam("adductor-pad-stalk" + i, add3(leg[1], [0, -8, 0]), padCentre, 1.1);
        platform("adductor-foot" + i, feet[i].contact, feet[i].up, feet[i].toe, 10, 11);
        beam("adductor-foot-link" + i, add3(leg[1], [0, -8, 0]), feet[i].contact, 1.3);
      });
      floorFrame("adductor-base", 1, 48, 42);
      hands.forEach((h, i) => handle("adductor-grip" + i, h));
      break;
    }
    case "hip-abduction":

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
        pulley("pushdown-pulley", a);
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
    variant,
    grips,
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
export function camera3d(frame: TrainingFrame3, view: View3, focus: Focus3, orbit?: Orbit) {
  const body = frame.body, whole: V3 = [0, 42, 8];
  const target = focus === "hands" ? average3(body.arms.map(a => a[2])) : focus === "feet" ? average3(frame.contacts[2].points) : focus === "muscles" ? mix3(body.hip, body.shoulder, 0.6) : whole;
  const angles=normaliseOrbit(orbit??orbitForView(view)),yaw=angles.yaw*Math.PI/180,pitch=angles.pitch*Math.PI/180;
  const radius = focus === "whole" ? frame.type === "cable-machine" ? 160 : 135 : focus === "hands" ? 65 : focus === "feet" ? 65 : 75;
  const facing=!orbit&&(view === "above"||view === "below")?1:body.facing;
  return { target, position:add3(target,[Math.sin(yaw)*Math.cos(pitch)*radius*facing,Math.sin(pitch)*radius,Math.cos(yaw)*Math.cos(pitch)*radius*facing]),radius };
}
