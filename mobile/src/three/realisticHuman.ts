import { HUMAN_SURFACE, humanSurfaceColours } from "./humanSurface";
import { VolumeSkinner } from "./volumeSkinning";
import * as THREE from "three";
import asset from "../data/human/makehuman.json";
import { Muscle } from "../domain/muscleMotion";
import { TrainingFrame3, V3, add3, mix3, mul3, sub3, unit3, length3, cross3, dot3, trainingFrame3d } from "../domain/training3d";
type Rest = {
  head: number[];
  tail: number[];
};
const rest = asset.rest as Record<string, Rest>;
const muscleNames = Object.keys(asset.muscleMasks) as Muscle[];
const vec = (p: readonly number[]) => new THREE.Vector3(...(p as [number, number, number]));
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const SCALE = 4.8;
function decode(text: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const out = new Uint8Array(text.length * 3 / 4 - (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0));
  let index = 0;
  for (let i = 0; i < text.length; i += 4) {
    const value = chars.indexOf(text[i]) << 18 | chars.indexOf(text[i + 1]) << 12 | (chars.indexOf(text[i + 2]) & 63) << 6 | chars.indexOf(text[i + 3]) & 63;
    if (index < out.length) out[index++] = value >> 16;
    if (index < out.length) out[index++] = value >> 8 & 255;
    if (index < out.length) out[index++] = value & 255;
  }
  return out;
}
const base = new Float32Array(decode(asset.positions).buffer);
const normals = new Float32Array(decode(asset.normals).buffer);
const indices = new Uint16Array(decode(asset.indices).buffer);
const boneIds = decode(asset.skinIndices);
const weights = new Float32Array(decode(asset.skinWeights).buffer);
const clothes = decode(asset.materials);
const surfaceOcclusion = decode(asset.surfaceOcclusion);
const masks = Object.fromEntries(muscleNames.map(name => [name, decode((asset.muscleMasks as Record<string, string>)[name])])) as Record<Muscle, Uint8Array>;
const as3 = (p: readonly number[]) => p as V3;

/** Stable anatomical frame: X is the bend-plane normal, Y follows the bone. */
function basis(start: V3, end: V3, side: V3) {
  const y = vec(sub3(end, start)).normalize();
  let x = vec(side).addScaledVector(y, -vec(side).dot(y));
  if (x.lengthSq() < 1e-7) x = new THREE.Vector3(0, 0, 1).addScaledVector(y, -y.z);
  if (x.lengthSq() < 1e-7) x = new THREE.Vector3(0, 1, 0).addScaledVector(y, -y.y);
  x.normalize();
  return new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y).normalize()).setPosition(...start);
}
const rootRest = as3(rest.spine05.head),
  neckRest = as3(rest.neck.head);
function sideIndex(frame: TrainingFrame3, side: string) {
  const index = side === "L" ? 1 : 0;
  return frame.body.right[0] > 0 ? index : 1 - index;
}
function limbNormal(points: readonly V3[], fallback: V3): V3 {
  let n = cross3(sub3(points[1], points[0]), sub3(points[2], points[1]));
  if (length3(n) < .02) return fallback;
  n = unit3(n);
  return n[0] * fallback[0] + n[1] * fallback[1] + n[2] * fallback[2] < 0 ? mul3(n, -1) : n;
}
function sourceSide(name: string): V3 {
  if (!name.includes(".") || name.startsWith("foot")) return [1, 0, 0];
  const side = name.at(-1)!,
    leg = /thigh|shin|foot/.test(name);
  const a = rest[(leg ? "thigh" : "upperarm") + "." + side],
    b = rest[(leg ? "shin" : "forearm") + "." + side];
  return limbNormal([as3(a.head), as3(a.tail), as3(b.tail)], [1, 0, 0]);
}
const restFrames = asset.bones.map(name => basis(as3(rest[name].head), as3(rest[name].tail), sourceSide(name)));
const inverseBind = restFrames.map(matrix => matrix.clone().invert());
const restRotations = restFrames.map(matrix => new THREE.Matrix4().extractRotation(matrix));
const floorSupported = new Set(["incline-bench-press", "barbell-bench-press", "incline-hammer-press", "chest-press", "pec-fly", "lat-pulldown", "shoulder-press", "abdominal-crunch", "incline-smith", "dumbbell-heavy", "lateral-raise", "preacher-curl", "triceps-pushdown", "cable-machine", "rear-delt-fly", "power-rack"]);
const soleSamples = new Map<number, number[]>();
for (const side of ["R", "L"]) {
  const bone = asset.bones.indexOf("foot." + side),
    samples: number[] = [];
  for (let i = 0; i < asset.vertexCount; i++) {
    let weight = 0;
    for (let j = 0; j < 4; j++) if (boneIds[i * 4 + j] === bone) weight += weights[i * 4 + j];
    if (weight > .95 && clothes[i] === 0 && base[i * 3 + 1] < rest["foot." + side].head[1] - .2) samples.push(i);
  }
  soleSamples.set(bone, samples);
}
function footTransform(frame: TrainingFrame3, index: number, ankle: V3) {
  const name = asset.bones[index],
    i = sideIndex(frame, name.at(-1)!),
    foot = frame.feet[i];
  const end = add3(add3(ankle, mul3(foot.toe, 3)), mul3(foot.up, -1.5));
  const scale = length3(sub3(end, ankle)) / length3(sub3(as3(rest[name].tail), as3(rest[name].head)));
  const radial = SCALE;
  return basis(ankle, end, frame.body.right).scale(new THREE.Vector3(radial, scale, radial)).multiply(inverseBind[index]);
}
function targets(frame: TrainingFrame3) {
  const {
      body
    } = frame,
    up = unit3(sub3(body.shoulder, body.hip));
  const curve = new THREE.CatmullRomCurve3(body.spine.map(p => vec(p)), false, "centripetal");
  // CatmullRomCurve3's two-point endpoint extrapolation shares a temporary
  // vector and is not linear. A straight spine must retain anatomical height.
  const point = (position: number): V3 => body.spine.length === 2
    ? mix3(body.spine[0], body.spine[1], clamp(position))
    : as3(curve.getPoint(clamp(position)).toArray());
  const span = neckRest[1] - rootRest[1];
  const rootRotation = basis([0, 0, 0], up, body.right);
  const handMatrices = new Map<number, THREE.Matrix4>();
  const wrists = new Map<number, V3>();
  for (const side of ["R", "L"] as const) {
    const i = sideIndex(frame, side), arm = body.arms[i];
    const grip = frame.grips.find(g => length3(sub3(g.centre, arm[2])) < .01);
    if (!grip) continue;
    const source = asset.grips[side];
    const axis = vec(grip.axis).normalize();
    if (Math.abs(axis.y) < .5 && axis.x * (i === 0 ? -1 : 1) > 0) axis.negate();
    const approach = vec(sub3(arm[1], grip.centre)).addScaledVector(axis, -vec(sub3(arm[1], grip.centre)).dot(axis)).normalize();
    const targetFrame = new THREE.Matrix4().makeBasis(axis, approach, new THREE.Vector3().crossVectors(axis, approach).normalize()).setPosition(...grip.centre);
    const sourceFrame = new THREE.Matrix4().makeBasis(vec(source.axis), vec(source.approach), new THREE.Vector3().crossVectors(vec(source.axis), vec(source.approach)).normalize()).setPosition(...as3(source.centre));
    const matrix = targetFrame.scale(new THREE.Vector3(SCALE, SCALE, SCALE)).multiply(sourceFrame.invert());
    handMatrices.set(i, matrix);
    wrists.set(i, as3(vec(source.wrist).applyMatrix4(matrix).toArray()));
  }
  // Fit the authored sole to the existing contact plane instead of guessing an
  // ankle height from the old ellipsoid shoe. The shin follows the same ankle.
  const ankles: V3[] = [];
  for (const side of ["R", "L"]) {
    const index = asset.bones.indexOf("foot." + side),
      i = sideIndex(frame, side),
      foot = frame.feet[i];
    const matrix = footTransform(frame, index, foot.ankle),
      normal = vec(foot.up),
      point = new THREE.Vector3();
    let minimum = Infinity;
    for (const vertex of soleSamples.get(index)!) {
      point.set(base[vertex * 3], base[vertex * 3 + 1], base[vertex * 3 + 2]).applyMatrix4(matrix);
      minimum = Math.min(minimum, point.dot(normal));
    }
    const support = floorSupported.has(frame.type) ? .1 : vec(foot.contact).dot(normal);
    ankles[i] = add3(foot.ankle, mul3(foot.up, support - minimum));
  }
  return asset.bones.map((name, index) => {
    if (name.startsWith("foot")) return footTransform(frame, index, ankles[sideIndex(frame, name.at(-1)!)]);
    const source = rest[name];
    if (name === "hip" || name.startsWith("spine")) {
      // Retarget torso cross-sections coherently. Aligning each authored curved
      // spine bone independently used to tilt anterior chest vertices down and
      // produce a hanging chest even when the reference mesh was muscular.
      const start = point((source.head[1] - rootRest[1]) / span);
      const end = point((source.tail[1] - rootRest[1]) / span);
      const vertical = sub3(end, start);
      const forward = unit3(cross3(body.right, unit3(vertical)));
      return new THREE.Matrix4().makeBasis(
        vec(mul3(body.right, SCALE)),
        vec(mul3(vertical, 1 / (source.tail[1] - source.head[1]))),
        vec(mul3(forward, SCALE)),
      ).setPosition(...start).multiply(new THREE.Matrix4().makeTranslation(-source.head[0], -source.head[1], -source.head[2]));
    }
    let start: V3, end: V3;
    if (name === "neck") {
      start = body.shoulder;
      end = add3(body.head, mul3(up, -3.7));
    } else if (name === "head") {
      start = add3(body.head, mul3(up, -3.74));
      end = add3(body.head, mul3(up, 3.74));
    } else {
      const i = sideIndex(frame, name.at(-1)!),
        arm = body.arms[i],
        leg = body.legs[i];
      const foreDirection = unit3(sub3(arm[2], arm[1])),
        wrist = wrists.get(i) ?? add3(arm[2], mul3(foreDirection, -4.4));
      const ankle = ankles[i];
      if (name.startsWith("clavicle")) {
        const height = (source.head[1] - rootRest[1]) / span;
        const sourceZ = rootRest[2] + (neckRest[2] - rootRest[2]) * height;
        start = add3(add3(point(height), mul3(body.right, source.head[0] * SCALE)), mul3(body.forward, (source.head[2] - sourceZ) * SCALE));
        end = arm[0];
      } else if (name.startsWith("upperarm")) {
        [start, end] = arm;
      } else if (name.startsWith("forearm")) {
        start = arm[1];
        end = wrist;
      } else if (name.startsWith("hand")) {
        if (handMatrices.has(i)) return handMatrices.get(i)!;
        start = wrist;
        end = add3(start, mul3(foreDirection, length3(sub3(as3(source.tail), as3(source.head))) * SCALE));
      } else if (name.startsWith("thigh")) {
        [start, end] = leg;
      } else if (name.startsWith("shin")) {
        start = leg[1];
        end = ankle;
      } else {
        start = ankle;
        end = add3(add3(start, mul3(frame.feet[i].toe, 3)), mul3(frame.feet[i].up, -1.5));
      }
    }
    const scaleY = length3(sub3(end, start)) / Math.max(.01, length3(sub3(as3(source.tail), as3(source.head))));
    const radial = SCALE;
    // Swing from the authored rest direction. A bend-plane sign must never flip
    // the skin through 180 degrees as a limb approaches its straight position.
    const originalDirection = vec(sub3(as3(source.tail), as3(source.head))).normalize().applyMatrix4(rootRotation);
    const targetDirection = vec(sub3(end, start)).normalize();
    const swing = new THREE.Quaternion().setFromUnitVectors(originalDirection, targetDirection);
    return new THREE.Matrix4().makeRotationFromQuaternion(swing).multiply(rootRotation).multiply(restRotations[index]).setPosition(...start).scale(new THREE.Vector3(radial, scaleY, radial)).multiply(inverseBind[index]);
  });
}

/** Qualitative paths across joints, not measured human fascicle lengths. */
export function musclePathLength(frame: TrainingFrame3, muscle: Muscle): number {
  const b = frame.body,
    up = unit3(sub3(b.shoulder, b.hip)),
    torso = length3(sub3(b.shoulder, b.hip));
  return [0, 1].map(i => {
    const arm = b.arms[i],
      leg = b.legs[i],
      fore = sub3(arm[2], arm[1]),
      shin = sub3(leg[2], leg[1]),
      sign = i === 0 ? -1 : 1;
    let origin: V3, insertion: V3;
    switch (muscle) {
      case "biceps":
        origin = arm[0];
        insertion = add3(arm[1], mul3(fore, .22));
        break;
      case "triceps":
        origin = mix3(arm[0], arm[1], .15);
        insertion = add3(arm[1], mul3(fore, -.18));
        break;
      case "quads":
        origin = leg[0];
        insertion = add3(leg[1], mul3(shin, -.18));
        break;
      case "hamstrings":
        origin = leg[0];
        insertion = add3(leg[1], mul3(shin, .18));
        break;
      case "chest":
      case "upperChest":
        origin = add3(add3(b.shoulder, mul3(up, muscle === "upperChest" ? -.08 * torso : -.2 * torso)), mul3(b.forward, 3));
        insertion = mix3(arm[0], arm[1], .25);
        break;
      case "frontShoulder":
      case "sideShoulder":
      case "rearShoulder":
        origin = add3(add3(arm[0], mul3(b.right, -sign * 3)), mul3(b.forward, muscle === "rearShoulder" ? -3 : muscle === "frontShoulder" ? 3 : 0));
        insertion = mix3(arm[0], arm[1], .45);
        break;
      case "lats":
        origin = add3(mix3(b.hip, b.shoulder, .25), mul3(b.forward, -2));
        insertion = mix3(arm[0], arm[1], .2);
        break;
      case "midBack":
        origin = add3(mix3(b.hip, b.shoulder, .8), mul3(b.forward, -3));
        insertion = arm[0];
        break;
      case "glutes":
        if (frame.type === "leg-press") {
          // A posterior hip path wraps around the joint; a straight chord can
          // incorrectly lengthen on extension. This is nominal excursion only.
          const flexion = Math.acos(clamp(dot3(unit3(sub3(leg[1], leg[0])), mul3(up, -1)), -1, 1));
          return 8 + 4 * flexion;
        }
        origin = add3(add3(b.hip, mul3(up, 3)), mul3(b.forward, -4));
        insertion = mix3(leg[0], leg[1], .35);
        break;
      case "hipAbductors":
        origin = add3(b.hip, mul3(b.right, sign * 9));
        insertion = mix3(leg[0], leg[1], .35);
        break;
      case "adductors":
        origin = b.hip;
        insertion = mix3(leg[0], leg[1], .55);
        break;
      case "soleus":
        origin = mix3(leg[1], leg[2], .45);
        insertion = add3(leg[2], mul3(frame.feet[i].toe, -2));
        break;
      case "abs":
        origin = add3(b.shoulder, mul3(b.forward, 3));
        insertion = add3(b.hip, mul3(b.forward, 3));
        break;
      default:
        origin = add3(b.shoulder, mul3(b.forward, -3));
        insertion = add3(b.hip, mul3(b.forward, -3));
    }
    return length3(sub3(insertion, origin));
  }).reduce((a, b) => a + b, 0) / 2;
}
const references = new Map<string, Record<Muscle, number>>();
function reference(type: string, variant?: TrainingFrame3["variant"]) {
  const key = type + "/" + (variant ?? "incline");
  if (!references.has(key)) {
    const a = trainingFrame3d(type, 0, variant),
      b = trainingFrame3d(type, 1, variant);
    references.set(key, Object.fromEntries(muscleNames.map(m => [m, Math.max(musclePathLength(a, m), musclePathLength(b, m))])) as Record<Muscle, number>);
  }
  return references.get(key)!;
}
export type HumanMuscleState = {
  muscle: Muscle;
  length: number;
  shortening: number;
  radialScale: number;
  colouredVertices: number;
};
export function createRealisticHuman(parent: THREE.Group) {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const positions = new Float32Array(base.length),
    posedNormals = new Float32Array(normals.length),
    colours = new Float32Array(base.length);
  const fibres = new Float32Array(asset.vertexCount * 2),
    tint = new Float32Array(asset.vertexCount);
  for (const [name, data, size] of [["position", positions, 3], ["normal", posedNormals, 3], ["color", colours, 3], ["muscleCoord", fibres, 2], ["muscleTint", tint, 1]] as const) geometry.setAttribute(name, new THREE.BufferAttribute(data, size).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: HUMAN_SURFACE.roughness,
    metalness: 0
  });
  material.onBeforeCompile = shader => {
    shader.vertexShader = "attribute vec2 muscleCoord; attribute float muscleTint; varying vec2 vFibre; varying float vTint;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFibre = muscleCoord; vTint = muscleTint;");
    shader.fragmentShader = "varying vec2 vFibre; varying float vTint;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\nfloat fibre = 0.5 + 0.5 * sin(vFibre.y * 90.0 + sin(vFibre.x * 12.0) * 0.2); diffuseColor.rgb *= 1.0 - vTint * fibre * 0.045;");
  };
  material.customProgramCacheKey = () => "makehuman-muscle-fibre-v1";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "human-surface";
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  const dominant = new Uint8Array(asset.vertexCount).fill(255),
    strength = new Float32Array(asset.vertexCount),
    sourceT = new Float32Array(asset.vertexCount),
    axes = new Float32Array(base.length);
  const skinner = new VolumeSkinner(asset.bones.length, SCALE);
  const neutralColours = humanSurfaceColours(base,clothes);
  const red = new THREE.Color("#b94b3e");
  function bindActiveMuscles(active: readonly Muscle[]) {
    dominant.fill(255);
    for (let i = 0; i < asset.vertexCount; i++) {
    let best = 0;
    for (let m = 0; m < muscleNames.length; m++) if (active.includes(muscleNames[m]) && masks[muscleNames[m]][i] > best) {
      best = masks[muscleNames[m]][i];
      dominant[i] = m;
    }
    strength[i] = best / 255;
    const name = muscleNames[dominant[i]],
      side = base[i * 3] < 0 ? "R" : "L";
    const kind = name === "biceps" || name === "triceps" || name?.includes("Shoulder") ? "upperarm" : ["quads", "hamstrings", "adductors", "hipAbductors"].includes(name) ? "thigh" : name === "soleus" ? "shin" : "forearm";
    const bone = rest[kind + "." + side];
    let axis = unit3(sub3(as3(bone.tail), as3(bone.head))),
      origin = as3(bone.head),
      span = length3(sub3(as3(bone.tail), as3(bone.head)));
    if (["chest", "upperChest"].includes(name)) {
      origin = [0, base[i * 3 + 1], 0];
      // Sternal and clavicular fibres fan into the upper arm rather than
      // running as horizontal strips across the lower ribcage.
      const insertion = as3(rest["upperarm." + side].head);
      const path: V3 = [insertion[0], insertion[1] - origin[1], 0];
      axis = unit3(path);
      span = length3(path);
    } else if (["abs", "lats", "midBack", "erectors", "glutes"].includes(name)) {
      origin = rootRest;
      axis = [0, 1, 0];
      span = 5;
    }
    const relative = sub3([base[i * 3], base[i * 3 + 1], base[i * 3 + 2]], origin);
    const t = clamp((relative[0] * axis[0] + relative[1] * axis[1] + relative[2] * axis[2]) / span);
    sourceT[i] = t;
    axes.set(axis, i * 3);
    fibres[i * 2] = t;
    fibres[i * 2 + 1] = (base[i * 3] * .7 + base[i * 3 + 2]) / Math.max(.4, span * .25);
    if (["chest", "upperChest"].includes(name)) {
      const insertion = rest["upperarm." + side].head;
      const lateral = clamp(Math.abs(base[i * 3] / insertion[0]), 0, .9);
      fibres[i * 2 + 1] = (base[i * 3 + 1] - insertion[1] * lateral) / (1 - lateral);
    }
  }
  }
  let activeKey = "";
  let disposed = false,
    lastStates: HumanMuscleState[] = [];
  return {
    mesh,
    draw(frame: TrainingFrame3, anatomy: boolean) {
      if (disposed) return;
      const key = frame.muscles.join("/");
      if (activeKey !== key) { bindActiveMuscles(frame.muscles); activeKey = key; (geometry.attributes.muscleCoord as THREE.BufferAttribute).needsUpdate = true; }
      const transforms = targets(frame),
        ref = reference(frame.type, frame.variant);
      mesh.userData.handContacts = (["R", "L"] as const).flatMap(side => {
        const i = sideIndex(frame, side), grip = frame.grips.find(g => length3(sub3(g.centre, frame.body.arms[i][2])) < .01);
        if (!grip) return [];
        const centre = vec(asset.grips[side].centre).applyMatrix4(transforms[asset.bones.indexOf("hand." + side)]);
        return [{ side, centre: centre.toArray(), error: centre.distanceTo(vec(grip.centre)) }];
      });
      const states = muscleNames.map(m => {
        const length = musclePathLength(frame, m),
          shortening = clamp((ref[m] - length) / Math.max(.01, ref[m]), 0, .28);
        return {
          muscle: m,
          length,
          shortening,
          radialScale: Math.sqrt(1 / (1 - shortening)),
          colouredVertices: 0
        };
      });
      skinner.update(transforms);
      const sourcePoint = new THREE.Vector3(),
        sourceNormal = new THREE.Vector3(),
        point = new THREE.Vector3(),
        n = new THREE.Vector3(),
        colour = new THREE.Color();
      for (let i = 0; i < asset.vertexCount; i++) {
        const k = i * 3,
          m = dominant[i],
          amount = m === 255 ? 0 : states[m].shortening,
          window = Math.sin(Math.PI * sourceT[i]) ** 2;
        const bulge = (Math.sqrt(1 / (1 - amount)) - 1) * .9 * strength[i] * window;
        const axial = (0.5 - sourceT[i]) * amount * .35 * strength[i] * window;
        sourcePoint.set(base[k] + normals[k] * bulge + axes[k] * axial, base[k + 1] + normals[k + 1] * bulge + axes[k + 1] * axial, base[k + 2] + normals[k + 2] * bulge + axes[k + 2] * axial);
        sourceNormal.set(normals[k], normals[k + 1], normals[k + 2]);
        skinner.apply(sourcePoint,sourceNormal,boneIds,weights,i*4,point,n);
        positions[k] = point.x; positions[k + 1] = point.y; positions[k + 2] = point.z;
        posedNormals[k] = n.x; posedNormals[k + 1] = n.y; posedNormals[k + 2] = n.z;
        let mask = 0;
        if (anatomy && clothes[i] !== 2) for (const active of frame.muscles) {
          const value = masks[active]?.[i] ?? 0;
          mask = Math.max(mask, value / 255);
          if (value > 35) states[muscleNames.indexOf(active)].colouredVertices++;
        }
        tint[i] = clamp(mask * 1.6);
        colour.fromArray(neutralColours,k);
        if (clothes[i] !== 2) colour.lerp(red, tint[i]);
        colour.multiplyScalar(surfaceOcclusion[i] / 255);
        colours[k] = colour.r;
        colours[k + 1] = colour.g;
        colours[k + 2] = colour.b;
      }
      for (const name of ["position", "normal", "color", "muscleTint"]) (geometry.attributes[name] as THREE.BufferAttribute).needsUpdate = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      lastStates = states;
      mesh.userData.muscles = states;
      mesh.userData.source = asset.source;
    },
    stats: () => ({
      objects: disposed ? 0 : 1,
      vertices: disposed ? 0 : asset.vertexCount,
      triangles: indices.length / 3,
      bones: asset.bones.length,
      source: asset.source.project,
      license: asset.source.license,
      muscles: lastStates,
      disposed
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      parent.remove(mesh);
      geometry.dispose();
      material.dispose();
    }
  };
}
