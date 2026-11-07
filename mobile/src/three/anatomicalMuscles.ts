import * as THREE from "three";
import {
  Bone3,
  TrainingFrame3,
  V3,
  add3,
  cross3,
  dot3,
  length3,
  mul3,
  sub3,
  unit3,
} from "../domain/training3d";
import { Muscle, contractionFrame } from "../domain/muscleMotion";

// Body meshes share the existing 21 by 25 surface grid. Patches conform to that
// same surface: muscle volume does not move the skeleton, hands or foot contacts.
export type BodySurfaces = Record<
  "torso" | "pelvis" | "arm0" | "arm1" | "leg0" | "leg1",
  THREE.BufferGeometry
>;
type SurfaceName = keyof BodySurfaces;
type UV = readonly [number, number];
type Patch = {
  id: string;
  muscle: Muscle | null;
  surface: SurfaceName;
  depth: number;
  reverse?: boolean;
  uv: (u: number, v: number) => UV;
};
export type MusclePatchState = {
  id: string;
  muscle: Muscle | null;
  surface: SurfaceName;
  active: boolean;
  shortened: number;
  firstVertex: number;
  vertexCount: number;
  bellyStart: number;
  bellyEnd: number;
  fibreSpan: number;
};
const ROWS = 21,
  COLS = 25,
  U = 16,
  V = 8,
  VERTS = (U + 1) * (V + 1),
  FIBRES = 5,
  SEGMENTS = 14;
const red = new THREE.Color("#c65346"),
  neutral = new THREE.Color("#c2c2c2"),
  tendon = new THREE.Color("#e4e4e4"),
  darkFibre = new THREE.Color("#999999"),
  lightFibre = new THREE.Color("#f5c3b5");
const vector = (p: V3) => new THREE.Vector3(...p);
function clamp(x: number) {
  return Math.max(0, Math.min(1, x));
}
function sample(surface: THREE.BufferGeometry, t: number, angle: number) {
  const row = clamp(t) * (ROWS - 1),
    i = Math.min(ROWS - 2, Math.floor(row)),
    a = ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * (COLS - 1),
    j = Math.min(COLS - 2, Math.floor(a));
  const f = row - i,
    g = a - j,
    positions = surface.attributes.position,
    normals = surface.attributes.normal;
  let px = 0,
    py = 0,
    pz = 0,
    nx = 0,
    ny = 0,
    nz = 0;
  for (const [r, c, w] of [
    [i, j, (1 - f) * (1 - g)],
    [i + 1, j, f * (1 - g)],
    [i, j + 1, (1 - f) * g],
    [i + 1, j + 1, f * g],
  ]) {
    const index = r * COLS + c;
    px += positions.getX(index) * w;
    py += positions.getY(index) * w;
    pz += positions.getZ(index) * w;
    nx += normals.getX(index) * w;
    ny += normals.getY(index) * w;
    nz += normals.getZ(index) * w;
  }
  const point = new THREE.Vector3(px, py, pz),
    normal = new THREE.Vector3(nx, ny, nz);
  return { point, normal: normal.normalize() };
}
function angleFor(surface: THREE.BufferGeometry, t: number, wanted: V3) {
  const a = sample(surface, t, 0).point,
    b = sample(surface, t, Math.PI).point,
    centre = a.clone().add(b).multiplyScalar(0.5);
  const first = a.clone().sub(centre).normalize(),
    second = sample(surface, t, Math.PI / 2)
      .point.sub(centre)
      .normalize(),
    d = vector(wanted);
  return Math.atan2(d.dot(second), d.dot(first));
}
function perpendicular(wanted: V3, axis: V3, fallback: V3): V3 {
  const projected = sub3(wanted, mul3(axis, dot3(wanted, axis)));
  if (length3(projected) > 0.05) return unit3(projected);
  const second = sub3(fallback, mul3(axis, dot3(fallback, axis)));
  return length3(second) > 0.05
    ? unit3(second)
    : unit3(cross3(axis, [1, 0, 0]));
}
function mixNormal(a: V3, b: V3, weight: number): V3 {
  return unit3(add3(a, mul3(b, weight)));
}

/** Named superficial teaching regions, not a manufacturer scan or clinical anatomy atlas. */
export function muscleLayouts(
  frame: TrainingFrame3,
  surfaces: BodySurfaces,
): Patch[] {
  const patches: Patch[] = [],
    body = frame.body,
    up = unit3(sub3(body.shoulder, body.hip));
  const leaf = (
    id: string,
    muscle: Muscle | null,
    surface: SurfaceName,
    start: number,
    end: number,
    angle: number | ((t: number) => number),
    half: number,
    depth: number,
  ) => {
    const angles = new Map<number, number>();
    patches.push({
      id,
      muscle,
      surface,
      depth,
      uv: (u, v) => {
        const t = start + (end - start) * u,
          centre =
            typeof angle === "number"
              ? angle
              : (angles.get(t) ??
                (() => {
                  const a = angle(t);
                  angles.set(t, a);
                  return a;
                })()),
          width = Math.pow(Math.sin(Math.PI * u), 0.22);
        return [t, centre + (v * 2 - 1) * half * width];
      },
    });
  };
  for (const side of [-1, 1]) {
    // The pectoral sheet fans from the sternum toward the upper arm. Separate
    // clavicular/costal sheets make an upper-chest target distinguishable.
    for (const upper of [false, true]) {
      patches.push({
        id: `pec-${side}-${upper ? "upper" : "lower"}`,
        muscle: upper ? "upperChest" : "chest",
        surface: "torso",
        depth: upper ? 0.7 : 1.0,
        reverse: side === 1,
        uv: (u, v) => [
          (upper ? 0.665 : 0.49) +
            (upper ? 0.04 : 0.12) * u +
            (v * 2 - 1) *
              (upper ? 0.035 : 0.12) *
              Math.pow(Math.sin(Math.PI * u), 0.3),
          Math.PI / 2 + side * (0.06 + 1.2 * u),
        ],
      });
    }
    for (let row = 0; row < 3; row++)
      leaf(
        `rectus-${side}-${row}`,
        "abs",
        "torso",
        0.14 + row * 0.1,
        0.235 + row * 0.1,
        Math.PI / 2 + side * 0.28,
        0.245,
        0.75,
      );
    leaf(
      `oblique-${side}`,
      null,
      "torso",
      0.12,
      0.49,
      Math.PI / 2 + side * 0.8,
      0.38,
      0.5,
    );
    patches.push({
      id: `lat-${side}`,
      muscle: "lats",
      surface: "torso",
      depth: 0.7,
      uv: (u, v) => [
        0.2 + 0.43 * u,
        Math.PI * 1.5 +
          side * (0.15 + 0.9 * u) +
          (v * 2 - 1) * 0.34 * Math.pow(Math.sin(Math.PI * u), 0.28),
      ],
    });
    patches.push({
      id: `scapular-${side}`,
      muscle: "midBack",
      surface: "torso",
      depth: 0.65,
      reverse: side === 1,
      uv: (u, v) => [
        0.6 +
          0.04 * u +
          (v * 2 - 1) * 0.065 * Math.pow(Math.sin(Math.PI * u), 0.28),
        Math.PI * 1.5 + side * (0.035 + 0.82 * u),
      ],
    });
    leaf(
      `upper-trap-${side}`,
      null,
      "torso",
      0.68,
      0.92,
      Math.PI * 1.5 + side * 0.25,
      0.22,
      0.55,
    );
    leaf(
      `spinal-${side}`,
      "erectors",
      "torso",
      0.18,
      0.7,
      Math.PI * 1.5 + side * 0.11,
      0.085,
      0.48,
    );
    leaf(
      `glute-${side}`,
      "glutes",
      "pelvis",
      0.13,
      0.87,
      Math.PI * 1.5 + side * 0.49,
      0.45,
      0.9,
    );
    leaf(
      `glute-medial-${side}`,
      "hipAbductors",
      "pelvis",
      0.54,
      0.95,
      side === 1 ? Math.PI * 2 - 0.28 : Math.PI + 0.28,
      0.29,
      0.55,
    );
  }
  const limb = (kind: "arm" | "leg", bone: Bone3, index: number) => {
    const key = `${kind}${index}` as SurfaceName,
      surface = surfaces[key],
      upper = unit3(sub3(bone[1], bone[0])),
      lower = unit3(sub3(bone[2], bone[1]));
    const outward: V3 = [bone[0][0] >= body.hip[0] ? 1 : -1, 0, 0];
    const bend = perpendicular(sub3(bone[2], bone[1]), upper, body.forward);
    const front = kind === "arm" ? bend : mul3(bend, -1),
      back = mul3(front, -1);
    const outer = perpendicular(outward, upper, body.right);
    const angled = (wanted: V3) => (t: number) => angleFor(surface, t, wanted);
    if (kind === "arm") {
      const forward = perpendicular(body.forward, upper, up);
      leaf(
        `deltoid-front-${index}`,
        "frontShoulder",
        key,
        0.025,
        0.2,
        angled(forward),
        0.75,
        1.1,
      );
      leaf(
        `deltoid-side-${index}`,
        "sideShoulder",
        key,
        0.02,
        0.22,
        angled(outer),
        0.75,
        1.2,
      );
      leaf(
        `deltoid-back-${index}`,
        "rearShoulder",
        key,
        0.025,
        0.2,
        angled(mul3(forward, -1)),
        0.75,
        1.1,
      );
      for (const sign of [-1, 1]) {
        leaf(
          `biceps-${index}-${sign}`,
          "biceps",
          key,
          0.19,
          0.455,
          angled(mixNormal(front, outer, sign * 0.3)),
          0.42,
          0.95,
        );
        leaf(
          `triceps-${index}-${sign}`,
          "triceps",
          key,
          0.17,
          0.465,
          angled(mixNormal(back, outer, sign * 0.35)),
          0.42,
          0.9,
        );
      }
      leaf(
        `forearm-front-${index}`,
        null,
        key,
        0.54,
        0.92,
        angled(front),
        0.7,
        0.32,
      );
      leaf(
        `forearm-back-${index}`,
        null,
        key,
        0.54,
        0.9,
        angled(back),
        0.7,
        0.32,
      );
    } else {
      // Continue the lateral hip sheet over the proximal femur. A patch on
      // the upper pelvic sphere alone would sit inside the torso/leg union.
      leaf(
        `lateral-hip-${index}`,
        "hipAbductors",
        key,
        0.01,
        0.145,
        angled(mixNormal(outer, back, 0.35)),
        0.48,
        0.72,
      );
      leaf(
        `quad-front-${index}`,
        "quads",
        key,
        0.095,
        0.435,
        angled(front),
        0.52,
        1.05,
      );
      leaf(
        `quad-outer-${index}`,
        "quads",
        key,
        0.08,
        0.46,
        angled(mixNormal(front, outer, 0.95)),
        0.52,
        1.1,
      );
      leaf(
        `quad-inner-${index}`,
        "quads",
        key,
        0.23,
        0.465,
        angled(mixNormal(front, outer, -0.95)),
        0.48,
        0.95,
      );
      for (const sign of [-1, 1])
        leaf(
          `hamstring-${index}-${sign}`,
          "hamstrings",
          key,
          0.14,
          0.46,
          angled(mixNormal(back, outer, sign * 0.36)),
          0.33,
          0.8,
        );
      leaf(
        `adductor-${index}`,
        "adductors",
        key,
        0.12,
        0.405,
        angled(mul3(outer, -1)),
        0.38,
        0.62,
      );
      const calfBack = perpendicular(
        sub3(bone[0], bone[1]),
        lower,
        mul3(body.forward, -1),
      );
      for (const sign of [-1, 1])
        leaf(
          `calf-head-${index}-${sign}`,
          null,
          key,
          0.55,
          0.78,
          angled(mixNormal(calfBack, outward, sign * 0.35)),
          0.3,
          0.6,
        );
      leaf(
        `soleus-${index}`,
        "soleus",
        key,
        0.69,
        0.93,
        angled(calfBack),
        0.78,
        0.45,
      );
      leaf(
        `shin-${index}`,
        null,
        key,
        0.55,
        0.93,
        angled(mul3(calfBack, -1)),
        0.35,
        0.27,
      );
    }
  };
  body.arms.forEach((bone, i) => limb("arm", bone, i));
  body.legs.forEach((bone, i) => limb("leg", bone, i));
  return patches;
}

/** Two batched objects for all muscle surfaces/fibres: buffers are reused per pose. */
export function createAnatomicalMuscles(group: THREE.Group) {
  let geometry: THREE.BufferGeometry | null = null,
    fibres: THREE.BufferGeometry | null = null,
    mesh: THREE.Mesh | null = null,
    lines: THREE.LineSegments | null = null,
    count = 0,
    disposed = false;
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.79,
    metalness: 0,
  });
  const fibreMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    toneMapped: false,
  });
  let state: MusclePatchState[] = [];
  function allocate(patches: Patch[]) {
    geometry?.dispose();
    fibres?.dispose();
    if (mesh) group.remove(mesh);
    if (lines) group.remove(lines);
    count = patches.length;
    geometry = new THREE.BufferGeometry();
    fibres = new THREE.BufferGeometry();
    for (const key of ["position", "color"]) {
      geometry.setAttribute(
        key,
        new THREE.BufferAttribute(new Float32Array(count * VERTS * 3), 3),
      );
      fibres.setAttribute(
        key,
        new THREE.BufferAttribute(
          new Float32Array(count * FIBRES * SEGMENTS * 2 * 3),
          3,
        ),
      );
    }
    const indices: number[] = [];
    patches.forEach((patch, n) => {
      for (let i = 0; i < U; i++)
        for (let j = 0; j < V; j++) {
          const a = n * VERTS + i * (V + 1) + j,
            b = a + V + 1;
          if (patch.reverse) indices.push(a, a + 1, b, b, a + 1, b + 1);
          else indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    });
    geometry.setIndex(indices);
    mesh = new THREE.Mesh(geometry, material);
    mesh.name = "anatomical-muscles";
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    lines = new THREE.LineSegments(fibres, fibreMaterial);
    lines.name = "anatomical-fibres";
    lines.renderOrder = 2;
    group.add(mesh, lines);
  }
  function draw(
    frame: TrainingFrame3,
    surfaces: BodySurfaces,
    progress: number,
    colour: boolean,
  ) {
    if (disposed) return;
    const patches = muscleLayouts(frame, surfaces);
    if (!geometry || count !== patches.length) allocate(patches);
    const positions = geometry!.attributes.position as THREE.BufferAttribute,
      colours = geometry!.attributes.color as THREE.BufferAttribute;
    const fibrePositions = fibres!.attributes.position as THREE.BufferAttribute,
      fibreColours = fibres!.attributes.color as THREE.BufferAttribute;
    state = [];
    patches.forEach((patch, n) => {
      const matches =
        patch.muscle !== null &&
        (frame.muscles.includes(patch.muscle) ||
          (patch.muscle === "upperChest" && frame.muscles.includes("chest")));
      const active = colour && matches;
      const movement =
        patch.muscle !== null && matches
          ? contractionFrame(frame.type, patch.muscle, progress, "work")
              .shortened
          : 0.25;
      const inset = 0.035 + 0.12 * movement;
      const point = (u: number, v: number, extra = 0) => {
        const [t, angle] = patch.uv(u, v),
          base = sample(surfaces[patch.surface], t, angle);
        const belly = clamp((u - inset) / (1 - 2 * inset));
        const rise =
          Math.pow(Math.max(0, Math.sin(Math.PI * belly)), 0.8) *
          Math.pow(Math.max(0, Math.sin(Math.PI * v)), 0.65);
        base.point.addScaledVector(
          base.normal,
          0.075 + patch.depth * rise * (0.8 + 0.45 * movement) + extra,
        );
        return { position: base.point, belly };
      };
      for (let i = 0; i <= U; i++)
        for (let j = 0; j <= V; j++) {
          const u = i / U,
            v = j / V,
            at = n * VERTS + i * (V + 1) + j,
            { position, belly } = point(u, v);
          positions.setXYZ(at, position.x, position.y, position.z);
          const end = Math.min(1, Math.min(belly, 1 - belly) * 14),
            base =
              end < 1
                ? tendon.clone().lerp(active ? red : neutral, end)
                : active
                  ? red
                  : neutral;
          colours.setXYZ(at, base.r, base.g, base.b);
        }
      for (let strand = 0; strand < FIBRES; strand++)
        for (let segment = 0; segment < SEGMENTS; segment++)
          for (let end = 0; end < 2; end++) {
            const u = inset + ((1 - 2 * inset) * (segment + end)) / SEGMENTS,
              v = (strand + 1) / (FIBRES + 1);
            const p = point(u, v, 0.025).position,
              at =
                n * FIBRES * SEGMENTS * 2 +
                strand * SEGMENTS * 2 +
                segment * 2 +
                end;
            fibrePositions.setXYZ(at, p.x, p.y, p.z);
            const c = active ? lightFibre : darkFibre;
            fibreColours.setXYZ(at, c.r, c.g, c.b);
          }
      const fibreSpan = point(inset, 0.5).position.distanceTo(
        point(1 - inset, 0.5).position,
      );
      state.push({
        id: patch.id,
        muscle: patch.muscle,
        surface: patch.surface,
        active,
        shortened: movement,
        firstVertex: n * VERTS,
        vertexCount: VERTS,
        bellyStart: inset,
        bellyEnd: 1 - inset,
        fibreSpan,
      });
    });
    for (const geo of [geometry!, fibres!]) {
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
    }
    geometry!.computeVertexNormals();
    mesh!.userData.patches = state;
  }
  return {
    draw,
    stats: () => ({
      patches: count,
      vertices: count * VERTS,
      objects: mesh ? 2 : 0,
      disposed,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry?.dispose();
      fibres?.dispose();
      material.dispose();
      fibreMaterial.dispose();
      if (mesh) group.remove(mesh);
      if (lines) group.remove(lines);
      state = [];
      count = 0;
      mesh = null;
      lines = null;
    },
  };
}
