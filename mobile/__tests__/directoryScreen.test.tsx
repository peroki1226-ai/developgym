import React from "react";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  userEvent,
} from "@testing-library/react-native";
import App from "../App";
import { DIRECTORY_STORAGE_KEY } from "../src/domain/gymDirectory";
import {
  FITNESS_STORAGE_KEY,
  initialFitnessData,
} from "../src/domain/fitnessStorage";
import { translate } from "../src/i18n";
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

const element = (id = 100, tags = {}) => ({
  type: "node",
  id,
  lat: 35.6,
  lon: 140.1,
  tags: { leisure: "fitness_centre", name: "エバーフィット24検証店", ...tags },
});
const response = (elements: unknown[]) =>
  ({ ok: true, json: async () => ({ elements }) }) as Response;
const press = async (name: string | RegExp) =>
  fireEvent.press(screen.getByRole("button", { name }));
async function open() {
  const app = await render(<App />);
  await screen.findByText("理想のジムを探そう。");
  return app;
}
async function directory() {
  const app = await open();
  await press(translate("ja", "directory.entry"));
  await screen.findByText("全国のジムを探す");
  return app;
}

test("a new chain typed into the main search opens its regional directory without an automatic network request", async () => {
  const fetcher = jest.spyOn(globalThis, "fetch");
  try {
    await open();
    await fireEvent.changeText(
      screen.getByLabelText("ジム検索"),
      "ルネサンス 千葉",
    );
    await press("最適なジムを探す");
    await screen.findByText("全国のジムを探す");
    expect(screen.getByText("千葉県 · ルネサンス")).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    fetcher.mockRestore();
  }
});

test("Everfit24 uses Chiba, opens the supplied official site, and saves real results across Favorites/MyPage/restart", async () => {
  const fetcher = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response([element()])),
    link = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const old = initialFitnessData();
  old.favorites = ["gold"];
  await AsyncStorage.setItem(FITNESS_STORAGE_KEY, JSON.stringify(old));
  try {
    const app = await directory();
    expect(fetcher).not.toHaveBeenCalled();
    await press("ブランドを選ぶ");
    await press("エバーフィット24");
    await press("公式サイトで店舗を探す");
    expect(link).toHaveBeenCalledWith("https://www.everfit24.co.jp/");
    await press("この条件で店舗を検索");
    await screen.findByText("エバーフィット24検証店");
    expect(
      decodeURIComponent(String(fetcher.mock.calls[0][1]?.body)),
    ).toContain('"ISO3166-2"="JP-12"');
    expect(
      screen.getByText(translate("ja", "directory.unknownSpecs")),
    ).toBeTruthy();
    await press("この施設をお気に入りに保存");
    await waitFor(async () =>
      expect(
        JSON.parse((await AsyncStorage.getItem(DIRECTORY_STORAGE_KEY))!).saved,
      ).toHaveLength(1),
    );
    await press("お気に入り");
    expect(screen.getByText("エバーフィット24検証店")).toBeTruthy();
    await app.unmount();
    await open();
    await press("マイページ");
    expect(screen.getByText("エバーフィット24検証店")).toBeTruthy();
    expect(
      JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).favorites,
    ).toEqual(["gold"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally {
    fetcher.mockRestore();
    link.mockRestore();
  }
});
test("women and public filters use selected prefectures, preserve provenance and clear results when preferences change", async () => {
  const fetcher = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      response([
        element(1, { name: "カーブス検証店" }),
        element(2, { name: "地域の検証ジム" }),
      ]),
    )
    .mockResolvedValueOnce(
      response([
        element(3, {
          name: "市民運動施設検証場",
          "operator:type": "government",
          leisure: "sports_centre",
        }),
      ]),
    );
  try {
    await directory();
    await press("都道府県を選ぶ（全国47都道府県）");
    await press("宮城県");
    await press("女性向け");
    await press("この条件で店舗を検索");
    await screen.findByText("カーブス検証店");
    expect(screen.queryByText("地域の検証ジム")).toBeNull();
    expect(
      screen.getByText(translate("ja", "directory.womenBrand")),
    ).toBeTruthy();
    expect(
      decodeURIComponent(String(fetcher.mock.calls[0][1]?.body)),
    ).toContain("JP-04");
    await press("公共施設");
    expect(screen.queryByText("カーブス検証店")).toBeNull();
    await press("この条件で店舗を検索");
    await screen.findByText("市民運動施設検証場");
  } finally {
    fetcher.mockRestore();
  }
});
test("a late response cannot replace results after a prefecture change", async () => {
  let resolveOld!: (value: Response) => void;
  const fetcher = jest
    .spyOn(globalThis, "fetch")
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce(response([element(9, { name: "沖縄の検証ジム" })]));
  try {
    await directory();
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "この条件で店舗を検索" }));
    await press("都道府県を選ぶ（全国47都道府県）");
    await press("沖縄県");
    await press("この条件で店舗を検索");
    await screen.findByText("沖縄の検証ジム");
    await act(async () =>
      resolveOld(response([element(8, { name: "前の検索結果" })])),
    );
    expect(screen.queryByText("前の検索結果")).toBeNull();
    expect(screen.getByText("沖縄の検証ジム")).toBeTruthy();
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  } finally {
    fetcher.mockRestore();
  }
});
test("service errors and empty results never create inferred branches", async () => {
  const fetcher = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
    .mockResolvedValueOnce(response([]));
  try {
    await directory();
    await press("ブランドを選ぶ");
    await press("ルネサンス");
    await press("この条件で店舗を検索");
    await screen.findByText(translate("ja", "directory.rateError"));
    await press("再試行");
    await screen.findByText(translate("ja", "directory.empty"));
    expect(
      screen.queryByRole("button", { name: "この施設をお気に入りに保存" }),
    ).toBeNull();
  } finally {
    fetcher.mockRestore();
  }
});
test("unsupported favorite storage is preserved and cannot be overwritten by a save", async () => {
  const raw = JSON.stringify({ version: 99, saved: [] });
  await AsyncStorage.setItem(DIRECTORY_STORAGE_KEY, raw);
  const fetcher = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(response([element()]));
  try {
    await directory();
    await screen.findByText(translate("ja", "directory.storageError"));
    await press("この条件で店舗を検索");
    await screen.findByText("エバーフィット24検証店");
    expect(
      screen.getByRole("button", { name: "この施設をお気に入りに保存" }).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(await AsyncStorage.getItem(DIRECTORY_STORAGE_KEY)).toBe(raw);
  } finally {
    fetcher.mockRestore();
  }
});
test.each(["ja", "en"] as const)(
  "%s: brand/prefecture selectors and untranslated venue names remain in the selected display language",
  async (language) => {
    const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      response([
        element(5, {
          name: language === "en" ? "地域の検証ジム" : "Test Regional Gym",
        }),
      ]),
    );
    try {
      const app = await open();
      if (language === "en") await press(/🇺🇸/);
      const t = (key: string) => translate(language, key);
      await press(t("directory.entry"));
      await press(t("directory.chooseBrand"));
      await press(t("directory.choosePrefecture"));
      await press(t("directory.search"));
      await screen.findByText(t("directory.resultCount").replace("{0}", "1"));
      const strings = (v: any): string[] =>
        typeof v === "string"
          ? [v]
          : Array.isArray(v)
            ? v.flatMap(strings)
            : v && typeof v === "object"
              ? [
                  ...strings(v.children),
                  ...["accessibilityLabel", "placeholder", "value"].flatMap(
                    (k) =>
                      typeof v.props?.[k] === "string" ? [v.props[k]] : [],
                  ),
                ]
              : [];
      expect(
        strings(app.toJSON()).filter((s) =>
          (language === "ja"
            ? /[A-Za-z]/
            : /[\u3040-\u30ff\u3400-\u9fff]/
          ).test(s),
        ),
      ).toEqual([]);
      fetcher.mockResolvedValueOnce({ ok: false, status: 429 } as Response);
      await press(t("directory.search"));
      await screen.findByText(t("directory.rateError"));
      expect(
        strings(app.toJSON()).filter((s) =>
          (language === "ja"
            ? /[A-Za-z]/
            : /[\u3040-\u30ff\u3400-\u9fff]/
          ).test(s),
        ),
      ).toEqual([]);
    } finally {
      fetcher.mockRestore();
    }
  },
);
