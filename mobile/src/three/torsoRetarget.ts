import * as THREE from "three";
import { Body3, V3, add3, sub3, mul3, mix3, unit3, cross3 } from "../domain/training3d";

type Landmark = { head: readonly number[]; tail: readonly number[] };
/** One continuous source reference for every vertebra. Aligning each section
 * against its own curved source Z used to push the ribcage forward by several
 * units while leaving the waist behind, exaggerating the lumbar arch. */
export function torsoRetarget(body: Body3, root: readonly number[], neck: readonly number[], scale: number) {
  const span = neck[1] - root[1], zSlope = (neck[2] - root[2]) / span;
  const curve = body.spine.length > 2 ? new THREE.CatmullRomCurve3(body.spine.map(p => new THREE.Vector3(...p)), false, "centripetal") : undefined;
  const point = (t: number): V3 => {
    const at = THREE.MathUtils.clamp(t, 0, 1);
    return curve ? curve.getPoint(at).toArray() as V3 : mix3(body.hip, body.shoulder, at);
  };
  const forwardAt = (t: number) => unit3(cross3(body.right, unit3(sub3(point(Math.min(1,t+.002)),point(Math.max(0,t-.002))))));
  return {
    point,
    forwardAt,
    transform(source: Landmark) {
      const a = (source.head[1]-root[1])/span, b = (source.tail[1]-root[1])/span;
      const forward = forwardAt((a+b)*.5);
      const referenceZ = root[2]+(source.head[1]-root[1])*zSlope;
      const start = add3(point(a),mul3(forward,(source.head[2]-referenceZ)*scale));
      const vertical = sub3(mul3(sub3(point(b),point(a)),1/(source.tail[1]-source.head[1])),mul3(forward,zSlope*scale));
      return new THREE.Matrix4().makeBasis(new THREE.Vector3(...mul3(body.right,scale)),new THREE.Vector3(...vertical),new THREE.Vector3(...mul3(forward,scale)))
        .setPosition(...start).multiply(new THREE.Matrix4().makeTranslation(-source.head[0],-source.head[1],-source.head[2]));
    }
  };
}
