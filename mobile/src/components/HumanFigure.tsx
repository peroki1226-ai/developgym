import React from "react";
import { Circle, Ellipse, G, Line, Path } from "react-native-svg";
import { ExercisePose, Limb } from "../domain/exerciseMotion";
import { between, bodyContour, footPlacement, shoeContour, taperedContour } from "../domain/humanFigure";

const palette = {
  skin: "#e5c4ae", skinShade: "#cfaa91", edge: "#947866",
  shirt: "#27658b", shirtLight: "#4684a7", shorts: "#304c64", shortsEdge: "#203b51",
  shoe: "#243c52", sole: "#e9eef2", hair: "#293e50", muscle: "#63c7df",
};
type Props = { pose: ExercisePose; type: string; ghost?: boolean };

/** Lightweight articulated illustration: every contour follows the existing joint centres. */
export const HumanFigure = React.memo(function HumanFigure({ pose, type, ghost = false }: Props) {
  const body = bodyContour(pose), facing = ["back-extension", "hack-squat"].includes(type) ? -1 : 1;
  const surface = (d: string, fill: string, edge = palette.edge, width = 0.35) => <Path d={d}
    fill={ghost ? "none" : fill} stroke={ghost ? "#7491a6" : edge}
    strokeWidth={ghost ? 0.5 : width} strokeDasharray={ghost ? "1.5 1.5" : undefined} strokeLinejoin="round" />;
  const leg = (limb: Limb, index: number) => {
    const [hip, knee, ankle] = limb;
    const shortsEnd = between(hip, knee, 0.48);
    const foot = footPlacement(type, pose, index), footDirection = foot.facing;
    const shoe = shoeContour(ankle, footDirection, foot.toe);
    return <G key={`leg-${index}`}>
      {surface(taperedContour(hip, knee, 4.7, 2.5), palette.skin)}
      {surface(taperedContour(knee, ankle, 2.7, 1.45), palette.skin)}
      {surface(taperedContour(hip, shortsEnd, 5.1, 4.2), palette.shorts, palette.shortsEdge)}
      {!ghost && <Path d={`M ${knee[0] - 1.3},${knee[1] - 0.4} Q ${knee[0]},${knee[1] + 1.1} ${knee[0] + 1.4},${knee[1] - 0.1}`}
        fill="none" stroke={palette.skinShade} strokeWidth={0.55} />}
      <G transform={`rotate(${foot.angle} ${ankle[0]} ${ankle[1]})`}>
        {surface(shoe, palette.shoe, palette.shortsEdge)}
        {!ghost && <Line x1={ankle[0] - footDirection * 1.1} y1={ankle[1] + 1.35} x2={foot.toe ? foot.toe[0] : ankle[0] + footDirection * 4.5}
          y2={foot.toe ? foot.toe[1] + 1.3 : ankle[1] + 1.9} stroke={palette.sole} strokeWidth={0.6} strokeLinecap="round" />}
      </G>
    </G>;
  };
  const arm = (limb: Limb, index: number) => {
    const [shoulder, elbow, hand] = limb;
    return <G key={`arm-${index}`}>
      {surface(taperedContour(shoulder, elbow, 3.4, 2.1), palette.skin)}
      {surface(taperedContour(elbow, hand, 2.45, 1.15), palette.skin)}
      {surface(taperedContour(shoulder, between(shoulder, elbow, 0.32), 3.7, 3.15), palette.shirt, palette.shortsEdge)}
      {!ghost && <Path d={`M ${elbow[0] - 0.8},${elbow[1] + 0.5} Q ${elbow[0]},${elbow[1] - 0.8} ${elbow[0] + 0.9},${elbow[1] + 0.3}`}
        fill="none" stroke={palette.skinShade} strokeWidth={0.5} />}
      <G transform={`translate(${hand[0]} ${hand[1]}) rotate(${Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) * 180 / Math.PI})`}>
        <Ellipse cx={0} cy={0} rx={2.05} ry={1.5} fill={ghost ? "none" : palette.skin} stroke={ghost ? "#7491a6" : palette.edge} strokeWidth={0.35} />
        {!ghost && <Path d="M -0.4,0.2 Q 0.1,-1 1.2,-0.6 M 0.9,0.1 L 1.3,0.6" fill="none" stroke={palette.edge} strokeWidth={0.35} />}
      </G>
    </G>;
  };
  return <G opacity={ghost ? 0.17 : 1} testID={ghost ? "human-start-outline" : "human-figure"}>
    {/* Rear limbs first; the shirt joins and occludes their proximal ends. */}
    {pose.legs.map(leg)}
    {pose.arms.length > 1 && arm(pose.arms[0], 0)}
    {surface(taperedContour(body.neck, between(pose.shoulder, pose.head, 0.65), 2.5, 2.1), palette.skin)}
    {surface(body.path, palette.shirt, palette.shortsEdge, 0.45)}
    {!ghost && <Path d={`M ${pose.shoulder[0]},${pose.shoulder[1] + 2} Q ${pose.shoulder[0] + body.torsoNormal[0] * 2},${pose.shoulder[1] + 5} ${between(pose.shoulder, pose.hip, 0.8).join(",")}`}
      stroke={palette.shirtLight} strokeWidth={0.8} fill="none" opacity={0.7} />}
    {pose.arms.slice(pose.arms.length > 1 ? 1 : 0).map((a, i) => arm(a, i + 1))}
    {!ghost && <Line x1={pose.highlight[0][0]} y1={pose.highlight[0][1]} x2={pose.highlight[1][0]} y2={pose.highlight[1][1]}
        stroke={palette.muscle} strokeWidth={3} strokeLinecap="round" opacity={0.75} />}
    <G transform={`translate(${pose.head[0]} ${pose.head[1]}) rotate(${body.headAngle})`}>
      {surface("M -3.8,-3.2 Q -3.2,-6 0,-6 Q 3.8,-6 4.1,-2.8 L 4,1.6 Q 3.4,5.4 0.6,5.7 Q -2.8,5.5 -3.8,2 Z", palette.skin)}
      {!ghost && <>
        <Path d="M -3.9,-0.4 L -4.1,-3 Q -3.5,-6.4 0,-6.3 Q 4.1,-6.3 4.2,-2.3 L 2.7,-3 Q 0,-4.6 -2.6,-3.2 L -2.8,0.2 Z" fill={palette.hair} />
        {pose.camera === "side" ? <G transform={`scale(${facing} 1)`}>
          <Path d="M 3.8,-0.9 L 5.3,0.9 Q 5.6,1.5 3.9,1.5" fill={palette.skin} stroke={palette.edge} strokeWidth={0.35} />
          <Circle cx={2.5} cy={-0.7} r={0.38} fill={palette.hair} />
          <Path d="M 2.6,3.1 L 3.7,2.9" stroke={palette.edge} strokeWidth={0.4} />
          <Ellipse cx={-1.4} cy={0.6} rx={0.8} ry={1.2} fill={palette.skinShade} />
        </G> : pose.camera === "front" ? <>
          <Circle cx={-1.5} cy={-0.4} r={0.35} fill={palette.hair} /><Circle cx={1.5} cy={-0.4} r={0.35} fill={palette.hair} />
          <Path d="M 0,0 L 0.5,1.6 L -0.3,1.6 M -1,3 Q 0,3.5 1,3" stroke={palette.edge} strokeWidth={0.35} fill="none" />
        </> : <Path d="M -2.5,-1 Q 0,-2 2.5,-1" stroke={palette.skinShade} strokeWidth={0.5} fill="none" />}
      </>}
    </G>
  </G>;
});
