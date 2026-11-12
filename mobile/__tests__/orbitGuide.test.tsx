import React from "react";
import * as THREE from "three";
import { PanResponder } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { MOTION_TYPES } from "../src/domain/exerciseMotion";
import { Orbit, clampZoom, normaliseOrbit, DEFAULT_GUIDE_ZOOM } from "../src/domain/guideCamera";
import { camera3d, trainingFrame3d, benchViews, length3, sub3, dot3, HUMAN_SEGMENTS } from "../src/domain/training3d";
import { createTrainingScene } from "../src/three/trainingScene";
import { OrbitGesture } from "../src/components/OrbitGesture";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { EQUIPMENTS } from "../src/data/equipment";
import { LocaleProvider,translate } from "../src/i18n";
let model:any;
jest.mock("../src/components/Motion3DView",()=>({Motion3DView:(props:any)=>{model=props;require("react").useEffect(()=>props.onReady(),[props.onReady]);return null;}}));
const locale=(children:React.ReactNode,language:"ja"|"en"="ja")=><LocaleProvider language={language} setLanguage={()=>{}}>{children}</LocaleProvider>;

test("continuous camera angles wrap without jumps at a full revolution, stay clear of poles and accept finite zoom bounds",()=>{
 for(const yaw of [-1080,-180,-25,0,180,1080]){
  const a=normaliseOrbit({yaw,pitch:90}),b=normaliseOrbit({yaw:yaw+360,pitch:90});expect(a).toEqual(b);expect(Math.abs(a.pitch)).toBeLessThan(90);expect(a.yaw).toBeGreaterThanOrEqual(-180);expect(a.yaw).toBeLessThan(180);
 }
 expect(normaliseOrbit({yaw:NaN,pitch:-Infinity})).toEqual({yaw:-25,pitch:13.5});expect(clampZoom(NaN)).toBe(DEFAULT_GUIDE_ZOOM);expect(clampZoom(-1)).toBe(1);expect(clampZoom(10)).toBe(2.5);
 for(const type of MOTION_TYPES){const f=trainingFrame3d(type,.5),before=JSON.stringify(f);expect(benchViews(type)).toHaveLength(6);
  for(const view of benchViews(type))for(const orbit of [undefined,{yaw:135,pitch:70},{yaw:-135,pitch:-70}])expect(camera3d(f,view,"whole",orbit).position.every(Number.isFinite)).toBe(true);
  expect(JSON.stringify(f)).toBe(before);
 }
});
test("dips descend further while keeping the previous top height, fixed bars, bone lengths and suspended feet",()=>{
 const bottom=trainingFrame3d("chest-dip",0),top=trainingFrame3d("chest-dip",1);
 expect(bottom.body.hip[1]).toBeLessThan(49-2.5);expect(top.body.hip[1]).toBeCloseTo(57.8,8);
 expect(top.body.hip[1]-bottom.body.hip[1]).toBeGreaterThan(11);
 for(let i=0;i<=40;i++){
  const f=trainingFrame3d("chest-dip",i/40);expect(f.equipment).toEqual(bottom.equipment);expect(f.grips).toEqual(bottom.grips);expect(f.feet.every(p=>p.contact[1]>20)).toBe(true);
  f.body.arms.forEach(a=>{expect(length3(sub3(a[1],a[0]))).toBeCloseTo(HUMAN_SEGMENTS.upperArm,7);expect(length3(sub3(a[2],a[1]))).toBeCloseTo(HUMAN_SEGMENTS.forearmGrip,7);});
 }
});
test("pec fly begins slightly behind the shoulder plane and keeps the same elbow bend, vertical grips and rigid overhead mechanism",()=>{
 const f=trainingFrame3d("pec-fly",0),angle=(arm:typeof f.body.arms[0])=>Math.acos(dot3(sub3(arm[0],arm[1]),sub3(arm[2],arm[1]))/(length3(sub3(arm[0],arm[1]))*length3(sub3(arm[2],arm[1]))));
 for(const a of f.body.arms){const posterior=dot3(sub3(a[2],a[0]),f.body.forward);expect(posterior).toBeLessThan(0);expect(posterior).toBeGreaterThan(-4);}
 for(let i=0;i<=40;i++){const pose=trainingFrame3d("pec-fly",i/40);pose.body.arms.forEach((a,j)=>{expect(angle(a)).toBeCloseTo(angle(f.body.arms[j]),7);expect(length3(sub3(a[2],pose.grips[j].centre))).toBeLessThan(1e-7);});}
 const end=trainingFrame3d("pec-fly",1);expect(length3(sub3(end.body.arms[0][2],end.body.arms[1][2]))).toBeLessThan(7);
});
test("free orbit and zoom reuse the same scene; fit restores full equipment at directions above, below and around the model",()=>{
 let scene:THREE.Scene,camera:THREE.Camera;
 const fake={setPixelRatio:jest.fn(),setSize:jest.fn(),shadowMap:{},render:(s:THREE.Scene,c:THREE.Camera)=>{scene=s;camera=c;},dispose:jest.fn()} as unknown as THREE.WebGLRenderer;
 const handle=createTrainingScene(fake,320,400);
 try{for(const type of ["chest-dip","pec-fly","barbell-bench-press"]){
  const input={type,progress:.5,view:"front" as const,focus:"whole" as const,anatomy:true,transparent:false};handle.draw(input);const nodes=handle.stats().nodes;
  const skin=(scene!.getObjectByName("human-surface") as THREE.Mesh).geometry.attributes.position as THREE.BufferAttribute,version=skin.version;
  for(const orbit of [{yaw:-135,pitch:70},{yaw:-45,pitch:-70},{yaw:45,pitch:30},{yaw:135,pitch:-30}]){
   handle.draw({...input,orbit,zoom:2});const near=camera!.position.clone();handle.draw({...input,orbit,zoom:1});expect(camera!.position.length()).not.toBe(near.length());expect(handle.stats().nodes).toBe(nodes);expect(skin.version).toBe(version);
   const box=new THREE.Box3(),group=scene!.children.find(n=>n instanceof THREE.Group)!;group.children.filter(n=>n.visible&&n.name!=="pectoral-fibre-guide").forEach(n=>box.expandByObject(n));
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera!);expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1);}
  }
 }}finally{handle.dispose();}
});
test("rotation mode releases ordinary scrolling when locked and applies native one-finger orbit and two-finger zoom without a second clock",async()=>{
 let handlers:any;const create=jest.spyOn(PanResponder,"create").mockImplementation(config=>{handlers=config;return {panHandlers:{}} as any;});
 const orbit=jest.fn(),zoom=jest.fn(),props={enabled:false,orbit:{yaw:-25,pitch:13.5},zoom:1.15,onOrbit:orbit,onZoom:zoom};
 const app=await render(locale(<OrbitGesture {...props}/>));
 try{
  expect(handlers.onStartShouldSetPanResponder()).toBe(false);await app.rerender(locale(<OrbitGesture {...props} enabled/>));expect(handlers.onStartShouldSetPanResponder()).toBe(true);
  handlers.onPanResponderGrant();handlers.onPanResponderMove({nativeEvent:{touches:[{}]}},{dx:80,dy:40});expect(orbit).toHaveBeenLastCalledWith({yaw:-65,pitch:25.5});
  handlers.onPanResponderRelease({}, {dx:80,dy:40});expect(orbit).toHaveBeenLastCalledWith({yaw:-65,pitch:25.5});orbit.mockClear();
  handlers.onPanResponderGrant();handlers.onPanResponderMove({nativeEvent:{touches:[{pageX:0,pageY:0},{pageX:100,pageY:0}]}},{});handlers.onPanResponderMove({nativeEvent:{touches:[{pageX:0,pageY:0},{pageX:150,pageY:0}]}},{});
  expect(zoom).toHaveBeenLastCalledWith(1.725);handlers.onPanResponderRelease({},{});expect(orbit).not.toHaveBeenCalled();
  expect(create).toHaveBeenCalledTimes(1);
 }finally{create.mockRestore();}
});
test.each(["ja","en"] as const)("%s: presets, free orbit, zoom and camera reset preserve the current exercise pose",async language=>{
 const t=(k:string)=>translate(language,k),e=EQUIPMENTS.find(e=>e.id==="pec-fly")!;
 await render(locale(<ExerciseDiagram type={e.id} label={e.name} muscleTag={e.muscleTag} beginner beginnerGuide={e}/>,language));
 const press=async(name:string)=>fireEvent.press(screen.getByRole("button",{name:t(name)}));
 expect(model.zoom).toBe(1.15);await press("camera.zoomIn");expect(model.zoom).toBeCloseTo(1.3);await press("anatomy.inspectShort");expect(model.progress).toBe(1);
 for(const v of benchViews(e.id)){await fireEvent.press(screen.getByRole("radio",{name:t(`scene.${v}`)}));expect(model.view).toBe(v);expect(model.progress).toBe(1);}
 await fireEvent.press(screen.getByRole("radio",{name:t("scene.right")}));await press("camera.unlock");await press("camera.turn.left");expect(model.orbit.yaw).toBe(75);await press("camera.turn.up");expect(model.orbit.pitch).toBeCloseTo(23.496);
 await press("camera.fit");expect(model.zoom).toBe(1);expect(model.focus).toBe("whole");expect(model.progress).toBe(1);
 await press("camera.reset");expect(model.orbit).toBeUndefined();expect(model.zoom).toBe(1.15);expect(model.view).toBe("front");expect(model.progress).toBe(1);
});
