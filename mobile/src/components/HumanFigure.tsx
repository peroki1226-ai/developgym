import React from "react";
import { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { ExercisePose, Limb } from "../domain/exerciseMotion";
import { ArticulatedLimb } from "./ArticulatedLimb";
import { Muscle } from "../domain/muscleMotion";
import { MuscleOverlay } from "./MuscleOverlay";
import { between, bodyContour, footPlacement, shoeContour, taperedContour } from "../domain/humanFigure";

const palette = {
  skin: "#c9c9c9", skinShade: "#969696", edge: "#656565",
  shirt: "#c9c9c9", shirtLight: "#f3f3f3", shorts: "#626262", shortsEdge: "#454545",
  shoe: "#4c4c4c", sole: "#ededed", hair: "#646464",
};
type Props = { pose: ExercisePose; type: string; ghost?: boolean; progress?: number; anatomy?: boolean; selectedMuscle?: Muscle };

/** Lightweight articulated illustration: every contour follows the existing joint centres. */
export const HumanFigure = React.memo(function HumanFigure({ pose, type, ghost = false, progress = 0, anatomy = true, selectedMuscle }: Props) {
  const prefix = `human-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const body = bodyContour(pose), facing = ["back-extension", "hack-squat"].includes(type) ? -1 : 1;
  const surface = (d: string, fill: string, edge = palette.edge, width = 0.35) => <Path d={d}
    fill={ghost ? "none" : fill === palette.skin ? `url(#${prefix}-skin)` : fill === palette.shorts ? `url(#${prefix}-shorts)` : fill} stroke={ghost ? "#a2a2a2" : edge}
    strokeWidth={ghost ? 0.5 : width} strokeDasharray={ghost ? "1.5 1.5" : undefined} strokeLinejoin="round" />;
  const leg = (limb: Limb, index: number) => {
    const [hip, knee, ankle] = limb;
    const shortsEnd = between(hip, knee, 0.48);
    const foot = footPlacement(type, pose, index), footDirection = foot.facing;
    const shoe = shoeContour(ankle, footDirection, foot.toe);
    return <G key={`leg-${index}`}>
      <ArticulatedLimb limb={limb} kind="leg" prefix={`${prefix}-leg-${index}`} ghost={ghost} />
      {surface(taperedContour(hip, shortsEnd, 5.1, 4.2), palette.shorts, palette.shortsEdge)}
      <G transform={`rotate(${foot.angle} ${ankle[0]} ${ankle[1]})`}>
        {surface(shoe, palette.shoe, palette.shortsEdge)}
        {!ghost && <Line x1={ankle[0] - footDirection * 1.1} y1={ankle[1] + 1.35} x2={foot.toe ? foot.toe[0] : ankle[0] + footDirection * 4.5}
          y2={foot.toe ? foot.toe[1] + 1.3 : ankle[1] + 1.9} stroke={palette.sole} strokeWidth={0.6} strokeLinecap="round" />}
      </G>
    </G>;
  };
  const arm = (limb: Limb, index: number) => {
    const [, elbow, hand] = limb;
    return <G key={`arm-${index}`}>
      <ArticulatedLimb limb={limb} kind="arm" prefix={`${prefix}-arm-${index}`} ghost={ghost} blendRoot />
      <G transform={`translate(${hand[0]} ${hand[1]}) rotate(${Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) * 180 / Math.PI})`}>
        {surface("M -2,-1.1 Q -1.4,-1.8 0,-1.6 L 1.9,-1.3 Q 2.8,-0.8 2.6,0.4 L 1.7,1.4 Q 0,1.9 -1.6,1 Z", palette.skin, palette.edge, 0.25)}
        {!ghost && <Path d="M -1,0.4 Q -0.5,-0.7 0.7,-0.5 M 0.5,-1.3 Q 0.1,-0.5 0.8,0.7 M 1.2,-1.1 Q 0.8,-0.4 1.4,0.7 M 1.9,-0.9 Q 1.5,-0.2 2,0.5" fill="none" stroke="#868686" strokeWidth={0.24} />}
      </G>
    </G>;
  };
  return <G opacity={ghost ? 0.17 : 1} testID={ghost ? "human-start-outline" : "human-figure"}>
    {!ghost && <Defs>
      <ClipPath id={`${prefix}-surface`}><Path d={body.path} /></ClipPath>
      <LinearGradient id={`${prefix}-skin`} x1="0%" y1="0%" x2="100%" y2="20%">
        <Stop offset="0%" stopColor="#b7b7b7" /><Stop offset="25%" stopColor="#dddddd" />
        <Stop offset="48%" stopColor="#e7e7e7" /><Stop offset="78%" stopColor="#c5c5c5" /><Stop offset="100%" stopColor="#aaaaaa" />
      </LinearGradient>
      <LinearGradient id={`${prefix}-shorts`} x1="0%" y1="0%" x2="100%" y2="70%">
        <Stop offset="0%" stopColor="#8b8b8b" /><Stop offset="55%" stopColor="#626262" /><Stop offset="100%" stopColor="#414141" />
      </LinearGradient>
    </Defs>}
    {/* Rear limbs first, joined by the shaded trunk. */}
    {pose.legs.map(leg)}
    {pose.arms.length > 1 && arm(pose.arms[0], 0)}
    {surface(body.path, palette.shirt, palette.shortsEdge, 0.45)}
    {!ghost && <G clipPath={`url(#${prefix}-surface)`}><G transform={`translate(${pose.shoulder[0]} ${pose.shoulder[1]}) rotate(${Math.atan2(pose.hip[1] - pose.shoulder[1], pose.hip[0] - pose.shoulder[0]) * 180 / Math.PI - 90})`}>
      {pose.camera === "side" ? <>
        <Path d="M 3,2 Q 5.4,5 3.6,10 Q 1,12 0.8,17 M -3.5,5 Q -4.8,11 -2.5,17" fill="none" stroke="#a0a0a0" strokeWidth={0.5} />
      </> : <>
        <Path d={`M -9,2 Q -5,-0.5 -1,2 L -0.5,${Math.min(8, Math.hypot(pose.hip[0]-pose.shoulder[0],pose.hip[1]-pose.shoulder[1])*0.6)} Q -6,10 -9,5 M 9,2 Q 5,-0.5 1,2 L 0.5,${Math.min(8, Math.hypot(pose.hip[0]-pose.shoulder[0],pose.hip[1]-pose.shoulder[1])*0.6)} Q 6,10 9,5`} fill="none" stroke="#999" strokeWidth={0.5} />
        {pose.camera === "front" && [11,15,19].map(y => <Path key={y} d={`M -3.5,${y} Q -1.5,${y-1} -0.4,${y} M 3.5,${y} Q 1.5,${y-1} 0.4,${y}`} stroke="#a5a5a5" strokeWidth={0.4} fill="none" />)}
      </>}
    </G></G>}
    {pose.arms.slice(pose.arms.length > 1 ? 1 : 0).map((a, i) => arm(a, i + 1))}
    {!ghost && <MuscleOverlay prefix={prefix} type={type} pose={pose} progress={progress} selectedMuscle={selectedMuscle} coloured={anatomy} />}
    <G transform={`translate(${pose.head[0]} ${pose.head[1]}) rotate(${body.headAngle})`}>
      {surface("M -3.8,-3.2 Q -3.2,-6 0,-6 Q 3.8,-6 4.1,-2.8 L 4,1.6 Q 3.4,5.4 0.6,5.7 Q -2.8,5.5 -3.8,2 Z", palette.skin)}
      {!ghost && <>
        <Path d="M -3.9,-0.4 L -4.1,-3 Q -3.5,-6.4 0,-6.3 Q 4.1,-6.3 4.2,-2.3 L 2.7,-3 Q 0,-4.6 -2.6,-3.2 L -2.8,0.2 Z" fill={palette.hair} />
        {pose.camera === "side" ? <G transform={`scale(${facing} 1)`}>
          <Path d="M 3.8,-0.9 L 4.8,0.9 Q 5,1.5 3.9,1.5" fill={palette.skin} stroke={palette.edge} strokeWidth={0.35} />
          <Circle cx={2.5} cy={-0.7} r={0.28} fill={palette.hair} />
          <Path d="M 2.6,3.1 L 3.7,2.9" stroke={palette.edge} strokeWidth={0.4} />
          <Path d="M -1.4,-0.4 Q -2.8,-0.6 -2.2,1.5 Q -1.7,2 -1.3,0.7" fill="none" stroke="#999" strokeWidth={0.3} />
        </G> : pose.camera === "front" ? <>
          <Circle cx={-1.5} cy={-0.4} r={0.26} fill={palette.hair} /><Circle cx={1.5} cy={-0.4} r={0.26} fill={palette.hair} />
          <Path d="M 0,0 L 0.5,1.6 L -0.3,1.6 M -1,3 Q 0,3.5 1,3" stroke={palette.edge} strokeWidth={0.35} fill="none" />
        </> : <Path d="M -2.5,-1 Q 0,-2 2.5,-1" stroke={palette.skinShade} strokeWidth={0.5} fill="none" />}
      </>}
    </G>
  </G>;
});
