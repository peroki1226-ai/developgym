import React from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { FitnessProvider } from "../src/state";
import { DietScreen } from "../src/screens/DietScreen";
import {
  FITNESS_STORAGE_KEY,
  initialFitnessData,
} from "../src/domain/fitnessStorage";
import { localDateKey } from "../src/domain/nutrition";
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
const pick = jest.mocked(ImagePicker.launchImageLibraryAsync);
const button = (name: string) => screen.getByRole("button", { name });
async function change(label: string, value: string) {
  await fireEvent.changeText(screen.getByLabelText(label), value);
}
async function open() {
  const app = await render(
    <FitnessProvider>
      <DietScreen />
    </FitnessProvider>,
  );
  await screen.findByText("Nourish your progress.");
  return app;
}
async function fillMeal(name = "鶏肉定食") {
  for (const [label, value] of [
    ["食事名", name],
    ["カロリーkcal", "600"],
    ["タンパク質g", "40"],
    ["脂質g", "20"],
    ["炭水化物g", "65"],
  ])
    await change(label, value);
}
beforeEach(() => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  pick.mockReset();
});
test("manual meal and goals persist across remount with correct daily totals", async () => {
  const app = await open();
  await change("目標体重kg", "65");
  await change("目標カロリー", "1800");
  await fireEvent.press(button("目標を保存"));
  await fireEvent.press(button("昼食"));
  await fillMeal();
  await fireEvent.press(button("食事を保存"));
  expect(screen.getByText("昼食 / 鶏肉定食")).toBeTruthy();
  expect(screen.getByText("目標まで1200kcal")).toBeTruthy();
  await waitFor(async () => {
    const d = JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!);
    expect(d.diet.meals).toHaveLength(1);
    expect(d.diet.calorieGoal).toBe(1800);
  });
  await app.unmount();
  await open();
  expect(screen.getByText("昼食 / 鶏肉定食")).toBeTruthy();
  expect(screen.getByLabelText("目標体重kg").props.value).toBe("65");
});
test("weight upsert updates one point, target and historical entries produce a real graph", async () => {
  await open();
  await change("体重kg", "70");
  await fireEvent.press(button("体重を記録"));
  await change("体重kg", "69.5");
  await fireEvent.press(button("体重を記録"));
  expect(screen.getByLabelText(/^体重推移 1件/)).toBeTruthy();
  await change("記録日", "2020-01-01");
  await fireEvent.press(button("日付を表示"));
  await change("体重kg", "75");
  await fireEvent.press(button("体重を記録"));
  expect(screen.getByLabelText(/^体重推移 2件/)).toBeTruthy();
  expect(screen.getByText("69.5 kg")).toBeTruthy();
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).diet
        .weights,
    ).toHaveLength(2),
  );
});
test("daily views isolate meal slots and historical dates, and calorie overflow caps the bar", async () => {
  await open();
  await change("目標カロリー", "100");
  await fireEvent.press(button("目標を保存"));
  await fillMeal();
  await fireEvent.press(button("夕食"));
  await fireEvent.press(button("食事を保存"));
  expect(screen.getByText("夕食 / 鶏肉定食")).toBeTruthy();
  expect(screen.getByText("目標を500kcal超えています")).toBeTruthy();
  expect(
    screen.getByLabelText("摂取カロリー達成率").props.accessibilityValue.now,
  ).toBe(100);
  await change("記録日", "2020-01-01");
  await fireEvent.press(button("日付を表示"));
  expect(screen.queryByText("夕食 / 鶏肉定食")).toBeNull();
  await fireEvent.press(button("今日を表示"));
  expect(screen.getByText("夕食 / 鶏肉定食")).toBeTruthy();
});
test("photo mock fills fixed values for explicit review, persists no photo URI, and saves only on confirmation", async () => {
  pick.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///private/meal.jpg", width: 100, height: 100 }],
  });
  await open();
  await fireEvent.press(button("写真を選んでモック推定"));
  expect(await screen.findByText("モック推定（要確認）")).toBeTruthy();
  expect(screen.getByLabelText("カロリーkcal").props.value).toBe("580");
  expect(screen.getByLabelText("タンパク質g").props.value).toBe("52");
  expect(screen.getByLabelText("脂質g").props.value).toBe("16");
  expect(screen.getByLabelText("炭水化物g").props.value).toBe("55");
  expect(
    screen.getByText("この日の食事はまだ記録されていません。"),
  ).toBeTruthy();
  await change("カロリーkcal", "590");
  await fireEvent.press(button("食事を保存"));
  expect(screen.getByText("590kcal / P:52g F:16g C:55g")).toBeTruthy();
  await waitFor(async () => {
    const raw = (await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!;
    const d = JSON.parse(raw);
    expect(d.diet.meals[0].source).toBe("mock");
    expect(raw).not.toContain("file:///private");
  });
});
test("photo cancellation and failure do not add meals or overwrite manual input", async () => {
  await open();
  await fillMeal();
  pick.mockResolvedValueOnce({ canceled: true, assets: null });
  await fireEvent.press(button("写真を選んでモック推定"));
  expect(screen.getByLabelText("食事名").props.value).toBe("鶏肉定食");
  pick.mockRejectedValueOnce(new Error("permission"));
  await fireEvent.press(button("写真を選んでモック推定"));
  expect(Alert.alert).toHaveBeenCalledWith(
    "写真を開けませんでした",
    expect.any(String),
  );
  expect(
    screen.getByText("この日の食事はまだ記録されていません。"),
  ).toBeTruthy();
});
test("invalid goals, date, weight and meal inputs cannot be recorded", async () => {
  await open();
  await change("目標カロリー", "0");
  await fireEvent.press(button("目標を保存"));
  expect(Alert.alert).toHaveBeenLastCalledWith(
    "入力を確認",
    expect.any(String),
  );
  await change("記録日", "2026-02-30");
  await fireEvent.press(button("日付を表示"));
  expect(screen.getByText(`表示・保存先: ${localDateKey()}`)).toBeTruthy();
  await change("体重kg", "NaN");
  await fireEvent.press(button("体重を記録"));
  expect(screen.getByText("まだ体重の記録がありません。")).toBeTruthy();
  await fillMeal();
  await change("脂質g", "-1");
  await fireEvent.press(button("食事を保存"));
  expect(
    screen.getByText("この日の食事はまだ記録されていません。"),
  ).toBeTruthy();
});
test("v1 data migrates in the real provider and retains workouts, profile and favorites after nutrition write", async () => {
  const { diet, ...old } = initialFitnessData();
  await AsyncStorage.setItem(
    FITNESS_STORAGE_KEY,
    JSON.stringify({
      ...old,
      version: 1,
      favorites: ["gold"],
      homeProfile: { ...old.homeProfile, gear: ["band"] },
      logs: [
        {
          id: "gym1",
          name: "press",
          weight: 20,
          reps: 10,
          sets: 3,
          date: "2026/1/1",
          location: "gym",
          loadType: "weight",
        },
      ],
    }),
  );
  await open();
  await fillMeal();
  await fireEvent.press(button("食事を保存"));
  await waitFor(async () => {
    const d = JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!);
    expect(d.version).toBe(2);
    expect(d.diet.meals).toHaveLength(1);
    expect(d.favorites).toEqual(["gold"]);
    expect(d.homeProfile.gear).toEqual(["band"]);
    expect(d.logs[0].id).toBe("gym1");
  });
});
test("meal deletion is confirmed and updates calories", async () => {
  const alert = jest.spyOn(Alert, "alert");
  await open();
  await fillMeal();
  await fireEvent.press(button("食事を保存"));
  await fireEvent.press(button("鶏肉定食を削除"));
  const options = alert.mock.calls.at(-1)![2]!;
  await options.find((o) => o.text === "削除")!.onPress!();
  await waitFor(() =>
    expect(
      screen.getByText("この日の食事はまだ記録されていません。"),
    ).toBeTruthy(),
  );
});
