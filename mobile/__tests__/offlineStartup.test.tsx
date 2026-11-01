import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import App from "../App";
import {
  FITNESS_STORAGE_KEY,
  initialFitnessData,
  decodeFitnessData,
} from "../src/domain/fitnessStorage";
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

test.each(["fresh installation", "existing installation"])(
  "%s opens all tabs, saves and restarts without HTTP or WebSocket access",
  async (kind) => {
    const http = jest.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Network is unavailable");
    });
    const socket = jest
      .spyOn(globalThis, "WebSocket")
      .mockImplementation(() => {
        throw new Error("Development server is unavailable");
      });
    try {
      if (kind === "existing installation") {
        const data = initialFitnessData();
        data.logs.push({
          id: "offline-existing",
          name: "既存の記録",
          date: "2026-11-02T00:00:00.000Z",
          location: "home",
          loadType: "bodyweight",
          weight: 0,
          reps: 12,
          sets: 3,
        });
        await AsyncStorage.setItem(FITNESS_STORAGE_KEY, JSON.stringify(data));
      }
      const first = await render(<App />);
      await screen.findByText("理想のジムを探そう。");
      await fireEvent.press(screen.getAllByText("お気に入りに追加")[0]);
      for (const [tab, title] of [
        [/トレーニング|Training/, "確かなフォームで鍛えよう。"],
        [/家トレ|Home/, "自宅で、自分のペースで。"],
        [/食事|Diet/, "食事から、理想の体へ。"],
        [/マイページ|My Page/, "積み重ねを、あなたの力に。"],
      ] as const) {
        await fireEvent.press(screen.getByRole("button", { name: tab }));
        await screen.findByText(title);
      }
      if (kind === "existing installation")
        expect(screen.getByText(/既存の記録/)).toBeTruthy();
      await waitFor(async () =>
        expect(
          decodeFitnessData(await AsyncStorage.getItem(FITNESS_STORAGE_KEY))
            .favorites,
        ).toHaveLength(1),
      );
      const saved = await AsyncStorage.getItem(FITNESS_STORAGE_KEY);
      await first.unmount();
      await render(<App />);
      await screen.findByText("理想のジムを探そう。");
      expect(screen.getAllByText("お気に入りを解除")).toHaveLength(1);
      expect(
        decodeFitnessData(await AsyncStorage.getItem(FITNESS_STORAGE_KEY)),
      ).toEqual(decodeFitnessData(saved));
      expect(http).not.toHaveBeenCalled();
      expect(socket).not.toHaveBeenCalled();
    } finally {
      http.mockRestore();
      socket.mockRestore();
    }
  },
);
