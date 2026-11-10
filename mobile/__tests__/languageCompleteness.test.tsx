import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";
import App from "../App";
import { FITNESS_STORAGE_KEY, initialFitnessData } from "../src/domain/fitnessStorage";
import { SEARCH_STORAGE_KEY } from "../src/domain/discovery";
import { translate } from "../src/i18n";

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

const originalRead = jest.mocked(AsyncStorage.getItem).getMockImplementation()!;
afterEach(() => {
  jest.restoreAllMocks();
  jest.mocked(AsyncStorage.getItem).mockImplementation(originalRead);
});

test("restoring an English installation never flashes Japanese loading copy", async () => {
  const seed = { ...initialFitnessData(), language: "en" };
  let finish!: (raw: string) => void;
  const pending = new Promise<string>(resolve => { finish = resolve; });
  const read = originalRead;
  jest.spyOn(AsyncStorage, "getItem").mockImplementation(key => key === FITNESS_STORAGE_KEY ? pending : read(key));
  const app = await render(<App />);
  expect(screen.queryByText("保存データを読み込み中…")).toBeNull();
  expect(JSON.stringify(app.toJSON())).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  finish(JSON.stringify(seed));
  expect(await screen.findByText("Find your gym.")).toBeTruthy();
  expect(screen.queryByText("理想のジムを探そう。")).toBeNull();
});

test("search-profile restoration uses English after the stored app language has loaded", async () => {
  await AsyncStorage.setItem(FITNESS_STORAGE_KEY, JSON.stringify({ ...initialFitnessData(), language: "en" }));
  let finish!: (raw: null) => void;
  const pending = new Promise<null>(resolve => { finish = resolve; });
  const read = originalRead;
  jest.spyOn(AsyncStorage, "getItem").mockImplementation(key => key === SEARCH_STORAGE_KEY ? pending : read(key));
  await render(<App />);
  expect(await screen.findByText("Loading…")).toBeTruthy();
  expect(screen.queryByText("読み込み中…")).toBeNull();
  finish(null);
  expect(await screen.findByText("Find your gym.")).toBeTruthy();
});

test("a storage-read failure offers language switching and fully English recovery without overwriting records", async () => {
  const seed = JSON.stringify({ ...initialFitnessData(), language: "en" });
  await AsyncStorage.setItem(FITNESS_STORAGE_KEY, seed);
  jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("Read failed"));
  await render(<App />);
  await screen.findByText("保存データを読み込めませんでした。データは上書きしていません。");
  await fireEvent.press(screen.getByRole("button", { name: /🇺🇸/ }));
  expect(screen.getByText(translate("en", "保存データを読み込めませんでした。データは上書きしていません。"))).toBeTruthy();
  expect(screen.queryByText("保存データを読み込めませんでした。データは上書きしていません。")).toBeNull();
  expect(await AsyncStorage.getItem(FITNESS_STORAGE_KEY)).toBe(seed);
  await fireEvent.press(screen.getByRole("button", { name: "Retry loading" }));
  expect(await screen.findByText("Find your gym.")).toBeTruthy();
});

test("an open machine guide switches language without losing equipment, weight or pose", async () => {
  await render(<App />);
  await screen.findByText("理想のジムを探そう。");
  await fireEvent.press(screen.getByRole("button", { name: translate("ja", "guide.open") }));
  await fireEvent.changeText(screen.getByLabelText("重量キログラム"), "17.5");
  await fireEvent.press(screen.getByRole("button", { name: translate("ja", "learn.advanced") }));
  await fireEvent.press(screen.getByRole("button", { name: translate("ja", "motion.endPose") }));
  await fireEvent.press(screen.getByRole("button", { name: /🇺🇸/ }));
  expect(screen.getByText("Seat & equipment setup")).toBeTruthy();
  expect(screen.getByLabelText("Weight in kg").props.value).toBe("17.5");
  expect(screen.getByRole("adjustable", { name: translate("en", "motion.position") }).props.accessibilityValue.now).toBe(100);
  expect(screen.queryByText("シート・器具のセッティング")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: /🇯🇵/ }));
  expect(screen.getByLabelText("重量キログラム").props.value).toBe("17.5");
  expect(screen.getByRole("adjustable", { name: translate("ja", "motion.position") }).props.accessibilityValue.now).toBe(100);
});
