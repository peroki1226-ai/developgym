import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import App from "../App";
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

test("five tabs navigate, favorites and workout logs survive tab changes", async () => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<App />);
  expect(await screen.findByText("Find your gym.")).toBeTruthy();
  await fireEvent.press(screen.getAllByText("お気に入りに追加")[0]);
  await fireEvent.press(screen.getByRole("button", { name: /Training/ }));
  expect(await screen.findByText("Move with intent.")).toBeTruthy();
  await fireEvent.press(screen.getByText("トレーニングを記録"));
  await fireEvent.press(screen.getByRole("button", { name: /Home/ }));
  expect(await screen.findByText("Your space. Your pace.")).toBeTruthy();
  await fireEvent.press(screen.getByText("ダンベル"));
  expect(screen.getByText("ダンベルスクワット")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /Diet/ }));
  expect(await screen.findByText("Nourish your progress.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /My Page/ }));
  expect(await screen.findByText("Made by you.")).toBeTruthy();
  expect(screen.getByText("20kg × 10回 × 3セット")).toBeTruthy();
  expect(
    screen.getByText("ATLAS / TOKYO / 東京・渋谷（サンプル）"),
  ).toBeTruthy();
});

test("search has an empty state and invalid training input is rejected", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<App />);
  await fireEvent.changeText(screen.getByLabelText("ジム検索"), "不存在");
  expect(screen.getByText("該当するジムがありません")).toBeTruthy();
  await fireEvent.press(screen.getByText("検索をクリア"));
  expect(screen.getByText("ATLAS / TOKYO")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /Training/ }));
  await screen.findByText("Move with intent.");
  await fireEvent.changeText(screen.getByLabelText("重量kg"), "-1");
  await fireEvent.press(screen.getByText("トレーニングを記録"));
  expect(alert).toHaveBeenCalledWith("入力を確認", expect.any(String));
});
