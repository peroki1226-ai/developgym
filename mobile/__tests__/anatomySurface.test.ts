import asset from "../src/data/human/makehuman.json";
const {createHash}=require('node:crypto');
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const p=new Float32Array(bytes(asset.positions).buffer),i=new Uint16Array(bytes(asset.indices).buffer),m=bytes(asset.materials),ids=bytes(asset.skinIndices),w=new Float32Array(bytes(asset.skinWeights).buffer);

test('the refined skin is conforming, bounded, and leaves no open edge around added vertices',()=>{
 expect(asset.vertexCount).toBeGreaterThan(20000);expect(asset.vertexCount).toBeLessThanOrEqual(24000);
 expect(asset.surfaceRefinement.baseVertexCount+asset.surfaceRefinement.addedVertices).toBe(asset.vertexCount);
 expect(i.length/3).toBe(27720+asset.surfaceRefinement.addedVertices*2);
 const edges=new Map<string,number>();
 for(let t=0;t<i.length;t+=3)for(let k=0;k<3;k++){
  const a=i[t+k],b=i[t+(k+1)%3];expect(a).toBeLessThan(asset.vertexCount);
  if(a<asset.surfaceRefinement.baseVertexCount&&b<asset.surfaceRefinement.baseVertexCount)continue;
  const key=Math.min(a,b)+'/'+Math.max(a,b);edges.set(key,(edges.get(key)??0)+1);
 }
 expect(edges.size).toBeGreaterThan(10000);for(const count of edges.values())expect(count).toBe(2);
});
test('authored face, eyes, hands and feet keep their vertices, weights and protected triangles',()=>{
 const protectedVertex:boolean[]=[],h=createHash('sha256');
 for(let v=0;v<asset.vertexCount;v++){
  let influence=0;for(let k=0;k<4;k++)if(/^(head|hand\.|foot\.)/.test(asset.bones[ids[v*4+k]]))influence+=w[v*4+k];
  protectedVertex[v]=influence>.95||m[v]===2;
  if(protectedVertex[v]){h.update(new Uint8Array(p.buffer,v*12,12));h.update(ids.slice(v*4,v*4+4));h.update(new Uint8Array(w.buffer,v*16,16));}
 }
 for(let t=0;t<i.length;t+=3)if([0,1,2].every(k=>protectedVertex[i[t+k]]))h.update(new Uint8Array(i.buffer,t*2,6));
 expect(h.digest('hex')).toBe('30dd2dc635d533154ccb8e853b356aa90b84ada7acd35d92fc371d33a946446c');
});
function anteriorAt(x:number,y:number){
 let front=-Infinity;
 for(let t=0;t<i.length;t+=3){
  const a=i[t]*3,b=i[t+1]*3,c=i[t+2]*3;
  if(m[i[t]]!==0||m[i[t+1]]!==0||m[i[t+2]]!==0)continue;
  const determinant=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(determinant)<1e-10)continue;
  const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/determinant;
  const v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/determinant;
  if(Math.min(u,v,1-u-v)<-1e-6)continue;
  front=Math.max(front,u*p[a+2]+v*p[b+2]+(1-u-v)*p[c+2]);
 }
 expect(Number.isFinite(front)).toBe(true);return front;
}
test('uncoloured rectus bellies have actual relief above transverse and central valleys on both sides',()=>{
 for(const side of [-1,1])for(const [level,below,above] of [[2.47,2.10,2.86],[3.25,2.86,3.64]]){
  const belly=anteriorAt(side*.4,level);
  expect(belly-(anteriorAt(side*.4,below)+anteriorAt(side*.4,above))/2).toBeGreaterThan(.05);
  expect(belly-anteriorAt(0,level)).toBeGreaterThan(.08);
 }
});
test('front torso triangles actually have enough local resolution for separated muscle contours',()=>{
 const lengths:number[]=[];
 for(let t=0;t<i.length;t+=3){const vertices=[i[t],i[t+1],i[t+2]];
  if(!vertices.every(v=>m[v]===0&&Math.abs(p[v*3])<1.7&&p[v*3+1]>2&&p[v*3+1]<5.8&&p[v*3+2]>.7))continue;
  for(let k=0;k<3;k++){const a=vertices[k]*3,b=vertices[(k+1)%3]*3;lengths.push(Math.hypot(p[a]-p[b],p[a+1]-p[b+1],p[a+2]-p[b+2]));}
 }
 lengths.sort((a,b)=>a-b);expect(lengths.length).toBeGreaterThan(5000);expect(lengths[Math.floor(lengths.length*.9)]).toBeLessThan(.25);
});
