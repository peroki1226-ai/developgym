import React, { createContext, PropsWithChildren, useContext } from "react";
import english from "./en.json";
export type Language = "ja" | "en";
export const isLanguage = (value: unknown): value is Language =>
  value === "ja" || value === "en";
export type Values = Record<string, string | number>;
const messages: Record<string, string> = english;
export function translate(
  language: Language,
  message: string,
  values: Values = {},
): string {
  let template = language === "en" ? (messages[message] ?? message) : message;
  // The domain validators/catalogue retain Japanese source messages and numeric values.
  if (language === "en" && !messages[message]) {
    const weight = message.match(
      /^片手重量は0より大きく、所有上限([0-9.]+)kg以下で入力してください。$/,
    );
    const spec = message.match(
      /^投稿による最大重量: ([0-9.]+)kg（端末内・未検証）$/,
    );
    if (weight)
      template = `Enter a per-hand weight above 0 and no more than ${weight[1]} kg.`;
    if (spec) template = `Locally reported maximum: ${spec[1]} kg (unverified)`;
  }
  return template.replace(/\{(\d+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : match,
  );
}
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
