import asset from "../src/data/human/makehuman.json";
const {createHash}=require("node:crypto");
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const raw=bytes(asset.positions),p=new Float32Array(raw.buffer),m=bytes(asset.materials),indices=new Uint16Array(bytes(asset.indices).buffer);
const normalBytes=bytes(asset.normals),n=new Float32Array(normalBytes.buffer),ao=bytes(asset.surfaceOcclusion);
function chestFraction(v:number){
 const x=Math.abs(p[v*3]),collar=asset.rest["clavicle.L"].head[1],shoulder=Math.abs(asset.rest["upperarm.L"].head[0]);
 const u=Math.min(1,x/shoulder),bottom=collar-1.14-.34*Math.sin(Math.PI*u)+.50*u*u+.16*Math.exp(-((x/.32)**2));
 return (p[v*3+1]-bottom)/Math.max(collar-.055-.18*u-bottom,.25);
}

test("the user-approved upper/middle chest and all regions outside the lower rim retain their surface, normals and shading",()=>{
 const h=createHash("sha256"),protectedVertices:number[]=[];
 for(let v=0;v<asset.vertexCount;v++){
  const x=Math.abs(p[v*3]),t=chestFraction(v);
  if(m[v]!==0||t>=1/3||t<-.26||x<=.04||x>=Math.abs(asset.rest["upperarm.L"].head[0])*.99||p[v*3+2]<=.4||p[v*3+1]<=4.18)protectedVertices.push(v);
 }
 for(const [data,stride]of [[raw,12],[normalBytes,12],[ao,1]] as const)for(const v of protectedVertices)h.update(data.subarray(v*stride,(v+1)*stride));
 expect(protectedVertices.length).toBe(23488);
 expect(h.digest("hex")).toBe("bf2f7577572225c3a497457a8c725babd4736b5e330e50c569bb5901d2d77f6a");
});

test("the lower rim normal field is smooth without changing the broad rounded chest contour",()=>{
 const core=new Map<number,Set<number>>();
 for(let v=0;v<asset.vertexCount;v++){
  const x=Math.abs(p[v*3]),t=chestFraction(v);
  if(m[v]===0&&t>-.05&&t<.18&&x>.35&&x<1.7&&p[v*3+2]>.65)core.set(v,new Set());
 }
 for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){
  const v=indices[i+k],neighbors=core.get(v);
  if(neighbors){neighbors.add(indices[i+(k+1)%3]);neighbors.add(indices[i+(k+2)%3]);}
 }
 const residuals=[...core].map(([v,neighbors])=>{
  const mean=[0,0,0];for(const j of neighbors)for(let k=0;k<3;k++)mean[k]+=n[j*3+k]/neighbors.size;
  return Math.hypot(n[v*3]-mean[0],n[v*3+1]-mean[1],n[v*3+2]-mean[2]);
 });
 expect(residuals.length).toBeGreaterThan(100);
 // v10: mean .07185 / max .16789. Measure the actual neighboring normals,
 // independently of the quadratic-fit implementation and target colours.
 expect(residuals.reduce((a,b)=>a+b,0)/residuals.length).toBeLessThan(.05);
 expect(Math.max(...residuals)).toBeLessThan(.13);
});

test("the chest-only correction preserves all topology, authored weights, bones, grips and garment bindings",()=>{
 const h=createHash("sha256");
 for(const k of ["indices","materials","skinIndices","skinWeights"] as const)h.update(asset[k]);
 for(const k of ["bones","rest","grips","garmentBindings"] as const)h.update(JSON.stringify(asset[k]));
 expect(h.digest("hex")).toBe("8989ea6626484c300efd901c41ce43338d2903731c1b77398774ce19a612d57b");
 const xy=createHash("sha256");for(let v=0;v<asset.vertexCount;v++)xy.update(raw.subarray(v*12,v*12+8));
 expect(xy.digest("hex")).toBe("a0f13c3a43b789a007a75cb6c5ee0cea634463bd7e1536d6e4a36f8f04b03e74");
});

test("the authored sternum and geometry outside the anterior chest patch remain unchanged",()=>{
 const h=createHash("sha256");
 for(let v=0;v<asset.vertexCount;v++){
  const x=Math.abs(p[v*3]),y=p[v*3+1],z=p[v*3+2];
  if(m[v]!==0||x<=.04||x>=2.06||y<=4.18||y>=6||z<=.4)h.update(raw.subarray(v*12,v*12+12));
 }
 expect(h.digest("hex")).toBe("28d8f17c2d81e4e28cfa650fd84d2eff2b8f05f529feb3f1feb53808c7113c50");
});

// Intersect actual skin triangles, rather than testing the sculpt's formula,
// colour masks, lighting or individual vertices chosen by the generator.
const triangles:number[][]=[];
for(let t=0;t<indices.length;t+=3){
 const ids=[indices[t],indices[t+1],indices[t+2]];
 if(ids.every(v=>m[v]===0&&p[v*3+1]>3.9&&p[v*3+1]<6.3&&p[v*3+2]>.4&&Math.abs(p[v*3])<2.2))triangles.push(ids);
}
function depth(x:number,y:number){
 let front=-Infinity;
 for(const ids of triangles){
  const [a,b,c]=ids.map(v=>v*3),d=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);
  if(Math.abs(d)<1e-10)continue;
  const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/d;
  const v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/d;
  if(Math.min(u,v,1-u-v)<-1e-6)continue;
  front=Math.max(front,u*p[a+2]+v*p[b+2]+(1-u-v)*p[c+2]);
 }
 expect(Number.isFinite(front)).toBe(true);return front;
}
const heights=Array.from({length:59},(_,i)=>4.35+i*.025);
function profile(x:number){return heights.map(y=>depth(x,y));}
function peakHeight(x:number){const z=profile(x);return heights[z.indexOf(Math.max(...z))];}

test("each fan has a lower central crown, with higher sternal and axillary ends as in the reference silhouette",()=>{
 for(const sign of [-1,1]){
  const centre=peakHeight(sign*.70);
  expect(centre).toBeGreaterThan(4.8);expect(centre).toBeLessThan(5.15);
  expect(peakHeight(sign*.22)-centre).toBeGreaterThan(.05);
  expect(peakHeight(sign*1.35)-centre).toBeGreaterThan(.05);
 }
});

test("the uncoloured chest surface rolls into the ribs without the former steep shelf",()=>{
 for(const sign of [-1,1])for(const x of [.22,.70,1.35]){
  const z=profile(sign*x),slope=z.slice(1).map((v,i)=>Math.abs(v-z[i])/.025);
  expect(Math.max(...slope)).toBeLessThan(1.95);
 }
});

test("the two broad bellies stay bilateral and separated by a bounded sternal cleft",()=>{
 for(const y of [4.95,5.05,5.25]){
  const left=depth(-.70,y),right=depth(.70,y),cleft=(left+right)/2-depth(0,y);
  expect(Math.abs(left-right)).toBeLessThan(.015);
  expect(cleft).toBeGreaterThan(.12);expect(cleft).toBeLessThan(.35);
 }
});
