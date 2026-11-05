import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { EQUIPMENTS } from "../src/data/equipment";
import { TrainingScreen } from "../src/screens/TrainingScreen";
import { FitnessProvider } from "../src/state";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FITNESS_STORAGE_KEY } from "../src/domain/fitnessStorage";

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

describe("TrainingScreen & Exercise Equipment Catalog", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  test("contains 24 complete equipment guides covering all major muscle groups", () => {
    expect(EQUIPMENTS).toHaveLength(24);

    const parts = new Set(EQUIPMENTS.map((e) => e.bodyPart));
    expect(parts.has("chest")).toBe(true);
    expect(parts.has("back")).toBe(true);
    expect(parts.has("legs")).toBe(true);
    expect(parts.has("shoulder")).toBe(true);
    expect(parts.has("arm")).toBe(true);
    expect(parts.has("abs")).toBe(true);

    // Each equipment must have complete beginner and pro guide data
    for (const eq of EQUIPMENTS) {
      expect(eq.name).toBeTruthy();
      expect(eq.seatSetup).toBeTruthy();
      expect(eq.beginnerSteps.length).toBeGreaterThan(0);
      expect(eq.ngPoints.length).toBeGreaterThan(0);
      expect(eq.proBiomechanics).toBeTruthy();
      expect(eq.proAnatomy).toBeTruthy();
      expect(eq.proVariations.length).toBeGreaterThan(0);
      expect(eq.builderTip).toBeTruthy();
      expect(eq.svgType).toBeTruthy();
    }
  });

  test("toggles between Beginner and Pro Mode and displays SVG diagrams", async () => {
    await render(
      <FitnessProvider>
        <TrainingScreen />
      </FitnessProvider>,
    );

    expect(await screen.findByText("確かなフォームで鍛えよう。")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "別のマシン・種目を選ぶ" }),
    );
    expect(screen.getByRole("button", { name: "チェストプレス" })).toBeTruthy();
    expect(screen.getByText("シート・器具のセッティング")).toBeTruthy();

    // Toggle to Pro Mode
    await fireEvent.press(screen.getByText("⚡ 本格モード（生体力学）"));
    expect(screen.getByText("生体力学")).toBeTruthy();
    expect(screen.getByText("ビルダーの極意")).toBeTruthy();

    // Filter by Back
    await fireEvent.press(screen.getByText("背中"));
    expect(
      screen.getByRole("button", { name: "ラットプルダウン" }),
    ).toBeTruthy();

    // Filter by Legs
    await fireEvent.press(screen.getByText("脚"));
    expect(
      screen.getByRole("button", { name: "45° レッグプレスマシン" }),
    ).toBeTruthy();
  });

  test("validates workout input and logs gym session", async () => {
    const alert = jest.spyOn(Alert, "alert");
    await render(
      <FitnessProvider>
        <TrainingScreen />
      </FitnessProvider>,
    );

    await screen.findByText("確かなフォームで鍛えよう。");
    // Invalid input
    await fireEvent.changeText(screen.getByLabelText("重量キログラム"), "-5");
    await fireEvent.press(screen.getByText("ジムトレーニングを記録"));
    expect(alert).toHaveBeenCalledWith("入力を確認", expect.any(String));

    // Valid input
    await fireEvent.changeText(screen.getByLabelText("重量キログラム"), "45");
    await fireEvent.changeText(screen.getByLabelText("回数"), "10");
    await fireEvent.changeText(screen.getByLabelText("セット数"), "3");
    await fireEvent.press(screen.getByText("ジムトレーニングを記録"));
    expect(alert).toHaveBeenCalledWith("記録しました", expect.any(String));
  });

  test("new arm machines appear in the same filters, display the live count and save a workout", async () => {
    await render(<FitnessProvider><TrainingScreen /></FitnessProvider>);
    await screen.findByText("確かなフォームで鍛えよう。");
    await fireEvent.press(screen.getByRole("button", { name: "別のマシン・種目を選ぶ" }));
    expect(screen.getByRole("button", { name: "全24種目" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "腕" }));
    expect(screen.queryByRole("button", { name: "レッグエクステンション" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "アームカールマシン" }));
    expect(screen.getByText("上腕がパッドに乗る高さへ座席を調整し、肘を回転軸付近に合わせる。")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("重量キログラム"), "6");
    await fireEvent.changeText(screen.getByLabelText("回数"), "12");
    await fireEvent.press(screen.getByText("ジムトレーニングを記録"));
    expect(JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).logs[0]).toMatchObject({ name: "アームカールマシン", weight: 6, reps: 12, location: "gym" });
  });
});
