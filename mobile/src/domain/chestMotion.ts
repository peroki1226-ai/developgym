import { clampProgress, MotionFrame } from "./exerciseMotion";
import { chestLesson } from "./chestLessons";
import { body3d, add3, sub3, mul3, unit3, V3 } from "./training3d";

/** Position within a complete repetition, including the return. Dips begin at the top. */
export function chestCyclePosition(type: string, frame: MotionFrame, completed = false) {
  if (completed) return 1;
  if (type === "chest-dip") return frame.phase === "return" ? (1-frame.progress)/2 : frame.phase === "hold" ? 0 : .5+frame.progress/2;
  return frame.phase === "return" ? 1-frame.progress/2 : frame.progress/2;
}
export function chestCyclePose(type: string, value: number) {
  const t = clampProgress(value), fromTop = type === "chest-dip";
  const returning = fromTop ? t < .5 : t > .5;
  const p = fromTop ? Math.abs(2*t-1) : 1-Math.abs(2*t-1);
  return { progress: p, direction: returning ? "return" as const : "work" as const, completed: t === 1 };
}
const trajectoryCache = new Map<string, V3[][]>();

/** Blue arrows show the movement of the hands, or body for fixed-grip dips.
 * They indicate direction, not measured forces. The equipment and hands stay unchanged. */
export function chestMotionPaths(type: string, progress: number, returning: boolean) {
  if (!chestLesson(type)) return [];
  const point = (p: number, side: number): V3 => {
    const b = body3d(type,p), target = type === "chest-dip" ? b.shoulder : b.arms[side === -1 ? 0 : 1][2];
    return add3(target, [side * (type === "chest-dip" ? 22 : 9), 0, 0]);
  };
  let trajectories = trajectoryCache.get(type);
  if (!trajectories) {
    trajectories = [-1,1].map(side=>Array.from({length:17},(_,i)=>point(i/16,side)));
    trajectoryCache.set(type,trajectories);
  }
  return [-1,1].map((side,index) => {
    const p = clampProgress(progress), before = point(Math.max(0,p-.04),side), after = point(Math.min(1,p+.04),side);
    const direction = mul3(unit3(sub3(after,before)), returning ? -1 : 1), tip=point(p,side);
    return { points: trajectories![index], tip, tail: add3(tip,mul3(direction,-5)), direction };
  });
}
