import {ChestPressVariant} from "../domain/training3d";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path } from "react-native-svg";
import { chestLesson } from "../domain/chestLessons";
import { useI18n } from "../i18n";
import { ChestPressSeatGuide } from "./ChestPressSeatGuide";
import { colors } from "./ui";

const angles = [
  { id: "flat", degrees: 0 }, { id: "low", degrees: 30 },
  { id: "mid", degrees: 45 }, { id: "high", degrees: 60 },
] as const;
type Angle = typeof angles[number];

// Position/angle teaching diagram only. It never retargets the moving model.
function BenchAngleComparison({ angle, onSelect }: { angle: Angle; onSelect: (value: Angle) => void }) {
  const { t } = useI18n();
  const rad = angle.degrees * Math.PI / 180;
  const hip = [152 + Math.sin(rad) * 13, 144 - Math.cos(rad) * 13];
  return <View style={styles.content}>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("chest.angle.compare")} style={styles.options}>
      {angles.map(value => <Pressable key={value.id} accessibilityRole="radio"
        accessibilityLabel={t(`chest.angle.${value.id}.label`)}
        accessibilityState={{ checked: angle.id === value.id }} aria-checked={angle.id === value.id}
        onPress={() => onSelect(value)} style={[styles.option, angle.id === value.id && styles.selected]}>
        <Text style={styles.text}>{t(`chest.angle.${value.id}.label`)}</Text>
      </Pressable>)}
    </View>
    <View accessible accessibilityRole="image" accessibilityLabel={t(`chest.angle.${angle.id}.image`)} style={styles.diagram}>
      <Svg viewBox="0 0 300 195" height={195} width="100%" accessibilityElementsHidden>
        <Line x1={24} x2={276} y1={183} y2={183} stroke="#b6c4ce" strokeWidth={2}/>
        <Path d="M72 182 L152 144 L206 182 M152 144 H194" fill="none" stroke="#586c7b" strokeWidth={6} strokeLinejoin="round"/>
        <Line x1={38} x2={152} y1={144} y2={144} stroke="#94a8b5" strokeDasharray="4 4"/>
        <G transform={`translate(152 144) rotate(${angle.degrees})`}>
          <Line testID="chest-angle-backrest" x1={-111} x2={0} y1={0} y2={0} stroke="#334d61" strokeWidth={12} strokeLinecap="round"/>
          <Circle cx={-95} cy={-22} r={11} fill="#c9b19b"/>
          <Path d="M-86 -21 L-76 -22 Q-64 -33 -42 -30 Q-24 -29 1 -24 L9 -8 Q-20 -4 -42 -7 L-70 -10 L-82 -15Z" fill="#d4beab" stroke="#ad9682" strokeWidth={1}/>
          <Path d="M-68 -28 Q-57 -34 -43 -29 L-40 -15 Q-55 -13 -67 -19Z" fill="#b85443"/>
          {angle.id === "flat" && <Path d="M-43 -29 L-27 -26 L-25 -12 L-40 -15Z" fill="#b85443"/>}
          <Circle cx={-73} cy={-21} r={8} fill={angle.id === "mid" || angle.id === "high" ? "#b85443" : "#c9b19b"}/>
          <Path d="M-73 -18 L-53 -5 L-26 -10" fill="none" stroke="#c9b19b" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"/>
        </G>
        <Path d={`M${hip[0]} ${hip[1]} L202 148 L214 177 L228 181`} fill="none" stroke="#c9b19b" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
      <Text style={styles.note}>{t("chest.angle.example", { 0: angle.degrees })}</Text>
    </View>
    <View accessibilityLiveRegion="polite" style={styles.content}>
      <Text style={styles.title}>{t(`chest.angle.${angle.id}.target`)}</Text>
      <Text style={styles.text}>{t(`chest.angle.${angle.id}.effect`)}</Text>
    </View>
    <Text style={styles.note}>{t("chest.angle.limit")}</Text>
  </View>;
}

function EquipmentSetup({ type,pressVariant,onPressVariant }: { type: string;pressVariant?:ChestPressVariant;onPressVariant?:(v:ChestPressVariant)=>void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedAngle, setSelectedAngle] = useState<Angle>(angles[1]);
  const lesson = chestLesson(type)!;
  const angle = type === "dumbbell-heavy" || type === "incline-bench-press";
  const prefix = `${lesson.prefix}.settings`;
  return <View testID="chest-equipment-setup" style={styles.panel}>
    <Pressable accessibilityRole="button" accessibilityLabel={t(`${prefix}.title`)}
      accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(!open)} style={styles.heading}>
      <Text style={styles.title}>{t(`${prefix}.title`)}</Text><Text style={styles.title}>{open ? "−" : "+"}</Text>
    </Pressable>
    <Text style={styles.text}>{t(`${prefix}.summary`)}</Text>
    {open && <View style={styles.content}>
      {angle && <BenchAngleComparison angle={selectedAngle} onSelect={setSelectedAngle}/>}
      <Text style={styles.title}>{t("chest.settings.basic")}</Text>
      <Text style={styles.text}>{t(`${prefix}.fit`)}</Text>
      <Text style={styles.title}>{t("chest.settings.emphasis")}</Text>
      <Text style={styles.text}>{t(`${prefix}.emphasis`)}</Text>
      <Text style={styles.note}>{t(`${prefix}.check`)}</Text>
      <Text style={styles.note}>{t("chest.settings.model")}</Text>
    </View>}
  </View>;
}

export function ChestSetupGuide({ type,pressVariant,onPressVariant }: { type: string;pressVariant?:ChestPressVariant;onPressVariant?:(v:ChestPressVariant)=>void }) {
  if (type === "chest-press") return <ChestPressSeatGuide variant={pressVariant} onVariant={onPressVariant}/>;
  if (!chestLesson(type)) return null;
  return <EquipmentSetup key={type} type={type}/>;
}
const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, gap: 8, backgroundColor: "#fff" },
  heading: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: colors.primary, fontSize: 14, fontWeight: "600", lineHeight: 22, flexShrink: 1 },
  text: { color: colors.text, fontSize: 13, lineHeight: 21 }, note: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  content: { gap: 10 }, options: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  option: { flexGrow: 1, flexBasis: "45%", minHeight: 48, padding: 8, justifyContent: "center", alignItems: "center", borderRadius: 9, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: "#f0f6ff", borderColor: colors.primary }, diagram: { backgroundColor: "#f5f8fa", padding: 8, borderRadius: 9, alignItems: "center" },
});
