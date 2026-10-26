import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { Body } from "./ui";
import { WeightEntry, weightChart } from "../domain/nutrition";
export function WeightChart({
  weights,
  target,
}: {
  weights: WeightEntry[];
  target: number | null;
}) {
  const chart = weightChart(weights, target);
  if (!chart) return <Body>体重を記録すると推移グラフが表示されます。</Body>;
  const { entries, points } = chart;
  return (
    <View
      accessible
      accessibilityLabel={`体重推移 ${entries.length}件。${entries[0].date} ${entries[0].kg}kgから${entries[entries.length - 1].date} ${entries[entries.length - 1].kg}kg。目標${target === null ? "未設定" : `${target}kg`}`}
    >
      <Svg width="100%" height={190} viewBox="0 0 320 180">
        <SvgText x={4} y={12} fontSize={9} fill="#d4d4d8">
          {chart.max.toFixed(1)} kg
        </SvgText>
        <SvgText x={4} y={158} fontSize={9} fill="#d4d4d8">
          {chart.min.toFixed(1)} kg
        </SvgText>
        <Line x1={24} x2={296} y1={144} y2={144} stroke="#404040" />
        {chart.targetY !== null && (
          <>
            <Line
              x1={24}
              x2={296}
              y1={chart.targetY}
              y2={chart.targetY}
              stroke="#a1a1aa"
              strokeDasharray="4 4"
            />
            <SvgText
              x={296}
              y={Math.max(12, chart.targetY - 5)}
              textAnchor="end"
              fill="#d4d4d8"
              fontSize={10}
            >
              目標 {target}kg
            </SvgText>
          </>
        )}
        {points.length > 1 && (
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke="#ffffff"
            fill="none"
            strokeWidth={2}
          />
        )}
        {points.map((p, i) => (
          <Circle
            key={entries[i].date}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#ffffff"
          />
        ))}
        <SvgText x={24} y={175} fill="#d4d4d8" fontSize={10}>
          {entries[0].date.slice(5)}
        </SvgText>
        <SvgText x={296} y={175} textAnchor="end" fill="#d4d4d8" fontSize={10}>
          {entries[entries.length - 1].date.slice(5)}
        </SvgText>
      </Svg>
      <Body>直近{entries.length}記録 / 点線は目標体重</Body>
    </View>
  );
}
