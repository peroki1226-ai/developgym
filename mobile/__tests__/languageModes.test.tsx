import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import App from "../App";
import { FITNESS_STORAGE_KEY, initialFitnessData } from "../src/domain/fitnessStorage";
import { languageFromSearch, languageUrl } from "../src/i18n/languageMode";
import { getLaunchLanguage } from "../src/i18n/launchLanguage";
import { translate } from "../src/i18n";

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("../src/i18n/launchLanguage", () => ({ getLaunchLanguage: jest.fn(() => undefined) }));
const originalRead = jest.mocked(AsyncStorage.getItem).getMockImplementation()!;
beforeEach(() => jest.mocked(getLaunchLanguage).mockReturnValue(undefined));
afterEach(() => {
  jest.mocked(AsyncStorage.getItem).mockImplementation(originalRead);
});

test("only an unambiguous ja/en entry can select the launch mode", () => {
  expect(languageFromSearch("?lang=ja")).toBe("ja");
  expect(languageFromSearch("?lang=en&revision=abc")).toBe("en");
  for (const search of ["", "?lang=", "?lang=de", "?lang=EN", "?lang=en&lang=ja", "?lang=%3Cscript%3E"])
    expect(languageFromSearch(search)).toBeUndefined();
});

test("changing mode replaces just the language, preserving other parameters and the current hash", () => {
  const url = new URL(languageUrl("https://gymfinder.test/app-preview/?lang=ja&revision=abc#menu", "en"));
  expect(url.searchParams.getAll("lang")).toEqual(["en"]);
  expect(url.searchParams.get("revision")).toBe("abc");
  expect(url.pathname).toBe("/app-preview/");
  expect(url.hash).toBe("#menu");
});

for (const mode of ["ja", "en"] as const) {
  test(`${mode} entry overrides the old language while keeping saved fitness records`, async () => {
    const seed = initialFitnessData();
    seed.language = mode === "en" ? "ja" : "en";
    seed.favorites = ["gold"];
    seed.logs = [{ id: "saved", name: "チェストプレス", weight: 17.5, reps: 8, sets: 3, date: "2026/11/1", location: "gym", loadType: "weight" }];
    await AsyncStorage.setItem(FITNESS_STORAGE_KEY, JSON.stringify(seed));
    jest.mocked(getLaunchLanguage).mockReturnValue(mode);
    await render(<App />);
    expect(await screen.findByText(translate(mode, "Find your gym."))).toBeTruthy();
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!)).toEqual({ ...seed, language: mode }));
  });
}

test("My Page offers two exclusive modes and applies selection to all mounted screens", async () => {
  const app = await render(<App />);
  await screen.findByText(translate("ja", "Find your gym."));
  await fireEvent.press(screen.getByRole("button", { name: translate("ja", "nav.mypage") }));
  expect(screen.getByRole("radio", { name: "日本語モード" }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole("radio", { name: "英語モード" }).props.accessibilityState.checked).toBe(false);
  await fireEvent.press(screen.getByRole("radio", { name: "英語モード" }));
  expect(screen.getByText("Current: English mode")).toBeTruthy();
  expect(screen.getByRole("radio", { name: "English mode" }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole("radio", { name: "Japanese mode" }).props.accessibilityState.checked).toBe(false);
  expect(screen.queryByText("表示言語")).toBeNull();
  await waitFor(() => expect(screen.getByText("Saved on this device. The app will use this language next time.")).toBeTruthy());
  await app.unmount();
  await render(<App />);
  await screen.findByText("Find your gym.");
  await fireEvent.press(screen.getByRole("button", { name: translate("en", "nav.mypage") }));
  expect(screen.getByRole("radio", { name: "English mode" }).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByRole("radio", { name: "Japanese mode" }));
  expect(screen.getByText("現在：日本語モード")).toBeTruthy();
  expect(screen.queryByText("Display language")).toBeNull();
});

test("a new choice during read recovery takes precedence over the original launch mode", async () => {
  const seed = { ...initialFitnessData(), language: "en" };
  await AsyncStorage.setItem(FITNESS_STORAGE_KEY, JSON.stringify(seed));
  jest.mocked(getLaunchLanguage).mockReturnValue("en");
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error("read failed"));
  await render(<App />);
  await screen.findByRole("button", { name: "Retry loading" });
  await fireEvent.press(screen.getByRole("button", { name: /🇯🇵/ }));
  await fireEvent.press(screen.getByRole("button", { name: "読み込みを再試行" }));
  expect(await screen.findByText(translate("ja", "Find your gym."))).toBeTruthy();
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).language).toBe("ja"));
});
