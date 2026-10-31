import React from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import App from "../App";
import { FITNESS_STORAGE_KEY } from "../src/domain/fitnessStorage";
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
async function home() {
  await screen.findByText("理想のジムを探そう。");
  await fireEvent.press(screen.getByRole("button", { name: /家トレ|Home/ }));
  await screen.findByText("自宅で、自分のペースで。");
}
const button = (name: string) => screen.getByRole("button", { name });
test("dumbbell log is tagged, locally persisted, restored after remount, and profile survives", async () => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const app = await render(<App />);
  await home();
  await fireEvent.press(button("ダンベル"));
  await fireEvent.press(button("ベンチ"));
  await fireEvent.changeText(
    screen.getByLabelText("ダンベル最大重量キログラム"),
    "20",
  );
  await fireEvent.press(button("最大重量を保存"));
  expect(screen.getByText("記録 / ダンベルベンチプレス")).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText("家トレ重量キログラム"),
    "12.5",
  );
  await fireEvent.changeText(screen.getByLabelText("家トレ回数"), "8");
  await fireEvent.changeText(screen.getByLabelText("家トレセット数"), "4");
  await fireEvent.press(button("家トレを記録"));
  await fireEvent.press(
    screen.getByRole("button", { name: /マイページ|My Page/ }),
  );
  expect(await screen.findByText("🏠 自宅")).toBeTruthy();
  expect(
    screen.getByText("12.5キログラム（片手） × 8回 × 4セット"),
  ).toBeTruthy();
  await waitFor(async () => {
    const d = JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!);
    expect(d.logs[0]).toMatchObject({
      name: "ダンベルベンチプレス",
      weight: 12.5,
      reps: 8,
      sets: 4,
      location: "home",
      loadType: "dumbbell",
    });
  });
  await app.unmount();
  await render(<App />);
  await home();
  expect(screen.getByLabelText("ダンベル最大重量キログラム").props.value).toBe(
    "20",
  );
  expect(screen.getByText("記録 / ダンベルベンチプレス")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: /マイページ|My Page/ }),
  );
  expect(
    await screen.findByText("12.5キログラム（片手） × 8回 × 4セット"),
  ).toBeTruthy();
});
test("bodyweight mode removes equipment alternatives and records reps without stale dumbbell weight", async () => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<App />);
  await home();
  await fireEvent.press(button("ダンベル"));
  await fireEvent.press(button("自重のみ"));
  expect(screen.queryByLabelText("家トレ重量キログラム")).toBeNull();
  await fireEvent.press(button("ジム種目から代替を探す"));
  await fireEvent.press(button("ラットプルダウン"));
  expect(screen.getByText("記録 / うつ伏せ肩甲骨レイズ")).toBeTruthy();
  await fireEvent.press(button("ケーブルカール"));
  expect(
    screen.getByText(
      "現在の器具では代替候補がありません。器具プロファイルを変更するか、別のジム種目を選んでください。",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("家トレを記録")).toBeNull();
  await fireEvent.press(button("レッグプレス"));
  await fireEvent.press(button("家トレを記録"));
  await fireEvent.press(
    screen.getByRole("button", { name: /マイページ|My Page/ }),
  );
  expect(await screen.findByText("自重 × 10回 × 3セット")).toBeTruthy();
  expect(screen.getByText("🏠 自宅")).toBeTruthy();
});
test("invalid home inputs and excess weight do not add logs", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<App />);
  await home();
  await fireEvent.press(button("ダンベル"));
  await fireEvent.changeText(
    screen.getByLabelText("ダンベル最大重量キログラム"),
    "0",
  );
  await fireEvent.press(button("最大重量を保存"));
  expect(alert).toHaveBeenLastCalledWith("入力を確認", expect.any(String));
  await fireEvent.changeText(
    screen.getByLabelText("家トレ重量キログラム"),
    "11",
  );
  await fireEvent.press(button("家トレを記録"));
  expect(alert).toHaveBeenLastCalledWith(
    "入力を確認",
    expect.stringContaining("上限10キログラム"),
  );
  await fireEvent.changeText(
    screen.getByLabelText("家トレ重量キログラム"),
    "5",
  );
  await fireEvent.changeText(screen.getByLabelText("家トレセット数"), "1.5");
  await fireEvent.press(button("家トレを記録"));
  await fireEvent.press(
    screen.getByRole("button", { name: /マイページ|My Page/ }),
  );
  expect(await screen.findByText(/まだ記録がありません/)).toBeTruthy();
});
test("read failure preserves stored data and supports retry", async () => {
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockRejectedValueOnce(new Error("disk read"));
  const write = jest.spyOn(AsyncStorage, "setItem");
  await render(<App />);
  expect(
    await screen.findByText(
      "保存データを読み込めませんでした。データは上書きしていません。",
    ),
  ).toBeTruthy();
  expect(write).not.toHaveBeenCalled();
  await fireEvent.press(button("読み込みを再試行"));
  expect(await screen.findByText("理想のジムを探そう。")).toBeTruthy();
});
test("write failure is visible, can retry, and retains current data", async () => {
  await render(<App />);
  await home();
  await screen.findByText("端末に保存済み");
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("disk full"));
  await fireEvent.press(button("バンド"));
  expect(
    await screen.findByText(
      "端末への保存に失敗しました。現在の変更は再起動すると失われる可能性があります。",
    ),
  ).toBeTruthy();
  await fireEvent.press(button("保存を再試行"));
  await screen.findByText("端末に保存済み");
  expect(
    JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).homeProfile
      .gear,
  ).toEqual(["band"]);
});

test("band exercises log repetitions with band load, not dumbbell kilograms", async () => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<App />);
  await home();
  await fireEvent.press(button("バンド"));
  await fireEvent.press(button("背中"));
  expect(screen.getByText("記録 / バンドシーテッドロー")).toBeTruthy();
  expect(screen.queryByLabelText("家トレ重量キログラム")).toBeNull();
  await fireEvent.press(button("家トレを記録"));
  await fireEvent.press(
    screen.getByRole("button", { name: /マイページ|My Page/ }),
  );
  expect(await screen.findByText("バンド × 10回 × 3セット")).toBeTruthy();
});

test("malformed saved data is not silently replaced by defaults", async () => {
  await AsyncStorage.setItem(FITNESS_STORAGE_KEY, '{"version":999}');
  const write = jest.spyOn(AsyncStorage, "setItem");
  write.mockClear();
  await render(<App />);
  await screen.findByText(
    "保存データを読み込めませんでした。データは上書きしていません。",
  );
  expect(write).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(FITNESS_STORAGE_KEY)).toBe(
    '{"version":999}',
  );
});
