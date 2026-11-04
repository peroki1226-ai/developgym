import {
  gymBrands,
  identifyBrand,
  normalized,
  prefectures,
} from "../data/gymDirectory";
import { Language } from "../i18n/messages";

export type DirectoryCategory = "all" | "women" | "public" | "local";
export type DirectoryQuery = {
  prefectureCode: string;
  brandId: string | null;
  category: DirectoryCategory;
  keyword: string;
};
export type DirectoryVenue = {
  id: string;
  names: { original: string; ja: string | null; en: string | null };
  latitude: number;
  longitude: number;
  prefectureCode: string;
  brandId: string | null;
  women: "tagged" | "brand" | "unknown";
  publicFacility: boolean;
  website: string | null;
  sourceUrl: string;
  fetchedAt: string;
};
export const DIRECTORY_STORAGE_KEY = "@gymfinder/directory/v1";
export const MAX_DIRECTORY_RESULTS = 80;
export const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
export class DirectoryError extends Error {
  constructor(public code: "network" | "rate" | "invalid" | "incomplete") {
    super(code);
  }
}
const record = (v: unknown): v is Record<string, any> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const shortText = (v: unknown, max = 250): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
export function safeWebsite(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1500) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
const quotedRegex = (text: string) =>
  JSON.stringify(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
export function validateDirectoryQuery(q: DirectoryQuery) {
  if (
    !prefectures.some((p) => p.code === q.prefectureCode) ||
    (q.brandId !== null && !gymBrands.some((b) => b.id === q.brandId)) ||
    !["all", "women", "public", "local"].includes(q.category) ||
    typeof q.keyword !== "string" ||
    q.keyword.length > 100
  ) {
    throw new DirectoryError("invalid");
  }
}
export function buildDirectoryQuery(q: DirectoryQuery): string {
  validateDirectoryQuery(q);
  // Fixed ISO area and escaped literal text: no raw Overpass code from user input.
  const brand = gymBrands.find((b) => b.id === q.brandId);
  const aliasPattern = (brands: typeof gymBrands) =>
    brands
      .flatMap((b) => b.aliases)
      .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
  const filter = brand
    ? `[~"^(name|name:ja|name:en|brand|operator)$"~${JSON.stringify(aliasPattern([brand]))},i]`
    : "";
  const keyword = q.keyword.trim()
    ? `[~"^(name|name:ja|name:en|brand|operator)$"~${quotedRegex(q.keyword.normalize("NFKC").trim())},i]`
    : "";
  let audience = [""];
  if (q.category === "women")
    audience = [
      '["female"="only"]',
      '["women"="only"]',
      '["access:gender"="female"]',
      `[~"^(name|name:ja|name:en|brand|operator)$"~${JSON.stringify(aliasPattern(gymBrands.filter((b) => b.womenFocused)))},i]`,
    ];
  if (q.category === "public")
    audience = [
      '["operator:type"~"^(public|government)$"]',
      '["ownership"="public"]',
    ];
  if (q.category === "local")
    audience = [
      ["name", "brand", "operator"]
        .map(
          (key) => `["${key}"!~${JSON.stringify(aliasPattern(gymBrands))},i]`,
        )
        .join(""),
    ];
  const selectors = ["fitness_centre", "sports_centre"]
    .flatMap((leisure) =>
      audience.map(
        (extra) =>
          `nwr(area.region)["leisure"="${leisure}"]${filter}${keyword}${extra};`,
      ),
    )
    .join("");
  return `[out:json][timeout:20];area["ISO3166-2"="${q.prefectureCode}"]["admin_level"="4"]->.region;(${selectors});out body center ${MAX_DIRECTORY_RESULTS};`;
}
export function parseDirectoryResponse(
  data: unknown,
  q: DirectoryQuery,
  fetchedAt = new Date().toISOString(),
): DirectoryVenue[] {
  validateDirectoryQuery(q);
  if (!record(data) || !Array.isArray(data.elements))
    throw new DirectoryError("invalid");
  if (data.remark) throw new DirectoryError("incomplete");
  const venues: DirectoryVenue[] = [],
    seen = new Set<string>();
  for (const item of data.elements.slice(0, 5000)) {
    if (
      !record(item) ||
      !["node", "way", "relation"].includes(item.type) ||
      !Number.isSafeInteger(item.id) ||
      item.id < 1 ||
      !record(item.tags)
    )
      continue;
    const tags = item.tags;
    if (!["fitness_centre", "sports_centre"].includes(tags.leisure)) continue;
    const name = tags.name || tags["name:ja"] || tags["name:en"];
    if (!shortText(name)) continue;
    if (
      q.keyword.trim() &&
      !normalized(
        [name, tags["name:ja"], tags["name:en"], tags.brand, tags.operator]
          .filter((v) => typeof v === "string")
          .join(" "),
      ).includes(normalized(q.keyword))
    )
      continue;
    const lat = item.lat ?? item.center?.lat,
      lon = item.lon ?? item.center?.lon;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    )
      continue;
    const id = `osm:${item.type}:${item.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const brand = identifyBrand(
      [name, tags.brand, tags.operator]
        .filter((v) => typeof v === "string")
        .join(" "),
    );
    const women =
      tags.female === "only" ||
      tags["access:gender"] === "female" ||
      tags.women === "only"
        ? "tagged"
        : brand?.womenFocused
          ? "brand"
          : "unknown";
    const publicFacility =
      ["public", "government"].includes(tags["operator:type"]) ||
      tags.ownership === "public";
    if (q.brandId && brand?.id !== q.brandId) continue;
    if (q.category === "women" && women === "unknown") continue;
    if (q.category === "public" && !publicFacility) continue;
    if (q.category === "local" && brand) continue;
    venues.push({
      id,
      names: {
        original: name,
        ja: shortText(tags["name:ja"]) ? tags["name:ja"] : null,
        en: shortText(tags["name:en"]) ? tags["name:en"] : null,
      },
      latitude: lat,
      longitude: lon,
      prefectureCode: q.prefectureCode,
      brandId: brand?.id ?? null,
      women,
      publicFacility,
      website: safeWebsite(tags.website || tags["contact:website"]),
      sourceUrl: `https://www.openstreetmap.org/${item.type}/${item.id}`,
      fetchedAt,
    });
    if (venues.length === MAX_DIRECTORY_RESULTS) break;
  }
  return venues;
}
export async function searchDirectory(
  q: DirectoryQuery,
  signal?: AbortSignal,
): Promise<DirectoryVenue[]> {
  const body = buildDirectoryQuery(q),
    controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 25000);
  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: `data=${encodeURIComponent(body)}`,
      signal: controller.signal,
    });
    if (!response.ok)
      throw new DirectoryError(response.status === 429 ? "rate" : "network");
    return parseDirectoryResponse(await response.json(), q);
  } catch (error) {
    if (error instanceof DirectoryError) throw error;
    throw new DirectoryError("network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function venueDisplayName(
  v: DirectoryVenue,
  language: Language,
): string {
  const acceptable = (name: string | null) =>
    name &&
    !(language === "ja" ? /[A-Za-z]/ : /[\u3040-\u30ff\u3400-\u9fff]/).test(
      name.normalize("NFKC"),
    );
  if (acceptable(v.names[language])) return v.names[language]!;
  if (acceptable(v.names.original)) return v.names.original;
  const brand = gymBrands.find((b) => b.id === v.brandId),
    prefecture = prefectures.find((p) => p.code === v.prefectureCode)!;
  return `${brand?.name[language] ?? (language === "ja" ? "地域の施設" : "Local facility")} · ${prefecture.name[language]} ${v.id.split(":").at(-1)}`;
}
export const venueRouteUrl = (v: DirectoryVenue) =>
  `https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`;
export function decodeSavedVenues(raw: string | null): DirectoryVenue[] {
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (
    !record(data) ||
    data.version !== 1 ||
    !Array.isArray(data.saved) ||
    data.saved.length > 500
  )
    throw new Error("Invalid directory storage");
  for (const v of data.saved) {
    if (
      !record(v) ||
      !/^osm:(node|way|relation):[1-9]\d*$/.test(v.id) ||
      !record(v.names) ||
      !shortText(v.names.original) ||
      (v.names.ja !== null && !shortText(v.names.ja)) ||
      (v.names.en !== null && !shortText(v.names.en))
    )
      throw new Error("Invalid directory venue");
    if (
      !prefectures.some((p) => p.code === v.prefectureCode) ||
      (v.brandId !== null && !gymBrands.some((b) => b.id === v.brandId)) ||
      !Number.isFinite(v.latitude) ||
      Math.abs(v.latitude) > 90 ||
      !Number.isFinite(v.longitude) ||
      Math.abs(v.longitude) > 180 ||
      !["tagged", "brand", "unknown"].includes(v.women) ||
      typeof v.publicFacility !== "boolean" ||
      (v.website !== null && safeWebsite(v.website) !== v.website) ||
      typeof v.fetchedAt !== "string" ||
      !Number.isFinite(Date.parse(v.fetchedAt))
    )
      throw new Error("Invalid directory venue");
    const [, type, id] = v.id.split(":");
    if (v.sourceUrl !== `https://www.openstreetmap.org/${type}/${id}`)
      throw new Error("Invalid directory source");
  }
  return [
    ...new Map(data.saved.map((v: DirectoryVenue) => [v.id, v])).values(),
  ] as DirectoryVenue[];
}
