import { ExercisePose, Limb, Point, exercisePose } from "./exerciseMotion";
import { V3, LegPressVariant, body3d } from "./training3d";

export const isPhotoGuide = (type: string) => ["chest-press", "pec-fly", "leg-press", "leg-extension", "hip-adduction"].includes(type);

/** The SVG fallback projects the same skeleton/mechanism as the native scene. */
export function projectPhotoChest(type: string, p: V3): Point {
  return (type === "pec-fly" || type === "hip-adduction")
    ? [60 + .84 * p[0] - .18 * p[2], 88 - .86 * p[1] - .05 * p[2]]
    : [38 + .85 * p[2] + .25 * p[0], 88 - .88 * p[1] - .03 * p[0]];
}

export function guidePose(type: string, progress: number, variant?: LegPressVariant): ExercisePose {
  if (!isPhotoGuide(type)) return exercisePose(type, progress);
  const body = body3d(type, progress, variant), project = (p: V3) => projectPhotoChest(type, p);
  const arms = body.arms.map(a => a.map(project) as unknown as Limb);
  return {
    head: project(body.head), shoulder: project(body.shoulder), hip: project(body.hip),
    arms, legs: body.legs.map(a => a.map(project) as unknown as Limb),
    grips: arms.map(a => a[2]), camera: (type === "pec-fly" || type === "hip-adduction") ? "front" : "side",
    spine: body.spine.map(project), highlight: [project(body.hip), project(body.shoulder)],
  };
}
