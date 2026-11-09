import * as THREE from "three";

/** A rigid bent steel section. Round only the corners; keep long runs straight. */
export function createCurvedEquipmentGeometry(points: readonly (readonly [number, number, number])[], width: number, rounding = 4) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const vertices = points.map(p => new THREE.Vector3(...p));
  let last = vertices[0];
  for (let i = 1; i < vertices.length - 1; i++) {
    const centre = vertices[i], before = vertices[i - 1], after = vertices[i + 1];
    const cut = Math.min(rounding, centre.distanceTo(before) * .35, centre.distanceTo(after) * .35);
    const approach = centre.clone().addScaledVector(before.clone().sub(centre).normalize(), cut);
    const exit = centre.clone().addScaledVector(after.clone().sub(centre).normalize(), cut);
    path.add(new THREE.LineCurve3(last, approach));
    path.add(new THREE.QuadraticBezierCurve3(approach, centre, exit));
    last = exit;
  }
  path.add(new THREE.LineCurve3(last, vertices[vertices.length - 1]));
  const shape = roundedRectangle(width, width, width * .2);
  const hole = roundedRectangle(width * .68, width * .68, width * .12);
  shape.holes.push(new THREE.Path(hole.getPoints(4).reverse()));
  return new THREE.ExtrudeGeometry(shape, { extrudePath: path, steps: 72, bevelEnabled: false, curveSegments: 3 });
}

// Locally authored geometry. A dimensioned industrial silhouette is more useful
// than a downloaded decorative model that cannot follow the exercise mechanism.
function roundedRectangle(width: number, height: number, radius: number) {
  const s = new THREE.Shape(), x = -width / 2, y = -height / 2;
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + height - radius);
  s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  s.lineTo(x + radius, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

function unitBounds(geometry: THREE.BufferGeometry, width = 1, height = 1, depth = 1) {
  geometry.center();
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  geometry.scale(width / size.x, height / size.y, depth / size.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function cushion() {
  const shape = roundedRectangle(1, 1, .13);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .7, bevelEnabled: true, bevelSize: .07,
    bevelThickness: .13, bevelSegments: 3, steps: 1, curveSegments: 5,
  });
  return unitBounds(geometry);
}

function roundedBox() {
  const geometry = new THREE.ExtrudeGeometry(roundedRectangle(1, 1, .055), {
    depth: .9, bevelEnabled: true, bevelSize: .025,
    bevelThickness: .025, bevelSegments: 2, curveSegments: 3, steps: 1,
  });
  return unitBounds(geometry);
}

function structuralTube() {
  const shape = roundedRectangle(1, 1, .16);
  const inside = roundedRectangle(.68, .68, .09);
  shape.holes.push(new THREE.Path(inside.getPoints(5).reverse()));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1, bevelEnabled: false, steps: 1, curveSegments: 4,
  });
  geometry.rotateX(Math.PI / 2);
  return unitBounds(geometry);
}

function weightPlate() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, .13, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  // Three real openings, rather than grooves painted on a solid sphere.
  for (let i = 0; i < 3; i++) {
    const centre = i * Math.PI * 2 / 3;
    const hole = new THREE.Path();
    const a = centre - .43, b = centre + .43;
    hole.moveTo(Math.cos(a) * .48, Math.sin(a) * .48);
    hole.absarc(0, 0, .48, a, b, false);
    hole.lineTo(Math.cos(b) * .77, Math.sin(b) * .77);
    hole.absarc(0, 0, .77, b, a, true);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .16, bevelEnabled: true, bevelSize: .018,
    bevelThickness: .018, bevelSegments: 2, steps: 1, curveSegments: 12,
  });
  geometry.rotateX(-Math.PI / 2);
  return unitBounds(geometry, 2, 1, 2);
}

function pulley() {
  // The cable sits in the narrow waist between two flanges.
  const points = [
    [.16, -.5], [.83, -.5], [1, -.35], [1, -.22],
    [.72, -.11], [.72, .11], [1, .22], [1, .35],
    [.83, .5], [.16, .5], [.16, -.5],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return unitBounds(new THREE.LatheGeometry(points, 32), 2, 1, 2);
}

export function createEquipmentGeometries() {
  return {
    box: roundedBox(),
    pad: cushion(),
    tube: structuralTube(),
    plate: weightPlate(),
    pulley: pulley(),
    bolt: new THREE.CylinderGeometry(1, 1, 1, 6),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 32),
    cone: new THREE.ConeGeometry(1, 1, 16),
    sphere: new THREE.SphereGeometry(1, 20, 14),
    beam: new THREE.CylinderGeometry(1, 1, 1, 24),
  };
}
