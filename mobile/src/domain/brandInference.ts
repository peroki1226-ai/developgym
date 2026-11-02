/**
 * GymFinder Brand & Equipment Inference Engine (100% Free / Client-Side)
 * Infers gym equipment, dumbbell capacities, visitor fees, and specifications
 * from gym names fetched via Apple Maps, OpenStreetMap, or user queries.
 */

export interface InferredGymProfile {
  brandKey: string;
  brandName: string;
  maxDumbbellKg: number;
  dumbbellRange: string;
  spec: string;
  fee: string;
  hours: string;
  installed: string[];
  tags: string[];
  sourceType: "apple_maps" | "osm" | "verified_preset";
}

const ALL_EQUIPMENT = [
  "chest-press",
  "pec-fly",
  "shoulder-press",
  "lat-pulldown",
  "seated-row",
  "abdominal-crunch",
  "leg-press",
  "hack-squat",
  "power-rack",
  "incline-smith",
  "cable-machine",
  "dumbbell-heavy",
];

const STANDARD_FREEWEIGHT_EQUIPMENT = [
  "chest-press",
  "pec-fly",
  "shoulder-press",
  "lat-pulldown",
  "seated-row",
  "abdominal-crunch",
  "leg-press",
  "power-rack",
  "incline-smith",
  "cable-machine",
  "dumbbell-heavy",
];

const SELECTORIZED_ONLY_EQUIPMENT = [
  "chest-press",
  "pec-fly",
  "shoulder-press",
  "lat-pulldown",
  "seated-row",
  "abdominal-crunch",
  "leg-press",
];

const PUBLIC_CENTER_EQUIPMENT = [
  "chest-press",
  "lat-pulldown",
  "seated-row",
  "abdominal-crunch",
  "leg-press",
  "power-rack",
  "cable-machine",
  "dumbbell-heavy",
];

/**
 * Infer gym equipment profile from name and area
 */
export function inferGymProfile(
  name: string,
  area: string = "",
  sourceType: "apple_maps" | "osm" | "verified_preset" = "osm",
): InferredGymProfile {
  const q = `${name} ${area}`.toLowerCase();

  // 1. Gold's Gym (ゴールドジム) - Hypertrophy King
  if (q.includes("gold's") || q.includes("golds") || q.includes("ゴールドジム")) {
    return {
      brandKey: "golds_gym",
      brandName: "Gold's Gym",
      maxDumbbellKg: 60,
      dumbbellRange: "1kg – 60kg Full Set (Ivanko & Urethane)",
      spec: "4+ Power Racks / Arsenal Hack Squat / Dual Cables / Mag Grips",
      fee: "Visitor ¥2,750〜¥3,300 / Monthly ¥14,300",
      hours: "07:00–23:30 (varies by location)",
      installed: [...ALL_EQUIPMENT],
      tags: ["Hardcore", "Hack Squat", "Visitor OK", "Dumbbells 60kg"],
      sourceType,
    };
  }

  // 2. Anytime Fitness (エニタイムフィットネス) - 24/7 Global Standard
  if (q.includes("anytime") || q.includes("エニタイム")) {
    return {
      brandKey: "anytime_fitness",
      brandName: "Anytime Fitness",
      maxDumbbellKg: 40,
      dumbbellRange: "1kg – 40kg Set (Life Fitness Urethane)",
      spec: "2 Hammer Strength Racks / 1 Smith Machine / Life Fitness DAP",
      fee: "Trial ¥1,980 / Monthly ¥7,800〜¥9,800 (Global Fob Key)",
      hours: "24 Hours / 365 Days",
      installed: [...STANDARD_FREEWEIGHT_EQUIPMENT],
      tags: ["24 Hours", "Power Rack 2+", "Global Key", "Dumbbells 40kg"],
      sourceType,
    };
  }

  // 3. chocoZAP (チョコザップ) - Beginner Convenience
  if (q.includes("chocozap") || q.includes("チョコザップ") || q.includes("ちょこざっぷ")) {
    return {
      brandKey: "chocozap",
      brandName: "chocoZAP",
      maxDumbbellKg: 0,
      dumbbellRange: "No Free Dumbbells (Selectorized Pin-Loaded Machines Only)",
      spec: "7-10 Selectorized Machines / Street Shoes & Clothes OK",
      fee: "Flat Rate ¥3,278 / month",
      hours: "24 Hours / 365 Days (QR Entry)",
      installed: [...SELECTORIZED_ONLY_EQUIPMENT],
      tags: ["24 Hours", "Beginner Friendly", "Street Shoes OK", "Flat Rate"],
      sourceType,
    };
  }

  // 4. FiT24 / 快活CLUB Fit24
  if (q.includes("fit24") || q.includes("快活")) {
    return {
      brandKey: "fit24",
      brandName: "FiT24",
      maxDumbbellKg: 50,
      dumbbellRange: "1kg – 50kg Heavy Dumbbells (Torque / Hammer)",
      spec: "3 Power Racks / Incline Smith / Dual Cable / Towel & Drink Bar",
      fee: "Visitor ¥2,200 / Monthly ¥7,480",
      hours: "24 Hours / 365 Days",
      installed: [...STANDARD_FREEWEIGHT_EQUIPMENT],
      tags: ["24 Hours", "Power Rack 3", "Dumbbells 50kg", "Free Towel"],
      sourceType,
    };
  }

  // 5. Joyfit / ジョイフィット
  if (q.includes("joyfit") || q.includes("ジョイフィット")) {
    return {
      brandKey: "joyfit",
      brandName: "JOYFIT 24",
      maxDumbbellKg: 36,
      dumbbellRange: "1kg – 36kg Dumbbells (Matrix / Techno)",
      spec: "2 Power Racks / Smith Machine / Cable Station",
      fee: "Monthly ¥7,980〜¥8,800",
      hours: "24 Hours / 365 Days",
      installed: [...STANDARD_FREEWEIGHT_EQUIPMENT],
      tags: ["24 Hours", "Cardio & Weights", "National Access"],
      sourceType,
    };
  }

  // 6. Public Community Gym / Sports Center (市営・区民体育館・総合スポーツセンター)
  if (
    q.includes("スポーツセンター") ||
    q.includes("体育館") ||
    q.includes("市営") ||
    q.includes("区立") ||
    q.includes("都立") ||
    q.includes("公営") ||
    q.includes("community") ||
    q.includes("recreation")
  ) {
    return {
      brandKey: "public_center",
      brandName: "Public Sports Center",
      maxDumbbellKg: 24,
      dumbbellRange: "1kg – 24kg Chrome / Rubber Dumbbells",
      spec: "1-2 Power Racks / Selectorized Machines / Pay-per-use",
      fee: "Visitor ¥300〜¥500 / session (Pay-per-visit)",
      hours: "09:00–21:30 (varies by municipality)",
      installed: [...PUBLIC_CENTER_EQUIPMENT],
      tags: ["Pay-Per-Visit (¥300〜¥500)", "No Contract", "Budget Friendly"],
      sourceType,
    };
  }

  // 7. General Fitness Club (Tipness, Konami, Renaissance, Central)
  if (
    q.includes("tipness") ||
    q.includes("ティップネス") ||
    q.includes("konami") ||
    q.includes("コナミ") ||
    q.includes("renaissance") ||
    q.includes("ルネサンス") ||
    q.includes("central") ||
    q.includes("セントラル")
  ) {
    return {
      brandKey: "comprehensive_fitness",
      brandName: "Full-Service Fitness Club",
      maxDumbbellKg: 32,
      dumbbellRange: "1kg – 32kg Dumbbells / Adjustable Benches",
      spec: "Power Rack / Smith Machine / Pool & Bathhouse & Sauna",
      fee: "Visitor ¥2,200〜¥3,300 / Monthly ¥11,000",
      hours: "09:00–23:00 / Weekend 20:00",
      installed: [...STANDARD_FREEWEIGHT_EQUIPMENT],
      tags: ["Pool & Spa", "Sauna", "Visitor Day Pass", "Studio Lessons"],
      sourceType,
    };
  }

  // 8. Default Independent / Studio Gym
  return {
    brandKey: "independent_gym",
    brandName: "Fitness Gym",
    maxDumbbellKg: 32,
    dumbbellRange: "1kg – 32kg Dumbbells / Free Weights",
    spec: "Power Rack / Cable Pulley / Core Strength Equipment",
    fee: "Inquire at front desk / Day Pass available",
    hours: "Standard Gym Hours",
    installed: [...STANDARD_FREEWEIGHT_EQUIPMENT],
    tags: ["Gym & Fitness", "Free Weights"],
    sourceType,
  };
}
