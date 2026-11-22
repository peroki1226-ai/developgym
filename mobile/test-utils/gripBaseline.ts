import asset from '../src/data/human/makehuman.json';
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const ids=bytes(asset.skinIndices),weights=new Float32Array(bytes(asset.skinWeights).buffer);
// Original vertex selection remains stable: this revision changes no weights.
export const isGripVertex=(v:number)=>{let w=0;for(let j=0;j<4;j++)if(asset.bones[ids[v*4+j]].startsWith('hand.'))w+=weights[v*4+j];return w>.95;};
export const outsideGrip=(v:number)=>!isGripVertex(v);
