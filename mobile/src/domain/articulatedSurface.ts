import { Limb, Point } from "./exerciseMotion";
import { between, boneDirection } from "./humanFigure";

export type SurfaceKind = "arm" | "leg" | "trunk";
const xy = (p: Point) => p.join(",");
const offset = (p: Point, n: Point, d: number): Point => [p[0] + n[0] * d, p[1] + n[1] * d];
const smooth = (points: Point[]) => points.slice(1).map((p, i) => {
  const a = points[i], before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 2)];
  const c1: Point = [a[0] + (p[0] - before[0]) / 6, a[1] + (p[1] - before[1]) / 6];
  const c2: Point = [p[0] - (after[0] - a[0]) / 6, p[1] - (after[1] - a[1]) / 6];
  return ` C ${xy(c1)} ${xy(c2)} ${xy(p)}`;
}).join("");

/** A single skin envelope, with no cap/outline cutting across the elbow or knee. */
export function articulatedSurface(limb: Limb, kind: SurfaceKind, scale = 1) {
  const [a, joint, tip] = limb;
  const upper = boneDirection(a, joint), lower = boneDirection(joint, tip);
  const centres: Point[] = [a, between(a, joint, 0.27), between(a, joint, 0.65), between(a, joint, 0.9), joint,
    between(joint, tip, 0.12), between(joint, tip, 0.4), between(joint, tip, 0.76), tip];
  const profile = kind === "leg" ? [4.7, 5.1, 4.2, 2.9, 2.7, 2.8, 3.1, 1.9, 1.4]
    : kind === "trunk" ? [7.8, 8, 7.3, 6.8, 6.8, 7, 7.4, 7.5, 7.4]
    : [3.35, 3.65, 2.85, 2.2, 2.15, 2.25, 2.15, 1.5, 1.15];
  const radii = profile.map(r => r * scale);
  const normals = centres.map((_, i) => boneDirection(centres[Math.max(0, i - 1)], centres[Math.min(centres.length - 1, i + 1)]).normal);
  const bend = upper.unit[0] * lower.unit[1] - upper.unit[1] * lower.unit[0];
  const normalSum: Point = [upper.normal[0] + lower.normal[0], upper.normal[1] + lower.normal[1]];
  const normalLength = Math.hypot(...normalSum);
  const bisector: Point = normalLength > 0.01 ? [normalSum[0] / normalLength, normalSum[1] / normalLength] : upper.normal;
  const alignment = Math.max(0.25, Math.abs(bisector[0] * upper.normal[0] + bisector[1] * upper.normal[1]));
  // Trim the inside to its offset-line intersection; adjacent caps otherwise loop into a hole.
  const side = (sign: number) => [0, 1, 2, 4, 6, 7, 8].map(i => i === 4
    ? offset(joint, bisector, sign * (sign * bend > 0 ? Math.min(radii[i] / alignment, radii[i] * 1.8) : radii[i]))
    : offset(centres[i], normals[i], radii[i] * sign));
  const left = side(1), right = side(-1).reverse();
  const distal = offset(tip, lower.unit, radii[8] * 0.6);
  const edge = `M ${xy(left[0])}${smooth(left)} Q ${xy(distal)} ${xy(right[0])}${smooth(right)}`;
  const path = `${edge} Q ${xy(offset(a, upper.unit, -radii[0] * 0.4))} ${xy(left[0])} Z`;
  const towardsA: Point = [-upper.unit[0], -upper.unit[1]], towardsTip = lower.unit;
  const sum: Point = [towardsA[0] + towardsTip[0], towardsA[1] + towardsTip[1]];
  const length = Math.hypot(...sum);
  const inner: Point = length > 0.01 ? [sum[0] / length, sum[1] / length] : upper.normal;
  const across: Point = [-inner[1], inner[0]];
  const fold = offset(joint, inner, radii[4] * 0.55);
  const foldA = offset(fold, across, radii[4] * 0.62), foldB = offset(fold, across, -radii[4] * 0.62);
  const crease = `M ${xy(foldA)} Q ${xy(offset(fold, inner, -0.45 * scale))} ${xy(foldB)}`;
  const kneecap = offset(joint, inner, -radii[4] * 0.25);
  return { path, edge, centres, left, right, crease, kneecap, radii, upper, lower };
}
