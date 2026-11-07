import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { contractionFrame, muscleRegions, muscleSpec } from "../src/domain/muscleMotion";
import { exercisePose, MOTION_TYPES, sampleMotion } from "../src/domain/exerciseMotion";
import { MuscleContractionPanel } from "../src/components/MuscleContractionPanel";
import { LocaleProvider, translate } from "../src/i18n";

test.each(MOTION_TYPES)("%s: localized targets follow the body and distinguish shortening from controlled lengthening", type => {
  const spec = muscleSpec(type);
  expect(spec.primary).toContain(spec.focus);
  for (const muscle of spec.primary) {
    expect(translate("ja", `muscle.${muscle}`)).not.toMatch(/[A-Za-z]/);
    expect(translate("en", `muscle.${muscle}`)).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
    const work = contractionFrame(type, muscle, 0.6, "work"), back = contractionFrame(type, muscle, 0.6, "return");
    expect(work.length).toBe(back.length);
    expect(work.zLeft).toBe(back.zLeft);
    if (work.isometric) expect(work.label).toBe(back.label);
    else { expect(work.label).toBe("muscle.concentric"); expect(back.label).toBe("muscle.eccentric"); }
  }
  for (let i = 0; i <= 100; i++) {
    const pose = exercisePose(type, i / 100), snapshot = JSON.stringify(pose);
    const regions = muscleRegions(type, pose);
    for (const muscle of spec.primary) expect(regions.some(r => r.muscle === muscle)).toBe(true);
    expect(regions.every(r => [...r.a, ...r.b, r.radius].every(Number.isFinite))).toBe(true);
    expect(regions.every(r => r.radius > 0 && r.a[0] > 0 && r.b[0] > 0 && r.a[0] < 120 && r.b[0] < 120 && r.a[1] > 0 && r.b[1] > 0 && r.a[1] < 96 && r.b[1] < 96)).toBe(true);
    expect(JSON.stringify(pose)).toBe(snapshot);
  }
});

test("the fibre bundle shortens and thickens, while sarcomere endpoints slide inward and return without a jump", () => {
  const frames = Array.from({ length: 21 }, (_, i) => contractionFrame("preacher-curl", "biceps", i / 20, "work"));
  for (let i = 1; i < frames.length; i++) {
    expect(frames[i].length).toBeLessThan(frames[i - 1].length);
    expect(frames[i].radius).toBeGreaterThan(frames[i - 1].radius);
    expect(frames[i].zRight - frames[i].zLeft).toBeLessThan(frames[i - 1].zRight - frames[i - 1].zLeft);
  }
  for (const time of [1799, 1800, 2249, 2250, 4649, 4650, 5099, 5100]) {
    const a = sampleMotion(time), b = sampleMotion(time + 1);
    const left = contractionFrame("preacher-curl", "biceps", a.progress, a.phase);
    const right = contractionFrame("preacher-curl", "biceps", b.progress, b.phase);
    expect(Math.abs(left.length - right.length)).toBeLessThan(0.01);
  }
});

test("back-extension spinal stabilizers stay isometric while the gluteal schematic changes length", () => {
  const still = [0, 0.5, 1].map(p => contractionFrame("back-extension", "erectors", p, "work"));
  expect(still[0]).toEqual(still[1]); expect(still[1]).toEqual(still[2]);
  expect(still[0].label).toBe("muscle.isometric");
  expect(contractionFrame("back-extension", "glutes", 1, "work").length).toBeLessThan(contractionFrame("back-extension", "glutes", 0, "work").length);
  expect(contractionFrame("preacher-curl", "biceps", NaN, "work")).toEqual(contractionFrame("preacher-curl", "biceps", 0, "work"));
});

test("selecting a postural muscle gives a stable drawing and the guide explains its schematic limits", async () => {
  const view = await render(<LocaleProvider language="ja" setLanguage={() => {}}><MuscleContractionPanel type="back-extension" progress={0} phase="work" /></LocaleProvider>);
  await fireEvent.press(view.getByRole("radio", { name: translate("ja", "muscle.erectors") }));
  expect(view.getByText(translate("ja", "muscle.isometric"))).toBeTruthy();
  expect(view.getByText(translate("ja", "muscle.limit"))).toBeTruthy();
  await fireEvent.press(view.getByRole("button", { name: translate("ja", "load.details") }));
  const before = view.getByTestId("muscle-bundle").props.d;
  const ends = () => view.getByTestId("sarcomere-filaments").props.children[1].map((node: any) => [node.props.x1,node.props.x2]);
  const filaments = ends();
  await view.rerender(<LocaleProvider language="ja" setLanguage={() => {}}><MuscleContractionPanel type="back-extension" progress={1} phase="return" /></LocaleProvider>);
  expect(view.getByTestId("muscle-bundle").props.d).toEqual(before);
  expect(ends()).toEqual(filaments);
});
