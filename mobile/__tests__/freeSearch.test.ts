import { inferGymProfile } from "../src/domain/brandInference";
import {
  searchGymsMultiSource,
  calculateDistanceKm,
  buildMapUrls,
} from "../src/domain/freeSearchService";
import { calculateMatch } from "../src/domain/matching";

describe("GymFinder Free Multi-Source Search & Brand Inference Engine", () => {
  test("Infers Gold's Gym correctly with 60kg dumbbells and Hack Squat", () => {
    const profile = inferGymProfile("ゴールドジム 原宿東京");
    expect(profile.brandName).toBe("Gold's Gym");
    expect(profile.maxDumbbellKg).toBe(60);
    expect(profile.installed).toContain("hack-squat");
    expect(profile.installed).toContain("power-rack");
    expect(profile.fee).toContain("¥2,750");
  });

  test("Infers Anytime Fitness correctly with 40kg dumbbells", () => {
    const profile = inferGymProfile("エニタイムフィットネス 新宿東口店");
    expect(profile.brandName).toBe("Anytime Fitness");
    expect(profile.maxDumbbellKg).toBe(40);
    expect(profile.installed).toContain("power-rack");
    expect(profile.installed).toContain("incline-smith");
    expect(profile.installed).not.toContain("hack-squat");
  });

  test("Infers chocoZAP correctly with 0kg dumbbells and selectorized machines", () => {
    const profile = inferGymProfile("chocoZAP 渋谷店");
    expect(profile.brandName).toBe("chocoZAP");
    expect(profile.maxDumbbellKg).toBe(0);
    expect(profile.installed).not.toContain("power-rack");
    expect(profile.installed).toContain("leg-press");
  });

  test("Infers Public Sports Center with affordable day-pass rate", () => {
    const profile = inferGymProfile("新宿スポーツセンター 体育館");
    expect(profile.brandName).toBe("Public Sports Center");
    expect(profile.fee).toContain("¥300〜¥500");
    expect(profile.installed).toContain("power-rack");
  });

  test("Multi-source search returns matching gyms and navigation URLs", () => {
    const results = searchGymsMultiSource("Shibuya");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].appleMapsUrl).toContain("maps.apple.com");
    expect(results[0].googleMapsUrl).toContain("google.com/maps");
  });

  test("Dynamic query inference creates actionable gym entry with calculated match", () => {
    const results = searchGymsMultiSource("ゴールドジム 名古屋金山");
    expect(results.length).toBeGreaterThan(0);
    const goldGym = results.find((g) => g.name.includes("ゴールドジム"));
    expect(goldGym).toBeDefined();

    if (goldGym) {
      const match = calculateMatch(goldGym, {
        menuIds: ["m-bench", "m-hack-squat"],
        partIds: ["legs"],
        requiredDumbbellKg: 50,
      });
      expect(match.percent).toBeGreaterThanOrEqual(90);
      expect(match.missing).toHaveLength(0);
    }
  });

  test("Calculates distance between coordinates accurately", () => {
    // Tokyo Station to Shibuya Station (~6.5km)
    const tokyoStation = { latitude: 35.6812, longitude: 139.7671 };
    const shibuyaStation = { latitude: 35.658, longitude: 139.7016 };
    const dist = calculateDistanceKm(tokyoStation, shibuyaStation);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(8);
  });
});
