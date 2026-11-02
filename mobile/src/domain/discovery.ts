import { menus, parts, gyms, Gym } from "./matching";
export type SearchProfile = {
  menuIds: string[];
  partIds: string[];
  requiredKg: number;
  query: string;
  region: string;
};
export const SEARCH_STORAGE_KEY = "@gymfinder/search/v1";
export const defaultSearch = (): SearchProfile => ({
  menuIds: ["m-incline-db", "m-incline-smith", "m-hack-squat", "m-squat"],
  partIds: [],
  requiredKg: 0,
  query: "",
  region: "all",
});
export function decodeSearch(raw: string | null): SearchProfile {
  if (!raw) return defaultSearch();
  const d = JSON.parse(raw),
    p = d?.profile;
  if (
    d?.version !== 1 ||
    !p ||
    !Array.isArray(p.menuIds) ||
    !p.menuIds.every((id: unknown) => menus.some((m) => m.id === id)) ||
    !Array.isArray(p.partIds) ||
    !p.partIds.every((id: unknown) => parts.some((m) => m.id === id)) ||
    typeof p.requiredKg !== "number" ||
    !Number.isFinite(p.requiredKg) ||
    p.requiredKg < 0 ||
    p.requiredKg > 200 ||
    typeof p.query !== "string" ||
    p.query.length > 200 ||
    !["all", "tokyo", "global"].includes(p.region)
  )
    throw new Error("Invalid search profile");
  return {
    menuIds: [...new Set<string>(p.menuIds)],
    partIds: [...new Set<string>(p.partIds)],
    requiredKg: p.requiredKg,
    query: p.query,
    region: p.region,
  };
}
// Approximate sample locations, not verified business coordinates.
export const locations: Record<
  string,
  { latitude: number; longitude: number }
> = {
  gold: { latitude: 35.6614, longitude: 139.7015 },
  anytime: { latitude: 35.665, longitude: 139.699 },
  compact: { latitude: 35.6589, longitude: 139.7028 },
  "global-la": { latitude: 33.9951, longitude: -118.4778 },
  "global-ldn": { latitude: 51.5131, longitude: -0.1335 },
};
export function routeUrl(gym: Gym) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(gym.name + " " + gym.area)}&travelmode=walking`;
}
export function pixelPoint(latitude: number, longitude: number, zoom: number) {
  const scale = 256 * 2 ** zoom,
    lat =
      (Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * scale,
  };
}
export function comparisonSelection(current: string[], id: string) {
  if (!gyms.some((g) => g.id === id)) return current;
  return current.includes(id)
    ? current.filter((x) => x !== id)
    : current.length < 2
      ? [...current, id]
      : current;
}
