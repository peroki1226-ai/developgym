import asset from "../src/data/human/makehuman.json";
import { dot3, length3, sub3, unit3 } from "../src/domain/training3d";
const { createHash } = require("node:crypto");
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const p=new Float32Array(bytes(asset.positions).buffer),w=new Float32Array(bytes(asset.skinWeights).buffer);
const ids=bytes(asset.skinIndices),materials=bytes(asset.materials);
// Measured v6 authored surface references, not population or athlete measurements.
test.each([
  ['forearm.L',.3919125649,.2715974322,1.08,1.24],
  ['forearm.R',.3919125649,.2715974322,1.08,1.24],
  ['thigh.L',1.2323637843,.6159064804,1.10,1.28],
  ['thigh.R',1.2323637843,.6159064804,1.10,1.28],
  ['shin.L',.8851697089,.4185440655,1.07,1.22],
  ['shin.R',.8851697089,.4185440655,1.07,1.22],
] as const)('%s: bodybuilder muscle belly gains volume without enlarging the joint end',(name,previous,joint,min,max)=>{
  const bone=asset.bones.indexOf(name),rest=asset.rest[name];
  const head=rest.head as [number,number,number],tail=rest.tail as [number,number,number],axis=unit3(sub3(tail,head)),span=length3(sub3(tail,head));
  const percentile=(lo:number,hi:number)=>{
    const values:number[]=[];
    for(let i=0;i<asset.surfaceRefinement.baseVertexCount;i++){
      if(materials[i]!==0)continue;let influence=0;
      for(let j=0;j<4;j++)if(ids[i*4+j]===bone)influence+=w[i*4+j];
      if(influence<=.55)continue;
      const offset=sub3([p[i*3],p[i*3+1],p[i*3+2]],head),along=dot3(offset,axis),t=along/span;
      if(t<=lo||t>=hi)continue;values.push(Math.sqrt(Math.max(0,dot3(offset,offset)-along*along)));
    }
    expect(values.length).toBeGreaterThan(5);values.sort((a,b)=>a-b);
    const at=.9*(values.length-1),low=Math.floor(at);return values[low]+(values[Math.ceil(at)]-values[low])*(at-low);
  };
  expect(percentile(.25,.7)).toBeGreaterThan(previous*min);
  expect(percentile(.25,.7)).toBeLessThan(previous*max);
  expect(percentile(.94,1.03)).toBeCloseTo(joint,6);
});
test('the accepted bone/grip and original material classification survive the refined surface',()=>{
  const h=createHash('sha256');
  for(const key of ['bones','rest','grips'] as const)h.update(JSON.stringify(asset[key]));
  h.update(materials.slice(0,asset.surfaceRefinement.baseVertexCount));
  expect(h.digest('hex')).toBe('9160c5696463377000b3eb006c7344269977514f9916e8dfe3f7ac8274b2fdbe');
});
test('anatomical relief retains subtle cavity shading without darkening the body or painting garments',()=>{
  const shade=bytes(asset.surfaceOcclusion);let skin=0,defined=0;
  for(let i=0;i<asset.vertexCount;i++)if(materials[i]===0){skin++;if(shade[i]<230)defined++;}else expect(shade[i]).toBe(255);
  expect(defined).toBeGreaterThan(0);
  expect([...shade].filter((_,i)=>materials[i]===0).reduce((a,b)=>a+b,0)/skin).toBeGreaterThan(245);
  expect(defined/skin).toBeLessThan(.30);
  expect(Math.min(...shade)).toBeGreaterThanOrEqual(214);
});
