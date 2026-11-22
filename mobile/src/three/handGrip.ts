import * as THREE from "three";

type GripReference = { centre: readonly number[]; axis: readonly number[]; approach: readonly number[]; wrist: readonly number[]; contactRadius?: number };
// Contact channel of the authored closed hand, in source-mesh units. Outside
// this band, radial thickness is retained when adapting to a thinner bar.
const REFERENCE_CONTACT_RADIUS = .23;
const CONTACT_SOFTNESS = .025;
/** Fit the palm and curled fingers to the actual shaft, rather than expanding
 * every vertex away from it. Preserve finger spacing and fade before the wrist.
 * A smooth contact floor avoids an abrupt crease along the bar surface. */
export class HandGripSurface {
  private centre: THREE.Vector3;
  private axis: THREE.Vector3;
  private approach: THREE.Vector3;
  private wristDistance: number;
  private contactRadius: number;
  private radial = new THREE.Vector3();
  private tangent = new THREE.Vector3();
  constructor(source: GripReference) {
    this.contactRadius=source.contactRadius??REFERENCE_CONTACT_RADIUS;
    this.centre = new THREE.Vector3(...source.centre);
    this.axis = new THREE.Vector3(...source.axis).normalize();
    this.approach = new THREE.Vector3(...source.approach).normalize();
    this.wristDistance = new THREE.Vector3(...source.wrist).sub(this.centre).dot(this.approach);
  }
  blend(point: THREE.Vector3) {
    const y = this.approach.dot(this.radial.copy(point).sub(this.centre));
    return 1 - THREE.MathUtils.smoothstep(y, this.wristDistance * .45, this.wristDistance * .85);
  }
  fit(point: THREE.Vector3, normal: THREE.Vector3, radius: number) {
    const blend = this.blend(point);
    if (!blend) return;
    this.radial.copy(point).sub(this.centre);
    this.radial.addScaledVector(this.axis, -this.radial.dot(this.axis));
    const r = this.radial.length();
    if (r < 1e-8) return;
    this.radial.multiplyScalar(1 / r);
    const x = (r - this.contactRadius) / CONTACT_SOFTNESS;
    // Stable softplus: no exponential overflow for large radii.
    const padded = radius + CONTACT_SOFTNESS * (Math.max(x, 0) + Math.log1p(Math.exp(-Math.abs(x))));
    const derivative = 1 / (1 + Math.exp(-x));
    const next = r + (padded - r) * blend, scale = next / r;
    const y = (point.x - this.centre.x) * this.approach.x + (point.y - this.centre.y) * this.approach.y + (point.z - this.centre.z) * this.approach.z;
    const width = this.wristDistance * .4;
    const t = THREE.MathUtils.clamp((y - this.wristDistance * .45) / width, 0, 1);
    const blendDerivative = -6 * t * (1 - t) / width;
    this.tangent.crossVectors(this.axis, this.radial);
    // Inverse-transpose of the cylindrical deformation, including wrist fade.
    const radialDerivative = 1 + blend * (derivative - 1) + (padded - r) * blendDerivative * this.approach.dot(this.radial);
    const shear = (padded - r) * blendDerivative * this.approach.dot(this.tangent);
    const a = normal.dot(this.axis), b = normal.dot(this.radial) / radialDerivative, c = normal.dot(this.tangent);
    normal.copy(this.axis).multiplyScalar(a).addScaledVector(this.radial, b).addScaledVector(this.tangent, (c - b * shear) / scale).normalize();
    point.addScaledVector(this.radial, next - r);
  }
}
