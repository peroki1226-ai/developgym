import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { MotionPhase } from "../domain/exerciseMotion";
import { contractionFrame, Muscle, muscleSpec } from "../domain/muscleMotion";
import { useI18n } from "../i18n";
import { colors } from "./ui";

export function MuscleContractionPanel({ type, progress, phase }: { type: string; progress: number; phase: MotionPhase }) {
  const { t } = useI18n(), spec = muscleSpec(type);
  const [selected, setSelected] = useState<Muscle>(spec.focus);
  const frame = contractionFrame(type, selected, progress, phase);
  const start = (180 - frame.length) / 2, end = 180 - start;
  return <View style={styles.panel} testID="muscle-contraction-panel">
    <Text style={styles.title}>{t("muscle.targets")}</Text>
    <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={t("muscle.select")}>
      {spec.primary.map(m => <Pressable key={m} accessibilityRole="radio" accessibilityLabel={t(`muscle.${m}`)}
        accessibilityState={{ checked: selected === m }} aria-checked={selected === m}
        onPress={() => setSelected(m)} style={[styles.choice, selected === m && styles.selected]}>
        <View style={styles.dot} /><Text style={styles.choiceText}>{t(`muscle.${m}`)}</Text>
      </Pressable>)}
    </View>
    <Text style={styles.note}>{t("muscle.cutaway")}</Text>
    <Text style={styles.subtitle}>{t("muscle.fibers")}</Text>
    <Text testID="muscle-phase" style={styles.phase}>{t(frame.label)}</Text>
    <View accessible accessibilityRole="image" accessibilityLabel={t("muscle.diagram", { 0: t(`muscle.${selected}`), 1: t(frame.label) })}>
      <Svg viewBox="0 0 180 98" style={styles.svg}>
        <Path d={`M 12,22 L ${start},22 M ${end},22 L 168,22`} stroke="#a7a7a7" strokeWidth={3} />
        <Path testID="muscle-bundle" d={`M ${start},22 C ${start + 10},${22 - frame.radius} ${end - 10},${22 - frame.radius} ${end},22 C ${end - 10},${22 + frame.radius} ${start + 10},${22 + frame.radius} ${start},22 Z`}
          fill="#b95749" stroke="#7d3d35" strokeWidth={0.7} />
        {[-0.5, 0, 0.5].map(f => <Path key={f} d={`M ${start + 5},22 Q 90,${22 + frame.radius * f * 1.65} ${end - 5},22`} fill="none" stroke="#f4beb0" strokeWidth={0.6} />)}
        <Path d="M 86,34 L 80,45 M 94,34 L 100,45" fill="none" stroke="#aaa" strokeWidth={0.6} strokeDasharray="2 2" />
        <Rect x={10} y={47} width={160} height={48} rx={7} fill="#fff" stroke="#ddd" strokeWidth={0.5} />
        <SvgText x={90} y={57} textAnchor="middle" fontSize={5} fill="#666">{t("muscle.sarcomere")}</SvgText>
        <G testID="sarcomere-filaments">
          <Line x1={frame.zLeft} x2={frame.zRight} y1={86} y2={86} stroke="#ddd" strokeWidth={0.5} />
          {[66, 76].map(y => <G key={y}>
            <Line x1={frame.zLeft} x2={frame.zLeft + 42} y1={y - 2} y2={y - 2} stroke="#bb5749" strokeWidth={1.4} />
            <Line x1={frame.zRight} x2={frame.zRight - 42} y1={y + 2} y2={y + 2} stroke="#bb5749" strokeWidth={1.4} />
            <Line x1={63} x2={117} y1={y} y2={y} stroke="#5b514f" strokeWidth={2} />
            {[70, 80, 90, 100, 110].map(x => <Path key={x} d={`M ${x},${y} l -1.5,-2.5 M ${x + 1},${y} l 1.5,2.5`} stroke="#5b514f" strokeWidth={0.6} />)}
          </G>)}
          {[frame.zLeft, frame.zRight].map((x, i) => <Line key={i} x1={x} x2={x} y1={61} y2={83} stroke="#8b4840" strokeWidth={1.7} />)}
          <Circle cx={frame.zLeft} cy={86} r={1.3} fill="#8b4840" /><Circle cx={frame.zRight} cy={86} r={1.3} fill="#8b4840" />
        </G>
      </Svg>
    </View>
    <Text style={styles.note}>{t("muscle.filamentLegend")}</Text>
    <Text style={styles.note}>{t(frame.isometric ? "muscle.isoHint" : "muscle.slidingHint")}</Text>
    <Text style={styles.note}>{t("muscle.limit")}</Text>
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 12, gap: 7, backgroundColor: "#faf8f7", borderWidth: 1, borderColor: "#e5dedb", borderRadius: 14 },
  title: { color: colors.text, fontSize: 13, fontWeight: "600" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { minHeight: 48, paddingHorizontal: 9, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#e4deda", borderRadius: 10, backgroundColor: "#fff" },
  selected: { borderColor: "#ae6b5f", backgroundColor: "#f7eeeb" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#b95749" },
  choiceText: { color: colors.text, fontSize: 12 },
  subtitle: { color: colors.text, fontSize: 12, fontWeight: "600" },
  phase: { color: "#7d3d35", fontSize: 12, lineHeight: 20, minHeight: 40 },
  svg: { width: "100%", height: 170 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});
