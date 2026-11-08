import { languageFromSearch } from "./languageMode";

export function getLaunchLanguage() {
  return typeof window === "undefined" ? undefined : languageFromSearch(window.location.search);
}
