import { outsideArmBack } from "../test-utils/armBackBaseline";
import asset from "../src/data/human/makehuman.json";
import * as THREE from "three";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { trainingFrame3d } from "../src/domain/training3d";
import * as definition from "../src/three/humanDefinition";
const {createHash}=require("node:crypto");
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const raw=bytes(asset.positions),p=new Float32Array(raw.buffer),m=bytes(asset.materials),indices=new Uint16Array(bytes(asset.indices).buffer);
const normalBytes=bytes(asset.normals),n=new Float32Array(normalBytes.buffer),ao=bytes(asset.surfaceOcclusion);
function chestFraction(v:number){
 const x=Math.abs(p[v*3]),collar=asset.rest["clavicle.L"].head[1],shoulder=Math.abs(asset.rest["upperarm.L"].head[0]);
 const u=Math.min(1,x/shoulder),bottom=collar-1.14-.34*Math.sin(Math.PI*u)+.50*u*u+.16*Math.exp(-((x/.32)**2));
 return (p[v*3+1]-bottom)/Math.max(collar-.055-.18*u-bottom,.25);
}
function protectedSurface(v:number){
 const x=Math.abs(p[v*3]),y=p[v*3+1];
 return outsideArmBack(v)&&(m[v]!==0||chestFraction(v)>=1/3||x>=2.06||y<=3.8||y>=6||n[v*3+2]<=0||(x<=.04&&y>=4.95));
}

test("the approved upper/middle chest and body outside the subpectoral and arm/back corrections retain surface, normals and shading",()=>{
 const h=createHash("sha256"),protectedVertices:number[]=[];
 for(let v=0;v<asset.vertexCount;v++)if(protectedSurface(v))protectedVertices.push(v);
 for(const [data,stride]of [[raw,12],[normalBytes,12],[ao,1]] as const)for(const v of protectedVertices)h.update(data.subarray(v*stride,(v+1)*stride));
 expect(protectedVertices.length).toBe(17731);
 expect(h.digest("hex")).toBe("04d51b08d7f6a99a7b37e335d677f163ccfbc4ed395c81ac66870a2f5edddf79");
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
 const xy=createHash("sha256");for(let v=0;v<asset.vertexCount;v++)if(outsideArmBack(v))xy.update(raw.subarray(v*12,v*12+8));
 expect(xy.digest("hex")).toBe("d612117a8f465695ecde4f0e182f7f88771bfedf97604773886c089b842d1282");
});

test("the upper sternal cleft and geometry outside the subpectoral bridge remain unchanged",()=>{
 const h=createHash("sha256");
 for(let v=0;v<asset.vertexCount;v++){
  if(protectedSurface(v))h.update(raw.subarray(v*12,v*12+12));
 }
 expect(h.digest("hex")).toBe("3f0b38184aab19a21d7217556bd4c94492f5da2cd55adf01c7a59c080e7ae87e");
});

// Intersect actual skin triangles, rather than testing the sculpt's formula,
// colour masks, lighting or individual vertices chosen by the generator.
const triangles:number[][]=[];
for(let t=0;t<indices.length;t+=3){
 const ids=[indices[t],indices[t+1],indices[t+2]];
 if(ids.every(v=>m[v]===0&&p[v*3+1]>3.5&&p[v*3+1]<6.3&&Math.abs(p[v*3])<2.2))triangles.push(ids);
}
function depth(x:number,y:number,posed?:ArrayLike<number>,forward?:readonly number[]){
 let front=-Infinity,anchor:{vertices:number[];weights:number[]}|undefined;
 for(const ids of triangles){
  const [a,b,c]=ids.map(v=>v*3),d=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);
  if(Math.abs(d)<1e-10)continue;
  const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/d;
  const v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/d;
  if(Math.min(u,v,1-u-v)<-1e-6)continue;
  const z=u*p[a+2]+v*p[b+2]+(1-u-v)*p[c+2];
  if(z>front){front=z;anchor={vertices:ids,weights:[u,v,1-u-v]};}
 }
 expect(Number.isFinite(front)).toBe(true);
 if(posed&&forward)return anchor!.vertices.reduce((sum,v,i)=>sum+anchor!.weights[i]*(posed[v*3]*forward[0]+posed[v*3+1]*forward[1]+posed[v*3+2]*forward[2]),0);
 return front;
}
const heights=Array.from({length:59},(_,i)=>4.35+i*.025);
function profile(x:number){return heights.map(y=>depth(x,y));}
function peakHeight(x:number){const z=profile(x);return heights[z.indexOf(Math.max(...z))];}

test("the torso immediately below the coloured chest no longer caves far behind its lower edge",()=>{
 const collar=asset.rest['clavicle.L'].head[1],shoulder=Math.abs(asset.rest['upperarm.L'].head[0]);
 for(const sign of [-1,1])for(const x of [.4,.7,1.05,1.3,1.4]){
  const u=x/shoulder,bottom=collar-1.14-.34*Math.sin(Math.PI*u)+.5*u*u+.16*Math.exp(-((x/.32)**2));
  const lowerChest=depth(sign*x,bottom+.12*(collar-.055-.18*u-bottom));
  const wall=depth(sign*x,4.25);
  expect(lowerChest-wall).toBeLessThan(.35);
  expect(wall).toBeLessThan(depth(sign*x,peakHeight(sign*x))+.01);
 }
});

test("the upper abdominal midline joins the chest without a false pit",()=>{
 const low=depth(0,3.9),high=depth(0,4.7);
 for(let i=1;i<16;i++){
  const y=3.9+i*.05,chord=low+(high-low)*(y-3.9)/.8;
  expect(chord-depth(0,y)).toBeLessThan(.015);
 }
});

test("press, fly and dip keep a continuous lower junction even at contraction",()=>{
 const human=createRealisticHuman(new THREE.Group()),collar=asset.rest['clavicle.L'].head[1],shoulder=Math.abs(asset.rest['upperarm.L'].head[0]);
 try{for(const type of ['chest-press','pec-fly','chest-dip'])for(const progress of [0,.5,1]){
  const frame=trainingFrame3d(type,progress);human.draw(frame,true);const q=human.mesh.geometry.attributes.position.array;
  for(const sign of [-1,1])for(const x of [.4,.7,1.05,1.3,1.4]){
   const u=x/shoulder,bottom=collar-1.14-.34*Math.sin(Math.PI*u)+.5*u*u+.16*Math.exp(-((x/.32)**2));
   const edge=depth(sign*x,bottom+.12*(collar-.055-.18*u-bottom),q,frame.body.forward);
   const wall=depth(sign*x,4.25,q,frame.body.forward);
   expect((edge-wall)/4.8).toBeLessThan(.36);
  }
 }}finally{human.dispose();}
});

test("the lower attachment taper leaves approved upper/middle posed geometry unchanged",()=>{
 const spy=jest.spyOn(definition,'lowerPectoralContractionScale').mockImplementation((_,materials)=>new Float32Array(materials.length).fill(1));
 let reference:ReturnType<typeof createRealisticHuman>;
 try{reference=createRealisticHuman(new THREE.Group());}finally{spy.mockRestore();}
 const actual=createRealisticHuman(new THREE.Group());
 const digest=(values:Float32Array)=>{
  const h=createHash('sha256');for(let v=0;v<asset.vertexCount;v++)if(chestFraction(v)>=1/3)h.update(new Uint8Array(values.buffer,v*12,12));return h.digest('hex');
 };
 try{for(const type of ['chest-press','pec-fly']){
  const frame=trainingFrame3d(type,1);reference.draw(frame,true);actual.draw(frame,true);
  expect(digest(actual.mesh.geometry.attributes.position.array as Float32Array)).toBe(digest(reference.mesh.geometry.attributes.position.array as Float32Array));
 }}finally{reference.dispose();actual.dispose();}
});

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
