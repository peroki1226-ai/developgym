export const bodyParts = [
  { id: "chest", label: "胸" },
  { id: "back", label: "背中" },
  { id: "legs", label: "脚" },
  { id: "shoulder", label: "肩" },
  { id: "arm", label: "腕" },
  { id: "abs", label: "腹筋" },
] as const;
export type BodyPart = (typeof bodyParts)[number]["id"];
export const homeGear = [
  { id: "dumbbell", label: "ダンベル" },
  { id: "bench", label: "ベンチ" },
  { id: "pullup-bar", label: "懸垂バー" },
  { id: "band", label: "バンド" },
] as const;
export type HomeGear = (typeof homeGear)[number]["id"];
export type HomeProfile = {
  gear: HomeGear[];
  maxDumbbellKg: number;
  bodyweightOnly: boolean;
};
export const defaultHomeProfile: HomeProfile = {
  gear: [],
  maxDumbbellKg: 10,
  bodyweightOnly: false,
};
export type HomeExercise = {
  id: string;
  name: string;
  part: BodyPart;
  requires: HomeGear[];
  load: "bodyweight" | "dumbbell" | "band";
  cue: string;
};
export const homeExercises: HomeExercise[] = [
  {
    id: "pushup",
    name: "プッシュアップ",
    part: "chest",
    requires: [],
    load: "bodyweight",
    cue: "膝つきでもOK。体幹をまっすぐ保ち、胸をゆっくり下ろします。",
  },
  {
    id: "floor-press",
    name: "ダンベルフロアプレス",
    part: "chest",
    requires: ["dumbbell"],
    load: "dumbbell",
    cue: "床に仰向けになり、肘が床に軽く触れる範囲で動かします。",
  },
  {
    id: "bench-press",
    name: "ダンベルベンチプレス",
    part: "chest",
    requires: ["dumbbell", "bench"],
    load: "dumbbell",
    cue: "安定したベンチを使い、肩甲骨を軽く寄せて押し上げます。",
  },
  {
    id: "prone-raise",
    name: "うつ伏せWレイズ",
    part: "back",
    requires: [],
    load: "bodyweight",
    cue: "うつ伏せで肘をW字にし、腰を反らさず肩甲骨を寄せます。広背筋の懸垂動作を完全に置き換えるものではありません。",
  },
  {
    id: "db-row",
    name: "ダンベルロー",
    part: "back",
    requires: ["dumbbell"],
    load: "dumbbell",
    cue: "股関節から上体を倒し、背中を丸めず肘を後ろへ引きます。",
  },
  {
    id: "band-row",
    name: "バンドシーテッドロー",
    part: "back",
    requires: ["band"],
    load: "band",
    cue: "バンドを足裏に確実に掛け、外れや亀裂がないことを確認して引きます。",
  },
  {
    id: "pullup",
    name: "懸垂",
    part: "back",
    requires: ["pullup-bar"],
    load: "bodyweight",
    cue: "耐荷重と固定を確認したバーで反動を使わず引きます。難しい場合は他の背中種目を選びます。",
  },
  {
    id: "squat",
    name: "自重スクワット",
    part: "legs",
    requires: [],
    load: "bodyweight",
    cue: "膝とつま先の向きをそろえ、痛みのない深さで動かします。",
  },
  {
    id: "db-squat",
    name: "ダンベルスクワット",
    part: "legs",
    requires: ["dumbbell"],
    load: "dumbbell",
    cue: "ダンベルを体側で保持し、背中を丸めず足裏全体で立ち上がります。",
  },
  {
    id: "split-squat",
    name: "ベンチ・スプリットスクワット",
    part: "legs",
    requires: ["bench"],
    load: "bodyweight",
    cue: "動かないベンチに後ろ足を置き、支えを使ってバランスを保ちます。",
  },
  {
    id: "pike-pushup",
    name: "パイクプッシュアップ",
    part: "shoulder",
    requires: [],
    load: "bodyweight",
    cue: "腰を高く保ち、頭を床へ打ちつけない範囲で肘を曲げます。",
  },
  {
    id: "db-press",
    name: "ダンベルショルダープレス",
    part: "shoulder",
    requires: ["dumbbell"],
    load: "dumbbell",
    cue: "腰を反らさず、肩に痛みのない範囲で押し上げます。",
  },
  {
    id: "band-raise",
    name: "バンドサイドレイズ",
    part: "shoulder",
    requires: ["band"],
    load: "band",
    cue: "バンドを足で固定し、反動を使わず腕を横に上げます。",
  },
  {
    id: "close-pushup",
    name: "ナロープッシュアップ",
    part: "arm",
    requires: [],
    load: "bodyweight",
    cue: "手幅を狭め、肘を体側に沿わせます。膝つきでも行えます。",
  },
  {
    id: "db-curl",
    name: "ダンベルカール",
    part: "arm",
    requires: ["dumbbell"],
    load: "dumbbell",
    cue: "肘の位置を固定し、上体を振らずに曲げ伸ばしします。",
  },
  {
    id: "band-curl",
    name: "バンドカール",
    part: "arm",
    requires: ["band"],
    load: "band",
    cue: "バンドを足で固定し、手首を反らさず肘を曲げます。",
  },
  {
    id: "deadbug",
    name: "デッドバグ",
    part: "abs",
    requires: [],
    load: "bodyweight",
    cue: "仰向けで腰を床につけ、対角の手足をゆっくり伸ばします。",
  },
  {
    id: "reverse-crunch",
    name: "リバースクランチ",
    part: "abs",
    requires: [],
    load: "bodyweight",
    cue: "反動を使わず骨盤をわずかに持ち上げます。",
  },
];
export function canPerform(exercise: HomeExercise, profile: HomeProfile) {
  return exercise.requires.every(
    (g) =>
      !profile.bodyweightOnly &&
      profile.gear.includes(g) &&
      (g !== "dumbbell" ||
        (Number.isFinite(profile.maxDumbbellKg) &&
          profile.maxDumbbellKg > 0 &&
          profile.maxDumbbellKg <= 100)),
  );
}
export function recommendHome(profile: HomeProfile, part: BodyPart) {
  return homeExercises
    .filter((e) => e.part === part && canPerform(e, profile))
    .sort((a, b) => b.requires.length - a.requires.length);
}
export const gymAlternatives = [
  {
    id: "chest-press",
    name: "チェストプレス",
    candidates: ["bench-press", "floor-press", "pushup"],
  },
  {
    id: "lat-pulldown",
    name: "ラットプルダウン",
    candidates: ["pullup", "band-row", "db-row", "prone-raise"],
  },
  {
    id: "leg-press",
    name: "レッグプレス",
    candidates: ["db-squat", "split-squat", "squat"],
  },
  {
    id: "seated-row",
    name: "シーテッドロー",
    candidates: ["db-row", "band-row", "prone-raise"],
  },
  {
    id: "shoulder-press",
    name: "ショルダープレス",
    candidates: ["db-press", "band-raise", "pike-pushup"],
  },
  {
    id: "cable-curl",
    name: "ケーブルカール",
    candidates: ["db-curl", "band-curl"],
  },
  {
    id: "abdominal-crunch",
    name: "アブドミナルクランチ",
    candidates: ["reverse-crunch", "deadbug"],
  },
] as const;
export function alternativesFor(gymExerciseId: string, profile: HomeProfile) {
  const source = gymAlternatives.find((g) => g.id === gymExerciseId);
  return (source?.candidates ?? [])
    .map((id) => homeExercises.find((e) => e.id === id)!)
    .filter((e) => canPerform(e, profile));
}
export function parseDumbbellMax(text: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(text.trim())) return null;
  const value = Number(text);
  return value > 0 && value <= 100 ? value : null;
}
export function validateHomeLog(
  exercise: HomeExercise,
  profile: HomeProfile,
  weight: string,
  reps: string,
  sets: string,
): string | null {
  if (!canPerform(exercise, profile))
    return "この種目に必要な器具がありません。";
  if (
    !/^\d+$/.test(reps.trim()) ||
    !/^\d+$/.test(sets.trim()) ||
    Number(reps) < 1 ||
    Number(reps) > 100 ||
    Number(sets) < 1 ||
    Number(sets) > 100
  )
    return "回数・セットは1〜100の整数で入力してください。";
  if (
    exercise.load === "dumbbell" &&
    (parseDumbbellMax(weight) === null ||
      Number(weight) > profile.maxDumbbellKg)
  )
    return `片手重量は0より大きく、所有上限${profile.maxDumbbellKg}kg以下で入力してください。`;
  return null;
}
