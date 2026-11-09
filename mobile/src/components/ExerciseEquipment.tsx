import React from "react";
import { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import { ExercisePose, motionType, Point } from "../domain/exerciseMotion";
import { beamSurface, boxSurface, polygonPoints } from "../domain/equipmentSurface";
import { LegPressVariant } from "../domain/training3d";
import { PhotoChestEquipment } from "./PhotoChestEquipment";

const machine = "#686868", frame = "#a8a8a8", person = "#666666";
function Segment({ a, b, color = machine, width = 2 }: { a: Point; b: Point; color?: string; width?: number }) {
  const padded = width >= 5;
  const volume = beamSurface(a, b, width, padded ? [2.2, -1.5] : [2.8, -1.8]);
  return <G>
    <Polygon points={polygonPoints(volume.side)} fill={padded ? "#343434" : "#8b8b8b"} stroke="#686868" strokeWidth={0.25} />
    <Polygon points={polygonPoints(volume.cap)} fill={padded ? "#777" : "#ddd"} stroke="#888" strokeWidth={0.25} />
    <Line x1={a[0]} y1={a[1] + 0.35} x2={b[0]} y2={b[1] + 0.35} stroke="#444" strokeWidth={width + 0.7} strokeLinecap="round" />
    <Line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={padded ? "#454545" : color} strokeWidth={width} strokeLinecap="round" />
    <Line x1={a[0] - 0.35} y1={a[1] - 0.45} x2={b[0] - 0.35} y2={b[1] - 0.45}
      stroke={padded ? "#727272" : "#ededed"} strokeWidth={Math.max(0.3, width * 0.18)} strokeLinecap="round" />
  </G>;
}
function Pivot({ cx, cy, r = 3 }: { cx: number; cy: number; r?: number; fill?: string }) {
  return <G><Circle cx={cx + 0.8} cy={cy - 0.5} r={r + 0.25} fill="#666" />
    <Circle cx={cx} cy={cy} r={r + 0.25} fill="#353535" />
    <Circle cx={cx - 0.25} cy={cy - 0.25} r={r * 0.78} fill="#b6b6b6" />
    <Circle cx={cx} cy={cy} r={r * 0.3} fill="#555" />
    <Path d={`M ${cx - 0.6},${cy} h 1.2`} stroke="#ddd" strokeWidth={0.3} />
  </G>;
}
function Plate({ x, y, radius = 5 }: { x: number; y: number; radius?: number }) {
  return <G><Ellipse cx={x + 2} cy={y - 1.3} rx={radius * 0.55} ry={radius} fill="#333" />
    <Path d={`M ${x},${y-radius} l 2,-1.3 v ${radius*2} l -2,1.3 Z`} fill="#4b4b4b" />
    <Ellipse cx={x} cy={y} rx={radius * 0.55} ry={radius} fill="#737373" stroke="#383838" strokeWidth={0.5} />
    <Ellipse cx={x} cy={y} rx={radius * 0.35} ry={radius * 0.78} fill="none" stroke="#aaa" strokeWidth={0.4} />
    <Circle cx={x} cy={y} r={0.75} fill="#ddd" stroke="#333" strokeWidth={0.3} />
  </G>;
}
function Seat({ x = 43, y = 66, width = 24 }: { x?: number; y?: number; width?: number }) {
  const volume = boxSurface(x, y, width, 4);
  return <G>
    <Polygon points={polygonPoints(volume.top)} fill="#777" stroke="#444" strokeWidth={0.3} />
    <Polygon points={polygonPoints(volume.side)} fill="#333" stroke="#222" strokeWidth={0.3} />
    <Rect x={x - 0.5} y={y + 1} width={width + 1} height={4} rx={1.4} fill="#343434" />
    <Rect x={x} y={y} width={width} height={3.7} rx={1.4} fill="#555" stroke="#292929" strokeWidth={0.45} />
    <Path d={`M ${x + 2},${y + 0.8} h ${width - 4}`} stroke="#929292" strokeWidth={0.4} />
    <Segment a={[x + 9, y + 4]} b={[x + 9, 88]} width={3} />
    <Rect x={x + 4} y={87.3} width={11} height={2} rx={0.8} fill="#414141" />
  </G>;
}
function Stack({ x, lift }: { x: number; lift: number }) {
  const volume = boxSurface(x, 12, 11, 76);
  return <G>
    <Polygon points={polygonPoints(volume.top)} fill="#e0e0e0" stroke="#777" strokeWidth={0.4} />
    <Polygon points={polygonPoints(volume.side)} fill="#9b9b9b" stroke="#666" strokeWidth={0.4} />
    <Rect x={x} y={12} width={11} height={76} rx={2} fill="#d0d0d0" stroke="#6d6d6d" strokeWidth={0.6} />
    <Rect x={x + 1.2} y={15} width={8.6} height={70} rx={1} fill="#ededed" stroke="#aaa" strokeWidth={0.4} />
    {[3, 8].map(dx => <Segment key={dx} a={[x + dx, 17]} b={[x + dx, 84]} color="#bebebe" width={0.65} />)}
    {Array.from({ length: 8 }, (_, i) => <G key={i}>
      <Rect x={x + 1.4} y={64 + i * 2.5 - lift} width={8.2} height={2} rx={0.35} fill="#676767" stroke="#414141" strokeWidth={0.25} />
      <Line x1={x + 1.8} x2={x + 8.8} y1={64.3 + i * 2.5 - lift} y2={64.3 + i * 2.5 - lift} stroke="#aaa" strokeWidth={0.3} />
    </G>)}
    <Circle cx={x + 5.5} cy={71 - lift} r={0.8} fill="#d5d5d5" stroke="#333" strokeWidth={0.3} />
    <Rect x={x + 2} y={16} width={7} height={4} rx={0.5} fill="#555" />
    <Line x1={x + 3} y1={17.5} x2={x + 8} y2={17.5} stroke="#ccc" strokeWidth={0.4} />
    <Rect x={x - 0.5} y={86} width={12} height={3} rx={1} fill="#505050" />
  </G>;
}

export function EquipmentRearFrame({ type }: { type: string }) {
  const rack = type === "power-rack" || type === "assisted-pull-up";
  if (rack) {
    const left = type === "power-rack" ? 22 : 18, right = type === "power-rack" ? 98 : 102;
    return <G testID="equipment-rear-frame" opacity={0.65}>
      <Segment a={[left+5, 6]} b={[left+5, 84]} width={2.4} color="#999" />
      <Segment a={[right+5, 6]} b={[right+5, 84]} width={2.4} color="#999" />
      <Segment a={[left+5, 6]} b={[right+5, 6]} width={2.4} color="#999" />
      {[left,right].map(x=><G key={x}>
        <Segment a={[x, 9]} b={[x+5, 6]} width={2.4} color="#999" />
        <Segment a={[x, 88]} b={[x+5, 84]} width={2.4} color="#999" />
      </G>)}
    </G>;
  }
  if (type === "leg-press" || type === "hack-squat") {
    const a: Point = type === "leg-press" ? [54,81] : [26,86];
    const b: Point = type === "leg-press" ? [106,29] : [99,13];
    return <G testID="equipment-rear-frame" opacity={0.6}>
      <Segment a={[a[0]+5,a[1]-3]} b={[b[0]+5,b[1]-3]} width={3} color="#aaa" />
      <Segment a={a} b={[a[0]+5,a[1]-3]} width={3} color="#aaa" />
      <Segment a={b} b={[b[0]+5,b[1]-3]} width={3} color="#aaa" />
    </G>;
  }
  return null;
}

export function EquipmentGrips({ type, pose }: { type: string; pose: ExercisePose }) {
  const bar = ["incline-smith", "dumbbell-heavy", "power-rack", "lat-pulldown", "assisted-pull-up"].includes(type);
  return <G testID="equipment-grips">{pose.arms.map(([, e, hand],i)=>{
    const angle = bar ? 0 : Math.atan2(hand[1]-e[1],hand[0]-e[0])*180/Math.PI + 90;
    return <G key={i} transform={`translate(${hand[0]} ${hand[1]}) rotate(${angle})`}>
      <Path d="M -3,0 H 3" stroke="#333" strokeWidth={2.2} strokeLinecap="round" />
      {[-2,-1,0,1,2].map(x=><Line key={x} x1={x} x2={x} y1={-0.75} y2={0.75} stroke="#8e8e8e" strokeWidth={0.25} />)}
    </G>;
  })}</G>;
}
export function ExerciseEquipment({ type: raw, pose, progress: p, variant }: { type: string; pose: ExercisePose; progress: number; variant?: LegPressVariant }) {
  const type = motionType(raw), hand = pose.grips[0], foot = pose.legs[0]?.[2] ?? [0, 0];
  if (["leg-press", "leg-extension", "hip-adduction"].includes(type)) return <PhotoChestEquipment type={type} progress={p} variant={variant} />;
  switch (type) {
    case "chest-press":
    case "pec-fly":
      return <PhotoChestEquipment type={type} progress={p} />;
    case "cable-machine":
      return <G><Stack x={8} lift={p * 8} /><Stack x={101} lift={p * 8} />
        <Segment a={[13, 18]} b={pose.grips[0]} /><Segment a={[106, 18]} b={pose.grips[1]} />
        <Pivot cx={13} cy={18} r={3} fill={machine} /><Pivot cx={106} cy={18} r={3} fill={machine} />
      </G>;
    case "incline-smith":
    case "dumbbell-heavy":
      return <G><Segment a={[33, 46]} b={[62, 72]} width={6} /><Segment a={[62, 72]} b={[79, 68]} width={5} />
        <Segment a={[59, 73]} b={[59, 88]} width={3} />
        {type === "incline-smith" ? <G>
          <Segment a={[65, 9]} b={[65, 88]} color={frame} width={3} /><Segment a={[83, 9]} b={[83, 88]} color={frame} width={3} />
          <Segment a={[44, hand[1]]} b={[87, hand[1]]} width={2.5} />
          <Plate x={82} y={hand[1]} radius={6} />
        </G> : <G>
          <Segment a={[hand[0] - 8, hand[1]]} b={[hand[0] + 8, hand[1]]} width={2} />
          <Plate x={hand[0] - 7} y={hand[1]} /><Plate x={hand[0] + 7} y={hand[1]} />
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
        <Segment a={[26, 34]} b={hand} width={3} /><Pivot cx={26} cy={34} r={3} fill={machine} />
        <Stack x={98} lift={p * 9} />
      </G>;
    case "leg-press":
      return <G><Segment a={[19, 47]} b={[40, 75]} width={6} /><Segment a={[40, 75]} b={[55, 72]} width={5} />
        <Segment a={[54, 81]} b={[106, 29]} width={3} color={frame} />
        <Segment a={[foot[0] - 7, foot[1] - 7]} b={[foot[0] + 7, foot[1] + 7]} width={5} />
        <Pivot cx={foot[0] + 8} cy={foot[1] + 9} r={4} fill={machine} />
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
        <Segment a={[26, 9]} b={[26, 88]} width={1.4} color="#777" />
        <Segment a={[94, 9]} b={[94, 88]} width={1.4} color="#777" />
        {[24, 96].map(x => <G key={x}>{[24, 34, 44, 54, 64].map(y => <Circle key={y} cx={x} cy={y} r={0.55} fill="#555" />)}
          <Rect x={x - 6} y={86} width={12} height={3} rx={0.7} fill="#444" />
        </G>)}
        <Segment a={[22, 71]} b={[98, 71]} width={2} color={frame} />
        <Segment a={[13, y]} b={[107, y]} width={2.5} />
        <Plate x={22} y={y} radius={8} /><Plate x={98} y={y} radius={8} />
      </G>;
    }
    case "abdominal-crunch":
      return <G><Seat /><Segment a={[42, 34]} b={[42, 63]} width={5} />
        <Segment a={[32, 28]} b={hand} width={3} /><Pivot cx={32} cy={28} r={3} fill={machine} />
      </G>;
    case "leg-extension":
    case "seated-leg-curl":
      return <G><Stack x={103} lift={p * 8} /><Seat x={37} width={39} />
        <Segment a={[38, 34]} b={[40, 63]} width={5} />
        <Segment a={pose.legs[0][1]} b={foot} width={5} color={frame} />
        <Pivot cx={73} cy={64} r={3} fill={machine} />
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
        <Pivot cx={86} cy={12} r={3} fill={machine} />
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
        <Pivot cx={94} cy={83} r={4} fill={machine} />
        <Segment a={[43, 88]} b={[106, 88]} width={3} />
      </G>;
    case "rear-delt-fly":
      return <G><Rect x={49} y={48} width={22} height={5} rx={2} fill={machine} />
        <Segment a={[60, 53]} b={[60, 72]} width={3} color={frame} />
        {pose.arms.map((arm, i) => <Segment key={i} a={[i === 0 ? 46 : 74, 27]} b={arm[2]} width={4} color={frame} />)}
      </G>;
  }
}

/** Contact pads sit in front of the body, keeping straps/rollers visible against the cutaway. */
export function EquipmentContacts({ type, pose }: { type: string; pose: ExercisePose }) {
  const foot = pose.legs[0]?.[2], knee = pose.legs[0]?.[1];
  if (type === "lat-pulldown") return <Segment a={[43, 68]} b={[77, 68]} width={4} />;
  if ((type === "leg-extension" || type === "seated-leg-curl") && foot) return <G>
    <Ellipse cx={foot[0]} cy={foot[1]} rx={4.5} ry={2.5} fill="#454545" stroke="#292929" strokeWidth={0.4} />
    <Ellipse cx={foot[0] - 3} cy={foot[1]} rx={1.2} ry={2.3} fill="#898989" />
    <Path d={`M ${foot[0]-2},${foot[1]-1.5} h 4`} stroke="#929292" strokeWidth={0.35} />
    {type === "seated-leg-curl" && <Rect x={66} y={58} width={13} height={4} rx={1.3} fill="#454545" stroke="#999" strokeWidth={0.4} />}
  </G>;
  if (type === "seated-calf-raise" && knee) return <Rect x={knee[0]-6} y={knee[1]-5} width={12} height={4} rx={1.2} fill="#454545" stroke="#888" strokeWidth={0.4} />;
  if (type === "lateral-raise") return <G>{pose.arms.map(([,e],i)=><Rect key={i} x={e[0]-4} y={e[1]-2} width={8} height={4} rx={1.4} fill="#454545" stroke="#aaa" strokeWidth={0.4} />)}</G>;
  if (type === "hip-abduction" || type === "hip-adduction") return <G>{pose.legs.map(([,k],i)=><Rect key={i}
    x={k[0]+(type==="hip-abduction"?(i===0?-5:2):(i===0?2:-5))} y={k[1]-4} width={3} height={8} rx={0.9} fill="#454545" stroke="#999" strokeWidth={0.4} />)}</G>;
  return null;
}
