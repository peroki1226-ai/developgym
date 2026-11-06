import { Point } from "./exerciseMotion";
import { boneDirection } from "./humanFigure";

export const EQUIPMENT_DEPTH: Point = [2.8, -1.8];
export const atDepth = (p: Point, depth: Point = EQUIPMENT_DEPTH): Point => [p[0] + depth[0], p[1] + depth[1]];
export const polygonPoints = (points: readonly Point[]) => points.map(p => p.join(",")).join(" ");

/** Oblique side faces leave the original front face and all contact anchors untouched. */
export function beamSurface(a: Point, b: Point, width: number, depth: Point = EQUIPMENT_DEPTH) {
  const { normal: n, unit: u } = boneDirection(a, b), r = Math.max(0, width) / 2;
  const corner = (p: Point, sign: number): Point => [p[0] + n[0] * r * sign, p[1] + n[1] * r * sign];
  const front = [corner(a, 1), corner(b, 1), corner(b, -1), corner(a, -1)];
  const back = front.map(p => atDepth(p, depth));
  const side = n[0] * depth[0] + n[1] * depth[1] > 0
    ? [front[0], front[1], back[1], back[0]] : [front[3], front[2], back[2], back[3]];
  const cap = u[0] * depth[0] + u[1] * depth[1] < 0
    ? [front[3], front[0], back[0], back[3]] : [front[1], front[2], back[2], back[1]];
  return { front, back, side, cap };
}

export function boxSurface(x: number, y: number, width: number, height: number, depth: Point = EQUIPMENT_DEPTH) {
  const front: Point[] = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
  const back = front.map(p => atDepth(p, depth));
  return { front, back, top: [front[0], front[1], back[1], back[0]], side: [front[1], front[2], back[2], back[1]] };
}
