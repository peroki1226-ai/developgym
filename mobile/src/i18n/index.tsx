import React, { createContext, PropsWithChildren, useContext } from "react";
import { Language, Values, translate } from "./messages";
export { isLanguage, translate } from "./messages";
export type { Language, Values } from "./messages";
export function formatDate(value: string, language: Language) {
  const old = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  const date = old
    ? new Date(Number(old[1]), Number(old[2]) - 1, Number(old[3]))
    : new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US")
    : value;
}
type Locale = { language: Language; setLanguage: (language: Language) => void };
const Context = createContext<Locale>({
  language: "ja",
  setLanguage: () => {},
});
export function LocaleProvider({
  language,
  setLanguage,
  children,
}: PropsWithChildren<Locale>) {
  return (
    <Context.Provider value={{ language, setLanguage }}>
      {children}
    </Context.Provider>
  );
}
export function useI18n() {
  const value = useContext(Context);
  return {
    ...value,
    t: (message: string, values?: Values) =>
      translate(value.language, message, values),
    formatDate: (date: string) => formatDate(date, value.language),
  };
}
