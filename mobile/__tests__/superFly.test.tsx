import React from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import App from "../App";
import { CHEST_LESSONS, CHEST_MENU_GUIDES } from "../src/domain/chestLessons";
import { calculateMatch, equipment, gyms, menus } from "../src/domain/matching";
import { defaultSearch, decodeSearch, SEARCH_STORAGE_KEY } from "../src/domain/discovery";
import { FITNESS_STORAGE_KEY } from "../src/domain/fitnessStorage";
import { trainingFrame3d, sub3, dot3, length3, FLAT_BENCH, HUMAN_SEGMENTS } from "../src/domain/training3d";
import { guidePose, projectPhotoChest } from "../src/domain/photoChestProjection";
import { proTraining } from "../src/domain/proTraining";
import { translate } from "../src/i18n";

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

test("Super Fly is a distinct whole-chest lesson with its own menu, equipment and saved identifier", () => {
  expect(CHEST_LESSONS.filter(l => l.id === "super-fly")).toEqual([{ id: "super-fly", prefix: "chest.superFly", emphasis: "whole" }]);
  expect(CHEST_MENU_GUIDES["m-super-fly"]).toBe("super-fly");
  expect(menus.find(m => m.id === "m-super-fly")).toMatchObject({ reqEquip: "super-fly", name: "chest.superFly.name" });
  expect(equipment.find(e => e.id === "super-fly")).toMatchObject({ bodyPart: "chest", brand: "Hammer Strength" });
  const profile = { ...defaultSearch(), menuIds: ["m-super-fly", "m-pec-fly"] };
  expect(decodeSearch(JSON.stringify({ version: 1, profile }))).toEqual(profile);
  expect(proTraining("super-fly")?.method).toBe("backoff");
});

test("a pec deck or chest press does not falsely count as a Super Fly installation", () => {
  const preferences = { menuIds: ["m-super-fly"], partIds: [], requiredDumbbellKg: 0 };
  const missing = calculateMatch({ ...gyms[0], installed: ["pec-fly", "chest-press"] }, preferences);
  expect(missing.available).toHaveLength(0);
  expect(missing.missingEquipment).toEqual(["super-fly"]);
  expect(gyms.some(g => g.installed.includes("super-fly"))).toBe(false);
  const available = calculateMatch({ ...gyms[0], installed: ["super-fly"] }, preferences);
  expect(available.available.map(m => m.id)).toEqual(["m-super-fly"]);
  expect(available.missing).toHaveLength(0);
});

test("the supine fly closes through a rigid arc with constant elbow bend, grip contact and fixed supports", () => {
  const start = trainingFrame3d("super-fly", 0), radius = start.body.arms.map(a => length3(sub3(a[2], a[0])));
  let previousWidth = Infinity;
  for (let i = 0; i <= 40; i++) {
    const f = trainingFrame3d("super-fly", i / 40), b = f.body;
    expect(b.hip).toEqual(start.body.hip); expect(b.shoulder).toEqual(start.body.shoulder); expect(b.legs).toEqual(start.body.legs);
    expect(b.shoulder[1]).toBe(b.hip[1]); expect(b.forward).toEqual([0, 1, 0]);
    const bench = f.equipment.find(e => e.id === "super-fly-bench")!;
    expect(bench.a[1]).toBe(FLAT_BENCH.head[1]); expect(bench.axes![1][1]).toBe(0);
    expect(bench).toEqual(start.equipment.find(e => e.id === bench.id));
    for (const [j, arm] of b.arms.entries()) {
      const side = j === 0 ? -1 : 1, a = sub3(arm[0], arm[1]), c = sub3(arm[2], arm[1]);
      expect(length3(a)).toBeCloseTo(HUMAN_SEGMENTS.upperArm, 7); expect(length3(c)).toBeCloseTo(HUMAN_SEGMENTS.forearmGrip, 7);
      expect(Math.acos(dot3(a, c) / (length3(a) * length3(c))) * 180 / Math.PI).toBeCloseTo(150, 7);
      expect(length3(sub3(arm[2], arm[0]))).toBeCloseTo(radius[j], 7);
      expect(f.grips[j].centre).toEqual(arm[2]); expect(f.grips[j].axis).toEqual([0, 0, 1]);
      expect(f.equipment.find(e => e.id === "super-fly-grip" + side)!.a).toEqual([arm[2][0], arm[2][1], arm[2][2] - 3]);
      expect(f.equipment.find(e => e.id === "super-fly-grip-link" + side)!.b).toEqual([arm[2][0], arm[2][1], arm[2][2] - 3]);
    }
    const width = b.arms[1][2][0] - b.arms[0][2][0]; expect(width).toBeGreaterThan(0); expect(width).toBeLessThanOrEqual(previousWidth); previousWidth = width;
    expect(f.muscles).toEqual(["chest"]);
    expect(guidePose("super-fly", i / 40).grips).toEqual(b.arms.map(a => projectPhotoChest("super-fly", a[2])));
    expect(f.equipment.some(e => /barbell|fly-hanger|smith/.test(e.id))).toBe(false);
  }
  const end = trainingFrame3d("super-fly", 1);
  expect(end.body.arms[0][2][1]).toBeGreaterThan(start.body.arms[0][2][1] + 20);
  expect(start.body.arms[1][2][0] - start.body.arms[0][2][0]).toBeGreaterThan(70);
  expect(previousWidth).toBeLessThan(5);
});

test.each(["ja", "en"] as const)("%s: menu opens the supine guide, explains whole-chest focus and preserves the saved log and selection", async language => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const t = (k: string, values = {}) => translate(language, k, values), name = t("chest.superFly.name");
  await render(<App />); await screen.findByText("理想のジムを探そう。");
  if (language === "en") await fireEvent.press(screen.getByRole("button", { name: /🇺🇸/ }));
  await fireEvent.press(screen.getByRole("button", { name: t("travel.nav.menu") }));
  await fireEvent.changeText(screen.getByLabelText(t("travel.menuSearch")), name);
  await fireEvent.press(screen.getByRole("button", { name }));
  await fireEvent.press(screen.getByRole("button", { name: t("chest.menu.form", { 0: name }) }));
  expect(screen.getByRole("image", { name: t("guide.diagramLabel", { 0: name }) })).toBeTruthy();
  expect(screen.getAllByText(t("chest.superFly.target")).length).toBeGreaterThan(0);
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(t("learn.setup", { 0: t("chest.superFly.setup") }));
  await fireEvent.press(screen.getByRole("radio", { name: t("learn.hands") }));
  expect(screen.getByTestId("beginner-step-hint").props.children).toBe(t("chest.superFly.hands"));
  await fireEvent.press(screen.getByRole("button", { name: t("learn.advanced") }));
  await fireEvent.press(screen.getByRole("radio", { name: t("motion.extraSlow") }));
  await fireEvent.changeText(screen.getByLabelText(t("重量kg")), "10");
  await fireEvent.press(screen.getByRole("button", { name: t("ジムトレーニングを記録") }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).logs[0]).toMatchObject({ name: "chest.superFly.name", weight: 10, location: "gym" }));
  await fireEvent.press(screen.getByRole("button", { name: t("guide.back") }));
  expect(screen.getByLabelText(t("travel.menuSearch")).props.value).toBe(name);
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SEARCH_STORAGE_KEY))!).profile.menuIds).toContain("m-super-fly"));
});
