import React from "react";
import * as THREE from "three";
import { fireEvent, render, screen } from "@testing-library/react-native";
import asset from "../src/data/human/makehuman.json";
import { createRealisticHuman } from "../src/three/realisticHuman";
import { PECTORAL_FIBRES, createPectoralFibres } from "../src/three/pectoralFibres";
import { benchViews, camera3d, trainingFrame3d, sub3, unit3 } from "../src/domain/training3d";
import { CHEST_LESSONS } from "../src/domain/chestLessons";
import { EQUIPMENTS } from "../src/data/equipment";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { LocaleProvider, translate } from "../src/i18n";
let model: any;
jest.mock("../src/components/Motion3DView", () => ({ Motion3DView: (props: any) => {
  model = props; require("react").useEffect(() => props.onReady(), [props.onReady]); return null;
} }));

test("bench cameras include a non-singular overhead direction that reveals the sternum and symmetric hand placement", () => {
  for (const type of ["barbell-bench-press", "incline-bench-press", "incline-smith", "dumbbell-heavy"]) {
    expect(benchViews(type)).toContain("above");
    const frame = trainingFrame3d(type, .5), copy = JSON.stringify(frame);
    const above = camera3d(frame, "above", "whole"), front = camera3d(frame, "front", "whole");
    const a = unit3(sub3(above.position, above.target)), f = unit3(sub3(front.position, front.target));
    expect(a[1]).toBeGreaterThan(.9); expect(a[1]).toBeGreaterThan(f[1] * 3);
    expect(Math.hypot(a[0], a[2])).toBeGreaterThan(.1); expect(JSON.stringify(frame)).toBe(copy);
  }
  expect(benchViews("pec-fly")).toEqual(expect.arrayContaining(["above","below","right","side"]));
});
test("fibre fans are sampled on anterior chest triangles, not the abdomen, and retain valid barycentric anchors", () => {
  const mask = Uint8Array.from(atob(asset.muscleMasks.chest), c => c.charCodeAt(0));
  expect(PECTORAL_FIBRES).toHaveLength(18);
  expect(PECTORAL_FIBRES.filter(f => f.upper).length).toBeGreaterThan(2);
  for (const f of PECTORAL_FIBRES) {
    expect(f.anchors.length).toBeGreaterThanOrEqual(8);
    for (const a of f.anchors) {
      expect(a.weights.reduce((x,y)=>x+y,0)).toBeCloseTo(1,8);
      expect(Math.min(...a.weights)).toBeGreaterThanOrEqual(-1e-6);
      expect(a.vertices.every(i=>mask[i]>12)).toBe(true);
    }
  }
});
test.each(CHEST_LESSONS)("$id: fibres follow posed skin, reverse direction on return, preserve grips and hide with anatomy off", lesson => {
  const parent = new THREE.Group(), human = createRealisticHuman(parent), guide = createPectoralFibres(parent,human.mesh.geometry);
  try {
    let geometry: THREE.BufferGeometry | undefined, reference: Float32Array | undefined;
    const lengths:number[]=[];
    for (const p of [0, .5, 1]) {
      const frame = trainingFrame3d(lesson.id,p); human.draw(frame,true); guide.draw(frame,true,false,p);
      expect(guide.group.visible).toBe(true);
      const lines = guide.group.children[0] as THREE.LineSegments;
      if (geometry) expect(lines.geometry).toBe(geometry); geometry=lines.geometry;
      expect(Array.from(lines.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      const paths = guide.group.userData.paths as THREE.Vector3[][];
      lengths.push((guide.group.userData.contractilePaths as THREE.Vector3[][]).reduce((sum,path)=>sum+path.slice(1).reduce((n,point,i)=>n+point.distanceTo(path[i]),0),0));
      const sample = PECTORAL_FIBRES[0].anchors[0], point = new THREE.Vector3(), normal = new THREE.Vector3();
      sample.vertices.forEach((v,i)=>{
        point.addScaledVector(new THREE.Vector3().fromBufferAttribute(human.mesh.geometry.attributes.position,v),sample.weights[i]);
        normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(human.mesh.geometry.attributes.normal,v),sample.weights[i]);
      });
      expect(paths[0][0].distanceTo(point.addScaledVector(normal.normalize(),.13))).toBeLessThan(1e-6);
      const arrow = guide.group.children.find(n=>n instanceof THREE.Mesh&&n.visible)!;
      const direction = new THREE.Vector3(0,1,0).applyQuaternion(arrow.quaternion);
      guide.draw(frame,true,true,p);
      expect(direction.dot(new THREE.Vector3(0,1,0).applyQuaternion(arrow.quaternion))).toBeCloseTo(-1,7);
      human.mesh.userData.handContacts.forEach((contact:any)=>expect(contact.error).toBeLessThan(1e-6));
      const position=human.mesh.geometry.attributes.position.array as Float32Array;
      if(reference)expect(position).not.toEqual(reference);reference=position.slice();
    }
    expect(lengths[2]).toBeLessThan(lengths[0]);
    guide.draw(trainingFrame3d(lesson.id,.5),false,false);expect(guide.group.visible).toBe(false);
    guide.draw(trainingFrame3d("lat-pulldown",.5),true,false);expect(guide.group.visible).toBe(false);
    const dispose=jest.spyOn((guide.group.children[0] as THREE.LineSegments).geometry,"dispose");guide.dispose();guide.dispose();expect(dispose).toHaveBeenCalledTimes(1);
    expect(parent.children).toEqual([human.mesh]);
  } finally {guide.dispose();human.dispose();}
});
test.each(["ja","en"] as const)("%s: overhead and anatomy focus preserve pose; lengthened/shortened controls synchronize model and target cue",async language=>{
  const t=(key:string)=>translate(language,key), equipment=EQUIPMENTS.find(e=>e.id==="barbell-bench-press")!;
  await render(<LocaleProvider language={language} setLanguage={()=>{}}><ExerciseDiagram type={equipment.id} label={equipment.name} muscleTag={equipment.muscleTag} beginner beginnerGuide={equipment}/></LocaleProvider>);
  await fireEvent.press(screen.getByRole("radio",{name:t("scene.above")}));
  await fireEvent.press(screen.getByRole("button",{name:t("chest.live.watch")}));expect(model.view).toBe("above");
  await fireEvent.press(screen.getByRole("button",{name:t("anatomy.inspectShort")}));expect(model.progress).toBe(1);expect(model.view).toBe("above");
  expect(screen.getByTestId("chest-anatomy-state").props.children).toBe(t("anatomy.short"));
  await fireEvent.press(screen.getByRole("radio",{name:t("scene.above")}));expect(model.view).toBe("above");expect(model.progress).toBe(1);
  await fireEvent.press(screen.getByRole("button",{name:t("anatomy.inspect")}));expect(model.focus).toBe("muscles");expect(model.view).toBe("above");expect(model.progress).toBe(1);
  await fireEvent.press(screen.getByRole("button",{name:t("anatomy.inspectLong")}));expect(model.progress).toBe(0);
  expect(screen.getByTestId("chest-anatomy-state").props.children).toBe(t("anatomy.long"));
  expect(screen.getByTestId("chest-anatomy-overlay").props.children[0].props.children).toContain(t("chest.bench.target"));
  await fireEvent.press(screen.getByRole("button",{name:t("anatomy.showWhole")}));expect(model.focus).toBe("whole");expect(model.progress).toBe(0);
});
