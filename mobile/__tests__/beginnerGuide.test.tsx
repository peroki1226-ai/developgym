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
import { EQUIPMENTS } from "../src/data/equipment";
import { translate } from "../src/i18n";
import { FITNESS_STORAGE_KEY } from "../src/domain/fitnessStorage";

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
const ja = (key: string, values = {}) => translate("ja", key, values);
const press = async (name: string | RegExp) =>
  fireEvent.press(screen.getByRole("button", { name }));
async function open() {
  await render(<App />);
  await screen.findByText("理想のジムを探そう。");
}

test("home opens the illustrated beginner guide offline and returns to the same search input", async () => {
  const network = jest
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("offline"));
  try {
    await open();
    await fireEvent.changeText(screen.getByLabelText("ジム検索"), "東京");
    await press(ja("guide.open"));
    expect(
      screen.getByRole("button", { name: "🔰 初心者モード" }).props
        .accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByRole("image", {
        name: ja("guide.diagramLabel", { 0: ja(EQUIPMENTS[0].name) }),
      }),
    ).toBeTruthy();
    expect(screen.getByText(ja(EQUIPMENTS[0].seatSetup))).toBeTruthy();
    for (const step of EQUIPMENTS[0].beginnerSteps)
      expect(screen.getByText(new RegExp(ja(step)))).toBeTruthy();
    expect(
      screen.getByRole("button", { name: ja("guide.changeMachine") }).props
        .accessibilityState.expanded,
    ).toBe(false);
    await press(ja("guide.back"));
    expect(screen.getByLabelText("ジム検索").props.value).toBe("東京");
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});

test("menu opens the selected machine, records that exercise, and retains the menu search on return", async () => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await open();
  await press("メニュー");
  await fireEvent.changeText(
    screen.getByLabelText(ja("travel.menuSearch")),
    "ラット",
  );
  await press(ja("guide.browse"));
  const equipment = EQUIPMENTS.find((e) => e.id === "leg-press")!;
  await press(ja("guide.openMachine", { 0: ja(equipment.name) }));
  expect(
    screen.getByRole("image", {
      name: ja("guide.diagramLabel", { 0: ja(equipment.name) }),
    }),
  ).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("重量キログラム"), "15");
  await press("ジムトレーニングを記録");
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).logs[0],
    ).toMatchObject({ name: equipment.name, weight: 15, location: "gym" }),
  );
  await press(ja("guide.back"));
  expect(screen.getByLabelText(ja("travel.menuSearch")).props.value).toBe(
    "ラット",
  );
  expect(
    screen.getByRole("button", { name: ja("guide.browse") }).props
      .accessibilityState.expanded,
  ).toBe(true);
});

test("gym equipment opens the corresponding machine guide and returns to the same gym detail", async () => {
  await open();
  await press("最適なジムを探す");
  await fireEvent.press(
    screen.getAllByRole("button", { name: "詳細を見る" })[0],
  );
  await press(ja("guide.openMachine", { 0: ja("ラットプルダウン") }));
  expect(
    screen.getByRole("image", {
      name: ja("guide.diagramLabel", { 0: ja("ラットプルダウン") }),
    }),
  ).toBeTruthy();
  await press(ja("guide.back"));
  expect(screen.getByText("掲載している器具の保有数")).toBeTruthy();
});

test.each(["ja", "en"] as const)(
  "%s: all direct machine guides open in beginner mode with localized setup",
  async (language) => {
    await open();
    if (language === "en") await press(/🇺🇸/);
    const t = (key: string, values = {}) => translate(language, key, values);
    await press(t("travel.nav.menu"));
    await press(t("guide.browse"));
    for (const equipment of EQUIPMENTS) {
      await press(t("guide.openMachine", { 0: t(equipment.name) }));
      expect(
        screen.getByRole("image", {
          name: t("guide.diagramLabel", { 0: t(equipment.name) }),
        }),
      ).toBeTruthy();
      expect(screen.getByText(t(equipment.seatSetup))).toBeTruthy();
      expect(
        screen.getByRole("button", { name: t("🔰 初心者モード") }).props
          .accessibilityState.selected,
      ).toBe(true);
      await press(t("guide.back"));
    }
  },
);
