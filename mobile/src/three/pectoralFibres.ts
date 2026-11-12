import * as THREE from "three";
import asset from "../data/human/makehuman.json";
import { TrainingFrame3 } from "../domain/training3d";

type Anchor = { vertices: [number, number, number]; weights: [number, number, number] };
type Fibre = { anchors: Anchor[]; upper: boolean };
const decode = (s: string) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const n = alphabet.indexOf(s[i]) << 18 | alphabet.indexOf(s[i + 1]) << 12 |
      (alphabet.indexOf(s[i + 2]) & 63) << 6 | alphabet.indexOf(s[i + 3]) & 63;
    bytes.push(n >> 16 & 255);
    if (s[i + 2] !== "=") bytes.push(n >> 8 & 255);
    if (s[i + 3] !== "=") bytes.push(n & 255);
  }
  return new Uint8Array(bytes);
};
const rest = new Float32Array(decode(asset.positions).buffer);
const indices = new Uint16Array(decode(asset.indices).buffer);
const masks = decode(asset.muscleMasks.chest), upper = decode(asset.muscleMasks.upperChest);
const triangles: [number, number, number][] = [];
for (let i = 0; i < indices.length; i += 3) {
  const ids = [indices[i], indices[i + 1], indices[i + 2]] as [number, number, number];
  if (ids.every(v => masks[v] > 12)) triangles.push(ids);
}
// Sample the actual anterior skin triangles once, then follow their barycentric
// coordinates through the same skinning as the human. No floating muscle decals.
function surfaceAnchor(x: number, y: number): Anchor | undefined {
  let found: Anchor | undefined, front = -Infinity;
  for (const vertices of triangles) {
    const [a, b, c] = vertices.map(i => [rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]]);
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-8) continue;
    const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
    const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
    const w = 1 - u - v;
    if (Math.min(u, v, w) < -1e-6) continue;
    const z = u * a[2] + v * b[2] + w * c[2];
    if (z > front) { front = z; found = { vertices, weights: [u, v, w] }; }
  }
  return found;
}
const collar = asset.rest["clavicle.L"].head[1], shoulder = asset.rest["upperarm.L"].head[0];
const torso = asset.rest.neck.head[1] - asset.rest.spine05.head[1];
export const PECTORAL_FIBRES: readonly Fibre[] = [-1, 1].flatMap(side =>
  Array.from({ length: 9 }, (_, row) => {
    const anchors = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12, x = side * shoulder * (.12 + .66 * t);
      const y = collar - torso * ((.05 + row * .0165) * (1 - t) + .065 * t);
      return surfaceAnchor(x, y);
    }).filter((p): p is Anchor => !!p);
    return { anchors, upper: anchors.length > 0 && anchors.reduce((sum, a) => sum + a.vertices.reduce((s, v, i) => s + upper[v] * a.weights[i], 0), 0) / anchors.length > 80 };
  }).filter(f => f.anchors.length >= 8));

/** A highlighted contractile segment within a fibre, not a measured fascicle.
 * Skin can stretch as the humerus moves even while the muscle shortens. Keep
 * the full skin-following fan as orientation context; shorten this inner segment
 * by arc length so the learning cue cannot accidentally depict lengthening. */
export function contractileSegment(path: readonly THREE.Vector3[], progress: number) {
  const distance = [0];
  path.slice(1).forEach((p, i) => distance.push(distance[i] + p.distanceTo(path[i])));
  const length = distance.at(-1)!, inset = .08 + .18 * Math.max(0, Math.min(1, progress));
  const at = (value: number) => {
    let i = 1;
    while (i < distance.length - 1 && distance[i] < value) i++;
    return path[i - 1].clone().lerp(path[i], (value - distance[i - 1]) / Math.max(1e-8, distance[i] - distance[i - 1]));
  };
  const start = length * inset, end = length * (1 - inset);
  return [at(start), ...path.filter((_, i) => distance[i] > start && distance[i] < end), at(end)];
}

export function createPectoralFibres(parent: THREE.Group, skin: THREE.BufferGeometry) {
  const group = new THREE.Group(); group.name = "pectoral-fibre-guide"; parent.add(group);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PECTORAL_FIBRES.reduce((n, f) => n + (f.anchors.length - 1) * 6, 0));
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.LineBasicMaterial({ color: "#d4a97b", transparent: true, opacity: .4, toneMapped: false, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material); lines.frustumCulled = false; group.add(lines);
  const activeGeometry = geometry.clone();
  const activePositions = new Float32Array(positions.length + PECTORAL_FIBRES.length * 12);
  activeGeometry.setAttribute("position", new THREE.BufferAttribute(activePositions, 3).setUsage(THREE.DynamicDrawUsage));
  const activeMaterial = new THREE.LineBasicMaterial({ color: "#fff0bb", transparent: true, opacity: .95, toneMapped: false, depthWrite: false });
  const bands = new THREE.LineSegments(activeGeometry, activeMaterial); bands.frustumCulled = false; group.add(bands);
  const arrowGeometry = new THREE.ConeGeometry(.25, .9, 8);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: "#fffaf2", toneMapped: false });
  const arrows = Array.from({ length: 4 }, () => {
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial); group.add(arrow); return arrow;
  });
  const markerGeometry = new THREE.SphereGeometry(.28, 8, 6);
  const markers = Array.from({length:4},()=>{const marker=new THREE.Mesh(markerGeometry,arrowMaterial);group.add(marker);return marker;});
  const axis = new THREE.Vector3(0, 1, 0);
  let disposed = false;
  return {
    group,
    draw(frame: TrainingFrame3, anatomy: boolean, returning: boolean, progress = 0) {
      if (disposed) return;
      const active = frame.muscles.find(m => m === "chest" || m === "upperChest");
      group.visible = anatomy && !!active;
      if (!group.visible) return;
      const p = skin.attributes.position, n = skin.attributes.normal;
      const paths = PECTORAL_FIBRES.map(f => f.anchors.map(a => {
        const point = new THREE.Vector3(), normal = new THREE.Vector3();
        a.vertices.forEach((v, i) => {
          point.addScaledVector(new THREE.Vector3().fromBufferAttribute(p, v), a.weights[i]);
          normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(n, v), a.weights[i]);
        });
        return point.addScaledVector(normal.normalize(), .13);
      }));
      let offset = 0, activeOffset = 0, arrowIndex = 0;
      const segments = paths.map(path => contractileSegment(path, progress));
      paths.forEach((path, i) => {
        // Clavicular emphasis keeps the upper fan bright without falsely isolating
        // a separate muscle or painting the abdomen/arms.
        if (active === "upperChest" && !PECTORAL_FIBRES[i].upper) return;
        path.slice(1).forEach((point, j) => { path[j].toArray(positions, offset); point.toArray(positions, offset + 3); offset += 6; });
        const segment = segments[i];
        segment.slice(1).forEach((point,j)=>{segment[j].toArray(activePositions,activeOffset);point.toArray(activePositions,activeOffset+3);activeOffset+=6;});
        if (i % 9 !== (active === "upperChest" ? 1 : 4) || arrowIndex + 2 > arrows.length) return;
        for (const end of [0, 1]) {
          const index = Math.round((end ? .72 : .28) * (segment.length - 1));
          const direction = segment[Math.min(segment.length - 1, index + 1)].clone().sub(segment[Math.max(0, index - 1)]).normalize();
          direction.multiplyScalar((end ? -1 : 1) * (returning ? -1 : 1));
          markers[arrowIndex].visible=true;markers[arrowIndex].position.copy(segment[end ? segment.length-1 : 0]);
          const arrow = arrows[arrowIndex++]; arrow.visible = true;
          arrow.position.copy(segment[index]); arrow.quaternion.setFromUnitVectors(axis, direction);
        }
      });
      arrows.slice(arrowIndex).forEach(a => a.visible = false);
      markers.slice(arrowIndex).forEach(a=>a.visible=false);
      geometry.setDrawRange(0, offset / 3); geometry.attributes.position.needsUpdate = true;
      activeGeometry.setDrawRange(0,activeOffset/3);activeGeometry.attributes.position.needsUpdate=true;
      group.userData.paths = paths; group.userData.contractilePaths=segments; group.userData.returning = returning;
    },
    dispose() {
      if (disposed) return; disposed = true;
      parent.remove(group); geometry.dispose(); material.dispose(); activeGeometry.dispose(); activeMaterial.dispose(); markerGeometry.dispose(); arrowGeometry.dispose(); arrowMaterial.dispose();
    }
  };
}
