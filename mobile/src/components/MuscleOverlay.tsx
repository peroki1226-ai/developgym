import React from "react";
import { ClipPath, Defs, G, Path } from "react-native-svg";
import { ExercisePose } from "../domain/exerciseMotion";
import { articulatedSurface } from "../domain/articulatedSurface";
import { bodyContour } from "../domain/humanFigure";
import {
  contractionFrame,
  Muscle,
  muscleRegions,
  muscleSpec,
} from "../domain/muscleMotion";

/** Cutaway, schematic muscle bellies; neutral tendons retain their fixed attachments. */
export function MuscleOverlay({
  type,
  pose,
  progress,
  prefix,
  selectedMuscle,
  coloured = true,
}: {
  type: string;
  pose: ExercisePose;
  progress: number;
  prefix: string;
  selectedMuscle?: Muscle;
  coloured?: boolean;
}) {
  const all: Muscle[] = [
    "chest",
    "upperChest",
    "lats",
    "midBack",
    "frontShoulder",
    "sideShoulder",
    "rearShoulder",
    "biceps",
    "triceps",
    "quads",
    "glutes",
    "hamstrings",
    "hipAbductors",
    "adductors",
    "soleus",
    "abs",
    "erectors",
  ];
  const targets = selectedMuscle ? [selectedMuscle] : muscleSpec(type).primary;
  const matches = (muscle: Muscle) =>
    targets.includes(muscle) ||
    (muscle === "upperChest" && targets.includes("chest"));
  const active = (muscle: Muscle) => coloured && matches(muscle);
  const regions = muscleRegions(type, pose, all).sort(
    (a, b) => Number(active(a.muscle)) - Number(active(b.muscle)),
  );
  return (
    <G testID={coloured ? "muscle-overlay" : "anatomy-neutral"}>
      <Defs>
        <ClipPath id={`${prefix}-torso`}>
          <Path d={bodyContour(pose).path} />
        </ClipPath>
        <ClipPath id={`${prefix}-arm`}>
          {pose.arms.map((limb, i) => (
            <Path key={i} d={articulatedSurface(limb, "arm").path} />
          ))}
        </ClipPath>
        <ClipPath id={`${prefix}-leg`}>
          {pose.legs.map((limb, i) => (
            <Path key={i} d={articulatedSurface(limb, "leg").path} />
          ))}
        </ClipPath>
      </Defs>
      {regions.map((region, index) => {
        const on = active(region.muscle);
        const dx = region.b[0] - region.a[0],
          dy = region.b[1] - region.a[1];
        const length = Math.hypot(dx, dy),
          state = contractionFrame(
            type,
            region.muscle,
            matches(region.muscle) ? progress : 0.25,
            "work",
          );
        const inset = length * (0.06 + 0.09 * state.shortened),
          span = length - inset * 2;
        const r = region.radius * (0.86 + 0.14 * state.shortened);
        const fan = region.fan ? 0.42 : 0.65;
        return (
          <G
            key={index}
            testID={`${on ? "muscle-region" : "anatomy-neutral-region"}-${region.muscle}-${index}`}
            clipPath={`url(#${prefix}-${region.clip})`}
          >
            <G
              transform={`translate(${region.a[0]} ${region.a[1]}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`}
            >
              <Path
                d={`M 0,0 L ${length},0`}
                stroke="#dedede"
                strokeWidth={0.75}
              />
              <G transform={`translate(${inset} 0)`}>
                <Path
                  d={`M 0,0 C ${span * 0.2},${-r} ${span * 0.7},${-r} ${span},0 C ${span * 0.7},${r} ${span * fan},${r} 0,0 Z`}
                  fill={on ? "#b95749" : "#c2c2c2"}
                  stroke={on ? "#7d3d35" : "#969696"}
                  strokeWidth={0.3}
                />
                {[-0.55, -0.25, 0.1, 0.4].map((f, i) => (
                  <Path
                    key={i}
                    d={`M ${span * 0.1},0 Q ${span * 0.45},${r * f * 1.9} ${span * 0.92},0`}
                    stroke={on ? "#f4beb0" : "#969696"}
                    strokeWidth={0.24}
                    fill="none"
                  />
                ))}
              </G>
            </G>
          </G>
        );
      })}
    </G>
  );
}
