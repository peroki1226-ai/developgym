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
];
export const chestLesson = (id: string) => CHEST_LESSONS.find(lesson => lesson.id === id);
