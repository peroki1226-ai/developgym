import { equipment, gyms, Gym } from "./matching";
type Meta = { id: string; gymId: string; createdAt: string };
export type SpecPost = Meta & {
  previousMaxDumbbellKg: number;
  maxDumbbellKg: number | null;
  equipmentIds: string[];
  note: string;
};
export type ReviewPost = Meta & { rating: number; comment: string };
export type PhotoPost = Meta & {
  fileName: string;
  caption: string;
  equipmentId: string | null;
};
export type CommunityData = {
  specs: SpecPost[];
  reviews: ReviewPost[];
  photos: PhotoPost[];
};
export const initialCommunity = (): CommunityData => ({
  specs: [],
  reviews: [],
  photos: [],
});
export const validPhotoName = (name: unknown): name is string =>
  typeof name === "string" &&
  /^[a-z0-9-]+\.(jpg|jpeg|png|heic|heif|webp)$/i.test(name);
export function applySpecs(
  base: readonly Gym[],
  posts: readonly SpecPost[],
): Gym[] {
  return base.map((g) => {
    let result = { ...g, installed: [...g.installed] };
    for (const post of posts.filter((p) => p.gymId === g.id)) {
      const max = post.maxDumbbellKg ?? result.maxDumbbellKg;
      const installed = [
        ...new Set([...result.installed, ...post.equipmentIds]),
      ].filter((id) => id !== "dumbbell-heavy");
      if (max > 0) installed.push("dumbbell-heavy");
      result = {
        ...result,
        maxDumbbellKg: max,
        installed,
        dumbbellRange:
          post.maxDumbbellKg === null
            ? result.dumbbellRange
            : `投稿による最大重量: ${max}kg（端末内・未検証）`,
      };
    }
    return result;
  });
}
export function validateSpec(
  gym: Gym,
  max: number | null,
  ids: string[],
  note: string,
): string | null {
  if (max !== null && (!Number.isFinite(max) || max < 0 || max > 200))
    return "最大重量は0〜200kgで入力してください。";
  if (new Set(ids).size !== ids.length)
    return "同じ器具を重複して選択できません。";
  if (ids.some((id) => !equipment.some((e) => e.id === id)))
    return "器具を一覧から選んでください。";
  if (ids.includes("dumbbell-heavy") && (max ?? gym.maxDumbbellKg) <= 0)
    return "ダンベルの追加には0より大きい最大重量が必要です。";
  if (note.length > 300) return "確認メモは300文字以内で入力してください。";
  if (
    (max === null || max === gym.maxDumbbellKg) &&
    !ids.some((id) => !gym.installed.includes(id))
  )
    return "最大重量を変更するか、不足器具を選んでください。";
  return null;
}
export function validateReview(rating: number, comment: string): string | null {
  return !Number.isInteger(rating) || rating < 1 || rating > 5
    ? "星評価を1〜5から選んでください。"
    : !comment.trim() || comment.trim().length > 1000
      ? "コメントは1〜1000文字で入力してください。"
      : null;
}
export function reviewSummary(reviews: ReviewPost[]) {
  return {
    count: reviews.length,
    average: reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null,
  };
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const finite = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function isCommunityData(value: unknown): value is CommunityData {
  if (
    !record(value) ||
    !Array.isArray(value.specs) ||
    !Array.isArray(value.reviews) ||
    !Array.isArray(value.photos)
  )
    return false;
  const ids = new Set<string>();
  const meta = (v: unknown): v is Record<string, unknown> => {
    if (
      !record(v) ||
      typeof v.id !== "string" ||
      !v.id ||
      ids.has(v.id) ||
      !gyms.some((g) => g.id === v.gymId) ||
      typeof v.createdAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(v.createdAt) ||
      !Number.isFinite(Date.parse(v.createdAt))
    )
      return false;
    ids.add(v.id);
    return true;
  };
  return (
    value.specs.every(
      (p) =>
        meta(p) &&
        finite(p.previousMaxDumbbellKg, 0, 200) &&
        (p.maxDumbbellKg === null || finite(p.maxDumbbellKg, 0, 200)) &&
        Array.isArray(p.equipmentIds) &&
        p.equipmentIds.every((id) => equipment.some((e) => e.id === id)) &&
        new Set(p.equipmentIds).size === p.equipmentIds.length &&
        typeof p.note === "string" &&
        p.note.length <= 300,
    ) &&
    value.reviews.every(
      (p) =>
        meta(p) &&
        typeof p.rating === "number" &&
        typeof p.comment === "string" &&
        validateReview(p.rating, p.comment) === null,
    ) &&
    value.photos.every(
      (p) =>
        meta(p) &&
        validPhotoName(p.fileName) &&
        typeof p.caption === "string" &&
        p.caption.trim().length > 0 &&
        p.caption.length <= 120 &&
        (p.equipmentId === null ||
          equipment.some((e) => e.id === p.equipmentId)),
    )
  );
}
