import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  decodeSavedVenues,
  DIRECTORY_STORAGE_KEY,
  DirectoryVenue,
} from "./domain/gymDirectory";

type DirectoryState = {
  saved: DirectoryVenue[];
  ready: boolean;
  error: boolean;
  toggle: (venue: DirectoryVenue) => void;
  retry: () => void;
};
const Context = createContext<DirectoryState | null>(null);
export const useDirectory = () => useContext(Context);
export function DirectoryProvider({ children }: PropsWithChildren) {
  const [saved, setSaved] = useState<DirectoryVenue[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [dirty, setDirty] = useState(false),
    [reload, setReload] = useState(0),
    [attempt, setAttempt] = useState(0);
  const writable = useRef(false),
    queue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DIRECTORY_STORAGE_KEY)
      .then((raw) => {
        const decoded = decodeSavedVenues(raw);
        if (active) {
          setSaved(decoded);
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
    const raw = JSON.stringify({ version: 1, saved });
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(DIRECTORY_STORAGE_KEY, raw));
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
  }, [saved, ready, dirty, attempt]);
  return (
    <Context.Provider
      value={{
        saved,
        ready,
        error,
        toggle: (venue) => {
          if (!ready || !writable.current) return;
          setSaved((old) =>
            old.some((v) => v.id === venue.id)
              ? old.filter((v) => v.id !== venue.id)
              : old.length < 500
                ? [...old, venue]
                : old,
          );
          setDirty(true);
        },
        retry: () =>
          writable.current ? setAttempt((n) => n + 1) : setReload((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
