import * as THREE from 'three';
const {createHash}=require('node:crypto');
import asset from '../src/data/human/makehuman.json';
import {createRealisticHuman} from '../src/three/realisticHuman';
import {trainingFrame3d} from '../src/domain/training3d';
import {HandGripSurface} from '../src/three/handGrip';
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const ids=bytes(asset.skinIndices),weights=new Float32Array(bytes(asset.skinWeights).buffer);
const hand=Array.from({length:asset.vertexCount},(_,v)=>{let w=0;for(let j=0;j<4;j++)if(asset.bones[ids[v*4+j]].startsWith('hand.'))w+=weights[v*4+j];return w>.95;});

test('hand revision changes only the 3,094 authorised hand vertices; the accepted body, weights and clothing remain byte-identical',()=>{
 const h=createHash('sha256');expect(asset.handRevision).toBe('full-palm-wrap-v2');expect(hand.filter(Boolean)).toHaveLength(3094);
 for(const [key,stride] of [['positions',12],['normals',12],['surfaceOcclusion',1],['skinIndices',4],['skinWeights',16]] as const){const b=bytes(asset[key]);for(let v=0;v<asset.vertexCount;v++)if(!hand[v])h.update(b.subarray(v*stride,(v+1)*stride));}
 // Computed from cc8247b's accepted asset, before editing the hands.
 expect(h.digest('hex')).toBe('0b06679c15740afbd995bbaf21f6a70929eb6836b935b6c2d7251179b443fea9');
});

test.each(['incline-bench-press','barbell-bench-press'])('%s grips match the continuous steel shaft, without rubber end rings underneath the fingers',type=>{
 for(const progress of [0,.5,1]){const f=trainingFrame3d(type,progress);expect(f.grips).toHaveLength(2);f.grips.forEach(g=>expect(g.radius).toBe(.65));expect(f.equipment.filter(e=>/^(smith|free)-bar-grip/.test(e.id))).toHaveLength(0);}
});

test('refining the hand skin has a bounded vertex count and leaves no cracks around the new shared edges',()=>{
 const human=createRealisticHuman(new THREE.Group());try{const g=human.mesh.geometry,index=g.getIndex()!,n=g.getAttribute('position').count;expect(n).toBeGreaterThan(asset.vertexCount);expect(n).toBeLessThan(34000);
 const edges=new Map<string,number>();for(let t=0;t<index.count;t+=3)for(let j=0;j<3;j++){const a=index.getX(t+j),b=index.getX(t+(j+1)%3);if(a<asset.vertexCount&&b<asset.vertexCount)continue;const key=Math.min(a,b)+'/'+Math.max(a,b);edges.set(key,(edges.get(key)??0)+1);}
 expect(edges.size).toBeGreaterThan(10000);for(const count of edges.values())expect(count).toBe(2);
 }finally{human.dispose();}
});

test.each(['incline-bench-press','barbell-bench-press','chest-press','pec-fly','chest-dip'])('%s maintains close finger contact and finite, bounded hand skin throughout the motion',type=>{
 const h=createRealisticHuman(new THREE.Group());try{for(const progress of [0,.5,1]){h.draw(trainingFrame3d(type,progress),false);
 for(const stats of h.mesh.userData.gripSurfaces){expect(stats.minimumClearance).toBeGreaterThan(.024);expect(stats.contactVertices).toBeGreaterThan(500);}
 h.mesh.userData.handContacts.forEach((c:any)=>expect(c.error).toBeLessThan(1e-6));
 const p=h.mesh.geometry.getAttribute('position'),normal=h.mesh.geometry.getAttribute('normal'),index=h.mesh.geometry.getIndex()!;
 expect(Array.from(p.array).every(Number.isFinite)).toBe(true);expect(Array.from(normal.array).every(Number.isFinite)).toBe(true);
 // Reject the long spikes that an unconstrained surface collision solve causes.
 let longest=0;for(let t=0;t<index.count;t+=3){const vs=[index.getX(t),index.getX(t+1),index.getX(t+2)];if(!vs.every(v=>v>=asset.vertexCount||hand[v]))continue;
 for(let j=0;j<3;j++)longest=Math.max(longest,new THREE.Vector3().fromBufferAttribute(p,vs[j]).distanceTo(new THREE.Vector3().fromBufferAttribute(p,vs[(j+1)%3])));
 }expect(longest).toBeLessThan(3);
 }}finally{h.dispose();}
});

test('surface normals follow the changing grip radius and wrist transition without a lighting seam',()=>{
 const ref=asset.grips.R,fit=new HandGripSurface(ref),centre=new THREE.Vector3(...ref.centre),axis=new THREE.Vector3(...ref.axis),up=new THREE.Vector3(...ref.approach),across=new THREE.Vector3().crossVectors(axis,up);
 const wrist=new THREE.Vector3(...ref.wrist).sub(centre).dot(up),p=centre.clone().addScaledVector(up,wrist*.62).addScaledVector(across,.1),n=up.clone(),epsilon=1e-5;
 for(const radius of [.14,.23,.35]){const at=p.clone(),normal=n.clone();fit.fit(at,normal,radius);
 for(const tangent of [axis,across]){const nearby=p.clone().addScaledVector(tangent,epsilon);fit.fit(nearby,n.clone(),radius);expect(Math.abs(normal.dot(nearby.sub(at).normalize()))).toBeLessThan(.0001);}
 }
});
