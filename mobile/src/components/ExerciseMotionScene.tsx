import React, { useMemo } from "react";
import { Circle, Ellipse, G, Line, Path, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { exercisePose, ExercisePose, motionContact, motionType, Point } from "../domain/exerciseMotion";
import { motionTeaching } from "../domain/motionTeaching";

const machine = "#8c9ca8", frame = "#c8d2da", person = "#337baf", target = "#173f60";
const points = (items: readonly Point[]) => items.map((p) => p.join(",")).join(" ");
function Segment({ a, b, color = machine, width = 2 }: { a: Point; b: Point; color?: string; width?: number }) {
  return <Line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />;
}
function Seat({ x = 43, y = 66, width = 24 }: { x?: number; y?: number; width?: number }) {
  return <G>
    <Rect x={x} y={y} width={width} height={4} rx={2} fill={machine} />
    <Segment a={[x + 9, y + 4]} b={[x + 9, 88]} width={3} />
  </G>;
}
function Stack({ x, lift }: { x: number; lift: number }) {
  return <G>
    <Rect x={x} y={12} width={11} height={76} rx={3} fill="#eef2f5" stroke={frame} />
    <Segment a={[x + 5.5, 17]} b={[x + 5.5, 84]} color={frame} width={1} />
    {[0, 1, 2, 3].map((i) => <Rect key={i} x={x + 1.5} y={65 + i * 4 - lift} width={8} height={3} rx={0.5} fill={machine} />)}
  </G>;
}
function Hardware({ type: raw, pose, progress: p }: { type: string; pose: ExercisePose; progress: number }) {
  const type = motionType(raw), hand = pose.grips[0], foot = pose.legs[0]?.[2] ?? [0, 0];
  switch (type) {
    case "chest-press":
      return <G><Stack x={18} lift={p * 9} /><Seat />
        <Segment a={[43, 32]} b={[43, 64]} width={5} />
        <Segment a={[29, 17]} b={[65, 18]} color={frame} width={3} />
        <Segment a={[65, 18]} b={hand} width={3} /><Circle cx={65} cy={18} r={2.5} fill={machine} />
      </G>;
    case "pec-fly":
      return <G><Rect x={44} y={18} width={32} height={8} rx={3} fill={machine} />
        {pose.arms.map((arm, i) => <Segment key={i} a={arm[0]} b={arm[2]} width={5} color={frame} />)}
        <Ellipse cx={60} cy={44} rx={12} ry={10} fill="#eef2f5" stroke={frame} />
      </G>;
    case "cable-machine":
      return <G><Stack x={8} lift={p * 8} /><Stack x={101} lift={p * 8} />
        <Segment a={[13, 18]} b={pose.grips[0]} /><Segment a={[106, 18]} b={pose.grips[1]} />
        <Circle cx={13} cy={18} r={3} fill={machine} /><Circle cx={106} cy={18} r={3} fill={machine} />
      </G>;
    case "incline-smith":
    case "dumbbell-heavy":
      return <G><Segment a={[33, 46]} b={[62, 72]} width={6} /><Segment a={[62, 72]} b={[79, 68]} width={5} />
        <Segment a={[59, 73]} b={[59, 88]} width={3} />
        {type === "incline-smith" ? <G>
          <Segment a={[65, 9]} b={[65, 88]} color={frame} width={3} /><Segment a={[83, 9]} b={[83, 88]} color={frame} width={3} />
          <Segment a={[44, hand[1]]} b={[87, hand[1]]} width={2.5} />
          <Rect x={79} y={hand[1] - 6} width={6} height={12} rx={1} fill={machine} />
        </G> : <G>
          <Segment a={[hand[0] - 8, hand[1]]} b={[hand[0] + 8, hand[1]]} width={2} />
          <Rect x={hand[0] - 9} y={hand[1] - 5} width={4} height={10} rx={1} fill={machine} />
          <Rect x={hand[0] + 5} y={hand[1] - 5} width={4} height={10} rx={1} fill={machine} />
        </G>}
      </G>;
    case "lat-pulldown":
      return <G><Stack x={100} lift={p * 10} /><Seat x={46} width={28} />
        <Segment a={[60, 8]} b={[105, 8]} width={3} />
        <Segment a={[60, 8]} b={[60, hand[1]]} width={1.3} />
        <Segment a={pose.grips[0]} b={pose.grips[1]} width={3} />
        <Segment a={[43, 68]} b={[77, 68]} width={4} />
      </G>;
    case "seated-row":
      return <G><Stack x={100} lift={p * 9} /><Seat x={27} width={23} />
        <Segment a={[105, 52]} b={hand} width={1.4} />
        <Segment a={[78, 69]} b={[81, 83]} width={4} />
      </G>;
    case "shoulder-press":
      return <G><Seat /><Segment a={[39, 34]} b={[43, 64]} width={5} />
        <Segment a={[26, 34]} b={hand} width={3} /><Circle cx={26} cy={34} r={3} fill={machine} />
        <Stack x={98} lift={p * 9} />
      </G>;
    case "leg-press":
      return <G><Segment a={[19, 47]} b={[40, 75]} width={6} /><Segment a={[40, 75]} b={[55, 72]} width={5} />
        <Segment a={[54, 81]} b={[106, 29]} width={3} color={frame} />
        <Segment a={[foot[0] - 7, foot[1] - 7]} b={[foot[0] + 7, foot[1] + 7]} width={5} />
        <Circle cx={foot[0] + 8} cy={foot[1] + 9} r={4} fill={machine} />
      </G>;
    case "hack-squat":
      return <G><Segment a={[26, 86]} b={[99, 13]} width={4} color={frame} />
        <Segment a={[24, 71]} b={[40, 87]} width={5} />
        <Segment a={[pose.hip[0] + 3, pose.hip[1] + 3]} b={[pose.shoulder[0] + 3, pose.shoulder[1] + 3]} width={10} />
        <Rect x={pose.shoulder[0] - 7} y={pose.shoulder[1] - 1} width={16} height={5} rx={2} fill={machine} />
      </G>;
    case "power-rack": {
      const y = pose.shoulder[1] - 3;
      return <G><Rect x={22} y={9} width={76} height={79} rx={2} fill="none" stroke={frame} strokeWidth={3} />
        <Segment a={[22, 71]} b={[98, 71]} width={2} color={frame} />
        <Segment a={[13, y]} b={[107, y]} width={2.5} />
        <Rect x={19} y={y - 8} width={6} height={16} rx={1} fill={machine} />
        <Rect x={95} y={y - 8} width={6} height={16} rx={1} fill={machine} />
      </G>;
    }
    case "abdominal-crunch":
      return <G><Seat /><Segment a={[42, 34]} b={[42, 63]} width={5} />
        <Segment a={[32, 28]} b={hand} width={3} /><Circle cx={32} cy={28} r={3} fill={machine} />
      </G>;
    case "leg-extension":
    case "seated-leg-curl":
      return <G><Stack x={103} lift={p * 8} /><Seat x={37} width={39} />
        <Segment a={[38, 34]} b={[40, 63]} width={5} />
        <Segment a={pose.legs[0][1]} b={foot} width={5} color={frame} />
        <Circle cx={73} cy={64} r={3} fill={machine} />
        <Ellipse cx={foot[0]} cy={foot[1]} rx={5} ry={3} fill={machine} />
        {type === "seated-leg-curl" && <Rect x={66} y={58} width={13} height={4} rx={2} fill={machine} />}
      </G>;
    case "hip-abduction":
    case "hip-adduction":
      return <G><Seat x={45} y={55} width={30} /><Segment a={[45, 31]} b={[45, 52]} width={4} />
        {pose.legs.map((leg, i) => <G key={i}>
          <Segment a={[60, 59]} b={leg[1]} width={3} color={frame} />
          <Rect x={leg[1][0] + (type === "hip-abduction" ? (i === 0 ? -5 : 2) : (i === 0 ? 2 : -5))} y={leg[1][1] - 4} width={3} height={8} rx={1} fill={machine} />
          <Segment a={[leg[2][0] - 4, leg[2][1] + 1]} b={[leg[2][0] + 4, leg[2][1] + 1]} width={3} />
        </G>)}
      </G>;
    case "seated-calf-raise": {
      const knee = pose.legs[0][1];
      return <G><Stack x={101} lift={p * 5} /><Seat x={34} width={25} />
        <Segment a={[78, 88]} b={[90, 88]} width={4} />
        <Segment a={foot} b={[82, 88]} width={3} color={person} />
        <Segment a={[95, 64]} b={[knee[0], knee[1] - 4]} width={3} />
        <Rect x={knee[0] - 6} y={knee[1] - 5} width={12} height={4} rx={2} fill={machine} />
      </G>;
    }
    case "lateral-raise":
      return <G><Seat x={46} y={63} width={28} />
        <Segment a={[20, 88]} b={[20, 32]} width={3} color={frame} />
        <Segment a={[100, 88]} b={[100, 32]} width={3} color={frame} />
        {pose.arms.map((arm, i) => <G key={i}>
          <Segment a={[i === 0 ? 20 : 100, 32]} b={arm[0]} width={3} color={frame} />
          <Segment a={arm[0]} b={arm[1]} width={6} color={frame} />
          <Rect x={arm[1][0] - 4} y={arm[1][1] - 2} width={8} height={4} rx={2} fill={machine} />
        </G>)}
      </G>;
    case "preacher-curl":
      return <G><Stack x={100} lift={p * 7} /><Seat x={32} width={25} />
        <Segment a={[45, 44]} b={[67, 61]} width={7} />
        <Segment a={[65, 62]} b={[65, 88]} width={3} />
        <Segment a={[61, 54]} b={hand} width={6} color={frame} />
        <Segment a={[hand[0] - 4, hand[1]]} b={[hand[0] + 4, hand[1]]} width={3} />
      </G>;
    case "triceps-pushdown":
      return <G><Stack x={96} lift={p * 9} />
        <Segment a={[86, 12]} b={[102, 12]} width={3} />
        <Circle cx={86} cy={12} r={3} fill={machine} />
        <Segment a={[86, 12]} b={hand} width={1.3} />
        <Segment a={[hand[0] - 5, hand[1]]} b={[hand[0] + 5, hand[1]]} width={3} />
      </G>;
    case "assisted-pull-up":
      return <G><Rect x={18} y={8} width={84} height={80} rx={2} fill="none" stroke={frame} strokeWidth={3} />
        <Stack x={5} lift={-p * 4} /><Segment a={pose.grips[0]} b={pose.grips[1]} width={3} />
        <Segment a={[60, 54]} b={[60, 88]} width={2} color={frame} />
        <Rect x={40} y={pose.legs[0][1][1] + 3} width={40} height={4} rx={2} fill={machine} />
      </G>;
    case "assisted-dip":
      return <G><Stack x={101} lift={-p * 4} />
        <Segment a={[87, 18]} b={[87, 88]} width={4} color={frame} />
        <Segment a={[65, 48]} b={[87, 48]} width={4} />
        <Segment a={[78, 43]} b={[78, 88]} width={2} color={frame} />
        <Rect x={56} y={pose.legs[0][1][1] + 3} width={28} height={4} rx={2} fill={machine} />
      </G>;
    case "back-extension":
      return <G><Segment a={[51, 61]} b={[96, 88]} width={5} color={frame} />
        <Segment a={[55, 53]} b={[69, 62]} width={8} />
        <Circle cx={94} cy={83} r={4} fill={machine} />
        <Segment a={[43, 88]} b={[106, 88]} width={3} />
      </G>;
    case "rear-delt-fly":
      return <G><Rect x={49} y={48} width={22} height={5} rx={2} fill={machine} />
        <Segment a={[60, 53]} b={[60, 72]} width={3} color={frame} />
        {pose.arms.map((arm, i) => <Segment key={i} a={[i === 0 ? 46 : 74, 27]} b={arm[2]} width={4} color={frame} />)}
      </G>;
  }
}
function Figure({ pose, ghost = false }: { pose: ExercisePose; ghost?: boolean }) {
  return <G opacity={ghost ? 0.2 : 1}>
    <Circle cx={pose.head[0]} cy={pose.head[1]} r={5.5} fill={ghost ? "none" : person} stroke={person} strokeWidth={1} />
    {pose.spine
      ? <Polyline points={points(pose.spine)} fill="none" stroke={person} strokeWidth={ghost ? 1 : 7} strokeLinecap="round" strokeLinejoin="round" />
      : <Segment a={pose.shoulder} b={pose.hip} color={person} width={ghost ? 1 : 7} />}
    {pose.camera !== "side" && <Segment a={[pose.shoulder[0] - 11, pose.shoulder[1]]} b={[pose.shoulder[0] + 11, pose.shoulder[1]]} color={person} width={ghost ? 1 : 5} />}
    {[...pose.legs, ...pose.arms].map((limb, i) => <G key={i}>
      <Polyline points={points(limb)} fill="none" stroke={i < pose.legs.length ? "#69849a" : person} strokeWidth={ghost ? 1 : 3.8} strokeDasharray={ghost ? "2 2" : undefined} strokeLinecap="round" strokeLinejoin="round" />
      {!ghost && <Circle cx={limb[1][0]} cy={limb[1][1]} r={1.8} fill="#ffffff" stroke={person} strokeWidth={0.9} />}
    </G>)}
    {!ghost && <>
      <Segment a={pose.highlight[0]} b={pose.highlight[1]} color={target} width={5} />
      {pose.grips.map((p, i) => <Circle key={i} cx={p[0]} cy={p[1]} r={2.4} fill={person} stroke="#ffffff" strokeWidth={1} />)}
    </>}
  </G>;
}
function Marker({ point, number, offset }: { point: Point; number: 1 | 2; offset: number }) {
  const x = Math.max(8, Math.min(112, point[0] + offset));
  const y = Math.max(8, Math.min(88, point[1] - 7));
  const color = number === 1 ? "#173f60" : person;
  return <G>
    <Circle cx={point[0]} cy={point[1]} r={4} stroke={color} strokeWidth={1} fill="none" />
    <Line x1={point[0]} y1={point[1]} x2={x} y2={y} stroke={color} strokeWidth={0.7} />
    <Circle cx={x} cy={y} r={3.7} fill="#ffffff" stroke={color} strokeWidth={0.7} />
    <SvgText x={x} y={y + 1.5} fontSize={4.5} textAnchor="middle" fontWeight="bold" fill={color}>{number}</SvgText>
  </G>;
}
export function ExerciseMotionScene({ type, progress, details = false, returning = false }: { type: string; progress: number; details?: boolean; returning?: boolean }) {
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
    <Ellipse cx={60} cy={89} rx={50} ry={3} fill="#f1f4f6" />
    <Line x1={10} y1={88} x2={110} y2={88} stroke={frame} strokeWidth={1.5} />
    <Hardware type={type} pose={pose} progress={progress} />
    <Figure pose={start} ghost />
    <Polyline points={trajectory} stroke={person} strokeWidth={0.8} strokeDasharray="1 2" fill="none" opacity={0.45} />
    {details && <Polyline points={points(partial)} stroke={person} strokeWidth={1.5} fill="none" opacity={0.75} />}
    <Figure pose={pose} />
    {details && <>
      <Marker point={teaching.fixed} number={1} offset={8} />
      <Marker point={teaching.moving} number={2} offset={-8} />
    </>}
    <Line x1={111 - dx / length * 6} y1={48 - dy / length * 6} x2={tip[0]} y2={tip[1]} stroke={person} strokeWidth={1.4} />
    <Path d={`M ${base[0] - dy / length * 2} ${base[1] + dx / length * 2} L ${tip[0]} ${tip[1]} L ${base[0] + dy / length * 2} ${base[1] - dx / length * 2}`} fill="none" stroke={person} strokeWidth={1.4} />
  </>;
}
