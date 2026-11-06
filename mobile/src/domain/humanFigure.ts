import { ExercisePose, Point } from "./exerciseMotion";

const add = (p: Point, n: Point, r: number): Point => [p[0] + n[0] * r, p[1] + n[1] * r];
export const between = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const xy = (p: Point) => `${p[0]},${p[1]}`;
export function boneDirection(a: Point, b: Point) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const unit: Point = length > 1e-8 ? [(b[0] - a[0]) / length, (b[1] - a[1]) / length] : [0, 1];
  return { unit, normal: [-unit[1], unit[0]] as Point };
}

/** Rounded, tapered flesh/clothing contours around the unchanged skeletal anchors. */
export function taperedContour(a: Point, b: Point, startRadius: number, endRadius: number) {
  const { unit: u, normal: n } = boneDirection(a, b);
  const mid = between(a, b, 0.5), bulge = (startRadius + endRadius) * 0.56;
  return `M ${xy(add(a, n, startRadius))} Q ${xy(add(mid, n, bulge))} ${xy(add(b, n, endRadius))}`
    + ` Q ${xy(add(b, u, endRadius))} ${xy(add(b, n, -endRadius))}`
    + ` Q ${xy(add(mid, n, -bulge))} ${xy(add(a, n, -startRadius))}`
    + ` Q ${xy(add(a, u, -startRadius))} ${xy(add(a, n, startRadius))} Z`;
}

export function bodyContour(pose: ExercisePose) {
  const { shoulder: s, hip: h } = pose;
  const { normal: n } = boneDirection(s, h);
  const front = pose.camera !== "side";
  const shoulderWidth = front ? 10.5 : 5.4, waistWidth = front ? 6.7 : 4.3, hipWidth = front ? 7.5 : 5.2;
  // The curved outline follows the crunch's lumbar and thoracic segments too.
  const centre = pose.spine ? [...pose.spine].reverse() : [s, between(s, h, 0.52), between(s, h, 0.8), h];
  const widths = centre.map((_, i) => i === 0 ? shoulderWidth : i === centre.length - 1 ? hipWidth : waistWidth);
  const sides = [-1, 1].map(sign => centre.map((point, i) => {
    const before = centre[Math.max(0, i - 1)], after = centre[Math.min(centre.length - 1, i + 1)];
    return add(point, boneDirection(before, after).normal, widths[i] * sign);
  }));
  const [left, right] = sides;
  const neck = between(s, pose.head, 0.25);
  const side = (items: Point[]) => items.slice(1).map((v, i) => ` Q ${xy(items[i])} ${xy(between(items[i], v, 0.5))} L ${xy(v)}`).join("");
  return {
    path: `M ${xy(left[0])}${side(left)} Q ${xy(add(h, boneDirection(s, h).unit, 2))} ${xy(right[right.length - 1])}${side([...right].reverse())} Q ${xy(neck)} ${xy(left[0])} Z`,
    shoulderWidth, waistWidth, hipWidth,
    // Neck and head rotation use the actual changing head/shoulder relation.
    neck, headAngle: Math.atan2(pose.head[0] - s[0], s[1] - pose.head[1]) * 180 / Math.PI,
    torsoNormal: n,
  };
}

export function shoeContour(ankle: Point, facing: number, toe?: Point) {
  const end: Point = toe ?? [ankle[0] + facing * 5, ankle[1] + 0.9];
  return `M ${ankle[0] - facing * 1.9},${ankle[1] - 1.8}`
    + ` Q ${ankle[0] + facing * 1.5},${ankle[1] - 2} ${ankle[0] + facing * 2.3},${ankle[1] - 0.5}`
    + ` L ${end[0]},${end[1] - 0.7} Q ${end[0] + facing},${end[1] + 1.4} ${end[0]},${end[1] + 1.5}`
    + ` L ${ankle[0] - facing * 2},${ankle[1] + 1.5} Z`;
}

/** Shoes pivot at the existing ankle; angled plates and moving shins keep their orientation. */
export function footPlacement(type: string, pose: ExercisePose, index: number) {
  const [, knee, ankle] = pose.legs[index];
  const facing = pose.camera === "front" ? (index === 0 ? -1 : 1)
    : ["back-extension", "hack-squat", "leg-press"].includes(type) ? -1 : 1;
  const angle = ["leg-press", "hack-squat"].includes(type) ? 45
    : ["leg-extension", "seated-leg-curl"].includes(type) ? Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]) * 180 / Math.PI - 90 : 0;
  return { facing, angle, toe: type === "seated-calf-raise" ? [82, 88] as Point : undefined };
}
