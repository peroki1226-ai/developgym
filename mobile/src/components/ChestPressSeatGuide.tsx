import {ChestPressVariant} from "../domain/training3d";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { useI18n } from "../i18n";
import { colors } from "./ui";

const heights = ["low", "standard", "high"] as const;
type Height = typeof heights[number];
// A relative-height explanation, separate from the moving model's standard setup.
// Handles stay fixed while the seat, torso and shoulder roots move together.
function SeatComparison({ height }: { height: Height }) {
  const { t } = useI18n();
  const offset = height === "low" ? 8 : height === "high" ? -8 : 0;
  const accent = "#b85443", muted = "#e1c8ba";
  return <View accessible accessibilityRole="image" accessibilityLabel={t(`press.seat.${height}.image`)} style={styles.diagram}>
    <Svg viewBox="0 0 200 205" height={205} width="100%" accessibilityElementsHidden>
      <Rect x={58} y={45} width={84} height={108} rx={8} fill="#dce2e7"/>
      <Line x1={22} x2={178} y1={194} y2={194} stroke="#bbc6ce" strokeWidth={2}/>
      <Line x1={100} x2={100} y1={148+offset} y2={192} stroke="#586c7b" strokeWidth={6}/>
      <Line x1={65} x2={135} y1={192} y2={192} stroke="#586c7b" strokeWidth={5}/>
      {offset !== 0 && <Line x1={48} x2={152} y1={148} y2={148} stroke="#8e9da8" strokeDasharray="3 4"/>}
      <G transform={`translate(0 ${offset})`}>
        <Rect testID="press-seat-pad" x={48} y={143} width={104} height={10} rx={4} fill="#425969"/>
        <Circle cx={100} cy={34} r={14} fill="#c9b19b"/>
        <Path d="M93 46 L93 58 Q78 54 67 63 L70 99 Q76 119 72 142 Q100 151 128 142 Q124 119 130 99 L133 63 Q122 54 107 58 L107 46Z" fill="#d4beab" stroke="#ad9682" strokeWidth={1}/>
        {[false,true].map(right => <G key={String(right)} transform={right ? "translate(200 0) scale(-1 1)" : undefined}>
          <Path d="M97 64 Q80 59 70 68 L74 79 Q86 78 97 76Z" fill={height === "high" ? muted : accent}/>
          <Path d="M97 78 Q85 81 74 79 Q77 95 97 98Z" fill={height === "low" ? muted : accent}/>
          <Path d="M97 65 L97 98" stroke="#f5e8de" strokeWidth={1.4}/>
        </G>)}
      </G>
      {[-1,1].map(side => <G key={side}>
        <Path d={`M${100+side*30} ${66+offset} Q${100+side*45} ${78+offset} ${100+side*43} ${93+offset} L${100+side*59} 80`} stroke="#c9b19b" strokeWidth={10} strokeLinecap="round" fill="none"/>
        <Path d={`M${100+side*17} ${151+offset} L${100+side*26} 184 L${100+side*38} 190`} stroke="#c9b19b" strokeWidth={12} strokeLinecap="round" fill="none"/>
        <Line x1={100+side*59} x2={100+side*59} y1={71} y2={88} stroke="#163e5d" strokeWidth={5} strokeLinecap="round"/>
      </G>)}
      <Line testID="press-seat-handle-level" x1={27} x2={173} y1={80} y2={80} stroke="#136b9d" strokeWidth={1.5} strokeDasharray="4 3"/>
    </Svg>
    <Text style={styles.legend}>{t("press.seat.legend")}</Text>
  </View>;
}

export function ChestPressSeatGuide({variant,onVariant}:{variant?:ChestPressVariant;onVariant?:(v:ChestPressVariant)=>void}={}) {
  const { t } = useI18n();
  const [open,setOpen] = useState(false);
  const [localHeight,setHeight] = useState<Height>("standard");
  const height=variant?(variant==="upper"?"low":variant==="lower"?"high":"standard"):localHeight;
  return <View testID="chest-press-seat-guide" style={styles.panel}>
    <Pressable accessibilityRole="button" accessibilityLabel={t("press.seat.title")}
      accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(!open)} style={styles.heading}>
      <Text style={styles.title}>{t("press.seat.title")}</Text><Text style={styles.title}>{open ? "−" : "+"}</Text>
    </Pressable>
    <Text style={styles.text}>{t("press.seat.summary")}</Text>
    {open && <View style={styles.content}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("press.seat.compare")} style={styles.options}>
        {heights.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(`press.seat.${value}.label`)}
          accessibilityState={{ checked: height === value }} aria-checked={height === value} onPress={() => {setHeight(value);onVariant?.(value==="low"?"upper":value==="high"?"lower":"middle");}}
          style={[styles.option,height === value && styles.selected]}><Text style={styles.optionText}>{t(`press.seat.${value}.label`)}</Text></Pressable>)}
      </View>
      <SeatComparison height={height}/>
      <View accessibilityLiveRegion="polite" style={styles.content}>
        <Text style={styles.title}>{t(`press.seat.${height}.position`)}</Text>
        <Text style={styles.text}>{t(`press.seat.${height}.effect`)}</Text>
      </View>
      <Text style={styles.note}>{t("press.seat.limit")}</Text>
      <Text style={styles.text}>{t("press.seat.check")}</Text>
      <Text style={styles.note}>{t("press.seat.model")}</Text>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, gap: 8, backgroundColor: "#fff" },
  heading: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontSize: 14, lineHeight: 22, fontWeight: "600", color: colors.primary, flexShrink: 1 },
  text: { fontSize: 13, lineHeight: 21, color: colors.text }, note: { fontSize: 12, lineHeight: 20, color: colors.muted },
  content: { gap: 10 }, options: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  option: { minHeight: 48, minWidth: 74, flex: 1, padding: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 9 },
  selected: { borderColor: colors.primary, backgroundColor: "#f0f6ff" }, optionText: { fontSize: 13, lineHeight: 20, color: colors.text, textAlign: "center" },
  diagram: { borderRadius: 9, backgroundColor: "#f5f8fa", padding: 8, alignItems: "center" }, legend: { color: "#136b9d", fontSize: 12, lineHeight: 20 },
});
