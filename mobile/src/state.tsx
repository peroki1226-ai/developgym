import { Language, isLanguage, LocaleProvider, translate } from "./i18n";
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";
import { Body, Button } from "./components/ui";
import { DietData, Meal, WeightEntry, upsertWeight } from "./domain/nutrition";
import {
  applySpecs,
  CommunityData,
  SpecPost,
  ReviewPost,
  PhotoPost,
  validateSpec,
  validateReview,
  isCommunityData,
} from "./domain/community";
import { gyms, Gym } from "./domain/matching";
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
  language: Language;
  setLanguage: (language: Language) => void;
  community: CommunityData;
  gymCatalog: Gym[];
  addSpec: (
    post: Omit<SpecPost, "id" | "createdAt" | "previousMaxDumbbellKg">,
  ) => void;
  addReview: (post: Omit<ReviewPost, "id" | "createdAt">) => void;
  addPhoto: (post: Omit<PhotoPost, "id" | "createdAt">) => void;
  diet: DietData;
  setDietGoals: (
    goals: Pick<DietData, "targetWeightKg" | "calorieGoal">,
  ) => void;
  addWeight: (entry: WeightEntry) => void;
  addMeal: (entry: Omit<Meal, "id">) => void;
  removeMeal: (id: string) => void;
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
  const t = (message: string) => translate(data.language, message);
  const setLanguage = (language: Language) => {
    if (!isLanguage(language)) throw new Error("Unsupported language");
    setData((old) => (old.language === language ? old : { ...old, language }));
  };
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
  const gymCatalog = useMemo(
    () => applySpecs(gyms, data.community.specs),
    [data.community.specs],
  );
  const meta = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  });
  if (!ready)
    return (
      <LocaleProvider language={data.language} setLanguage={setLanguage}>
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
              ? t(
                  "保存データを読み込めませんでした。データは上書きしていません。",
                )
              : t("保存データを読み込み中…")}
          </Body>
          {loadError && (
            <Button
              title={t("読み込みを再試行")}
              onPress={() => setReload((n) => n + 1)}
            />
          )}
        </View>
      </LocaleProvider>
    );
  return (
    <LocaleProvider language={data.language} setLanguage={setLanguage}>
      <Context.Provider
        value={{
          language: data.language,
          setLanguage,
          community: data.community,
          gymCatalog,
          addSpec: (post) => {
            const gym = gymCatalog.find((g) => g.id === post.gymId);
            const error = gym
              ? validateSpec(
                  gym,
                  post.maxDumbbellKg,
                  post.equipmentIds,
                  post.note,
                )
              : "Unknown gym";
            if (error) throw new Error(error);
            const entry = {
              ...post,
              ...meta(),
              previousMaxDumbbellKg: gym!.maxDumbbellKg,
            };
            setData((old) => ({
              ...old,
              community: {
                ...old.community,
                specs: [...old.community.specs, entry],
              },
            }));
          },
          addReview: (post) => {
            if (
              !gyms.some((g) => g.id === post.gymId) ||
              validateReview(post.rating, post.comment)
            )
              throw new Error("Invalid review");
            const entry = { ...post, ...meta(), comment: post.comment.trim() };
            setData((old) => ({
              ...old,
              community: {
                ...old.community,
                reviews: [...old.community.reviews, entry],
              },
            }));
          },
          addPhoto: (post) => {
            const entry = { ...post, ...meta(), caption: post.caption.trim() };
            if (!isCommunityData({ specs: [], reviews: [], photos: [entry] }))
              throw new Error("Invalid photo");
            setData((old) => ({
              ...old,
              community: {
                ...old.community,
                photos: [...old.community.photos, entry],
              },
            }));
          },
          diet: data.diet,
          setDietGoals: (goals) =>
            setData((old) => ({ ...old, diet: { ...old.diet, ...goals } })),
          addWeight: (entry) =>
            setData((old) => ({
              ...old,
              diet: {
                ...old.diet,
                weights: upsertWeight(old.diet.weights, entry),
              },
            })),
          addMeal: (entry) =>
            setData((old) => ({
              ...old,
              diet: {
                ...old.diet,
                meals: [
                  ...old.diet.meals,
                  { ...entry, id: `${Date.now()}-${Math.random()}` },
                ],
              },
            })),
          removeMeal: (id) =>
            setData((old) => ({
              ...old,
              diet: {
                ...old.diet,
                meals: old.diet.meals.filter((m) => m.id !== id),
              },
            })),
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
                  date: new Date().toISOString(),
                  location: log.location ?? "gym",
                  loadType:
                    log.loadType ??
                    (log.weight === 0 ? "bodyweight" : "weight"),
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
              {t(
                "端末への保存に失敗しました。現在の変更は再起動すると失われる可能性があります。",
              )}
            </Body>
            <Button
              title={t("保存を再試行")}
              onPress={() => setRetry((n) => n + 1)}
            />
          </View>
        )}
        {children}
      </Context.Provider>
    </LocaleProvider>
  );
}
export function useFitness() {
  const state = useContext(Context);
  if (!state) throw new Error("FitnessProvider is required");
  return state;
}
