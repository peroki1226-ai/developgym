import { isLanguage, Language } from "./messages";

export function languageFromSearch(search: string): Language | undefined {
  const values = new URLSearchParams(search).getAll("lang");
  return values.length === 1 && isLanguage(values[0]) ? values[0] : undefined;
}

export function languageUrl(href: string, language: Language): string {
  const url = new URL(href);
  url.searchParams.set("lang", language);
  return url.href;
}
