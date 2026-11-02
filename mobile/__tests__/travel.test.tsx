import React from "react";
import { Image, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import App from "../App";
import { translate } from "../src/i18n";
import {
  SEARCH_STORAGE_KEY,
  decodeSearch,
  defaultSearch,
  comparisonSelection,
  pixelPoint,
  routeUrl,
} from "../src/domain/discovery";
import { gyms } from "../src/domain/matching";
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
const press = async (name: string | RegExp) =>
  fireEvent.press(screen.getByRole("button", { name }));
async function open() {
  const app = await render(<App />);
  await screen.findByText("理想のジムを探そう。");
  return app;
}
test("new five-tab navigation shares menu choices with results and keeps the menu across a restart", async () => {
  const app = await open();
  for (const name of [
    "ホーム",
    "マップ",
    "メニュー",
    "お気に入り",
    "マイページ",
  ])
    expect(screen.getByRole("button", { name })).toBeTruthy();
  await press("メニュー");
  await screen.findByText("トレーニングメニュー");
  await press("種目をすべて解除");
  await press("バーベルベンチプレス");
  await waitFor(async () =>
    expect(
      decodeSearch(await AsyncStorage.getItem(SEARCH_STORAGE_KEY)).menuIds,
    ).toEqual(["m-bench"]),
  );
  await press("このメニューでジムを探す");
  await screen.findByText("検索結果");
  expect(screen.getAllByText(/バーベルベンチプレス/).length).toBeGreaterThan(0);
  await app.unmount();
  await open();
  await press("メニュー");
  expect(screen.getByText("選択したメニュー（1種目）")).toBeTruthy();
});
test("search opens detail, favorites remain visible despite unrelated filters, and directions use the selected venue", async () => {
  const link = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  try {
    await open();
    await press("最適なジムを探す");
    await fireEvent.press(
      screen.getAllByRole("button", { name: "詳細を見る" })[0],
    );
    await screen.findByText("掲載している器具の保有数");
    await press("お気に入りに追加");
    await press("このジムへのルートを見る");
    expect(link).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://www.google.com/maps/dir/?api=1&destination=",
      ),
    );
    await press("ホーム");
    await fireEvent.changeText(screen.getByLabelText("ジム検索"), "不存在");
    await press("お気に入り");
    expect(screen.getByText("ゴールドジム渋谷東京")).toBeTruthy();
  } finally {
    link.mockRestore();
  }
});
test("two gyms can be compared and a third is blocked until a selection is removed", async () => {
  await open();
  await press("最適なジムを探す");
  await fireEvent.press(
    screen.getAllByRole("button", { name: "比較に追加" })[0],
  );
  await fireEvent.press(
    screen.getAllByRole("button", { name: "比較に追加" })[0],
  );
  expect(
    screen
      .getAllByRole("button", { name: "比較に追加" })
      .every((b) => b.props.accessibilityState.disabled),
  ).toBe(true);
  await press("ジムを比較（2/2）");
  await screen.findByText("ジム比較");
  expect(screen.getAllByRole("button", { name: "比較から外す" })).toHaveLength(
    2,
  );
});
test("map pins select venues, tile failure leaves the list usable, and both languages cover the new screens", async () => {
  await open();
  await press("マップ");
  await screen.findByText("地図から探す");
  const tile = screen.getAllByTestId("gym-map-tile", {
    includeHiddenElements: true,
  })[0];
  expect(tile).toBeTruthy();
  await fireEvent(tile!, "error", {});
  expect(
    screen.getByText("地図を読み込めません。下の店舗一覧から選択できます。"),
  ).toBeTruthy();
  await press("地図上のエニタイムフィットネス渋谷公園通り");
  expect(
    screen.getByRole("button", { name: "エニタイムフィットネス渋谷公園通り" })
      .props.accessibilityState.selected,
  ).toBe(true);
  await press(/🇺🇸/);
  expect(screen.getByText("Explore the map")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Zoom in" })).toBeTruthy();
  await press("Menu");
  expect(screen.getByText("Training menu")).toBeTruthy();
  await press("Favorites");
  expect(screen.getByText("No favorites yet")).toBeTruthy();
});
test("equipment manufacturer lookup connects to actual matching gym IDs", async () => {
  await open();
  await press("器具・メーカー検索");
  await screen.findByText("使いたい器具やメーカーから探す。");
  await fireEvent.changeText(
    screen.getByLabelText("器具・メーカー検索"),
    "ハンマーストレングス",
  );
  expect(
    screen.getAllByRole("button", { name: /この器具があるジム/ }).length,
  ).toBeGreaterThan(0);
  await fireEvent.press(
    screen.getAllByRole("button", { name: /この器具があるジム/ })[0],
  );
  expect(screen.getByText("器具を備えるジム")).toBeTruthy();
});
test("unknown search storage is preserved rather than overwritten", async () => {
  const raw = JSON.stringify({ version: 99, profile: defaultSearch() });
  await AsyncStorage.setItem(SEARCH_STORAGE_KEY, raw);
  await open();
  expect(
    screen.getByText(
      "検索設定を保存・復元できません。元のデータは保持しています。",
    ),
  ).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("ジム検索"), "東京");
  expect(await AsyncStorage.getItem(SEARCH_STORAGE_KEY)).toBe(raw);
});
test("search schema, geographic projection, comparison limit and route destination preserve invariants", () => {
  expect(() =>
    decodeSearch(
      JSON.stringify({
        version: 1,
        profile: { ...defaultSearch(), menuIds: ["unknown"] },
      }),
    ),
  ).toThrow();
  expect(() =>
    decodeSearch(
      JSON.stringify({
        version: 1,
        profile: { ...defaultSearch(), requiredKg: -1 },
      }),
    ),
  ).toThrow();
  expect(comparisonSelection(["gold", "anytime"], "compact")).toEqual([
    "gold",
    "anytime",
  ]);
  expect(comparisonSelection(["gold", "anytime"], "gold")).toEqual(["anytime"]);
  expect(pixelPoint(0, 0, 0)).toEqual({ x: 128, y: 128 });
  expect(Number.isFinite(pixelPoint(90, 0, 3).y)).toBe(true);
  expect(decodeURIComponent(routeUrl(gyms[0]))).toContain(gyms[0].name);
});

for (const language of ["ja", "en"] as const)
  test(`${language}: every discovery screen uses only its selected system language`, async () => {
    const app = await open();
    if (language === "en") await press(/🇺🇸/);
    const t = (key: string) => translate(language, key);
    const strings = (node: any): string[] =>
      typeof node === "string"
        ? [node]
        : !node || typeof node !== "object"
          ? []
          : Array.isArray(node)
            ? node.flatMap(strings)
            : [
                ...strings(node.children),
                ...["accessibilityLabel", "placeholder", "value"].flatMap(
                  (key) =>
                    typeof node.props?.[key] === "string"
                      ? [node.props[key]]
                      : [],
                ),
              ];
    const audit = () =>
      expect([
        ...new Set(
          strings(app.toJSON()).filter((text) =>
            (language === "ja"
              ? /[A-Za-z]/
              : /[\u3040-\u30ff\u3400-\u9fff]/
            ).test(text),
          ),
        ),
      ]).toEqual([]);
    for (const tab of [
      "travel.nav.map",
      "travel.nav.menu",
      "travel.nav.favorites",
      "nav.mypage",
      "travel.nav.explore",
    ]) {
      await press(t(tab));
      audit();
    }
    await press(t("travel.search"));
    audit();
    await fireEvent.press(
      screen.getAllByRole("button", { name: t("travel.addComparison") })[0],
    );
    await fireEvent.press(
      screen.getAllByRole("button", { name: t("travel.addComparison") })[0],
    );
    await press(t("travel.compareCount").replace("{0}", "2"));
    audit();
    await fireEvent.press(
      screen.getAllByRole("button", { name: t("travel.details") })[0],
    );
    audit();
    for (const section of [
      "travel.info",
      "travel.reviews",
      "travel.equipment",
    ]) {
      await press(t(section));
      audit();
    }
    await press(t("travel.nav.explore"));
    await press(t("travel.equipmentSearch"));
    audit();
    await press(t("travel.back"));
    await press(t("travel.suggestions"));
    audit();
  });
test("a transient search-storage read failure can be retried without losing fitness records", async () => {
  const read = jest.mocked(AsyncStorage.getItem),
    original = read.getMockImplementation()!;
  read.mockImplementation((key) =>
    key === SEARCH_STORAGE_KEY
      ? Promise.reject(new Error("unavailable"))
      : original(key),
  );
  try {
    await open();
    expect(
      screen.getByText(
        "検索設定を保存・復元できません。元のデータは保持しています。",
      ),
    ).toBeTruthy();
    read.mockImplementation(original);
    await press("再試行");
    await waitFor(() =>
      expect(
        screen.queryByText(
          "検索設定を保存・復元できません。元のデータは保持しています。",
        ),
      ).toBeNull(),
    );
  } finally {
    read.mockImplementation(original);
  }
});
