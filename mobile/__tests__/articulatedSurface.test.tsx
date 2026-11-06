import React from "react";
import { render } from "@testing-library/react-native";
import Svg from "react-native-svg";
import { articulatedSurface } from "../src/domain/articulatedSurface";
import { beamSurface, boxSurface } from "../src/domain/equipmentSurface";
import { exercisePose, Limb, MOTION_TYPES } from "../src/domain/exerciseMotion";
import { ArticulatedLimb } from "../src/components/ArticulatedLimb";

const coords = (d: string) => (d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
test.each(MOTION_TYPES)("%s: joined skin preserves anchors and changes continuously around the elbow/knee", type => {
  let previous: number[] | undefined;
  for (let i = 0; i <= 100; i++) {
    const pose = exercisePose(type, i / 100), snapshot = JSON.stringify(pose);
    const surfaces = [...pose.arms.map(limb => articulatedSurface(limb, "arm")), ...pose.legs.map(limb => articulatedSurface(limb, "leg"))];
    [...pose.arms, ...pose.legs].forEach((limb, index) => {
      const skin = surfaces[index];
      expect([skin.centres[0], skin.centres[4], skin.centres[8]]).toEqual(limb);
      expect(skin.path).toMatch(/ Z$/);
      // The visible edge never crosses the root or the hinge with a closing cap.
      expect(skin.edge).not.toContain(" Z");
      expect(skin.path.match(/M /g)).toHaveLength(1);
      const numbers = coords(skin.path);
      expect(numbers.every((v, j) => Number.isFinite(v) && v > 0 && v < (j % 2 === 0 ? 120 : 96))).toBe(true);
    });
    const values = surfaces.flatMap(s => coords(s.path));
    if (previous) expect(Math.max(...values.map((v, j) => Math.abs(v - previous![j])))).toBeLessThan(2.5);
    expect(JSON.stringify(pose)).toBe(snapshot);
    previous = values;
  }
});

test("the soft surface and fold follow translated and rotated bones", () => {
  const limb: Limb = [[20, 20], [30, 40], [50, 25]];
  const move = ([x, y]: readonly number[]) => [x + 10, y - 4] as const;
  const base = articulatedSurface(limb, "arm"), translated = articulatedSurface(limb.map(move) as unknown as Limb, "arm");
  base.left.forEach((p, i) => { expect(translated.left[i][0]).toBeCloseTo(move(p)[0], 10); expect(translated.left[i][1]).toBeCloseTo(move(p)[1], 10); });
  const turn = ([x, y]: readonly number[]) => [-y, x] as const;
  const rotated = articulatedSurface(limb.map(turn) as unknown as Limb, "arm");
  base.left.forEach((p, i) => { expect(rotated.left[i][0]).toBeCloseTo(turn(p)[0]); expect(rotated.left[i][1]).toBeCloseTo(turn(p)[1]); });
  for (const kind of ["arm", "leg", "trunk"] as const) {
    expect(articulatedSurface([[10, 10], [10, 10], [10, 10]], kind).path).not.toMatch(/NaN|Infinity/);
  }
});

test("extruded beams and panels preserve front-face contact positions and parallel depth", () => {
  for (const [a,b,width] of [[[20, 20], [20, 80], 3], [[20, 80], [90, 10], 5], [[10, 40], [100, 40], 2]] as const) {
    const shape = beamSurface(a,b,width);
    expect([(shape.front[0][0]+shape.front[3][0])/2,(shape.front[0][1]+shape.front[3][1])/2]).toEqual(a);
    shape.front.forEach((p,i)=>{expect(shape.back[i][0]-p[0]).toBeCloseTo(2.8);expect(shape.back[i][1]-p[1]).toBeCloseTo(-1.8);});
  }
  const vertical = beamSurface([20,20], [20,80], 3);
  expect(Math.max(...vertical.side.map(p=>p[0]))).toBeGreaterThan(Math.max(...vertical.front.map(p=>p[0])));
  const panel = boxSurface(40, 60, 20, 4);
  expect(panel.front).toEqual([[40,60],[60,60],[60,64],[40,64]]);
  expect(panel.top[0]).toEqual(panel.front[0]);
  expect(panel.side[1]).toEqual(panel.front[2]);
});

test("close-up skin has a ghost outline and adds no independent playback loop", async () => {
  const raf = jest.spyOn(globalThis, "requestAnimationFrame");
  const view = await render(<Svg><ArticulatedLimb limb={[[15,20],[40,40],[65,20]]} kind="arm" prefix="test-joint" scale={1.5} /></Svg>);
  expect(view.getByTestId("articulated-arm")).toBeTruthy();
  const skin = view.toJSON();
  await view.rerender(<Svg><ArticulatedLimb limb={[[15,20],[40,40],[65,20]]} kind="arm" prefix="test-joint" ghost /></Svg>);
  expect(view.toJSON()).not.toEqual(skin);
  expect(raf).not.toHaveBeenCalled();
  raf.mockRestore();
});
