import * as THREE from "three";
import asset from "../src/data/human/makehuman.json";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { trainingFrame3d, sub3, unit3, dot3, length3 } from "../src/domain/training3d";
const bytes = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const positions = new Float32Array(bytes(asset.positions).buffer);
const ids = bytes(asset.skinIndices), weights = new Float32Array(bytes(asset.skinWeights).buffer);
const materials = bytes(asset.materials);
const influence = (vertex: number, bone: number) => {
  let total = 0;
  for (let j = 0; j < 4; j++) if (ids[vertex*4+j] === bone) total += weights[vertex*4+j];
  return total;
};
// P90 radial distances measured on the previous natural athletic adult v3 reference, in authored
// mesh units. Keep this visual-change baseline explicit, not a human body claim.
test.each([
  ['upperarm.L', 0.6948824408808659, 1.04],
  ['thigh.L', 1.22512621851725, 1.015],
  ['shin.L', 0.8540106768065523, 1.03],
] as const)("%s: muscle bellies retain bounded athletic volume while joint ends stay tapered", (name, previous, increase) => {
  const bone = asset.bones.indexOf(name), rest = asset.rest[name];
  const axis = unit3(sub3(rest.tail as [number,number,number],rest.head as [number,number,number]));
  const span = length3(sub3(rest.tail as [number,number,number],rest.head as [number,number,number]));
  const distances: number[] = [];
  for (let i = 0; i < asset.vertexCount; i++) {
    if (influence(i,bone) <= .55) continue;
    const offset = sub3([positions[i*3],positions[i*3+1],positions[i*3+2]],rest.head as [number,number,number]);
    const along = dot3(offset,axis), t = along/span;
    if (t <= .15 || t >= .75) continue;
    distances.push(Math.sqrt(Math.max(0,dot3(offset,offset)-along*along)));
  }
  distances.sort((a,b)=>a-b);
  const index = .9*(distances.length-1), low = Math.floor(index);
  const current = distances[low]+(distances[Math.ceil(index)]-distances[low])*(index-low);
  expect(current).toBeGreaterThan(previous*increase);
  expect(current).toBeLessThan(previous*1.12); // Muscle bellies, not swollen joints.
});
test("the muscular profile retains pinned CC0 source data including its new regional morphs", () => {
  expect(asset.profile).toBe('balanced-athletic-adult-v5');
  const files=asset.source.files.map(f=>f.file);
  expect(files).toEqual(expect.arrayContaining([
    'targets/armslegs/l-upperarm-shoulder-muscle-incr.target',
    'targets/armslegs/r-upperarm-shoulder-muscle-incr.target',
    'targets/stomach/stomach-tone-incr.target',
    'targets/torso/torso-muscle-dorsi-incr.target',
  ]));
  expect(asset.source.license).toBe('CC0-1.0');
  expect(asset.vertexCount).toBe(13905);
});
test("cavity shading is bounded and neutral, while clothing and eyes retain their material", () => {
  const shade=bytes(asset.surfaceOcclusion);
  expect(shade).toHaveLength(asset.vertexCount);
  expect(Math.min(...shade)).toBeGreaterThanOrEqual(183);
  expect(Math.max(...shade)).toBe(255);
  expect([...shade].filter((value,i)=>materials[i]===0&&value<230).length).toBeGreaterThan(30);
  shade.forEach((value,i)=>{if(materials[i]!==0)expect(value).toBe(255);});
});
test("torso cross-sections retain their height without tilting the anterior chest downward", () => {
  const human=createRealisticHuman(new THREE.Group());
  try {
    const frame=trainingFrame3d('chest-press',0);frame.muscles=[];human.draw(frame,false);
    const output=human.mesh.geometry.attributes.position;
    const up=unit3(sub3(frame.body.shoulder,frame.body.hip)), span=length3(sub3(frame.body.shoulder,frame.body.hip));
    const root=asset.rest.spine05.head[1], restSpan=asset.rest.neck.head[1]-root;
    let checked=0;
    for(let i=0;i<asset.vertexCount;i++){
      const y=positions[i*3+1];
      if(materials[i]!==0||positions[i*3+2]<.6||y<4.4||y>5.7)continue;
      let spineWeight=0;
      for(let j=0;j<4;j++)if(asset.bones[ids[i*4+j]].startsWith('spine'))spineWeight+=weights[i*4+j];
      if(spineWeight<.9999)continue;
      const at=dot3(sub3([output.getX(i),output.getY(i),output.getZ(i)],frame.body.hip),up)/span;
      expect(at).toBeCloseTo((y-root)/restSpan,4);checked++;
    }
    expect(checked).toBeGreaterThan(20);
  } finally {human.dispose();}
});
test("the shorts carry thigh influences instead of remaining fixed only to the pelvis", () => {
  const thighR=asset.bones.indexOf('thigh.R'),thighL=asset.bones.indexOf('thigh.L');
  let cloth=0, moving=0;
  for(let i=0;i<asset.vertexCount;i++)if(materials[i]===1){cloth++;if(influence(i,thighR)+influence(i,thighL)>.15)moving++;}
  expect(cloth).toBeGreaterThan(100);
  expect(moving).toBeGreaterThan(cloth*.2);
});
