export type LocalizedName = { ja: string; en: string };
export type GymBrand = {
  id: string;
  name: LocalizedName;
  aliases: readonly string[];
  website: string | null;
  womenFocused?: boolean;
  preferredPrefecture?: string;
};

// Brand directories, not branch records or guarantees of branch equipment.
// Everfit24 official directory supplied by the user (Chiba, 2026-11-04).
export const gymBrands: readonly GymBrand[] = [
  {
    id: "gold",
    name: { ja: "ゴールドジム", en: "Gold's Gym" },
    aliases: ["Gold's Gym", "Golds Gym", "ゴールドジム"],
    website: "https://www.goldsgym.jp/",
  },
  {
    id: "anytime",
    name: { ja: "エニタイムフィットネス", en: "Anytime Fitness" },
    aliases: ["Anytime Fitness", "エニタイム"],
    website: "https://www.anytimefitness.co.jp/",
  },
  {
    id: "chocozap",
    name: { ja: "チョコザップ", en: "chocoZAP" },
    aliases: ["chocoZAP", "チョコザップ", "ちょこざっぷ"],
    website: "https://chocozap.jp/",
  },
  {
    id: "renaissance",
    name: { ja: "ルネサンス", en: "Renaissance" },
    aliases: ["Renaissance", "ルネサンス"],
    website: "https://www.s-re.jp/",
  },
  {
    id: "everfit",
    name: { ja: "エバーフィット24", en: "Everfit24" },
    aliases: [
      "everfit",
      "ever fit",
      "everfit24",
      "エバーフィット",
      "エヴァーフィット",
      "エヴァーフィット",
    ],
    website: "https://www.everfit24.co.jp/",
    preferredPrefecture: "JP-12",
  },
  {
    id: "tipness",
    name: { ja: "ティップネス", en: "TIPNESS" },
    aliases: ["TIPNESS", "ティップネス"],
    website: "https://tip.tipness.co.jp/",
  },
  {
    id: "central",
    name: { ja: "セントラルスポーツ", en: "Central Sports" },
    aliases: ["Central Sports", "セントラルスポーツ", "セントラルフィットネス"],
    website: "https://www.central.co.jp/",
  },
  {
    id: "joyfit",
    name: { ja: "ジョイフィット", en: "JOYFIT" },
    aliases: ["JOYFIT", "JOY FIT", "ジョイフィット"],
    website: "https://joyfit.jp/",
  },
  {
    id: "fiteasy",
    name: { ja: "フィットイージー", en: "FIT-EASY" },
    aliases: ["FIT-EASY", "FIT EASY", "フィットイージー"],
    website: "https://fit-easy.com/",
  },
  {
    id: "konami",
    name: { ja: "コナミスポーツ", en: "Konami Sports" },
    aliases: ["Konami Sports", "コナミスポーツ"],
    website: "https://www.konami.com/sportsclub/",
  },
  {
    id: "cospa",
    name: { ja: "コ・ス・パ", en: "COSPA" },
    aliases: ["COSPA", "コ・ス・パ", "コスパ"],
    website: "https://www.cospa-wellness.co.jp/",
  },
  {
    id: "holiday",
    name: { ja: "ホリデイスポーツクラブ", en: "Holiday Sports Club" },
    aliases: ["Holiday Sports", "ホリデイスポーツ"],
    website: "https://www.holiday-sc.jp/",
  },
  {
    id: "curves",
    name: { ja: "カーブス", en: "Curves" },
    aliases: ["Curves", "カーブス"],
    website: "https://www.curves.co.jp/",
    womenFocused: true,
  },
  {
    id: "furdi",
    name: { ja: "ファディー", en: "FURDI" },
    aliases: ["FURDI", "FÜRDI", "ファディー"],
    website: "https://furdi.jp/",
    womenFocused: true,
  },
  {
    id: "bodies",
    name: { ja: "ボディーズ", en: "Bodies" },
    aliases: ["Bodies", "ボディーズ"],
    website: "https://www.bodies.jp/",
    womenFocused: true,
  },
  {
    id: "lava",
    name: { ja: "ラバ", en: "LAVA" },
    aliases: ["LAVA", "ラバ", "ホットヨガスタジオLAVA"],
    website: "https://yoga-lava.com/",
    womenFocused: true,
  },
];

const prefectureNames: [string, string][] = [
  ["北海道", "Hokkaido"],
  ["青森県", "Aomori"],
  ["岩手県", "Iwate"],
  ["宮城県", "Miyagi"],
  ["秋田県", "Akita"],
  ["山形県", "Yamagata"],
  ["福島県", "Fukushima"],
  ["茨城県", "Ibaraki"],
  ["栃木県", "Tochigi"],
  ["群馬県", "Gunma"],
  ["埼玉県", "Saitama"],
  ["千葉県", "Chiba"],
  ["東京都", "Tokyo"],
  ["神奈川県", "Kanagawa"],
  ["新潟県", "Niigata"],
  ["富山県", "Toyama"],
  ["石川県", "Ishikawa"],
  ["福井県", "Fukui"],
  ["山梨県", "Yamanashi"],
  ["長野県", "Nagano"],
  ["岐阜県", "Gifu"],
  ["静岡県", "Shizuoka"],
  ["愛知県", "Aichi"],
  ["三重県", "Mie"],
  ["滋賀県", "Shiga"],
  ["京都府", "Kyoto"],
  ["大阪府", "Osaka"],
  ["兵庫県", "Hyogo"],
  ["奈良県", "Nara"],
  ["和歌山県", "Wakayama"],
  ["鳥取県", "Tottori"],
  ["島根県", "Shimane"],
  ["岡山県", "Okayama"],
  ["広島県", "Hiroshima"],
  ["山口県", "Yamaguchi"],
  ["徳島県", "Tokushima"],
  ["香川県", "Kagawa"],
  ["愛媛県", "Ehime"],
  ["高知県", "Kochi"],
  ["福岡県", "Fukuoka"],
  ["佐賀県", "Saga"],
  ["長崎県", "Nagasaki"],
  ["熊本県", "Kumamoto"],
  ["大分県", "Oita"],
  ["宮崎県", "Miyazaki"],
  ["鹿児島県", "Kagoshima"],
  ["沖縄県", "Okinawa"],
];
export const prefectures = prefectureNames.map(([ja, en], index) => ({
  code: `JP-${String(index + 1).padStart(2, "0")}`,
  name: { ja, en },
}));

export const normalized = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
export function identifyBrand(text: string) {
  const q = normalized(text);
  return gymBrands.find((b) =>
    b.aliases.some((a) => {
      const alias = normalized(a).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z])${alias}($|[^a-z])`, "i").test(q);
    }),
  );
}
export function identifyPrefecture(text: string) {
  const q = normalized(text);
  return prefectures.find(
    (p) =>
      q.includes(
        p.name.ja.replace(/[府県]$/, "").replace(/^東京都$/, "東京"),
      ) || new RegExp(`(^|[^a-z])${p.name.en.toLowerCase()}($|[^a-z])`).test(q),
  );
}
export function initialDirectorySelection(text: string) {
  const brand = identifyBrand(text),
    prefecture = identifyPrefecture(text);
  let keyword = normalized(text);
  const removable = [
    ...(brand ? [...brand.aliases, brand.name.ja, brand.name.en] : []),
    ...(prefecture
      ? [
          prefecture.name.ja,
          prefecture.name.en,
          prefecture.name.ja.replace(/[府県]$/, "").replace(/^東京都$/, "東京"),
        ]
      : []),
  ].sort((a, b) => b.length - a.length);
  for (const value of removable) {
    const escaped = normalized(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    keyword = keyword.replace(
      new RegExp(`(^|[^a-z])${escaped}(?=$|[^a-z])`, "gi"),
      "$1 ",
    );
  }
  return {
    brandId: brand?.id ?? null,
    prefectureCode: prefecture?.code ?? brand?.preferredPrefecture ?? "JP-13",
    keyword: normalized(keyword),
  };
}
