import React, { useMemo } from "react";
import { Muscle } from "../domain/muscleMotion";
import { Circle, Ellipse, G, Line, Path, Polyline, Text as SvgText } from "react-native-svg";
import { exercisePose, ExercisePose, motionContact, Point } from "../domain/exerciseMotion";
import { motionTeaching } from "../domain/motionTeaching";
import { EquipmentContacts, EquipmentGrips, EquipmentRearFrame, ExerciseEquipment } from "./ExerciseEquipment";
import { HumanFigure } from "./HumanFigure";

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
export function ExerciseMotionScene({ type, progress, details = false, returning = false, anatomy = true, selectedMuscle }: { type: string; progress: number; details?: boolean; returning?: boolean; anatomy?: boolean; selectedMuscle?: Muscle }) {
  const pose = exercisePose(type, progress);
  const { start, trace, trajectory } = useMemo(() => {
    const contact = (p: ExercisePose) => motionContact(type, p);
    const start = exercisePose(type, 0);
    const trace = Array.from({ length: 17 }, (_, i) => contact(exercisePose(type, i / 16)));
    return { start, trace, trajectory: points(trace) };
  }, [type]);
  const before = motionContact(type, exercisePose(type, Math.max(0, progress - 0.025)));
  const after = motionContact(type, exercisePose(type, Math.min(1, progress + 0.025)));
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
    <ExerciseEquipment type={type} pose={pose} progress={progress} />
    <EquipmentGrips type={type} pose={pose} />
    <HumanFigure type={type} pose={start} ghost />
    <Polyline points={trajectory} stroke={person} strokeWidth={0.8} strokeDasharray="1 2" fill="none" opacity={0.45} />
    {details && <Polyline points={points(partial)} stroke={person} strokeWidth={1.5} fill="none" opacity={0.75} />}
    <HumanFigure type={type} pose={pose} progress={progress} anatomy={anatomy} selectedMuscle={selectedMuscle} />
    <EquipmentContacts type={type} pose={pose} />
    {details && <>
      <Marker point={teaching.fixed} number={1} offset={8} />
      <Marker point={teaching.moving} number={2} offset={-8} />
    </>}
    <Line testID="motion-direction" x1={111 - dx / length * 6} y1={48 - dy / length * 6} x2={tip[0]} y2={tip[1]} stroke={person} strokeWidth={1.4} />
    <Path d={`M ${base[0] - dy / length * 2} ${base[1] + dx / length * 2} L ${tip[0]} ${tip[1]} L ${base[0] + dy / length * 2} ${base[1] - dx / length * 2}`} fill="none" stroke={person} strokeWidth={1.4} />
  </>;
}
