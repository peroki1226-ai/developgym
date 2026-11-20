import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import App from "../App";
import { ChestPressSeatGuide } from "../src/components/ChestPressSeatGuide";
import { Language, LocaleProvider, translate } from "../src/i18n";
import ja from "../src/i18n/ja.json";
import en from "../src/i18n/en.json";
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
const localized = (language: Language) => <LocaleProvider language={language} setLanguage={() => {}}><ChestPressSeatGuide/></LocaleProvider>;

test.each(["ja","en"] as const)("%s: seat explanation starts with the basic setting and compares all heights without language mixing", async language => {
  const t = (key:string) => translate(language,key);
  await render(localized(language));
  const toggle = () => screen.getByRole("button",{name:t("press.seat.title")});
  expect(toggle().props.accessibilityState.expanded).toBe(false);
  expect(screen.queryByRole("radiogroup")).toBeNull();
  await fireEvent.press(toggle());
  expect(screen.getByRole("radio",{name:t("press.seat.standard.label")}).props.accessibilityState.checked).toBe(true);
  for(const value of ["low","high","standard"]){
    await fireEvent.press(screen.getByRole("radio",{name:t(`press.seat.${value}.label`)}));
    expect(screen.getByRole("image",{name:t(`press.seat.${value}.image`)})).toBeTruthy();
    expect(screen.getByText(t(`press.seat.${value}.position`))).toBeTruthy();
    expect(screen.getByText(t(`press.seat.${value}.effect`))).toBeTruthy();
    expect(screen.getByText(t("press.seat.limit"))).toBeTruthy();
    expect(screen.getByText(t("press.seat.check"))).toBeTruthy();
  }
  await fireEvent.press(toggle());
  expect(screen.queryByRole("radiogroup")).toBeNull();
  const entries=Object.entries(language === "ja" ? ja : en).filter(([key])=>key.startsWith('press.seat.') || key==='chest.press.setup');
  expect(entries.length).toBe(20);
  for(const [,value] of entries) expect(value.normalize("NFKC")).not.toMatch(language === "ja" ? /\p{Script=Latin}/u : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
});
test("changing language updates the open comparison and selected height immediately", async () => {
  const {rerender}=await render(localized("ja"));
  await fireEvent.press(screen.getByRole("button",{name:translate("ja","press.seat.title")}));
  await fireEvent.press(screen.getByRole("radio",{name:translate("ja","press.seat.low.label")}));
  await rerender(localized("en"));
  expect(screen.getByRole("button",{name:translate("en","press.seat.title")}).props.accessibilityState.expanded).toBe(true);
  expect(screen.getByRole("radio",{name:translate("en","press.seat.low.label")}).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole("image",{name:translate("en","press.seat.low.image")})).toBeTruthy();
  expect(screen.queryByText(translate("ja","press.seat.title"))).toBeNull();
});
test("the real guide exposes the comparison in beginner and advanced modes only for chest press", async () => {
  const t = (key:string) => translate("ja",key);
  await render(<App/>);
  await screen.findByText("理想のジムを探そう。");
  await fireEvent.press(screen.getByRole("button",{name:t("guide.open")}));
  await fireEvent.press(screen.getByRole("button",{name:t("guide.changeMachine")}));
  await fireEvent.press(screen.getByRole("button",{name:t("chest.press.name")}));
  expect(screen.getByTestId("beginner-machine-lesson")).toBeTruthy();
  expect(screen.queryByTestId("chest-live-fiber")).toBeNull();
  expect(screen.getByTestId("chest-target-profile")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button",{name:t("press.seat.title")}));
  await fireEvent.press(screen.getByRole("radio",{name:t("press.seat.high.label")}));
  expect(screen.queryByTestId("press-seat-pad")).toBeNull();
  await fireEvent.press(screen.getByRole("button",{name:t("learn.advanced")}));
  expect(screen.queryByTestId("coach-muscle-shape")).toBeNull();
  expect(within(screen.getByTestId("chest-press-seat-guide")).getByRole("radio",{name:t("press.seat.high.label")}).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByRole("button",{name:t("chest.fly.name")}));
  expect(screen.queryByTestId("chest-press-seat-guide")).toBeNull();
  await fireEvent.press(screen.getByRole("button",{name:t("chest.press.name")}));
  expect(screen.getByRole("button",{name:t("press.seat.title")}).props.accessibilityState.expanded).toBe(false);
});
