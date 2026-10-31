import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import App from "../App";
import { translate, Language } from "../src/i18n";
import { EQUIPMENTS } from "../src/data/equipment";
import {
  homeExercises,
  homeGear,
  bodyParts,
  gymAlternatives,
} from "../src/domain/homeTraining";
import data from "../src/data/finder.json";
import japanese from "../src/i18n/ja.json";
import english from "../src/i18n/en.json";
import { findGyms, gyms } from "../src/domain/matching";
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: "file:///pure-meal.jpg" }],
  })),
}));
jest.setTimeout(30000);
function strings(value: any): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(strings);
  return [
    ...strings(value.children),
    ...["accessibilityLabel", "placeholder", "value"].flatMap((k) =>
      typeof value.props?.[k] === "string" ? [value.props[k]] : [],
    ),
  ];
}
const jp = /[\u3040-\u30ff\u3400-\u9fff]/;
function audit(app: any, language: Language) {
  const invalid = strings(app.toJSON()).filter((s) =>
    language === "ja" ? /[A-Za-z]/.test(s) : jp.test(s),
  );
  expect([...new Set(invalid)]).toEqual([]);
}
async function press(source: string, language: Language) {
  await fireEvent.press(
    screen.getByRole("button", { name: translate(language, source) }),
  );
}
async function open(language: Language) {
  const app = await render(<App />);
  await screen.findByText(translate("ja", "Find your gym."));
  if (language === "en") await press("🇺🇸 English", "ja");
  return app;
}
for (const language of ["ja", "en"] as const) {
  test(`${language}: all five screens and expanded forms contain only the selected system language`, async () => {
    const app = await open(language);
    audit(app, language);
    await press("やりたい種目を選ぶ", language);
    await press("対象部位を選ぶ（任意）", language);
    audit(app, language);
    await press("トレーニング (Training)", language);
    audit(app, language);
    await press("⚡ 本格モード（生体力学）", language);
    audit(app, language);
    await press("家トレ (Home)", language);
    audit(app, language);
    await press("ジム種目から代替を探す", language);
    audit(app, language);
    await press("食事 (Diet)", language);
    audit(app, language);
    await press("写真を選んでモック推定", language);
    await screen.findByLabelText(
      translate(language, "選択した食事写真（保存・送信しません）"),
    );
    audit(app, language);
    await press("マイページ (My Page)", language);
    audit(app, language);
    await press("レビュー", language);
    audit(app, language);
    await press("設備写真", language);
    audit(app, language);
  });
}
test("all twelve exercise diagrams and beginner/advanced guides are separated in both languages", async () => {
  const app = await open("ja");
  for (const language of ["ja", "en"] as const) {
    if (language === "en") await press("🇺🇸 English", "ja");
    await press("トレーニング (Training)", language);
    for (const equipment of EQUIPMENTS) {
      await press(equipment.name, language);
      await press("🔰 初心者モード", language);
      audit(app, language);
      await press("⚡ 本格モード（生体力学）", language);
      audit(app, language);
    }
  }
});
test("provided exercise, home, gym and manufacturer data have explicit localized display values", () => {
  const fields: string[] = [];
  for (const e of EQUIPMENTS)
    fields.push(
      e.name,
      e.muscleTag,
      e.bodyPartLabel,
      e.pof,
      e.summary,
      e.seatSetup,
      e.proAnatomy,
      e.proBiomechanics,
      e.builderTip,
      e.startWeightMale,
      e.startWeightFemale,
      ...e.beginnerSteps,
      ...e.ngPoints,
      ...e.proVariations,
    );
  for (const e of homeExercises) fields.push(e.name, e.cue);
  for (const e of [...homeGear, ...bodyParts]) fields.push(e.label);
  for (const e of gymAlternatives) fields.push(e.name);
  for (const e of [...data.menus, ...data.parts]) fields.push(e.name);
  for (const e of data.equipment) fields.push(e.name, e.brand);
  for (const e of data.gyms)
    fields.push(e.name, e.area, e.spec, e.dumbbellRange);
  const invalid = fields.flatMap((text) =>
    (["ja", "en"] as const)
      .filter((l) =>
        l === "ja"
          ? /[A-Za-z]/.test(translate(l, text))
          : jp.test(translate(l, text)),
      )
      .map((l) => `${l}: ${text} => ${translate(l, text)}`),
  );
  expect(invalid).toEqual([]);
});
test("dictionaries preserve interpolation tokens and never introduce the other language", () => {
  const tokens = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort();
  for (const [key, value] of Object.entries(japanese)) {
    expect(tokens(value)).toEqual(tokens(key));
    expect(translate("ja", key)).not.toMatch(/[A-Za-z]/);
    expect((english as Record<string, string>)[key]).toBeDefined();
    expect(translate("en", key)).not.toMatch(jp);
  }
  expect(translate("ja", "回数（Reps）")).toBe("回数");
  expect(translate("ja", "生体力学（Biomechanics）")).toBe("生体力学");
  expect(translate("ja", "kg")).toBe("キログラム");
  expect(translate("ja", "Hammer Strength")).toBe("ハンマーストレングス");
});
test("only templates are localized; interpolated user text and source catalogs stay intact", () => {
  const before = JSON.stringify(data);
  const raw = "胸 (Chest) 日本語 <review> {1}";
  expect(translate("en", "投稿先: {0}", { 0: raw })).toContain(raw);
  expect(translate("ja", "投稿先: {0}", { 0: raw })).toContain(raw);
  expect(JSON.stringify(data)).toBe(before);
});
test("Japanese display names remain searchable without altering gym IDs or scores", () => {
  const pref = { menuIds: ["m-squat"], partIds: [], requiredDumbbellKg: 0 };
  const result = findGyms(pref, "ゴールドジム", "all", 0, gyms, (s) =>
    translate("ja", s),
  );
  expect(result.map((r) => r.gym.id).sort()).toEqual(["global-la", "gold"]);
  expect(result.every((r) => r.match.percent === 99)).toBe(true);
  const bilingual = (s: string) =>
    `${translate("ja", s)} ${translate("en", s)}`;
  expect(
    findGyms(pref, "ゴールドジム", "all", 0, gyms, bilingual).map(
      (r) => r.gym.id,
    ),
  ).toEqual(result.map((r) => r.gym.id));
  expect(findGyms(pref, "Gold's Gym").map((r) => r.gym.id)).toEqual(
    result.map((r) => r.gym.id),
  );
});
