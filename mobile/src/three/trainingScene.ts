import * as THREE from "three";
import {
  camera3d,
  TrainingFrame3,
  V3,
  Bone3,
  View3,
  Focus3,
  trainingFrame3d,
  add3,
  sub3,
  mul3,
  unit3,
  cross3,
  dot3,
  mix3,
} from "../domain/training3d";
import { muscleSpec } from "../domain/muscleMotion";

export type SceneInput = {
  type: string;
  progress: number;
  anatomy: boolean;
  view: View3;
  focus: Focus3;
  transparent: boolean;
};
const v = (a: V3) => new THREE.Vector3(...a);
const SKIN = new THREE.Color("#c8c8c8"),
  DARK = new THREE.Color("#575757"),
  MUSCLE = new THREE.Color("#c65346");
const yAxis = new THREE.Vector3(0, 1, 0);
const material = (color: string, metalness = 0, roughness = 0.7) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

function tubeGeometry() {
  const geometry = new THREE.BufferGeometry(),
    positions = new Float32Array(21 * 25 * 3),
    colours = new Float32Array(positions.length),
    indices: number[] = [];
  for (let i = 0; i < 20; i++)
    for (let j = 0; j < 24; j++) {
      const a = i * 25 + j,
        b = a + 25;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  return geometry;
}
function profile(values: number[], t: number) {
  const p = Math.min(
      values.length - 1.000001,
      Math.max(0, t) * (values.length - 1),
    ),
    i = Math.floor(p);
  return THREE.MathUtils.lerp(values[i], values[i + 1], p - i);
}
function writeLimb(
  geometry: THREE.BufferGeometry,
  limb: Bone3,
  kind: "arm" | "leg",
  index: number,
  frame: TrainingFrame3,
  anatomy: boolean,
  progress: number,
) {
  const [a, b, c] = limb,
    curve = new THREE.CatmullRomCurve3(
      [v(a), v(mix3(a, b, 0.65)), v(b), v(mix3(b, c, 0.4)), v(c)],
      false,
      "centripetal",
    );
  const normal = unit3(cross3(sub3(b, a), sub3(c, b)));
  const positions = geometry.attributes.position as THREE.BufferAttribute,
    colours = geometry.attributes.color as THREE.BufferAttribute;
  const radius =
    kind === "arm"
      ? [3.2, 3.7, 3.2, 2.3, 2.1, 2.2, 2.1, 1.6, 1.1]
      : [4.8, 5.1, 4.6, 3.4, 2.6, 2.7, 3.1, 2.2, 1.3];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20,
      centre = curve.getPoint(t),
      tangent = curve.getTangent(t).normalize(),
      first = v(normal)
        .addScaledVector(tangent, -v(normal).dot(tangent))
        .normalize();
    if (first.lengthSq() < 0.1)
      first.set(1, 0, 0).addScaledVector(tangent, -tangent.x).normalize();
    const second = new THREE.Vector3().crossVectors(first, tangent).normalize(),
      r = profile(radius, t);
    for (let j = 0; j <= 24; j++) {
      const angle = (j / 24) * Math.PI * 2,
        radial = first
          .clone()
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(second, Math.sin(angle));
      const point = centre.clone().addScaledVector(radial, r),
        at = i * 25 + j;
      const front = radial.dot(v(frame.body.forward)),
        lateral = radial.x * (index === 0 ? -1 : 1),
        upper = t < 0.5;
      const selected =
        anatomy &&
        frame.muscles.some((m) =>
          kind === "arm"
            ? (m === "biceps" && t > 0.12 && t < 0.43 && front > 0.05) ||
              (m === "triceps" && t > 0.12 && t < 0.43 && front < -0.05) ||
              (((m === "frontShoulder" && front > 0.15) ||
                (m === "sideShoulder" && lateral > 0.15) ||
                (m === "rearShoulder" && front < -0.15)) &&
                t < 0.19)
            : (m === "quads" && t > 0.08 && t < 0.46 && front > -0.05) ||
              (m === "hamstrings" && t > 0.1 && t < 0.45 && front < 0.05) ||
              (m === "glutes" && t < 0.18 && front < 0.2) ||
              (m === "hipAbductors" && t < 0.2 && lateral > 0.15) ||
              (m === "adductors" && t > 0.06 && t < 0.4 && lateral < -0.1) ||
              (m === "soleus" && t > 0.57 && t < 0.91 && front < 0.1),
        );
      if (selected && upper && kind === "arm")
        point.addScaledVector(radial, 0.25 * progress);
      positions.setXYZ(at, point.x, point.y, point.z);
      const base = selected ? MUSCLE : kind === "leg" && t < 0.23 ? DARK : SKIN;
      const stripe = selected ? 0.94 + 0.06 * Math.cos(t * 150 + angle * 3) : 1;
      colours.setXYZ(at, base.r * stripe, base.g * stripe, base.b * stripe);
    }
  }
  positions.needsUpdate = true;
  colours.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
}
function writeTorso(
  geometry: THREE.BufferGeometry,
  frame: TrainingFrame3,
  anatomy: boolean,
) {
  const { body } = frame,
    up = unit3(sub3(body.shoulder, body.hip)),
    neck = add3(body.head, mul3(up, -5.3));
  const spine =
    body.spine.length > 2
      ? [...body.spine, neck]
      : [body.hip, mix3(body.hip, body.shoulder, 0.5), body.shoulder, neck];
  const curve = new THREE.CatmullRomCurve3(spine.map(v), false, "centripetal"),
    positions = geometry.attributes.position as THREE.BufferAttribute,
    colours = geometry.attributes.color as THREE.BufferAttribute;
  const widths = [7.4, 7.8, 7, 6.5, 7.6, 9.5, 10.5, 10.3, 8.4, 3, 2.4],
    depths = [5.1, 5.3, 4.7, 4.3, 5, 5.9, 6, 5.8, 4.8, 2.5, 2.3];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20,
      c = curve.getPoint(t),
      axis = curve.getTangent(t).normalize(),
      right = v(body.right),
      front = new THREE.Vector3().crossVectors(right, axis).normalize();
    for (let j = 0; j <= 24; j++) {
      const angle = (j / 24) * Math.PI * 2,
        x = Math.cos(angle),
        z = Math.sin(angle),
        at = i * 25 + j;
      const rx = profile(widths, t),
        rz =
          profile(depths, t) +
          (z > 0 && t > 0.5 && t < 0.8
            ? 0.45 * Math.sin(((t - 0.5) / 0.3) * Math.PI)
            : 0);
      const point = c
        .clone()
        .addScaledVector(right, rx * x)
        .addScaledVector(front, rz * z);
      positions.setXYZ(at, point.x, point.y, point.z);
      const on =
        anatomy &&
        frame.muscles.some(
          (m) =>
            (m === "chest" &&
              t > 0.5 + 0.08 * Math.abs(x) &&
              t < 0.81 &&
              z > 0.25 &&
              Math.abs(x) > 0.06) ||
            (m === "upperChest" && t > 0.65 && t < 0.84 && z > 0.25) ||
            (m === "abs" && t > 0.16 && t < 0.54 && z > 0.6) ||
            (m === "lats" &&
              t > 0.24 &&
              t < 0.76 &&
              z < -0.1 &&
              Math.abs(x) > 0.32) ||
            (m === "midBack" && t > 0.5 && t < 0.8 && z < -0.45) ||
            (m === "erectors" && t > 0.2 && t < 0.75 && z < -0.75),
        );
      const base = on ? MUSCLE : t < 0.13 ? DARK : SKIN,
        shade = on ? 0.96 + 0.04 * Math.cos(t * 165 + x * 9) : 1;
      colours.setXYZ(at, base.r * shade, base.g * shade, base.b * shade);
    }
  }
  positions.needsUpdate = true;
  colours.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
}

function writePelvis(
  geometry: THREE.BufferGeometry,
  frame: TrainingFrame3,
  anatomy: boolean,
) {
  const positions = geometry.attributes.position as THREE.BufferAttribute,
    colours = geometry.attributes.color as THREE.BufferAttribute;
  const up = unit3(sub3(frame.body.shoulder, frame.body.hip));
  for (let i = 0; i <= 20; i++)
    for (let j = 0; j <= 24; j++) {
      const t = (i / 20) * Math.PI,
        theta = (j / 24) * Math.PI * 2,
        x = Math.sin(t) * Math.cos(theta),
        y = -Math.cos(t),
        z = Math.sin(t) * Math.sin(theta),
        at = i * 25 + j;
      const p = add3(
        add3(
          add3(frame.body.hip, mul3(frame.body.right, x * 7.8)),
          mul3(up, y * 4.4),
        ),
        mul3(frame.body.forward, z * 5.2),
      );
      positions.setXYZ(at, ...p);
      const active =
        anatomy &&
        ((frame.muscles.includes("glutes") && z < -0.15) ||
          (frame.muscles.includes("hipAbductors") && Math.abs(x) > 0.55));
      const c = active ? MUSCLE : DARK;
      colours.setXYZ(at, c.r, c.g, c.b);
    }
  positions.needsUpdate = true;
  colours.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
}

/** One render per supplied pose/camera change. No secondary animation loop or downloaded assets. */
export function createTrainingScene(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number,
  pixelRatio = 1,
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f2f2f2");
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 700);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x969696, 2));
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(60, 130, 90);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -90;
  key.shadow.camera.right = 90;
  key.shadow.camera.top = 110;
  key.shadow.camera.bottom = -70;
  key.shadow.camera.far = 350;
  key.shadow.bias = -0.001;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.2);
  fill.position.set(-70, 70, -40);
  scene.add(fill);
  const groundMat = material("#eeeeee"),
    groundGeo = new THREE.PlaneGeometry(360, 360),
    ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  scene.add(ground);
  const group = new THREE.Group();
  scene.add(group);
  const materials = {
    skin: material("#c8c8c8"),
    metal: material("#747474", 0.65, 0.42),
    pad: material("#303030", 0.02, 0.88),
    rubber: material("#242424", 0.01, 0.82),
    chrome: material("#bdbdbd", 0.8, 0.28),
    shoe: material("#303030", 0.01, 0.8),
    eyes: material("#575757"),
    hair: material("#707070"),
    vertex: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
    }),
    pin: material("#fff", 0, 0.45),
  };
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 20, 14),
    beam: new THREE.CylinderGeometry(1, 1, 1, 16),
  };
  const nodes = new Map<string, THREE.Mesh>();
  const tubes = new Map<string, THREE.Mesh>();
  let currentType = "",
    disposed = false;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  function mesh(
    id: string,
    shape: keyof typeof geometries,
    mat: THREE.Material,
  ) {
    let node = nodes.get(id);
    if (!node) {
      node = new THREE.Mesh(geometries[shape], mat);
      node.castShadow = true;
      node.receiveShadow = true;
      node.name = id;
      nodes.set(id, node);
      group.add(node);
    }
    node.visible = true;
    node.material = mat;
    return node;
  }
  function axes(mesh: THREE.Mesh, x: V3, y: V3, z: V3) {
    mesh.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(v(x), v(y), v(z)),
    );
  }
  function sphere(id: string, a: V3, size: V3, mat: THREE.Material) {
    const node = mesh(id, "sphere", mat);
    node.position.set(...a);
    node.scale.set(...size);
    node.quaternion.identity();
    return node;
  }
  function beam(id: string, a: V3, b: V3, r: number, mat: THREE.Material) {
    const node = mesh(id, "beam", mat),
      delta = v(sub3(b, a));
    node.position.copy(v(mix3(a, b, 0.5)));
    node.scale.set(r, delta.length(), r);
    node.quaternion.setFromUnitVectors(yAxis, delta.normalize());
    return node;
  }
  function tube(id: string) {
    let node = tubes.get(id);
    if (!node) {
      node = new THREE.Mesh(tubeGeometry(), materials.vertex);
      node.castShadow = true;
      node.receiveShadow = true;
      node.name = id;
      tubes.set(id, node);
      group.add(node);
    }
    return node;
  }
  function reset() {
    nodes.forEach((n) => group.remove(n));
    nodes.clear();
    tubes.forEach((n) => {
      n.geometry.dispose();
      group.remove(n);
    });
    tubes.clear();
  }
  function draw(input: SceneInput) {
    if (disposed) return;
    const frame = trainingFrame3d(input.type, input.progress);
    if (currentType !== frame.type) {
      reset();
      currentType = frame.type;
    }
    nodes.forEach((n) => (n.visible = false));
    for (const mat of [
      materials.metal,
      materials.pad,
      materials.rubber,
      materials.chrome,
    ]) {
      if (mat.transparent !== input.transparent) mat.needsUpdate = true;
      mat.transparent = input.transparent;
      mat.opacity = input.transparent ? 0.26 : 1;
      mat.depthWrite = !input.transparent;
    }
    frame.equipment.forEach((item) => {
      const node = mesh("gear-" + item.id, item.kind, materials[item.color]);
      node.castShadow = !input.transparent;
      node.position.set(...item.a);
      node.quaternion.identity();
      if (item.kind === "beam") {
        const d = v(sub3(item.b!, item.a));
        node.position.copy(v(mix3(item.a, item.b!, 0.5)));
        node.scale.set(item.size[0], d.length(), item.size[0]);
        node.quaternion.setFromUnitVectors(yAxis, d.normalize());
      } else {
        node.scale.set(...item.size);
        if (item.axes) axes(node, ...item.axes);
      }
    });
    writePelvis(tube("pelvis").geometry, frame, input.anatomy);
    writeTorso(tube("torso").geometry, frame, input.anatomy);
    frame.body.arms.forEach((limb, i) =>
      writeLimb(
        tube("arm" + i).geometry,
        limb,
        "arm",
        i,
        frame,
        input.anatomy,
        input.progress,
      ),
    );
    frame.body.legs.forEach((limb, i) =>
      writeLimb(
        tube("leg" + i).geometry,
        limb,
        "leg",
        i,
        frame,
        input.anatomy,
        input.progress,
      ),
    );
    const body = frame.body,
      up = unit3(sub3(body.head, body.shoulder)),
      front = unit3(cross3(body.right, up));
    const neck = sphere(
      "neck",
      add3(body.head, mul3(up, -5.3)),
      [2.35, 3.1, 2.35],
      materials.skin,
    );
    axes(neck, body.right, up, front);
    const head = sphere("head", body.head, [4.2, 5.9, 4.1], materials.skin);
    axes(head, body.right, up, front);
    const local = (x: number, y: number, z: number) =>
      add3(
        add3(add3(body.head, mul3(body.right, x)), mul3(up, y)),
        mul3(front, z),
      );
    for (const s of [-1, 1]) {
      sphere(
        "ear" + s,
        local(s * 4.1, 0, 0),
        [0.65, 1.2, 0.65],
        materials.skin,
      );
      sphere(
        "eye" + s,
        local(s * 1.45, 0.8, 3.8),
        [0.25, 0.28, 0.2],
        materials.eyes,
      );
    }
    const nose = sphere(
      "nose",
      local(0, -0.2, 4.1),
      [0.65, 1.05, 0.75],
      materials.skin,
    );
    axes(nose, body.right, up, front);
    beam(
      "mouth",
      local(-0.85, -2.2, 3.6),
      local(0.85, -2.2, 3.6),
      0.1,
      materials.eyes,
    );
    const hair = sphere(
      "hair",
      local(0, 3.6, -0.25),
      [4.05, 2.5, 3.85],
      materials.hair,
    );
    axes(hair, body.right, up, front);
    body.arms.forEach(([, e, h], i) => {
      const along = unit3(sub3(h, e)),
        side = unit3(cross3(along, body.forward)),
        palm = sphere("palm" + i, h, [1.6, 2, 0.9], materials.skin);
      axes(palm, side, along, unit3(cross3(side, along)));
      for (let f = 0; f < 4; f++) {
        const start = add3(h, mul3(side, (f - 1.5) * 0.65)),
          mid = add3(add3(start, mul3(along, 1.4)), mul3(body.forward, 0.85)),
          end = add3(mid, mul3(along, -0.7));
        beam("finger-a" + i + f, start, mid, 0.35, materials.skin);
        beam("finger-b" + i + f, mid, end, 0.35, materials.skin);
      }
    });
    frame.feet.forEach((f, i) => {
      const foot = sphere(
          "shoe" + i,
          f.centre,
          [2.3, 1.1, 4.4],
          materials.shoe,
        ),
        right = unit3(cross3(f.up, f.toe));
      axes(foot, right, f.up, f.toe);
      const sole = sphere(
        "sole" + i,
        add3(f.centre, mul3(f.up, -0.85)),
        [2.32, 0.3, 4.3],
        materials.skin,
      );
      axes(sole, right, f.up, f.toe);
    });
    const contact =
      input.focus === "hands"
        ? frame.contacts[1]
        : input.focus === "feet"
          ? frame.contacts[2]
          : null;
    contact?.points.forEach((p, i) =>
      sphere("contact" + i, p, [1.6, 1.6, 1.6], materials.pin),
    );
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    if (input.focus === "whole")
      group.children.forEach((n) => {
        if (n.visible) bounds.expandByObject(n);
      });
    else {
      const muscle = muscleSpec(frame.type).focus;
      const lower = [
        "quads",
        "hamstrings",
        "glutes",
        "hipAbductors",
        "adductors",
        "soleus",
      ].includes(muscle);
      const arm = [
        "frontShoulder",
        "sideShoulder",
        "rearShoulder",
        "biceps",
        "triceps",
      ].includes(muscle);
      const musclePoints = lower
        ? body.legs.flat()
        : arm
          ? body.arms.flat()
          : [body.hip, body.shoulder, body.head, ...body.arms.map((a) => a[0])];
      const points =
        input.focus === "hands"
          ? body.arms.flat()
          : input.focus === "feet"
            ? body.legs.flat()
            : musclePoints;
      bounds.setFromPoints(points.map(v)).expandByScalar(6);
    }
    const target = bounds.getCenter(new THREE.Vector3()),
      base = camera3d(frame, input.view, input.focus),
      direction = v(sub3(base.position, base.target)).normalize();
    const screenRight = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), direction)
        .normalize(),
      screenUp = new THREE.Vector3()
        .crossVectors(direction, screenRight)
        .normalize();
    const tangent = Math.tan((camera.fov * Math.PI) / 360);
    let distance = 50;
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const d = new THREE.Vector3(x, y, z).sub(target);
          distance = Math.max(
            distance,
            d.dot(direction) +
              Math.max(
                Math.abs(d.dot(screenRight)) / (tangent * camera.aspect),
                Math.abs(d.dot(screenUp)) / tangent,
              ),
          );
        }
    camera.position.copy(target).addScaledVector(direction, distance * 1.12);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    return frame;
  }
  return {
    draw,
    resize(w: number, h: number) {
      if (disposed) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      groundGeo.dispose();
      groundMat.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
    },
    stats: () => ({ nodes: nodes.size, tubes: tubes.size, disposed }),
  };
}
