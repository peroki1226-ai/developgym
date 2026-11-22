import * as THREE from "three";

type Skin = { base: Float32Array; normals: Float32Array; indices: Uint16Array; boneIds: Uint8Array; weights: Float32Array; clothes: Uint8Array; surfaceOcclusion: Uint8Array; masks: Record<string, Uint8Array> };
/** One conforming subdivision of hand edges, before cylinder fitting. Original
 * vertices/weights stay in place; adjacent triangles split the same shared edge.
 * This prevents coarse finger facets from cutting through a narrow lifting bar. */
export function refineGripSkin(skin: Skin, bones: readonly string[]) {
  const originalCount = skin.base.length / 3;
  const base = Array.from(skin.base), normals = Array.from(skin.normals), ids = Array.from(skin.boneIds), weights = Array.from(skin.weights);
  const clothes = Array.from(skin.clothes), shade = Array.from(skin.surfaceOcclusion);
  const hand = Array.from({length: originalCount}, (_, i) => {
    for (const name of ["hand.R", "hand.L"]) {
      let w = 0; for (let j=0;j<4;j++) if (bones[ids[i*4+j]]===name) w+=weights[i*4+j];
      if (w>.95) return name;
    }
    return "";
  });
  const mids = new Map<string,number>(), index: number[] = [];
  const edge = (a:number,b:number) => Math.min(a,b)+"/"+Math.max(a,b);
  const p = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3(), chord = new THREE.Vector3();
  for(let t=0;t<skin.indices.length;t+=3) for(let k=0;k<3;k++) {
    const a=skin.indices[t+k],b=skin.indices[t+(k+1)%3],key=edge(a,b);
    if(!hand[a]||hand[a]!==hand[b]||mids.has(key))continue;
    p.fromArray(base,a*3);q.fromArray(base,b*3);n.fromArray(normals,a*3);m.fromArray(normals,b*3);chord.copy(q).sub(p);
    // Point-normal midpoint keeps the finger round instead of flattening it.
    const offset=n.clone().multiplyScalar(-chord.dot(n)).addScaledVector(m,chord.dot(m)).multiplyScalar(1/8);
    offset.clampLength(0,.035);p.lerp(q,.5).add(offset);n.add(m).normalize();
    const id=base.length/3;mids.set(key,id);base.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);
    const influences=new Map<number,number>();
    for(const v of [a,b])for(let j=0;j<4;j++)influences.set(ids[v*4+j],(influences.get(ids[v*4+j])||0)+weights[v*4+j]*.5);
    const ordered=[...influences].sort((a,b)=>b[1]-a[1]).slice(0,4),total=ordered.reduce((s,p)=>s+p[1],0);
    for(let j=0;j<4;j++){ids.push(ordered[j]?.[0]??0);weights.push((ordered[j]?.[1]??0)/total);}
    clothes.push(skin.clothes[a]);shade.push(Math.round((skin.surfaceOcclusion[a]+skin.surfaceOcclusion[b])*.5));
  }
  for(let t=0;t<skin.indices.length;t+=3){
    const v=Array.from(skin.indices.slice(t,t+3)),mid=v.map((a,k)=>mids.get(edge(a,v[(k+1)%3]))),count=mid.filter(x=>x!==undefined).length;
    if(!count){index.push(...v);continue;}
    if(count===3){const[a,b,c]=v,[ab,bc,ca]=mid as number[];index.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);continue;}
    const turn=count===1?mid.findIndex(x=>x!==undefined):(mid.findIndex(x=>x===undefined)+1)%3;
    const[a,b,c]=[0,1,2].map(k=>v[(k+turn)%3]),[ab,bc]=[0,1].map(k=>mid[(k+turn)%3]!);
    if(count===1)index.push(a,ab,c,ab,b,c);else index.push(a,ab,c,ab,bc,c,ab,b,bc);
  }
  const count=base.length/3;
  if(count>65535)throw new Error("Grip subdivision exceeds the mobile skin index budget");
  const masks=Object.fromEntries(Object.entries(skin.masks).map(([name,values])=>{const a=new Uint8Array(count);a.set(values);return[name,a];}));
  return {base:new Float32Array(base),normals:new Float32Array(normals),indices:new Uint16Array(index),boneIds:new Uint8Array(ids),weights:new Float32Array(weights),clothes:new Uint8Array(clothes),surfaceOcclusion:new Uint8Array(shade),masks};
}
