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
    screen.getByLabelText("エニタイムフィットネス渋谷公園通り マッチ率 84%"),
  ).toBeTruthy();
  expect(screen.getByText("不足器具: 45度ハックスクワット")).toBeTruthy();
  await fireEvent.press(screen.getByText("やりたい種目を選ぶ"));
  await fireEvent.press(screen.getByText("種目をすべて解除"));
  expect(
    screen.getByLabelText("エニタイムフィットネス渋谷公園通り マッチ率 未選択"),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "バーベルベンチプレス" }),
  );
  expect(
    screen.getByLabelText("エニタイムフィットネス渋谷公園通り マッチ率 99%"),
  ).toBeTruthy();
  expect(screen.queryByText("不足器具: 45度ハックスクワット")).toBeNull();
  await fireEvent.press(screen.getByText("対象部位を選ぶ（任意）"));
  await fireEvent.press(screen.getByRole("button", { name: "大腿四頭筋" }));
  expect(
    screen.getByLabelText("エニタイムフィットネス渋谷公園通り マッチ率 93%"),
  ).toBeTruthy();
});

test("weight filters remove insufficient gyms and clear restores filters without changing the menu", async () => {
  await render(
    <FitnessProvider>
      <GymsScreen />
    </FitnessProvider>,
  );
  await fireEvent.press(screen.getByText("東京"));
  await fireEvent.press(screen.getByText("60キログラム以上"));
  expect(screen.getByText("マッチ率順 / 1件")).toBeTruthy();
  expect(screen.getByText("ゴールドジム渋谷東京")).toBeTruthy();
  expect(screen.queryByText("エニタイムフィットネス渋谷公園通り")).toBeNull();
  await fireEvent.press(screen.getByText("90キログラム以上"));
  expect(screen.getByText("該当するジムがありません")).toBeTruthy();
  await fireEvent.press(screen.getByText("検索をクリア"));
  expect(screen.getByText("マッチ率順 / 5件")).toBeTruthy();
  expect(screen.getByText("選択種目 4 / 対象部位 0")).toBeTruthy();
});
