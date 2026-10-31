import data from "../data/finder.json";
export type Gym = (typeof data.gyms)[number];
export type Menu = (typeof data.menus)[number];
export type MatchPreferences = {
  menuIds: readonly string[];
  partIds: readonly string[];
  requiredDumbbellKg: number;
};
export type MatchResult = {
  percent: number | null;
  available: Menu[];
  missing: Menu[];
  missingEquipment: string[];
  dbOk: boolean;
};
export const gyms: Gym[] = data.gyms;
export const menus: Menu[] = data.menus;
export const parts = data.parts;
export const equipment = data.equipment;
export const equipmentName = (id: string) =>
  equipment.find((e) => e.id === id)?.name ?? id;

/** Port of index.html calcMatch (pro): 65% menu, 20% body-part coverage, 15% dumbbells.
 * Preserve per-exercise weighting even when several exercises use the same equipment.
 * Unlike the prototype, no preferences means no score; insufficient dumbbell weight
 * also makes dumbbell exercises unavailable. Inputs from the UI use known catalog IDs.
 */
export function calculateMatch(
  gym: Gym,
  preferences: MatchPreferences,
): MatchResult {
  const selected = menus.filter((m) => preferences.menuIds.includes(m.id));
  const partEquipment = menus
    .filter((m) => preferences.partIds.includes(m.part))
    .map((m) => m.reqEquip);
  const requiredKg = Number.isFinite(preferences.requiredDumbbellKg)
    ? Math.max(0, preferences.requiredDumbbellKg)
    : 0;
  const dbOk = requiredKg === 0 || gym.maxDumbbellKg >= requiredKg;
  const installed = new Set(gym.installed);
  const supports = (id: string) =>
    installed.has(id) && (id !== "dumbbell-heavy" || dbOk);
  const available = selected.filter((m) => supports(m.reqEquip));
  const missing = selected.filter((m) => !supports(m.reqEquip));
  const missingEquipment = [
    ...new Set([
      ...missing.map((m) => m.reqEquip),
      ...partEquipment.filter((id) => !supports(id)),
    ]),
  ];
  if (!selected.length && !partEquipment.length && requiredKg === 0)
    return { percent: null, available, missing, missingEquipment, dbOk };
  const menuRatio = selected.length ? available.length / selected.length : 1;
  const partRatio = partEquipment.length
    ? partEquipment.filter(supports).length / partEquipment.length
    : 1;
  let percent = Math.round(
    (menuRatio * 0.65 + partRatio * 0.2 + (dbOk ? 0.15 : 0)) * 100,
  );
  if (!missing.length && selected.length > 0 && partRatio === 1 && dbOk)
    percent = 99;
  return {
    percent: Math.max(15, percent),
    available,
    missing,
    missingEquipment,
    dbOk,
  };
}
export function findGyms(
  preferences: MatchPreferences,
  query = "",
  region = "all",
  minimumDumbbellKg = 0,
  catalog: readonly Gym[] = gyms,
  localize: (text: string) => string = (text) => text,
) {
  const q = query.normalize("NFKC").trim().toLowerCase();
  return catalog
    .filter(
      (g) =>
        (region === "all" || g.region === region) &&
        g.maxDumbbellKg >= minimumDumbbellKg &&
        `${g.name} ${g.area} ${g.spec} ${g.installed.map(equipmentName).join(" ")} ${[g.name, g.area, g.spec, ...g.installed.map(equipmentName)].map(localize).join(" ")}`
          .normalize("NFKC")
          .toLowerCase()
          .includes(q),
    )
    .map((gym) => ({ gym, match: calculateMatch(gym, preferences) }))
    .sort((a, b) => (b.match.percent ?? -1) - (a.match.percent ?? -1));
}
