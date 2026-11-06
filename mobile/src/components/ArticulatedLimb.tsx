import React from "react";
import { ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";
import { Limb } from "../domain/exerciseMotion";
import { articulatedSurface, SurfaceKind } from "../domain/articulatedSurface";
import { between } from "../domain/humanFigure";

export function ArticulatedLimb({ limb, kind, prefix, ghost = false, scale = 1, blendRoot = false }: {
  limb: Limb; kind: SurfaceKind; prefix: string; ghost?: boolean; scale?: number; blendRoot?: boolean;
}) {
  const skin = articulatedSurface(limb, kind, scale), [a, joint, tip] = limb;
  const high = [a[0] + skin.upper.normal[0] * skin.radii[0], a[1] + skin.upper.normal[1] * skin.radii[0]];
  const low = [a[0] - skin.upper.normal[0] * skin.radii[0], a[1] - skin.upper.normal[1] * skin.radii[0]];
  const highlights = [[a, joint], [joint, tip]] as const;
  return <G testID={`articulated-${kind}`}>
    {!ghost && <Defs>
      <ClipPath id={`${prefix}-clip`}><Path d={skin.path} /></ClipPath>
      <LinearGradient id={`${prefix}-tone`} gradientUnits="userSpaceOnUse" x1={high[0]} y1={high[1]} x2={low[0]} y2={low[1]}>
        <Stop offset="0%" stopColor="#b1b1b1" /><Stop offset="35%" stopColor="#dedede" />
        <Stop offset="62%" stopColor="#e6e6e6" /><Stop offset="100%" stopColor="#aaa" />
      </LinearGradient>
      <RadialGradient id={`${prefix}-soft`}><Stop offset="0%" stopColor="#fff" stopOpacity={0.7} /><Stop offset="100%" stopColor="#fff" stopOpacity={0} /></RadialGradient>
      {blendRoot && <RadialGradient id={`${prefix}-shoulder`}>
        <Stop offset="0%" stopColor="#d5d5d5" /><Stop offset="60%" stopColor="#d6d6d6" stopOpacity={0.85} />
        <Stop offset="100%" stopColor="#d6d6d6" stopOpacity={0} />
      </RadialGradient>}
    </Defs>}
    <Path d={skin.path} fill={ghost ? "none" : `url(#${prefix}-tone)`} />
    <Path d={skin.edge} fill="none" stroke={ghost ? "#aaa" : "#767676"} strokeWidth={ghost ? 0.45 : 0.27 * scale}
      strokeDasharray={ghost ? "1.5 1.5" : undefined} strokeLinecap="round" />
    {!ghost && <G clipPath={`url(#${prefix}-clip)`}>
      {highlights.map(([s, e], i) => {
        const centre = between(s, e, i === 0 ? 0.4 : 0.38);
        const angle = Math.atan2(e[1] - s[1], e[0] - s[0]) * 180 / Math.PI;
        return <Ellipse key={i} cx={centre[0]} cy={centre[1]} rx={Math.hypot(e[0] - s[0], e[1] - s[1]) * 0.35}
          ry={skin.radii[i === 0 ? 1 : 6] * 0.73} transform={`rotate(${angle} ${centre[0]} ${centre[1]})`} fill={`url(#${prefix}-soft)`} />;
      })}
      {kind === "leg" && <Ellipse cx={skin.kneecap[0]} cy={skin.kneecap[1]} rx={1.6 * scale} ry={2 * scale}
        fill={`url(#${prefix}-soft)`} transform={`rotate(${Math.atan2(skin.upper.unit[1], skin.upper.unit[0]) * 180 / Math.PI - 90} ${skin.kneecap[0]} ${skin.kneecap[1]})`} />}
      <Path d={skin.crease} fill="none" stroke="#969696" strokeWidth={0.38 * scale} strokeLinecap="round" />
    </G>}
    {!ghost && blendRoot && <Ellipse cx={a[0]+skin.upper.unit[0]*0.4} cy={a[1]+skin.upper.unit[1]*0.4}
      rx={skin.radii[0]*1.12} ry={skin.radii[0]*1.08} fill={`url(#${prefix}-shoulder)`} />}
  </G>;
}
