import { useI18n } from "../i18n";
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
  const { t } = useI18n();
  const chart = weightChart(weights, target);
  if (!chart)
    return <Body>{t("体重を記録すると推移グラフが表示されます。")}</Body>;
  const { entries, points } = chart;
  return (
    <View
      accessible
      accessibilityLabel={t("体重推移 {0}件。{1} {2}kgから{3} {4}kg。目標{5}", {
        "0": entries.length,
        "1": entries[0].date,
        "2": entries[0].kg,
        "3": entries[entries.length - 1].date,
        "4": entries[entries.length - 1].kg,
        "5": target === null ? t("未設定") : `${target}${t("kg")}`,
      })}
    >
      <Svg width="100%" height={190} viewBox="0 0 320 180">
        <SvgText x={4} y={12} fontSize={9} fill="#526d8c">
          {chart.max.toFixed(1)} {t("kg")}
        </SvgText>
        <SvgText x={4} y={158} fontSize={9} fill="#526d8c">
          {chart.min.toFixed(1)} {t("kg")}
        </SvgText>
        <Line x1={24} x2={296} y1={144} y2={144} stroke="#d8e6f5" />
        {chart.targetY !== null && (
          <>
            <Line
              x1={24}
              x2={296}
              y1={chart.targetY}
              y2={chart.targetY}
              stroke="#8ca4bd"
              strokeDasharray="4 4"
            />
            <SvgText
              x={296}
              y={Math.max(12, chart.targetY - 5)}
              textAnchor="end"
              fill="#526d8c"
              fontSize={10}
            >
              {t("目標 ")}
              {target}
              {t("kg")}
            </SvgText>
          </>
        )}
        {points.length > 1 && (
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            stroke="#254f70"
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
            fill="#254f70"
          />
        ))}
        <SvgText x={24} y={175} fill="#526d8c" fontSize={10}>
          {entries[0].date.slice(5)}
        </SvgText>
        <SvgText x={296} y={175} textAnchor="end" fill="#526d8c" fontSize={10}>
          {entries[entries.length - 1].date.slice(5)}
        </SvgText>
      </Svg>
      <Body>
        {t("直近")}
        {entries.length}
        {t("記録 / 点線は目標体重")}
      </Body>
    </View>
  );
}
