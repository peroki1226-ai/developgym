import { Language } from "./messages";

// Native screens use their own accessibility props; there is no browser document.
export function LocaleDocument(_props: { language: Language }) {
  return null;
}
