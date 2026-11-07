import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { muscleLengthPicture } from "../src/domain/muscleLength";
import { MuscleLengthCoach } from "../src/components/MuscleLengthCoach";
import { LocaleProvider, translate } from "../src/i18n";

test("shortening brings the marked endpoints closer to a fixed reference; reversing the motion restores the gap", () => {
  const frames = Array.from({ length: 41 }, (_, i) =>
    muscleLengthPicture(i / 40),
  );
  frames.forEach((frame, i) => {
    expect(frame.start).toBe(frames[0].start);
    expect(frame.referenceEnd).toBe(frames[0].end);
    expect(frame.end - frame.start).toBe(frame.distance);
    expect(Object.values(frame).every(Number.isFinite)).toBe(true);
    if (i) expect(frame.distance).toBeLessThan(frames[i - 1].distance);
  });
  expect(frames[40].distance).toBeLessThan(frames[0].distance * 0.6);
  expect(muscleLengthPicture(-5)).toEqual(frames[0]);
  expect(muscleLengthPicture(5)).toEqual(frames[40]);
  expect(muscleLengthPicture(NaN)).toEqual(frames[0]);
});

test("postural muscles keep exactly the same illustrated distance for every pose", () => {
  for (let i = 0; i <= 40; i++)
    expect(muscleLengthPicture(i / 40, true)).toEqual(
      muscleLengthPicture(0, true),
    );
});

test.each(["ja", "en"] as const)(
  "%s: marked endpoints, side-by-side references and end-of-lesson cue show long versus short",
  async (language) => {
    const t = (k: string) => translate(language, k),
      inspect = jest.fn(),
      play = jest.fn();
    const wrap = (progress: number, completed: "work" | "return" | null) => (
      <LocaleProvider language={language} setLanguage={() => {}}>
        <MuscleLengthCoach
          type="chest-press"
          progress={progress}
          phase="work"
          muscle="chest"
          direction="work"
          completed={completed}
          onSelect={() => {}}
          onInspect={inspect}
          onPlay={play}
          running={false}
          canPlay
        />
      </LocaleProvider>
    );
    const app = await render(wrap(0, null));
    const start = app.getByTestId("coach-end-0").props.cx,
      end = app.getByTestId("coach-end-1").props.cx;
    expect(app.getByText(t("coach.long"))).toBeTruthy();
    expect(app.getByText(t("coach.short"))).toBeTruthy();
    await fireEvent.press(
      app.getByRole("button", { name: t("load.lengthen") }),
    );
    expect(inspect).toHaveBeenCalledWith("return");
    await fireEvent.press(
      app.getByRole("button", { name: t("coach.playShort") }),
    );
    expect(play).toHaveBeenCalledTimes(1);
    await app.rerender(wrap(1, "work"));
    expect(app.getByTestId("coach-end-0").props.cx).toBe(start);
    expect(app.getByTestId("coach-end-1").props.cx).toBeLessThan(end);
    expect(app.getByText(t("coach.workDone"))).toBeTruthy();
  },
);

test("postural lesson never labels its playback as shortening and keeps markers fixed during return", async () => {
  const t = (k: string) => translate("ja", k);
  const wrap = (p: number) => (
    <LocaleProvider language="ja" setLanguage={() => {}}>
      <MuscleLengthCoach
        type="back-extension"
        progress={p}
        phase="return"
        muscle="erectors"
        direction="return"
        completed={p === 0 ? "return" : null}
        onSelect={() => {}}
        onInspect={() => {}}
        onPlay={() => {}}
        running={false}
        canPlay
      />
    </LocaleProvider>
  );
  const app = await render(wrap(1));
  const before = app.getByTestId("coach-distance").props.x2;
  expect(app.getByRole("button", { name: t("coach.playReturn") })).toBeTruthy();
  expect(app.queryByText(t("coach.short"))).toBeNull();
  await app.rerender(wrap(0));
  expect(app.getByTestId("coach-distance").props.x2).toBe(before);
  expect(app.getByText(t("coach.isoDone"))).toBeTruthy();
});
