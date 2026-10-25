import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useState,
} from "react";
export type Workout = {
  id: string;
  name: string;
  weight: number;
  reps: number;
  sets: number;
  date: string;
};
type State = {
  logs: Workout[];
  addLog: (log: Omit<Workout, "id" | "date">) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
};
const Context = createContext<State | null>(null);
export function FitnessProvider({ children }: PropsWithChildren) {
  const [logs, setLogs] = useState<Workout[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  return (
    <Context.Provider
      value={{
        logs,
        favorites,
        addLog: (log) =>
          setLogs((old) => [
            {
              ...log,
              id: `${Date.now()}-${Math.random()}`,
              date: new Date().toLocaleDateString("ja-JP"),
            },
            ...old,
          ]),
        toggleFavorite: (id) =>
          setFavorites((old) =>
            old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFitness() {
  const state = useContext(Context);
  if (!state) throw new Error("FitnessProvider is required");
  return state;
}
