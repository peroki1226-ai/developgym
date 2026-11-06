import React from "react";
import { ClipPath, Defs, G, Path } from "react-native-svg";
import { ExercisePose } from "../domain/exerciseMotion";
import { bodyContour, taperedContour } from "../domain/humanFigure";
import { contractionFrame, muscleRegions } from "../domain/muscleMotion";

/** Cutaway, schematic muscle bellies; neutral tendons retain their fixed attachments. */
export function MuscleOverlay({ type, pose, progress, prefix }: { type: string; pose: ExercisePose; progress: number; prefix: string }) {
  return <G testID="muscle-overlay">
    <Defs>
      <ClipPath id={`${prefix}-torso`}><Path d={bodyContour(pose).path} /></ClipPath>
      <ClipPath id={`${prefix}-arm`}>{pose.arms.map(([s, e], i) => <Path key={i} d={taperedContour(s, e, 3.4, 2.1)} />)}</ClipPath>
      <ClipPath id={`${prefix}-leg`}>{pose.legs.flatMap(([h, k, a], i) => [
        <Path key={`${i}-thigh`} d={taperedContour(h, k, 4.7, 2.5)} />,
        <Path key={`${i}-calf`} d={taperedContour(k, a, 2.7, 1.45)} />,
      ])}</ClipPath>
    </Defs>
    {muscleRegions(type, pose).map((region, index) => {
      const dx = region.b[0] - region.a[0], dy = region.b[1] - region.a[1];
      const length = Math.hypot(dx, dy), state = contractionFrame(type, region.muscle, progress, "work");
      const inset = length * (0.06 + 0.09 * state.shortened), span = length - inset * 2;
      const r = region.radius * (0.86 + 0.14 * state.shortened);
      const fan = region.fan ? 0.42 : 0.65;
      return <G key={index} testID={`muscle-region-${region.muscle}-${index}`} clipPath={`url(#${prefix}-${region.clip})`}>
        <G transform={`translate(${region.a[0]} ${region.a[1]}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`}>
          <Path d={`M 0,0 L ${length},0`} stroke="#dedede" strokeWidth={0.75} />
          <G transform={`translate(${inset} 0)`}>
            <Path d={`M 0,0 C ${span * 0.2},${-r} ${span * 0.7},${-r} ${span},0 C ${span * 0.7},${r} ${span * fan},${r} 0,0 Z`}
              fill="#b95749" stroke="#7d3d35" strokeWidth={0.3} />
            {[-0.55, -0.25, 0.1, 0.4].map((f, i) => <Path key={i}
              d={`M ${span * 0.1},0 Q ${span * 0.45},${r * f * 1.9} ${span * 0.92},0`}
              stroke="#f4beb0" strokeWidth={0.24} fill="none" />)}
          </G>
        </G>
      </G>;
    })}
  </G>;
}
