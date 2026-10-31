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
  expect(await screen.findByText("理想のジムを探そう。")).toBeTruthy();
  await fireEvent.press(screen.getAllByText("お気に入りに追加")[0]);
  await fireEvent.press(
    screen.getByRole("button", { name: /トレーニング|Training/ }),
  );
  expect(await screen.findByText("確かなフォームで鍛えよう。")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("重量キログラム"), "20");
  await fireEvent.press(screen.getByText("ジムトレーニングを記録"));
  await fireEvent.press(screen.getByRole("button", { name: /家トレ|Home/ }));
  expect(await screen.findByText("自宅で、自分のペースで。")).toBeTruthy();
  await fireEvent.press(screen.getByText("ダンベル"));
  await fireEvent.press(screen.getByText("脚"));
  expect(
    screen.getByRole("button", { name: "ダンベルスクワット" }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /食事|Diet/ }));
  expect(await screen.findByText("食事から、理想の体へ。")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: /マイページ|My Page/ }),
  );
  expect(await screen.findByText("積み重ねを、あなたの力に。")).toBeTruthy();
  expect(screen.getByText("20キログラム × 10回 × 3セット")).toBeTruthy();
  expect(
    screen.getByText("ゴールドジム渋谷東京 / 東京都渋谷区（サンプル）"),
  ).toBeTruthy();
});

test("search has an empty state and invalid training input is rejected", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<App />);
  await fireEvent.changeText(screen.getByLabelText("ジム検索"), "不存在");
  expect(screen.getByText("該当するジムがありません")).toBeTruthy();
  await fireEvent.press(screen.getByText("検索をクリア"));
  expect(screen.getByText("ゴールドジム渋谷東京")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: /トレーニング|Training/ }),
  );
  await screen.findByText("確かなフォームで鍛えよう。");
  await fireEvent.changeText(screen.getByLabelText("重量キログラム"), "-1");
  await fireEvent.press(screen.getByText("ジムトレーニングを記録"));
  expect(alert).toHaveBeenCalledWith("入力を確認", expect.any(String));
});
