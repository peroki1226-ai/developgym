import { exercisePose, elapsedForProgress, framePosition, inspectionFrame, motionContact, MOTION_TYPES, sampleMotion } from "../src/domain/exerciseMotion";
import { enlargedJoint, motionTeaching } from "../src/domain/motionTeaching";
import { translate } from "../src/i18n";

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
test.each(MOTION_TYPES)("%s: teaching points stay fixed/moving and the magnified joint stays bounded and localized", (type) => {
  const start = motionTeaching(type, exercisePose(type, 0));
  for (const key of ["fixedLabel", "movingLabel", "jointLabel", "workCue", "returnCue", "holdCue"] as const) {
    expect(translate("ja", start[key])).not.toMatch(/[A-Za-z]/);
    expect(translate("en", start[key])).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  }
  for (let i = 0; i <= 20; i++) {
    const pose = exercisePose(type, i / 20), info = motionTeaching(type, pose);
    expect(dist(info.fixed, start.fixed)).toBeLessThan(0.000001);
    expect(info.moving).toEqual(motionContact(type, pose));
    const zoom = enlargedJoint(info.joint);
    expect(zoom[1]).toEqual([40, 40]);
    for (const point of zoom) for (const coordinate of point) {
      expect(Number.isFinite(coordinate)).toBe(true);
      expect(coordinate).toBeGreaterThanOrEqual(12 - 1e-8);
      expect(coordinate).toBeLessThanOrEqual(68 + 1e-8);
    }
    const originalCos = ((info.joint[0][0] - info.joint[1][0]) * (info.joint[2][0] - info.joint[1][0]) + (info.joint[0][1] - info.joint[1][1]) * (info.joint[2][1] - info.joint[1][1])) / (dist(info.joint[0], info.joint[1]) * dist(info.joint[2], info.joint[1]));
    const zoomCos = ((zoom[0][0] - 40) * (zoom[2][0] - 40) + (zoom[0][1] - 40) * (zoom[2][1] - 40)) / (dist(zoom[0], zoom[1]) * dist(zoom[2], zoom[1]));
    expect(zoomCos).toBeCloseTo(originalCos, 8);
  }
});
test("all 41 inspection frames reproduce the forward/return cycle without a seek jump", () => {
  for (let i = 0; i < 41; i++) {
    const selected = inspectionFrame(i);
    const sample = sampleMotion(selected.elapsed);
    expect(sample.progress).toBeCloseTo(selected.frame.progress, 10);
    expect(framePosition(selected.frame, selected.elapsed)).toBeCloseTo(i);
    if (i > 20 && i < 40) expect(selected.frame.phase).toBe("return");
  }
  for (const phase of ["work", "return"] as const) for (const value of [0.13, 0.37, 0.82]) {
    const sample = sampleMotion(elapsedForProgress(value, phase));
    expect(sample.progress).toBeCloseTo(value, 10);
    expect(sample.phase).toBe(phase);
  }
});
test("crunch curls the spine with a stable pelvis and lower segment instead of hinging the whole torso", () => {
  const start = exercisePose("abdominal-crunch", 0), end = exercisePose("abdominal-crunch", 1);
  expect(end.hip).toEqual(start.hip);
  expect(end.spine![1]).toEqual(start.spine![1]);
  for (let i = 0; i <= 20; i++) {
    const spine = exercisePose("abdominal-crunch", i / 20).spine!;
    expect(dist(spine[1], spine[2])).toBeCloseTo(9);
    expect(dist(spine[2], spine[3])).toBeCloseTo(9);
  }
  expect(end.shoulder[0]).toBeGreaterThan(start.shoulder[0]);
});
