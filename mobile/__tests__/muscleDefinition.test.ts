import { surfaceAreas } from "../test-utils/surfaceAreas";
import asset from "../src/data/human/makehuman.json";
import { sub3, unit3, dot3, length3 } from "../src/domain/training3d";
const { createHash } = require("node:crypto");
const bytes = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const positions = new Float32Array(bytes(asset.positions).buffer);
const materials = bytes(asset.materials), ids = bytes(asset.skinIndices);
const weights = new Float32Array(bytes(asset.skinWeights).buffer);
const areas=surfaceAreas(positions,new Uint16Array(bytes(asset.indices).buffer));
const point = (i: number): [number, number, number] => [positions[i*3],positions[i*3+1],positions[i*3+2]];
const skinPoints = Array.from({length: asset.surfaceRefinement.baseVertexCount}, (_,i) => i).filter(i => materials[i] === 0);
// The shallow v8 chest division may reduce the v7 upper-chest mean slightly.
// Explicit v6 comparison landmarks, in authored units; not population anatomy measurements.
test.each([
  ["clavicular chest", .3, 1.2, 5.45, 5.75, 1, 1.2200708389, .08, .24],
  ["latissimus thickness", .8, 1.8, 3.2, 4.5, -1, .7806485891, .07, .25],
  ["mid-back thickness", .45, 1.2, 4.8, 5.8, -1, 1.0136190653, .09, .25],
] as const)("%s: extra depth is visible but bounded in its anatomical region", (_,x0,x1,y0,y1,side,previous,min,max) => {
  const region = skinPoints.map(point).filter(([x,y,z]) => Math.abs(x)>x0 && Math.abs(x)<x1 && y>y0 && y<y1 && z*side>.6-(side<0?.2:0));
  expect(region.length).toBeGreaterThan(10);
  const depth = region.reduce((sum,p) => sum+p[2]*side,0)/region.length;
  expect(depth-previous).toBeGreaterThan(min);
  expect(depth-previous).toBeLessThan(max);
});
test.each(["upperarm.L","upperarm.R"] as const)("%s: fuller muscle belly preserves the tapered elbow", name => {
  const bone = asset.bones.indexOf(name), rest = asset.rest[name];
  const head = rest.head as [number,number,number], tail = rest.tail as [number,number,number];
  const axis = unit3(sub3(tail,head)), span = length3(sub3(tail,head));
  const radius = (lo:number,hi:number) => {
    const values: number[] = [];
    for(const i of skinPoints){
      let influence=0; for(let j=0;j<4;j++) if(ids[i*4+j]===bone) influence+=weights[i*4+j];
      const offset=sub3(point(i),head), along=dot3(offset,axis), t=along/span;
      if(influence>.55 && t>lo && t<hi) values.push(Math.sqrt(dot3(offset,offset)-along*along));
    }
    values.sort((a,b)=>a-b); expect(values.length).toBeGreaterThan(5);
    const at=(values.length-1)*.9,low=Math.floor(at);
    return values[low]+(values[Math.ceil(at)]-values[low])*(at-low);
  };
  expect(radius(.25,.7)).toBeGreaterThan(.7883228763*1.15);
  expect(radius(.25,.7)).toBeLessThan(.7883228763*1.35);
  expect(radius(.94,1.03)).toBeCloseTo(.4581622631,6);
});
test("the authored full-palm-wrap-v2 hand pose remains deterministic", () => {
  const hash=createHash('sha256'); let count=0;
  for(const i of skinPoints){
    let hand=0; for(let j=0;j<4;j++) if(asset.bones[ids[i*4+j]].startsWith('hand.')) hand+=weights[i*4+j];
    if(hand>.95){hash.update(new Uint8Array(positions.buffer,i*12,12));count++;}
  }
  expect(count).toBe(3094);
  expect(hash.digest('hex')).toBe('87a6f38d20a439506aa369b877782e42d6e394b7c1b34544eeb830ac63aca4a4');
});
test("regional surfaces and masks remain bilateral and keep chest above the abdomen", () => {
  for(const name of ['upperChest','biceps','triceps','lats','midBack'] as const){
    const mask=bytes(asset.muscleMasks[name]); let left=0,right=0;
    mask.forEach((value,i)=>{if(positions[i*3]<0)left+=value*areas[i];else right+=value*areas[i];});
    expect(left).toBeGreaterThan(30); expect(Math.abs(left-right)/Math.max(left,right)).toBeLessThan(.03);
  }
  bytes(asset.muscleMasks.upperChest).forEach((value,i)=>{if(value>35){expect(positions[i*3+1]).toBeGreaterThan(5.1);expect(positions[i*3+1]).toBeLessThan(asset.rest['clavicle.L'].head[1]);}});
});
