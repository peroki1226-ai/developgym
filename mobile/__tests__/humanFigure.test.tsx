import React from "react";
import { render } from "@testing-library/react-native";
import Svg from "react-native-svg";
import { HumanFigure } from "../src/components/HumanFigure";
import { bodyContour, footPlacement, shoeContour, taperedContour } from "../src/domain/humanFigure";
import { exercisePose, MOTION_TYPES } from "../src/domain/exerciseMotion";

const coordinates = (path: string) => (path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);

test.each(MOTION_TYPES)("%s: body contours follow the unchanged motion without clipping or discontinuities", type => {
  let previous: number[] | undefined;
  for (let i = 0; i <= 100; i++) {
    const pose = exercisePose(type, i / 100), snapshot = JSON.stringify(pose);
    const body = bodyContour(pose);
    const paths = [body.path, ...pose.arms.flatMap(l => [taperedContour(l[0], l[1], 3.4, 2.1), taperedContour(l[1], l[2], 2.45, 1.15)]),
      ...pose.legs.flatMap(l => [taperedContour(l[0], l[1], 4.7, 2.5), taperedContour(l[1], l[2], 2.7, 1.45), shoeContour(l[2], 1)])];
    const values = paths.flatMap(coordinates);
    expect(values.length).toBeGreaterThan(50);
    for (const path of paths) {
      expect(path).not.toMatch(/NaN|Infinity/);
      const nums = coordinates(path);
      expect(nums.every((n, j) => n > 0 && n < (j % 2 === 0 ? 120 : 96))).toBe(true);
    }
    if (previous) expect(Math.max(...values.map((n, j) => Math.abs(n - previous![j])))).toBeLessThan(2);
    expect(Number.isFinite(body.headAngle)).toBe(true);
    expect(body.shoulderWidth).toBeGreaterThan(body.waistWidth);
    expect(JSON.stringify(pose)).toBe(snapshot);
    previous = values;
  }
});

test("silhouette curves with the crunch spine while maintaining the lower support", () => {
  const start = bodyContour(exercisePose("abdominal-crunch", 0));
  const end = bodyContour(exercisePose("abdominal-crunch", 1));
  expect(start.path).not.toEqual(end.path);
  // Both contours retain the lower hip-width endpoints while the upper body curls.
  for (const body of [start, end]) {
    expect(body.path).toContain("56.2,65");
    expect(body.path).toContain("45.8,65");
  }
});

test("zero-length segment fallback keeps a drawable contour", () => {
  expect(taperedContour([10, 10], [10, 10], 3, 2)).not.toMatch(/NaN|Infinity/);
  expect(coordinates(taperedContour([10, 10], [10, 10], 3, 2)).every(Number.isFinite)).toBe(true);
});

test("shoes follow the angled plate or shin while calf-raise toes stay on the footrest", () => {
  for (let i = 0; i <= 20; i++) {
    for (const type of ["leg-press", "hack-squat"]) {
      const foot = footPlacement(type, exercisePose(type, i / 20), 0);
      expect(foot.angle).toBe(45);
      expect(foot.facing).toBe(-1);
    }
    for (const type of ["leg-extension", "seated-leg-curl"]) {
      const pose = exercisePose(type, i / 20), [, knee, ankle] = pose.legs[0];
      const foot = footPlacement(type, pose, 0);
      expect(Math.cos((foot.angle + 90) * Math.PI / 180)).toBeCloseTo((ankle[0] - knee[0]) / Math.hypot(ankle[0] - knee[0], ankle[1] - knee[1]));
    }
    const calf = footPlacement("seated-calf-raise", exercisePose("seated-calf-raise", i / 20), 0);
    expect(calf.angle).toBe(0);
    expect(calf.toe).toEqual([82, 88]);
  }
});

test("solid person and start outline render without adding animation loops", async () => {
  const raf = jest.spyOn(globalThis, "requestAnimationFrame");
  const pose = exercisePose("chest-press", 0.5);
  const view = await render(<Svg><HumanFigure type="chest-press" pose={pose} /></Svg>);
  expect(view.getByTestId("human-figure")).toBeTruthy();
  const solid = view.toJSON();
  await view.rerender(<Svg><HumanFigure type="chest-press" pose={pose} ghost /></Svg>);
  expect(view.getByTestId("human-start-outline")).toBeTruthy();
  expect(view.toJSON()).not.toEqual(solid);
  expect(raf).not.toHaveBeenCalled();
  raf.mockRestore();
});
