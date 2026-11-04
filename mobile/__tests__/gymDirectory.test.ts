import {
  gymBrands,
  identifyBrand,
  identifyPrefecture,
  initialDirectorySelection,
  prefectures,
} from "../src/data/gymDirectory";
import {
  buildDirectoryQuery,
  decodeSavedVenues,
  DirectoryError,
  DirectoryQuery,
  parseDirectoryResponse,
  safeWebsite,
  searchDirectory,
  venueDisplayName,
  venueRouteUrl,
} from "../src/domain/gymDirectory";

const q: DirectoryQuery = {
  prefectureCode: "JP-01",
  brandId: null,
  category: "all",
  keyword: "",
};
const fixture = (id = 123, tags = {}) => ({
  type: "node",
  id,
  lat: 43.06,
  lon: 141.35,
  tags: { name: "地域の検証ジム", leisure: "fitness_centre", ...tags },
});
const parsed = () => parseDirectoryResponse({ elements: [fixture()] }, q);

test("all 47 prefectures and requested brands, including user-supplied Everfit24, are discoverable", () => {
  expect(prefectures).toHaveLength(47);
  expect(new Set(prefectures.map((p) => p.code)).size).toBe(47);
  for (const [text, id] of [
    ["ゴールドジム 地方店", "gold"],
    ["ANYTIME FITNESS", "anytime"],
    ["ちょこざっぷ", "chocozap"],
    ["ルネサンス", "renaissance"],
    ["EVERFIT24 千葉", "everfit"],
  ])
    expect(identifyBrand(text)?.id).toBe(id);
  expect(gymBrands.find((b) => b.id === "everfit")).toMatchObject({
    website: "https://www.everfit24.co.jp/",
    preferredPrefecture: "JP-12",
  });
  expect(identifyPrefecture("大阪のジム")?.code).toBe("JP-27");
  expect(identifyPrefecture("Chiba gyms")?.code).toBe("JP-12");
  expect(identifyBrand("Slava Training")).toBeUndefined();
});
test("queries scope Japanese regions correctly and apply facility filters before the result limit", () => {
  const query = buildDirectoryQuery({
    ...q,
    prefectureCode: "JP-27",
    category: "women",
  });
  expect(query).toContain('"ISO3166-2"="JP-27"');
  expect(query).toContain('"female"="only"');
  expect(query).toContain("Curves");
  expect(query).toContain("out body center 80");
  expect(buildDirectoryQuery({ ...q, category: "public" })).toContain(
    '"operator:type"~"^(public|government)$"',
  );
  expect(buildDirectoryQuery({ ...q, category: "local" })).toContain(
    '"brand"!~',
  );
});
test("query values cannot inject Overpass code or arbitrary area identifiers", () => {
  expect(() =>
    buildDirectoryQuery({ ...q, prefectureCode: 'JP-12"];out;' }),
  ).toThrow(DirectoryError);
  expect(() => buildDirectoryQuery({ ...q, brandId: "unknown" })).toThrow(
    DirectoryError,
  );
  expect(() => buildDirectoryQuery({ ...q, keyword: "x".repeat(101) })).toThrow(
    DirectoryError,
  );
  const query = buildDirectoryQuery({ ...q, keyword: '");node(1);out;' });
  expect(query).not.toContain("node(1)");
  expect(query).toContain("node\\\\(1\\\\)");
});
test("parsing uses returned real identifiers and coordinates, without inferred equipment or scores", () => {
  const v = parsed()[0];
  expect(v).toMatchObject({
    id: "osm:node:123",
    latitude: 43.06,
    longitude: 141.35,
    sourceUrl: "https://www.openstreetmap.org/node/123",
  });
  expect(v).not.toHaveProperty("maxDumbbellKg");
  expect(v).not.toHaveProperty("installed");
  expect(v).not.toHaveProperty("match");
  expect(venueRouteUrl(v)).toContain("destination=43.06,141.35");
  expect(
    parseDirectoryResponse({ elements: [] }, { ...q, brandId: "everfit" }),
  ).toEqual([]);
});
test("ways with centers are supported; malformed, duplicate and nameless records are excluded", () => {
  const results = parseDirectoryResponse(
    {
      elements: [
        fixture(),
        fixture(),
        { ...fixture(124), lat: 999 },
        { ...fixture(125), tags: {} },
        {
          ...fixture(126),
          type: "way",
          lat: undefined,
          lon: undefined,
          center: { lat: 43.07, lon: 141.36 },
        },
      ],
    },
    q,
  );
  expect(results.map((v) => v.id)).toEqual(["osm:node:123", "osm:way:126"]);
});
test("women-focused, explicitly tagged access and public facilities retain their distinct provenance", () => {
  const data = {
    elements: [
      fixture(1, { name: "カーブス検証店" }),
      fixture(2, { female: "only" }),
      fixture(3, { "operator:type": "government" }),
      fixture(4),
    ],
  };
  expect(
    parseDirectoryResponse(data, { ...q, category: "women" }).map(
      (v) => v.women,
    ),
  ).toEqual(["brand", "tagged"]);
  expect(
    parseDirectoryResponse(data, { ...q, category: "public" }).map((v) => v.id),
  ).toEqual(["osm:node:3"]);
  expect(
    parseDirectoryResponse(data, { ...q, brandId: "renaissance" }),
  ).toEqual([]);
});
test("partial and invalid responses do not imply a completed empty search", () => {
  expect(() =>
    parseDirectoryResponse({ elements: [], remark: "timed out" }, q),
  ).toThrow("incomplete");
  expect(() => parseDirectoryResponse({ elements: null }, q)).toThrow(
    "invalid",
  );
});
test("untranslated third-party names have pure-language display fallbacks while originals remain stored", () => {
  const venue = parsed()[0];
  expect(venueDisplayName(venue, "en")).not.toMatch(
    /[\u3040-\u30ff\u3400-\u9fff]/,
  );
  expect(venue.names.original).toBe("地域の検証ジム");
  const english = {
    ...venue,
    names: { original: "Local Test Fitness", ja: null, en: null },
  };
  expect(venueDisplayName(english, "ja")).not.toMatch(/[A-Za-z]/);
  expect(venueDisplayName(english, "en")).toBe("Local Test Fitness");
});
test("external website schemes and credential-bearing URLs are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:password@example.com",
    "file:///private/data",
  ])
    expect(safeWebsite(url)).toBeNull();
  expect(safeWebsite("https://example.org")).toBe("https://example.org/");
});
test("saved venues round-trip and reject unknown versions, forged source URLs and invalid coordinates", () => {
  const saved = parsed();
  expect(decodeSavedVenues(JSON.stringify({ version: 1, saved }))).toEqual(
    saved,
  );
  expect(() =>
    decodeSavedVenues(JSON.stringify({ version: 99, saved })),
  ).toThrow();
  for (const override of [
    { sourceUrl: "https://evil.invalid" },
    { latitude: 999 },
    { website: "javascript:alert(1)" },
  ])
    expect(() =>
      decodeSavedVenues(
        JSON.stringify({ version: 1, saved: [{ ...saved[0], ...override }] }),
      ),
    ).toThrow();
});
test("client sends the bounded query only on request and propagates rate limiting", async () => {
  const fetcher = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [fixture()] }),
    } as Response)
    .mockResolvedValueOnce({ ok: false, status: 429 } as Response);
  try {
    expect(await searchDirectory(q)).toHaveLength(1);
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://overpass-api.de/api/interpreter",
    );
    expect(
      decodeURIComponent(String(fetcher.mock.calls[0][1]?.body)),
    ).toContain('"ISO3166-2"="JP-01"');
    await expect(searchDirectory(q)).rejects.toMatchObject({ code: "rate" });
  } finally {
    fetcher.mockRestore();
  }
});
test("caller cancellation aborts the active fetch", async () => {
  const fetcher = jest.spyOn(globalThis, "fetch").mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        );
      }),
  );
  try {
    const controller = new AbortController(),
      pending = searchDirectory(q, controller.signal);
    const assertion = expect(pending).rejects.toMatchObject({
      code: "network",
    });
    controller.abort();
    await assertion;
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  } finally {
    fetcher.mockRestore();
  }
});

test("brand parsing preserves extra city and branch words instead of discarding them", () => {
  expect(initialDirectorySelection("ルネサンス 仙台駅前").keyword).toBe(
    "仙台駅前",
  );
  expect(initialDirectorySelection("ルネサンス 千葉")).toEqual({
    brandId: "renaissance",
    prefectureCode: "JP-12",
    keyword: "",
  });
});
