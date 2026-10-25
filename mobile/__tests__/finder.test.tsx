import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { GymsScreen } from "../src/screens/GymsScreen";
import { FitnessProvider } from "../src/state";

test("menu changes update live score and missing equipment; empty choices do not invent a match", async () => {
  await render(
    <FitnessProvider>
      <GymsScreen />
    </FitnessProvider>,
  );
  await fireEvent.changeText(screen.getByLabelText("ジム検索"), "Anytime");
  expect(
    screen.getByLabelText("Anytime Fitness Shibuya Koen-dori マッチ率 84%"),
  ).toBeTruthy();
  expect(screen.getByText("不足器具: 45° Hack Squat")).toBeTruthy();
  await fireEvent.press(screen.getByText("やりたい種目を選ぶ"));
  await fireEvent.press(screen.getByText("種目をすべて解除"));
  expect(
    screen.getByLabelText("Anytime Fitness Shibuya Koen-dori マッチ率 未選択"),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Barbell Bench Press" }),
  );
  expect(
    screen.getByLabelText("Anytime Fitness Shibuya Koen-dori マッチ率 99%"),
  ).toBeTruthy();
  expect(screen.queryByText("不足器具: 45° Hack Squat")).toBeNull();
  await fireEvent.press(screen.getByText("対象部位を選ぶ（任意）"));
  await fireEvent.press(
    screen.getByRole("button", { name: "Quadriceps (Front Thigh)" }),
  );
  expect(
    screen.getByLabelText("Anytime Fitness Shibuya Koen-dori マッチ率 93%"),
  ).toBeTruthy();
});

test("weight filters remove insufficient gyms and clear restores filters without changing the menu", async () => {
  await render(
    <FitnessProvider>
      <GymsScreen />
    </FitnessProvider>,
  );
  await fireEvent.press(screen.getByText("東京"));
  await fireEvent.press(screen.getByText("60kg以上"));
  expect(screen.getByText("マッチ率順 / 1件")).toBeTruthy();
  expect(screen.getByText("Gold's Gym Shibuya Tokyo")).toBeTruthy();
  expect(screen.queryByText("Anytime Fitness Shibuya Koen-dori")).toBeNull();
  await fireEvent.press(screen.getByText("90kg以上"));
  expect(screen.getByText("該当するジムがありません")).toBeTruthy();
  await fireEvent.press(screen.getByText("検索をクリア"));
  expect(screen.getByText("マッチ率順 / 5件")).toBeTruthy();
  expect(screen.getByText("選択種目 4 / 対象部位 0")).toBeTruthy();
});
