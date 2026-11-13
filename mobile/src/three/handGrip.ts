import * as THREE from "three";

type GripReference = { centre: readonly number[]; axis: readonly number[]; approach: readonly number[]; wrist: readonly number[] };
/** Adapt the authored curved fingers to the actual handle without scaling the
 * whole hand or moving its wrist. Smooth radial expansion keeps skin outside
 * the cylinder, preserves axial finger spacing and retains thickness/knuckles. */
export class HandGripSurface {
  private centre: THREE.Vector3;
  private axis: THREE.Vector3;
  private approach: THREE.Vector3;
  private wristDistance: number;
  private radial = new THREE.Vector3();
  private tangent = new THREE.Vector3();
  constructor(source: GripReference) {
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
    const next = Math.sqrt(r * r + radius * radius * blend), scale = next / r;
    point.addScaledVector(this.radial, next - r);
    this.tangent.crossVectors(this.axis, this.radial);
    const a = normal.dot(this.axis), b = normal.dot(this.radial), c = normal.dot(this.tangent);
    normal.copy(this.axis).multiplyScalar(a).addScaledVector(this.radial, b * scale).addScaledVector(this.tangent, c / scale).normalize();
  }
}
