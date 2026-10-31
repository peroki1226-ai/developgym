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
import {
  decodeFitnessData,
  FITNESS_STORAGE_KEY,
  initialFitnessData,
} from "../src/domain/fitnessStorage";
import { formatDate, translate } from "../src/i18n";
import { EQUIPMENTS } from "../src/data/equipment";
import {
  homeExercises,
  homeGear,
  bodyParts,
  gymAlternatives,
} from "../src/domain/homeTraining";
import english from "../src/i18n/en.json";
import { localDateKey } from "../src/domain/nutrition";
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
const button = (name: string) =>
  screen.getByRole("button", {
    name: name.startsWith("🇯🇵") ? /🇯🇵/ : name.startsWith("🇺🇸") ? /🇺🇸/ : name,
  });
async function englishMode() {
  await fireEvent.press(button("🇺🇸 English"));
}
async function open() {
  const app = await render(<App />);
  await screen.findByText(/理想のジムを探そう。|Find your gym\./);
  return app;
}

test("header switches all five screens and tab labels immediately in both directions", async () => {
  await open();
  expect(button("🇯🇵 日本語").props.accessibilityState.selected).toBe(true);
  await englishMode();
  expect(button("🇺🇸 English").props.accessibilityState.selected).toBe(true);
  expect(screen.getByText("Your training")).toBeTruthy();
  expect(screen.queryByText("あなたのトレーニング")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: /トレーニング|Training/ }),
  );
  expect(await screen.findByText("Seat & equipment setup")).toBeTruthy();
  expect(button("Seated Chest Press")).toBeTruthy();
  await fireEvent.press(button("⚡ Advanced mode (biomechanics)"));
  expect(screen.getByText("Anatomical targets")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /家トレ|Home/ }));
  expect(await screen.findByText("Home equipment profile")).toBeTruthy();
  expect(button("Dumbbells")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: /食事|Diet/ }));
  expect(await screen.findByText("Record a meal")).toBeTruthy();
  expect(button("Breakfast")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: /マイページ|My Page/ }),
  );
  expect(await screen.findByText("Your contributions")).toBeTruthy();
  expect(screen.getByText("Workout history")).toBeTruthy();
  await fireEvent.press(button("🇯🇵 日本語"));
  expect(screen.getByText("あなたの投稿")).toBeTruthy();
  expect(screen.getByText("トレーニング統合履歴")).toBeTruthy();
});

test("switching preserves the active tab, entered fields and equipment selection", async () => {
  await open();
  await fireEvent.press(screen.getByRole("button", { name: /家トレ|Home/ }));
  await screen.findByText("自宅で、自分のペースで。");
  await fireEvent.press(button("ダンベル"));
  await fireEvent.changeText(
    screen.getByLabelText("家トレ重量キログラム"),
    "7.5",
  );
  await englishMode();
  expect(screen.getByLabelText("Home workout weight in kg").props.value).toBe(
    "7.5",
  );
  expect(button("Dumbbells").props.accessibilityState.selected).toBe(true);
  expect(screen.getByText("Record / Dumbbell floor press")).toBeTruthy();
  await fireEvent.press(button("🇯🇵 日本語"));
  expect(screen.getByLabelText("家トレ重量キログラム").props.value).toBe("7.5");
});

test("English preference is saved and restored after a full provider/navigation remount", async () => {
  const app = await open();
  await englishMode();
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).language,
    ).toBe("en"),
  );
  await app.unmount();
  await open();
  expect(screen.getByText("Your training")).toBeTruthy();
  expect(button("🇺🇸 English").props.accessibilityState.selected).toBe(true);
  await fireEvent.press(button("🇯🇵 日本語"));
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).language,
    ).toBe("ja"),
  );
});

test("language changes never translate or modify saved meal names, comments or notes", async () => {
  const seed = initialFitnessData();
  seed.logs = [
    {
      id: "log",
      name: "食事を保存",
      date: "2026/1/2",
      weight: 10,
      reps: 10,
      sets: 3,
      location: "gym",
      loadType: "weight",
    },
  ];
  seed.diet.meals = [
    {
      id: "meal",
      date: localDateKey(),
      slot: "breakfast",
      name: "食事を保存",
      source: "manual",
      kcal: 10,
      p: 1,
      f: 0,
      c: 1,
    },
  ];
  seed.community.reviews = [
    {
      id: "review",
      gymId: "gold",
      createdAt: "2026-01-01T10:00:00Z",
      rating: 4,
      comment: "家トレを記録",
    },
  ];
  seed.community.specs = [
    {
      id: "spec",
      gymId: "gold",
      createdAt: "2026-01-01T10:00:00Z",
      previousMaxDumbbellKg: 60,
      maxDumbbellKg: 61,
      equipmentIds: [],
      note: "ダンベル",
    },
  ];
  await AsyncStorage.setItem(FITNESS_STORAGE_KEY, JSON.stringify(seed));
  await open();
  await englishMode();
  await fireEvent.press(screen.getByRole("button", { name: /食事|Diet/ }));
  await screen.findByText("Record a meal");
  expect(screen.getByText("Breakfast / 食事を保存")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: /マイページ|My Page/ }),
  );
  await screen.findByText("Your contributions");
  expect(screen.getByText("家トレを記録")).toBeTruthy();
  expect(screen.getByText("ダンベル")).toBeTruthy();
  await waitFor(async () => {
    const stored = JSON.parse(
      (await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!,
    );
    expect(stored).toEqual({ ...seed, language: "en" });
  });
});

test("a failed language save is visible in English and retry persists the same selection", async () => {
  await open();
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).language,
    ).toBe("ja"),
  );
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockRejectedValueOnce(new Error("disk full"));
  await englishMode();
  expect(
    await screen.findByText(
      "Could not save to this device. Current changes may be lost after restarting.",
    ),
  ).toBeTruthy();
  expect(button("🇺🇸 English").props.accessibilityState.selected).toBe(true);
  await fireEvent.press(button("Retry saving"));
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).language,
    ).toBe("en"),
  );
});

test("existing v1/v2/v3 data default to Japanese and preserve previous fields", () => {
  const seed = initialFitnessData();
  seed.favorites = ["gold"];
  seed.homeProfile.gear = ["band"];
  seed.diet.weights = [{ date: "2026-01-01", kg: 70 }];
  for (const version of [1, 2, 3]) {
    const old = { ...seed, version, language: "en" };
    const migrated = decodeFitnessData(JSON.stringify(old));
    expect(migrated.version).toBe(4);
    expect(migrated.language).toBe("ja");
    expect(migrated.favorites).toEqual(seed.favorites);
    expect(migrated.homeProfile).toEqual(seed.homeProfile);
    if (version >= 2) expect(migrated.diet).toEqual(seed.diet);
    if (version >= 3) expect(migrated.community).toEqual(seed.community);
  }
  expect(
    decodeFitnessData(JSON.stringify({ ...seed, language: "unsupported" })),
  ).toEqual({ ...seed, language: "ja" });
});

test("English catalog covers every displayed training/home description and macro labels", () => {
  const jp = /[\u3040-\u30ff\u3400-\u9fff]/;
  for (const equipment of EQUIPMENTS) {
    for (const text of [
      equipment.name,
      equipment.bodyPartLabel,
      equipment.pof,
      equipment.summary,
      equipment.seatSetup,
      equipment.proAnatomy,
      equipment.proBiomechanics,
      equipment.builderTip,
      equipment.startWeightMale,
      equipment.startWeightFemale,
      ...equipment.beginnerSteps,
      ...equipment.ngPoints,
      ...equipment.proVariations,
    ])
      expect(translate("en", text)).not.toMatch(jp);
  }
  for (const item of homeExercises)
    for (const text of [item.name, item.cue])
      expect(translate("en", text)).not.toMatch(jp);
  for (const item of [...homeGear, ...bodyParts])
    expect(translate("en", item.label)).not.toMatch(jp);
  for (const item of gymAlternatives)
    expect(translate("en", item.name)).not.toMatch(jp);
  for (const [ja, en] of Object.entries(english)) {
    expect(en.trim().length).toBeGreaterThan(0);
    expect(en).not.toMatch(jp);
    const tokens = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort();
    expect(tokens(en)).toEqual(tokens(ja));
  }
});

test("translation interpolates values without rewriting user content and formats locale dates", () => {
  expect(translate("en", "{0}を削除", { "0": "日本語{0}<text>" })).toBe(
    "Delete 日本語{0}<text>",
  );
  expect(translate("ja", "保存を再試行")).toBe("保存を再試行");
  expect(translate("en", "not in the catalog")).toBe("not in the catalog");
  expect(
    translate(
      "en",
      "片手重量は0より大きく、所有上限7.5kg以下で入力してください。",
    ),
  ).toContain("7.5 kg");
  expect(
    translate("en", "投稿による最大重量: 60kg（端末内・未検証）"),
  ).toContain("60 kg (unverified)");
  expect(formatDate("2026/1/2", "en")).toBe(
    new Date(2026, 0, 2).toLocaleDateString("en-US"),
  );
  expect(formatDate("2026/1/2", "ja")).toBe(
    new Date(2026, 0, 2).toLocaleDateString("ja-JP"),
  );
});

test("validation dialogs also switch to English", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await open();
  await englishMode();
  await fireEvent.press(
    screen.getByRole("button", { name: /トレーニング|Training/ }),
  );
  await screen.findByText("Seat & equipment setup");
  await fireEvent.changeText(screen.getByLabelText("Weight in kg"), "-1");
  await fireEvent.press(button("Record gym workout"));
  expect(alert).toHaveBeenCalledWith(
    "Check your input",
    expect.stringContaining("0 to 1000 kg"),
  );
});
