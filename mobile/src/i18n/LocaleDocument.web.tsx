import { useEffect } from "react";
import { Language, translate } from "./messages";

export function LocaleDocument({ language }: { language: Language }) {
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translate(language, "GymFinder");
  }, [language]);
  return null;
}
