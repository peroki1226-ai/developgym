import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, View } from "react-native";
import { useI18n } from "./i18n";
import { EQUIPMENTS } from "./data/equipment";
import {
  SearchProfile,
  defaultSearch,
  decodeSearch,
  SEARCH_STORAGE_KEY,
  comparisonSelection,
} from "./domain/discovery";
export type DiscoveryPage =
  | "home"
  | "results"
  | "detail"
  | "compare"
  | "equipment"
  | "recommendations";
export type Tool = "training" | "home" | "diet" | null;
type State = {
  profile: SearchProfile;
  update: (change: Partial<SearchProfile>) => void;
  page: DiscoveryPage;
  setPage: (p: DiscoveryPage) => void;
  gymId: string;
  openGym: (id: string) => void;
  compare: string[];
  toggleCompare: (id: string) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
  guideId: string | null;
  openGuide: (equipmentId: string) => void;
  closeGuide: () => void;
  storageError: boolean;
  retry: () => void;
};
const Context = createContext<State | null>(null);
export const useDiscovery = () => useContext(Context);
export function DiscoveryProvider({ children }: PropsWithChildren) {
  const { t } = useI18n();
  const [profile, setProfile] = useState(defaultSearch),
    [ready, setReady] = useState(false),
    [dirty, setDirty] = useState(false),
    [storageError, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [reload, setReload] = useState(0);
  const writable = useRef(true),
    queue = useRef(Promise.resolve());
  const [page, setPage] = useState<DiscoveryPage>("home"),
    [gymId, setGymId] = useState("gold"),
    [compare, setCompare] = useState<string[]>([]),
    [tool, setTool] = useState<Tool>(null),
    [guideId, setGuideId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SEARCH_STORAGE_KEY)
      .then((raw) => {
        if (active) {
          setProfile(decodeSearch(raw));
          writable.current = true;
          setError(false);
        }
      })
      .catch(() => {
        if (active) {
          writable.current = false;
          setError(true);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    if (!ready || !dirty || !writable.current) return;
    let active = true;
    const raw = JSON.stringify({ version: 1, profile });
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(SEARCH_STORAGE_KEY, raw));
    queue.current.then(
      () => {
        if (active) setError(false);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [profile, ready, dirty, retry]);
  if (!ready)
    return (
      <View style={{ padding: 24 }}>
        <Text style={{ color: "#183153" }}>{t("読み込み中…")}</Text>
      </View>
    );
  return (
    <Context.Provider
      value={{
        profile,
        update: (change) => {
          setProfile((old) => ({ ...old, ...change }));
          setDirty(true);
        },
        page,
        setPage,
        gymId,
        openGym: (id) => {
          setGymId(id);
          setTool(null);
          setPage("detail");
        },
        compare,
        toggleCompare: (id) =>
          setCompare((old) => comparisonSelection(old, id)),
        tool,
        setTool: (value) => {
          setGuideId(null);
          setTool(value);
        },
        guideId,
        openGuide: (equipmentId) => {
          setGuideId(
            EQUIPMENTS.find((e) => e.id === equipmentId)?.id ??
              EQUIPMENTS[0].id,
          );
        },
        closeGuide: () => setGuideId(null),
        storageError,
        retry: () =>
          writable.current ? setRetry((n) => n + 1) : setReload((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
