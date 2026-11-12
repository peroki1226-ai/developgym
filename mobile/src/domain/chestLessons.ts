import type { MotionType } from "./exerciseMotion";
export type ChestLesson = {
  id: MotionType; prefix: string; emphasis: "upper" | "whole" | "lower";
};
export const CHEST_LESSONS: readonly ChestLesson[] = [
  { id: "dumbbell-heavy", prefix: "chest.db", emphasis: "upper" },
  { id: "chest-press", prefix: "chest.press", emphasis: "whole" },
  { id: "pec-fly", prefix: "chest.fly", emphasis: "whole" },
  { id: "chest-dip", prefix: "chest.dip", emphasis: "lower" },
  { id: "incline-hammer-press", prefix: "chest.hammer", emphasis: "upper" },
  { id: "incline-bench-press", prefix: "chest.inclineBench", emphasis: "upper" },
  { id: "cable-machine", prefix: "chest.cable", emphasis: "whole" },
  { id: "barbell-bench-press", prefix: "chest.bench", emphasis: "whole" },
];
export const chestLesson = (id: string) => CHEST_LESSONS.find(lesson => lesson.id === id);

// A menu's required equipment and its exercise demonstration are distinct:
// bench press is performed in a rack, but must open a press rather than squat.
export const CHEST_MENU_GUIDES: Readonly<Record<string,string>> = {
  "m-bench":"barbell-bench-press", "m-incline-db":"dumbbell-heavy",
  "m-pec-fly":"pec-fly", "m-cable-cross":"cable-machine",
  "m-incline-bench":"incline-bench-press", "m-incline-hammer":"incline-hammer-press",
};
