import * as THREE from "three";
import { createEquipmentGeometries } from "../src/three/equipmentGeometry";
import { trainingFrame3d, length3, sub3 } from "../src/domain/training3d";

function hits(geometry: THREE.BufferGeometry, x: number, z: number) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.updateMatrixWorld();
  const result = new THREE.Raycaster(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
  material.dispose();
  return result.length;
}

test("weight plates have a real centre bore and three open hand grips with a solid outer rim", () => {
  const geometries = createEquipmentGeometries();
  expect(hits(geometries.plate, 0, 0)).toBe(0);
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3;
    expect(hits(geometries.plate, Math.cos(angle) * .6, Math.sin(angle) * .6)).toBe(0);
    expect(hits(geometries.plate, Math.cos(angle) * .92, Math.sin(angle) * .92)).toBeGreaterThan(0);
  }
  Object.values(geometries).forEach(g => g.dispose());
});

test("structural tubing has a hollow section rather than a solid cylinder", () => {
  const geometries = createEquipmentGeometries();
  expect(hits(geometries.tube, 0, 0)).toBe(0);
  expect(hits(geometries.tube, .43, 0)).toBeGreaterThan(0);
  Object.values(geometries).forEach(g => g.dispose());
});

test("all reusable equipment surfaces have finite normals and centred, positive bounds", () => {
  const geometries = createEquipmentGeometries();
  for (const geometry of Object.values(geometries)) {
    geometry.computeBoundingBox();
    expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    const centre = geometry.boundingBox!.getCenter(new THREE.Vector3());
    expect(centre.length()).toBeLessThan(1e-5);
    expect(geometry.boundingBox!.getSize(new THREE.Vector3()).toArray().every(n => n > 0)).toBe(true);
    geometry.dispose();
  }
});

test("the plate-loaded chest press has fixed structural bearings and rigid loading arms, without a selector stack", () => {
  const initial = trainingFrame3d("chest-press", 0);
  const fixed = (p: ReturnType<typeof trainingFrame3d>["equipment"][number]) => /^(press-(base|rear|front|diagonal|back-brace|axis|storage|stored|foot|frame-bolt|travel-stop|seat))/.test(p.id);
  const reference = initial.equipment.filter(fixed);
  expect(initial.equipment.some(p => /stack|cable/.test(p.id))).toBe(false);
  expect(initial.equipment.filter(p => p.kind === "plate")).toHaveLength(6);
  for (let step = 0; step <= 40; step++) {
    const frame = trainingFrame3d("chest-press", step / 40);
    expect(frame.equipment.filter(fixed)).toEqual(reference);
    for (const side of [-1, 1]) {
      const arm = frame.equipment.find(p => p.id === "press-lever" + side)!;
      const start = initial.equipment.find(p => p.id === arm.id)!;
      expect(length3(sub3(arm.b!, arm.a))).toBeCloseTo(length3(sub3(start.b!, start.a)), 7);
      const horn = frame.equipment.find(p => p.id === "press-loading-horn" + side)!;
      const startHorn = initial.equipment.find(p => p.id === horn.id)!;
      expect(length3(sub3(horn.a, arm.a))).toBeCloseTo(length3(sub3(startHorn.a, start.a)), 7);
    }
  }
});

test("weight stacks keep their bottom plates grounded while selected weights lift on the guides", () => {
  const start = trainingFrame3d("lat-pulldown", 0), end = trainingFrame3d("lat-pulldown", 1);
  for (const id of ["stack-weight0", "stack-weight3", "stack-back", "stack-rod-a", "stack-rod-b", "stack-side-1"]) {
    expect(end.equipment.find(p => p.id === id)).toEqual(start.equipment.find(p => p.id === id));
  }
  expect(end.equipment.find(p => p.id === "stack-weight4")!.a[1]).toBeGreaterThan(start.equipment.find(p => p.id === "stack-weight4")!.a[1]);
  // The cabinet foot frame must be centred underneath its own off-centre stack.
  expect(end.equipment.find(p => p.id === "stack-floor-cross")!.a[0]).toBe(16);
});

test("sleds keep their rails fixed; hack-squat plates travel with the back carriage above the fixed footplate", () => {
  const start = trainingFrame3d("hack-squat", 0), end = trainingFrame3d("hack-squat", 1);
  for (const id of ["sled-rail-1", "sled-rail1", "sled-guide-1", "sled-guide1"]) {
    expect(end.equipment.find(p => p.id === id)).toEqual(start.equipment.find(p => p.id === id));
  }
  expect(length3(sub3(end.equipment.find(p => p.id === "footplate")!.a, start.equipment.find(p => p.id === "footplate")!.a))).toBeLessThan(1e-8);
  for (const side of [-1, 1]) {
    const weight = end.equipment.find(p => p.id === "sled-weight" + side)!;
    const original = start.equipment.find(p => p.id === weight.id)!;
    expect(weight.a[1]).toBeGreaterThan(original.a[1] + 10);
    expect(end.equipment.find(p => p.id === "sled-bearing" + side)!.a[1]).toBeGreaterThan(start.equipment.find(p => p.id === "sled-bearing" + side)!.a[1]);
  }
});
