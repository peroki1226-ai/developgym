import { useEffect } from "react";
import { Language, translate } from "./messages";
import { languageUrl } from "./languageMode";

export function LocaleDocument({ language }: { language: Language }) {
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translate(language, "GymFinder");
    const next = languageUrl(window.location.href, language);
    if (next !== window.location.href) {
      try { window.history.replaceState(window.history.state, "", next); }
      catch { /* Storage and in-app switching remain available if browser history is restricted. */ }
    }
  }, [language]);
  return null;
}
