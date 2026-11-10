import * as THREE from "three";
const { createHash } = require("node:crypto");
import asset from "../src/data/human/makehuman.json";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { trainingFrame3d, sub3, unit3, dot3, length3 } from "../src/domain/training3d";
import { exercisePose } from "../src/domain/exerciseMotion";
import { muscleRegions } from "../src/domain/muscleMotion";

const bytes = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const restPositions = new Float32Array(bytes(asset.positions).buffer);
const normals = new Float32Array(bytes(asset.normals).buffer);
const masks = { chest: bytes(asset.muscleMasks.chest), upperChest: bytes(asset.muscleMasks.upperChest) };

function weightedHeight(mask: Uint8Array) {
  let sum = 0, weight = 0;
  mask.forEach((value, i) => { sum += restPositions[i * 3 + 1] * value; weight += value; });
  return sum / weight;
}
test("the pectoral fan lies below the clavicles and above the abdomen, on both anterior sides", () => {
  const collar = asset.rest['clavicle.L'].head[1];
  let left = 0, right = 0;
  masks.chest.forEach((value, i) => {
    if (value <= 35) return;
    const [x, y] = restPositions.slice(i * 3, i * 3 + 2);
    // Landmarks, rather than an exact copy of the mask-generation formula.
    expect(y).toBeGreaterThan(4.5); // Upper abdominal mask ends below this level.
    expect(y).toBeLessThan(collar);
    expect(Math.abs(x)).toBeLessThan(Math.abs(asset.rest['upperarm.L'].head[0]));
    expect(Math.abs(x)).toBeGreaterThan(.04);
    expect(normals[i * 3 + 2]).toBeGreaterThan(0);
    if (x < 0) left += value; else right += value;
  });
  expect(left).toBeGreaterThan(1000);
  expect(right).toBeCloseTo(left, -2);
  expect(weightedHeight(masks.chest)).toBeGreaterThan(5.1);
});
test("the clavicular portion is above the whole-muscle centroid and stays inside its fan", () => {
  expect(weightedHeight(masks.upperChest)).toBeGreaterThan(weightedHeight(masks.chest) + .2);
  masks.upperChest.forEach((value, i) => expect(value).toBeLessThanOrEqual(masks.chest[i]));
});
test("repositioning the learning masks preserves the authored human geometry, skin weights and materials", () => {
  const digest = createHash('sha256');
  for (const field of ['positions', 'normals', 'indices', 'skinIndices', 'skinWeights', 'materials'] as const) digest.update(asset[field]);
  expect(digest.digest('hex')).toBe('887f55e2a7430d150cda473631334f51e2b55df2bfc11a7f58be41da9d3831c2');
  const otherMasks = createHash('sha256');
  for (const key of Object.keys(asset.muscleMasks).filter(k => !['chest','upperChest'].includes(k)).sort()) otherMasks.update(key).update(asset.muscleMasks[key as keyof typeof asset.muscleMasks]);
  expect(otherMasks.digest('hex')).toBe('6abeaf06e4be57c93cf17af0f4136239199e2b489d961796ac8b81a7e2a25e11');
});
test.each(['chest-press','pec-fly','incline-smith','dumbbell-heavy','cable-machine','assisted-dip'])("%s: chest colour follows the upper ribcage throughout the movement without changing grips", type => {
  const human = createRealisticHuman(new THREE.Group());
  try {
    for (const progress of [0, .5, 1]) {
      const frame = trainingFrame3d(type, progress);
      frame.muscles = [type === 'incline-smith' || type === 'dumbbell-heavy' ? 'upperChest' : 'chest'];
      human.draw(frame, true);
      const positions = human.mesh.geometry.attributes.position, tint = human.mesh.geometry.attributes.muscleTint;
      const axis = unit3(sub3(frame.body.shoulder, frame.body.hip));
      let sum = 0, weight = 0;
      for (let i = 0; i < tint.count; i++) {
        const value = tint.getX(i);
        if (value <= .2) continue;
        const at = dot3(sub3([positions.getX(i),positions.getY(i),positions.getZ(i)],frame.body.hip),axis) / length3(sub3(frame.body.shoulder,frame.body.hip));
        sum += at * value; weight += value;
      }
      expect(weight).toBeGreaterThan(1);
      expect(sum / weight).toBeGreaterThan(.65);
      expect(sum / weight).toBeLessThan(.94);
      for (const grip of human.mesh.userData.handContacts) expect(grip.error).toBeLessThan(1e-6);
      expect(Array.from(human.mesh.geometry.attributes.muscleCoord.array).every(Number.isFinite)).toBe(true);
    }
  } finally { human.dispose(); }
});
test("the simplified front/side/bench illustrations also separate the upper chest from the lower fan", () => {
  for (const type of ['chest-press','pec-fly','incline-smith','dumbbell-heavy','cable-machine']) {
    const pose = exercisePose(type, .5);
    const chest = muscleRegions(type, pose, ['chest']), upper = muscleRegions(type, pose, ['upperChest']);
    const towardHip = unit3([pose.hip[0]-pose.shoulder[0],pose.hip[1]-pose.shoulder[1],0]);
    const height = (point: readonly number[]) => dot3([point[0]-pose.shoulder[0],point[1]-pose.shoulder[1],0],towardHip);
    expect(height(upper[0].a)).toBeLessThan(height(chest[0].a));
    expect(upper[0].radius).toBeLessThan(chest[0].radius);
  }
});
