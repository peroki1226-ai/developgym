import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";
import { Body, Button } from "./components/ui";
import { HomeProfile } from "./domain/homeTraining";
import {
  decodeFitnessData,
  FITNESS_STORAGE_KEY,
  FitnessData,
  initialFitnessData,
  Workout,
} from "./domain/fitnessStorage";
export type { Workout } from "./domain/fitnessStorage";
type NewWorkout = Omit<Workout, "id" | "date" | "location" | "loadType"> &
  Partial<Pick<Workout, "location" | "loadType">>;
type State = {
  logs: Workout[];
  addLog: (log: NewWorkout) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  homeProfile: HomeProfile;
  setHomeProfile: (profile: HomeProfile) => void;
  storageStatus: "saving" | "saved" | "error";
};
const Context = createContext<State | null>(null);
export function FitnessProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<FitnessData>(initialFitnessData);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [retry, setRetry] = useState(0);
  const [storageStatus, setStorageStatus] =
    useState<State["storageStatus"]>("saving");
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    setLoadError(false);
    AsyncStorage.getItem(FITNESS_STORAGE_KEY)
      .then((raw) => {
        const restored = decodeFitnessData(raw);
        if (active) {
          setData(restored);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setStorageStatus("saving");
    const snapshot = JSON.stringify(data);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(FITNESS_STORAGE_KEY, snapshot));
    queue.current.then(
      () => {
        if (active) setStorageStatus("saved");
      },
      () => {
        if (active) setStorageStatus("error");
      },
    );
    return () => {
      active = false;
    };
  }, [data, ready, retry]);
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000000",
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Body>
          {loadError
            ? "保存データを読み込めませんでした。データは上書きしていません。"
            : "保存データを読み込み中…"}
        </Body>
        {loadError && (
          <Button
            title="読み込みを再試行"
            onPress={() => setReload((n) => n + 1)}
          />
        )}
      </View>
    );
  return (
    <Context.Provider
      value={{
        logs: data.logs,
        favorites: data.favorites,
        homeProfile: data.homeProfile,
        storageStatus,
        setHomeProfile: (homeProfile) =>
          setData((old) => ({ ...old, homeProfile })),
        addLog: (log) =>
          setData((old) => ({
            ...old,
            logs: [
              {
                ...log,
                id: `${Date.now()}-${Math.random()}`,
                date: new Date().toLocaleDateString("ja-JP"),
                location: log.location ?? "gym",
                loadType:
                  log.loadType ?? (log.weight === 0 ? "bodyweight" : "weight"),
              },
              ...old.logs,
            ],
          })),
        toggleFavorite: (id) =>
          setData((old) => ({
            ...old,
            favorites: old.favorites.includes(id)
              ? old.favorites.filter((x) => x !== id)
              : [...old.favorites, id],
          })),
      }}
    >
      {storageStatus === "error" && (
        <View style={{ backgroundColor: "#000000", padding: 16 }}>
          <Body>
            端末への保存に失敗しました。現在の変更は再起動すると失われる可能性があります。
          </Body>
          <Button title="保存を再試行" onPress={() => setRetry((n) => n + 1)} />
        </View>
      )}
      {children}
    </Context.Provider>
  );
}
export function useFitness() {
  const state = useContext(Context);
  if (!state) throw new Error("FitnessProvider is required");
  return state;
}
