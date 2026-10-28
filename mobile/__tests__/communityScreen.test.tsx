import React from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FS from "expo-file-system/legacy";
enum PermissionStatus {
  DENIED = "denied",
  GRANTED = "granted",
  UNDETERMINED = "undetermined",
}
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
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
const pick = jest.mocked(ImagePicker.launchImageLibraryAsync);
const camera = jest.mocked(ImagePicker.launchCameraAsync);
const permission = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
const image = {
  canceled: false as const,
  assets: [
    {
      uri: "file:///picker/cache.jpg",
      fileName: "cache.jpg",
      width: 100,
      height: 100,
      fileSize: 1000,
    },
  ],
};
const button = (name: string) => screen.getByRole("button", { name });
const change = async (label: string, value: string) => {
  await fireEvent.changeText(screen.getByLabelText(label), value);
};
async function openMyPage() {
  await screen.findByText("Find your gym.");
  await fireEvent.press(screen.getByRole("button", { name: /My Page/ }));
  await screen.findByText("Made by you.");
}
beforeEach(() => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  pick.mockReset();
  camera.mockReset();
  permission.mockReset();
});
test("specs update Gyms ranking/weight filters and My Page immediately, then survive restart", async () => {
  const app = await render(<App />);
  await screen.findByText("Find your gym.");
  await change("ジム検索", "Anytime");
  await fireEvent.press(button("Anytime Fitness Shibuya Koen-doriに投稿する"));
  await change("修正後ダンベル最大重量kg", "60");
  await fireEvent.press(button("追加: 45° Hack Squat"));
  await change("設備確認メモ", "現地で確認");
  await fireEvent.press(button("設備修正を反映"));
  expect(
    screen.getByLabelText("Anytime Fitness Shibuya Koen-dori マッチ率 99%"),
  ).toBeTruthy();
  expect(screen.getByText("設備修正 / 40kg → 60kg")).toBeTruthy();
  await fireEvent.press(button("60kg以上"));
  expect(screen.getByText("マッチ率順 / 1件")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /My Page/ }));
  await screen.findByText("Made by you.");
  await fireEvent.press(button("投稿先: Anytime Fitness Shibuya Koen-dori"));
  expect(screen.getByText("設備修正 / 40kg → 60kg")).toBeTruthy();
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).community
        .specs,
    ).toHaveLength(1),
  );
  await app.unmount();
  await render(<App />);
  await screen.findByText("Find your gym.");
  expect(
    screen.getByLabelText("Anytime Fitness Shibuya Koen-dori マッチ率 99%"),
  ).toBeTruthy();
});
test("star/comment validation and local reviews reflect across tabs", async () => {
  await render(<App />);
  await openMyPage();
  await fireEvent.press(button("レビュー"));
  await fireEvent.press(button("レビューを投稿"));
  expect(Alert.alert).toHaveBeenLastCalledWith(
    "入力を確認",
    expect.any(String),
  );
  await fireEvent.press(button("★ 4"));
  await change("ジムレビューコメント", "ラックが使いやすい");
  await fireEvent.press(button("レビューを投稿"));
  expect(screen.getByText("★ 4.0 / 5（1件・この端末）")).toBeTruthy();
  expect(screen.getByText("ラックが使いやすい")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /Gyms/ }));
  await screen.findByText("Find your gym.");
  expect(screen.getByText("ラックが使いやすい")).toBeTruthy();
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).community
        .reviews[0],
    ).toMatchObject({
      gymId: "gold",
      rating: 4,
      comment: "ラックが使いやすい",
    }),
  );
});
test("library photos are copied, scoped to a gym/equipment, visible across tabs and restored", async () => {
  pick.mockResolvedValue(image);
  const app = await render(<App />);
  await openMyPage();
  await fireEvent.press(button("投稿先: Anytime Fitness Shibuya Koen-dori"));
  await fireEvent.press(button("設備写真"));
  await fireEvent.press(button("写真を選択"));
  await change("設備写真の説明", "パワーラック");
  await fireEvent.press(button("写真: Power Rack (Squat & Bench)"));
  await fireEvent.press(button("写真を投稿"));
  const thumbnail = await screen.findByLabelText("設備写真: パワーラック");
  expect(thumbnail.props.source.uri).toMatch(
    /^file:\/\/\/app-documents\/gym-photos\//,
  );
  await waitFor(async () => {
    const raw = (await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!;
    const stored = JSON.parse(raw).community.photos[0];
    expect(stored).toMatchObject({
      gymId: "anytime",
      equipmentId: "power-rack",
      caption: "パワーラック",
    });
    expect(raw).not.toContain("file:///picker/cache");
  });
  await app.unmount();
  await render(<App />);
  await screen.findByText("Find your gym.");
  expect(screen.getByLabelText("設備写真: パワーラック")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /My Page/ }));
  await screen.findByText("Made by you.");
  expect(screen.queryByLabelText("設備写真: パワーラック")).toBeNull();
  await fireEvent.press(button("投稿先: Anytime Fitness Shibuya Koen-dori"));
  expect(screen.getByLabelText("設備写真: パワーラック")).toBeTruthy();
});
test("camera denial and cancellation never create photos", async () => {
  await render(<App />);
  await openMyPage();
  await fireEvent.press(button("設備写真"));
  permission.mockResolvedValueOnce({
    granted: false,
    status: PermissionStatus.DENIED,
    canAskAgain: true,
    expires: "never",
  });
  await fireEvent.press(button("写真を撮影"));
  expect(camera).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith(
    "カメラを利用できません",
    expect.any(String),
  );
  permission.mockResolvedValueOnce({
    granted: true,
    status: PermissionStatus.GRANTED,
    canAskAgain: true,
    expires: "never",
  });
  camera.mockResolvedValueOnce({ canceled: true, assets: null });
  await fireEvent.press(button("写真を撮影"));
  expect(screen.queryByLabelText("投稿する写真のプレビュー")).toBeNull();
  expect(FS.copyAsync).not.toHaveBeenCalled();
});
test("camera captures only after permission and posting remains explicit", async () => {
  await render(<App />);
  await openMyPage();
  await fireEvent.press(button("設備写真"));
  permission.mockResolvedValue({
    granted: true,
    status: PermissionStatus.GRANTED,
    canAskAgain: true,
    expires: "never",
  });
  camera.mockResolvedValue(image);
  await fireEvent.press(button("写真を撮影"));
  expect(await screen.findByLabelText("投稿する写真のプレビュー")).toBeTruthy();
  expect(FS.copyAsync).not.toHaveBeenCalled();
  await change("設備写真の説明", "トレーニングフロア");
  await fireEvent.press(button("写真を投稿"));
  expect(
    await screen.findByLabelText("設備写真: トレーニングフロア"),
  ).toBeTruthy();
});
test("photo copy failure shows an error without a post; retry can succeed", async () => {
  pick.mockResolvedValue(image);
  await render(<App />);
  await openMyPage();
  await fireEvent.press(button("設備写真"));
  await fireEvent.press(button("写真を選択"));
  await change("設備写真の説明", "ケーブル");
  jest.spyOn(FS, "copyAsync").mockRejectedValueOnce(new Error("no space"));
  await fireEvent.press(button("写真を投稿"));
  expect(Alert.alert).toHaveBeenCalledWith(
    "写真を保存できませんでした",
    expect.any(String),
  );
  expect(screen.queryByLabelText("設備写真: ケーブル")).toBeNull();
  expect(screen.getByLabelText("設備写真の説明").props.value).toBe("ケーブル");
  await fireEvent.press(button("写真を投稿"));
  expect(await screen.findByLabelText("設備写真: ケーブル")).toBeTruthy();
});
