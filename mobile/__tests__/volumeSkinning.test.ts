import * as THREE from "three";
import { VolumeSkinner } from "../src/three/volumeSkinning";
const ids=Uint8Array.from([0,1,0,0]),half=Float32Array.from([.5,.5,0,0]);
const at=(angle:number,scale=1,pivot=new THREE.Vector3())=>new THREE.Matrix4().makeTranslation(...pivot.toArray() as [number,number,number]).multiply(new THREE.Matrix4().makeRotationZ(angle)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z)).multiply(new THREE.Matrix4().makeScale(scale,scale,scale));
test("single-bone skin remains exactly on its affine transform, including nonuniform stretch and normals",()=>{
 const skin=new VolumeSkinner(1,4.8),point=new THREE.Vector3(1,3,-2),normal=new THREE.Vector3(.3,.8,.5).normalize(),out=new THREE.Vector3(),n=new THREE.Vector3();
 for(let i=0;i<25;i++){
  const m=new THREE.Matrix4().makeRotationY(i*.15).multiply(new THREE.Matrix4().makeScale(3+i*.07,5.2,4.7)).multiply(new THREE.Matrix4().makeRotationX(.7));m.setPosition(7,-3,4);
  skin.update([m]);skin.apply(point,normal,new Uint8Array(4),Float32Array.from([1,0,0,0]),0,out,n);
  expect(out.distanceTo(point.clone().applyMatrix4(m))).toBeLessThan(1e-9);
  expect(n.distanceTo(normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(m)))).toBeLessThan(1e-9);
 }
});
test("a twisting wrist keeps its radius instead of collapsing halfway between bone rotations",()=>{
 const scale=4.8,skin=new VolumeSkinner(2,scale),p=new THREE.Vector3(1,0,0),n=new THREE.Vector3(1,0,0),out=new THREE.Vector3(),normal=new THREE.Vector3();
 const transforms=[at(Math.PI/3,scale),at(-Math.PI/3,scale)];skin.update(transforms);skin.apply(p,n,ids,half,0,out,normal);
 const linear=p.clone().applyMatrix4(transforms[0]).multiplyScalar(.5).addScaledVector(p.clone().applyMatrix4(transforms[1]),.5);
 expect(linear.length()).toBeCloseTo(scale*.5,8);expect(out.length()).toBeCloseTo(scale,8);expect(normal.length()).toBeCloseTo(1,8);
});
test("an elbow bends around its shared hinge without losing the skin radius",()=>{
 const skin=new VolumeSkinner(2),pivot=new THREE.Vector3(0,1,0),point=new THREE.Vector3(1,1,0),out=new THREE.Vector3(),normal=new THREE.Vector3();
 skin.update([at(0,1,pivot),at(2*Math.PI/3,1,pivot)]);skin.apply(point,new THREE.Vector3(1,0,0),ids,half,0,out,normal);
 expect(out.distanceTo(pivot)).toBeCloseTo(1,8);expect(out.x).toBeCloseTo(.5,8);expect(out.y).toBeCloseTo(1+Math.sqrt(3)/2,8);
});
test("rotations passing 180 degrees retain the same hemisphere and do not flip the surface",()=>{
 const skin=new VolumeSkinner(2),p=new THREE.Vector3(1,0,0),out=new THREE.Vector3(),normal=new THREE.Vector3();let previous:THREE.Vector3|undefined;
 for(let i=0;i<=40;i++){
  const a=(170+i*.5)*Math.PI/180;skin.update([at(a),at(a+.02)]);skin.apply(p,p,ids,half,0,out,normal);
  expect(out.length()).toBeCloseTo(1,8);if(previous)expect(out.distanceTo(previous)).toBeLessThan(.02);previous=out.clone();
 }
});
