import * as THREE from "three";
import { createRealisticHuman } from "./realisticHuman";
import { createCurvedEquipmentGeometry, createEquipmentGeometries } from "./equipmentGeometry";
import { camera3d, Primitive3, TrainingFrame3, V3, View3, Focus3, trainingFrame3d, add3, sub3, mul3, unit3, cross3, mix3, length3 } from "../domain/training3d";
import { Muscle, muscleSpec } from "../domain/muscleMotion";
export type SceneInput = {
  type: string;
  progress: number;
  anatomy: boolean;
  view: View3;
  focus: Focus3;
  transparent: boolean;
  muscle?: Muscle;
  variant?: TrainingFrame3["variant"];
  returning?: boolean;
};
const v = (a: V3) => new THREE.Vector3(...a);
const yAxis = new THREE.Vector3(0, 1, 0);
const material = (color: string, metalness = 0, roughness = 0.7) => new THREE.MeshStandardMaterial({
  color,
  metalness,
  roughness
});

/** One render per supplied pose/camera change. No secondary animation loop or downloaded assets. */
export function createTrainingScene(renderer: THREE.WebGLRenderer, width: number, height: number, pixelRatio = 1) {
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
    metal: material("#474c51", 0.65, 0.4),
    satin: material("#989fa6", 0.65, 0.42),
    pad: material("#202326", 0.02, 0.72),
    rubber: material("#25282b", 0.01, 0.86),
    chrome: material("#c5cbd0", 0.9, 0.2),
    pin: material("#fff", 0, 0.45),
    flow: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 1, depthTest: false, depthWrite: false })
  };
  const geometries = createEquipmentGeometries();
  const human = createRealisticHuman(group);
  const nodes = new Map<string, THREE.Mesh>();
  const focusedBounds = new Map<string, THREE.Box3>();
  let currentType = "",
    disposed = false;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  function mesh(id: string, shape: keyof typeof geometries | "curve", mat: THREE.Material, item?: Primitive3) {
    let node = nodes.get(id);
    if (!node) {
      const geometry = shape === "curve" ? createCurvedEquipmentGeometry(item!.points!, item!.section!) : geometries[shape];
      node = new THREE.Mesh(geometry, mat);
      node.userData.ownsGeometry = shape === "curve";
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
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(v(x), v(y), v(z)));
  }
  function sphere(id: string, a: V3, size: V3, mat: THREE.Material) {
    const node = mesh(id, "sphere", mat);
    node.position.set(...a);
    node.scale.set(...size);
    node.quaternion.identity();
    return node;
  }
  function reset() {
    nodes.forEach(n => {
      group.remove(n);
      if (n.userData.ownsGeometry) n.geometry.dispose();
    });
    nodes.clear();
    focusedBounds.clear();
  }
  function draw(input: SceneInput) {
    if (disposed) return;
    const sourceFrame = trainingFrame3d(input.type, input.progress, input.variant);
    const selected = input.muscle && muscleSpec(input.type).primary.includes(input.muscle) ? input.muscle : undefined;
    const frame = selected ? {
      ...sourceFrame,
      muscles: [selected]
    } : sourceFrame;
    const modelKey = frame.type + "/" + (input.variant ?? "incline");
    if (currentType !== modelKey) {
      reset();
      currentType = modelKey;
    }
    nodes.forEach(n => n.visible = false);
    for (const mat of [materials.metal, materials.satin, materials.pad, materials.rubber, materials.chrome]) {
      if (mat.transparent !== input.transparent) mat.needsUpdate = true;
      mat.transparent = input.transparent;
      mat.opacity = input.transparent ? 0.26 : 1;
      mat.depthWrite = !input.transparent;
    }
    frame.equipment.forEach(item => {
      const node = mesh("gear-" + item.id, item.kind, materials[item.color], item);
      node.castShadow = !input.transparent;
      node.position.set(...item.a);
      node.quaternion.identity();
      if (item.kind === "beam" || item.kind === "tube") {
        const d = v(sub3(item.b!, item.a));
        node.position.copy(v(mix3(item.a, item.b!, 0.5)));
        node.scale.set(item.size[0], d.length(), item.size[2]);
        node.quaternion.setFromUnitVectors(yAxis, d.normalize());
      } else {
        node.scale.set(...item.size);
        if (item.axes) axes(node, ...item.axes);
      }
    });
    human.draw(frame, input.anatomy);
    const flowMuscle = selected ?? muscleSpec(frame.type).focus;
    if (input.anatomy && ["leg-press", "leg-extension", "hip-adduction"].includes(frame.type)) {
      frame.body.legs.forEach((leg, i) => {
        const side = i === 0 ? -1 : 1;
        const along = flowMuscle === "glutes" ? unit3(sub3(frame.body.shoulder, frame.body.hip)) : unit3(sub3(leg[1], leg[0]));
        const anterior = unit3(cross3(along, frame.body.right));
        const centre = flowMuscle === "glutes"
          ? add3(add3(frame.body.hip, [side * 4, 3, 0]), mul3(frame.body.forward, -4.2))
          : add3(add3(mix3(leg[0], leg[1], .5), mul3(anterior, 4.5)), flowMuscle === "adductors" ? [-side * 2, 0, 0] : [0, 0, 0]);
        const span = 8 - 2.5 * input.progress;
        for (const end of [-1, 1]) {
          const from = add3(centre, mul3(along, end * span * .5));
          const to = add3(centre, mul3(along, end * (input.returning ? span * .5 + .8 : .3)));
          const direction = v(sub3(to, from)).normalize();
          const shaft = mesh(`muscle-flow-${i}-${end}`, "beam", materials.flow);
          shaft.renderOrder = 20;
          shaft.position.copy(v(mix3(from, to, .5)));
          shaft.quaternion.setFromUnitVectors(yAxis, direction);
          shaft.scale.set(.18, length3(sub3(to, from)), .18);
          const tip = mesh(`muscle-flow-tip-${i}-${end}`, "cone", materials.flow);
          tip.renderOrder = 20;
          tip.position.copy(v(to).addScaledVector(direction, -.5));
          tip.quaternion.copy(shaft.quaternion); tip.scale.set(.5, 1, .5);
        }
      });
    }
    const contact = input.focus === "hands" ? frame.contacts[1] : input.focus === "feet" ? frame.contacts[2] : null;
    contact?.points.forEach((p, i) => sphere("contact" + i, p, [1.6, 1.6, 1.6], materials.pin));
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    if (input.focus === "whole") group.children.forEach(n => {
      if (n.visible) bounds.expandByObject(n);
    });else {
      const muscle = selected ?? muscleSpec(frame.type).focus;
      const lower = ["quads", "hamstrings", "glutes", "hipAbductors", "adductors", "soleus"].includes(muscle);
      const arm = ["frontShoulder", "sideShoulder", "rearShoulder", "biceps", "triceps"].includes(muscle);
      const cacheKey = `${modelKey}/${input.focus}/${muscle}`;
      if (!focusedBounds.has(cacheKey)) {
        const points: THREE.Vector3[] = [];
        for (let step = 0; step <= 20; step++) {
          const body = trainingFrame3d(frame.type, step / 20, input.variant).body;
          const musclePoints = lower ? body.legs.flat() : arm ? body.arms.flat() : [body.hip, body.shoulder, body.head, ...body.arms.map(a => a[0])];
          const posePoints = input.focus === "hands" ? body.arms.flat() : input.focus === "feet" ? body.legs.flat() : musclePoints;
          points.push(...posePoints.map(v));
        }
        focusedBounds.set(cacheKey, new THREE.Box3().setFromPoints(points).expandByScalar(8));
      }
      // A fixed inspection window lets the viewer compare muscle changes without
      // zooming in and out as the joint bends.
      bounds.copy(focusedBounds.get(cacheKey)!);
    }
    const target = bounds.getCenter(new THREE.Vector3()),
      base = camera3d(frame, input.view, input.focus),
      direction = v(sub3(base.position, base.target)).normalize();
    const screenRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize(),
      screenUp = new THREE.Vector3().crossVectors(direction, screenRight).normalize();
    const tangent = Math.tan(camera.fov * Math.PI / 360);
    let distance = 50;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const d = new THREE.Vector3(x, y, z).sub(target);
      distance = Math.max(distance, d.dot(direction) + Math.max(Math.abs(d.dot(screenRight)) / (tangent * camera.aspect), Math.abs(d.dot(screenUp)) / tangent));
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
      human.dispose();
      Object.values(geometries).forEach(g => g.dispose());
      Object.values(materials).forEach(m => m.dispose());
      groundGeo.dispose();
      groundMat.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
    },
    stats: () => ({
      nodes: nodes.size,
      tubes: 0,
      disposed,
      anatomy: human.stats()
    })
  };
}
