import React from "react";
import { Circle, G, Line, Polygon, Polyline, Rect } from "react-native-svg";
import { projectPhotoChest } from "../domain/photoChestProjection";
import { V3, LegPressVariant, trainingFrame3d, add3, mul3 } from "../domain/training3d";

const colours = { metal: "#53585d", satin: "#a3a9ae", chrome: "#c6cbd0", rubber: "#292c30", pad: "#292c30" };

export function PhotoChestEquipment({ type, progress, variant }: { type: string; progress: number; variant?: LegPressVariant }) {
  const frame = trainingFrame3d(type, progress, variant), project = (p: V3) => projectPhotoChest(type, p);
  return <G testID="photo-chest-equipment">{frame.equipment.map(item => {
    const [x, y] = project(item.a), fill = colours[item.color];
    if (item.kind === "curve") {
      const axes = item.axes ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const points = item.points!.map(p => project([0, 1, 2].map(i => item.a[i] + axes[0][i] * p[0] + axes[1][i] * p[1] + axes[2][i] * p[2]) as unknown as V3).join(",")).join(" ");
      return <Polyline key={item.id} testID={"photo-gear-" + item.id} points={points} fill="none" stroke={fill} strokeWidth={item.section! * .84} strokeLinejoin="round" strokeLinecap="round" />;
    }
    if (item.b) {
      const [x2, y2] = project(item.b);
      const width = item.size[0] * (item.kind === "tube" ? .84 : 1.68);
      return <Line key={item.id} testID={"photo-gear-" + item.id} x1={x} y1={y} x2={x2} y2={y2} stroke={fill} strokeWidth={width} strokeLinecap="round" />;
    }
    if (item.axes && ["box", "pad"].includes(item.kind) && (["free-bench-back", "free-bench-back-shell"].includes(item.id) || item.id.startsWith("smith-"))) {
      // Project the actual pad plane. An upright screen Rect discards its axes
      // and makes a horizontal bench look like a vertical/sloped backrest.
      const corner = (u: number, v: number, w: number) => project(add3(item.a, add3(
        mul3(item.axes![0],u*item.size[0]/2),add3(mul3(item.axes![1],v*item.size[1]/2),mul3(item.axes![2],w*item.size[2]/2)))));
      const signs = [[-1,-1],[1,-1],[1,1],[-1,1]];
      const top = signs.map(([u,v])=>corner(u,v,1)), bottom = signs.map(([u,v])=>corner(u,v,-1));
      const points = (p: readonly (readonly number[])[]) => p.map(c=>c.join(",")).join(" ");
      return <G key={item.id} testID={"photo-gear-"+item.id}>
        {top.map((p,i)=><Polygon key={i} points={points([p,top[(i+1)%4],bottom[(i+1)%4],bottom[i]])} fill={fill} stroke="#666" strokeWidth={.2}/>)}
        <Polygon testID={"photo-gear-"+item.id+"-top"} points={points(top)} fill={fill} stroke="#666" strokeWidth={.2}/>
      </G>;
    }
    if (["cylinder", "bolt", "pulley"].includes(item.kind)) return <Circle key={item.id} testID={"photo-gear-" + item.id} cx={x} cy={y} r={Math.max(.25, item.size[0] * .65)} fill={fill} stroke="#555" strokeWidth={.2} />;
    return <Rect key={item.id} testID={"photo-gear-" + item.id} x={x - item.size[0] * .42} y={y - item.size[1] * .43} width={item.size[0] * .84} height={item.size[1] * .86} rx={item.kind === "pad" ? 1.1 : .3} fill={fill} stroke="#666" strokeWidth={.2} />;
  })}</G>;
}
