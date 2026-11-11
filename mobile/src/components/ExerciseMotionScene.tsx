import { chestMotionPaths } from "../domain/chestMotion";
import { projectPhotoChest } from "../domain/photoChestProjection";
import React, { useMemo } from "react";
import { Muscle } from "../domain/muscleMotion";
import { Circle, Ellipse, G, Line, Path, Polyline, Text as SvgText } from "react-native-svg";
import { ExercisePose, motionContact, Point } from "../domain/exerciseMotion";
import { motionTeaching } from "../domain/motionTeaching";
import { EquipmentContacts, EquipmentGrips, EquipmentRearFrame, ExerciseEquipment } from "./ExerciseEquipment";
import { HumanFigure } from "./HumanFigure";
import { LegPressVariant } from "../domain/training3d";
import { guidePose } from "../domain/photoChestProjection";

const frame = "#bcbcbc", person = "#666666";
const points = (items: readonly Point[]) => items.map((p) => p.join(",")).join(" ");
function Marker({ point, number, offset }: { point: Point; number: 1 | 2; offset: number }) {
  const x = Math.max(8, Math.min(112, point[0] + offset));
  const y = Math.max(8, Math.min(88, point[1] - 7));
  const color = number === 1 ? "#494949" : person;
  return <G>
    <Circle cx={point[0]} cy={point[1]} r={0.9} fill={color} />
    <Line x1={point[0]} y1={point[1]} x2={x} y2={y} stroke={color} strokeWidth={0.7} />
    <Circle cx={x} cy={y} r={3.7} fill="#ffffff" stroke={color} strokeWidth={0.7} />
    <SvgText x={x} y={y + 1.5} fontSize={4.5} textAnchor="middle" fontWeight="bold" fill={color}>{number}</SvgText>
  </G>;
}
export function ExerciseMotionScene({ type, progress, details = false, returning = false, guidance = false, anatomy = true, selectedMuscle, variant }: { type: string; variant?: LegPressVariant; progress: number; details?: boolean; returning?: boolean; guidance?: boolean; anatomy?: boolean; selectedMuscle?: Muscle }) {
  const pose = guidePose(type, progress, variant);
  const { start, trace, trajectory } = useMemo(() => {
    const contact = (p: ExercisePose) => motionContact(type, p);
    const start = guidePose(type, 0, variant);
    const trace = Array.from({ length: 17 }, (_, i) => contact(guidePose(type, i / 16, variant)));
    return { start, trace, trajectory: points(trace) };
  }, [type, variant]);
  const before = motionContact(type, guidePose(type, Math.max(0, progress - 0.025), variant));
  const after = motionContact(type, guidePose(type, Math.min(1, progress + 0.025), variant));
  const sign = returning ? -1 : 1;
  const dx = (after[0] - before[0]) * sign, dy = (after[1] - before[1]) * sign, length = Math.hypot(dx, dy) || 1;
  const current = motionContact(type, pose);
  const partial = trace.filter((_, i) => i / 16 < progress).concat([current]);
  const teaching = motionTeaching(type, pose);
  // Keep the direction cue on the right of the scene, away from moving joints.
  const tip: Point = [111 + dx / length * 4, 48 + dy / length * 4];
  const base: Point = [tip[0] - dx / length * 4, tip[1] - dy / length * 4];
  return <>
    <Ellipse cx={60} cy={89} rx={50} ry={3} fill="#f2f2f2" />
    <Line x1={10} y1={88} x2={110} y2={88} stroke={frame} strokeWidth={1.5} />
    <EquipmentRearFrame type={type} />
    <ExerciseEquipment type={type} pose={pose} progress={progress} variant={variant} />
    <EquipmentGrips type={type} pose={pose} />
    <HumanFigure type={type} pose={start} ghost />
    <Polyline points={trajectory} stroke={person} strokeWidth={0.8} strokeDasharray="1 2" fill="none" opacity={0.45} />
    {details && <Polyline points={points(partial)} stroke={person} strokeWidth={1.5} fill="none" opacity={0.75} />}
    <HumanFigure type={type} pose={pose} progress={progress} anatomy={anatomy} selectedMuscle={selectedMuscle} />
    <EquipmentContacts type={type} pose={pose} />
    {guidance && chestMotionPaths(type,progress,returning).map((path,index)=>{
      const a=projectPhotoChest(type,path.tail), b=projectPhotoChest(type,path.tip), angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
      return <G key={index}><Polyline points={points(path.points.map(p=>projectPhotoChest(type,p)))} stroke="#879aa8" strokeWidth={.45} strokeDasharray="1 1" fill="none"/>
        <Line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#254f70" strokeWidth={1.1}/>
        <Path d="M-3 -2 L0 0 L-3 2" transform={`translate(${b[0]} ${b[1]}) rotate(${angle})`} fill="none" stroke="#254f70" strokeWidth={1.1}/></G>;
    })}
    {details && <>
      <Marker point={teaching.fixed} number={1} offset={8} />
      <Marker point={teaching.moving} number={2} offset={-8} />
    </>}
    <Line testID="motion-direction" x1={111 - dx / length * 6} y1={48 - dy / length * 6} x2={tip[0]} y2={tip[1]} stroke={person} strokeWidth={1.4} />
    <Path d={`M ${base[0] - dy / length * 2} ${base[1] + dx / length * 2} L ${tip[0]} ${tip[1]} L ${base[0] + dy / length * 2} ${base[1] - dx / length * 2}`} fill="none" stroke={person} strokeWidth={1.4} />
  </>;
}
