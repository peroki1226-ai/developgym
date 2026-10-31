import english from "./en.json";
import japanese from "./ja.json";
export type Language = "ja" | "en";
export const isLanguage = (value: unknown): value is Language =>
  value === "ja" || value === "en";
export type Values = Record<string, string | number>;
const messages: Record<string, string> = english;
const japaneseMessages: Record<string, string> = japanese;
export function translate(
  language: Language,
  message: string,
  values: Values = {},
): string {
  let template =
    language === "en"
      ? (messages[message] ?? message)
      : (japaneseMessages[message] ?? message);
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
  if (language === "ja") {
    template = template
      .replace(/kcal/g, "キロカロリー")
      .replace(/kg/g, "キログラム")
      .replace(/MB/g, "メガバイト")
      .replace(/lbs/g, "ポンド")
      .replace(/(^|[^A-Za-z])g(?![A-Za-z])/g, "$1グラム");
  }
  return template.replace(/\{(\d+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : match,
  );
}
