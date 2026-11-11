import type { EquipmentItem } from "./equipment";
import { CHEST_LESSONS } from "../domain/chestLessons";
// Stable existing IDs retain their records; press and curl are no longer mixed.
export const CHEST_EQUIPMENT: EquipmentItem[] = CHEST_LESSONS.map(lesson => {
  const key = (suffix: string) => `${lesson.prefix}.${suffix}`;
  return {
    id: lesson.id, svgType: lesson.id, name: key("name"), enName: key("name"),
    category: key("category"), bodyPart: "chest", bodyPartLabel: key("target"),
    primaryMuscles: [key("target")], secondaryMuscles: [key("secondary")],
    muscleTag: lesson.emphasis === "upper" ? "muscle.upperChest" : "muscle.chest",
    pof: key("action"), summary: key("summary"), seatSetup: key("setup"),
    beginnerSteps: [key("start"),key("work"),key("return")],
    ngPoints: [key("wrong1"),key("wrong2"),key("wrong3")],
    startWeightMale: key("load"), startWeightFemale: key("load"),
    proBiomechanics: key("why"), proAnatomy: key("target"),
    proVariations: [key("tip1"),key("tip2")], builderTip: key("tip3"),
  };
});
