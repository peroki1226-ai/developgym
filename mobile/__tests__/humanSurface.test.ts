import * as THREE from "three";
import asset from "../src/data/human/makehuman.json";
import { HUMAN_SURFACE, humanSurfaceColours } from "../src/three/humanSurface";
const bytes=(text:string)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const p=new Float32Array(bytes(asset.positions).buffer),m=bytes(asset.materials);
test("the human has a muted skin tone, separate eye whites/irises/pupils and matte surface",()=>{
 const c=humanSurfaceColours(p,m),eyes:number[][]=[];
 for(let i=0;i<m.length;i++)if(m[i]===2)eyes.push(Array.from(c.slice(i*3,i*3+3)));
 expect(eyes.length).toBeGreaterThan(100);
 expect(eyes.some(c=>Math.max(...c)<.04)).toBe(true);
 expect(eyes.some(c=>Math.min(...c)>.6)).toBe(true);
 expect(eyes.some(c=>c[0]>.08&&c[0]<.3)).toBe(true);
 expect(c.every(Number.isFinite)).toBe(true);expect(HUMAN_SURFACE.roughness).toBeGreaterThan(.75);
 const skin=new THREE.Color(HUMAN_SURFACE.skin);expect(skin.r).toBeGreaterThan(skin.g);expect(skin.g).toBeGreaterThan(skin.b);
});
test("surface appearance does not mutate the authored mesh, eye positions or materials",()=>{
 const before=p.slice(),materials=m.slice(),colours=humanSurfaceColours(p,m);
 expect(p).toEqual(before);expect(m).toEqual(materials);
 expect(humanSurfaceColours(p,m)).toEqual(colours);
});
