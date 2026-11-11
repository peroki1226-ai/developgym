import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, G } from "react-native-svg";
import { CHEST_LESSONS, ChestLesson } from "../domain/chestLessons";
import { useI18n } from "../i18n";
import { Body, Button, Card, Heading, colors } from "./ui";

export function ChestCoursePicker({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  return <Card>
    <Heading>{t("chest.course.title")}</Heading>
    <Body>{t("chest.course.hint")}</Body>
    <Button title={t("chest.course.choose")} variant="quiet" onPress={() => setExpanded(value => !value)} />
    {expanded && <View accessibilityRole="radiogroup" accessibilityLabel={t("chest.course.title")} style={styles.list}>
      {CHEST_LESSONS.map((lesson, index) => <Pressable key={lesson.id} accessibilityRole="radio"
        accessibilityLabel={t("chest.course.select", { 0: t(`${lesson.prefix}.name`) })}
        accessibilityState={{ checked: lesson.id === selected }} aria-checked={lesson.id === selected}
        onPress={() => { onSelect(lesson.id); setExpanded(false); }} style={[styles.lesson, lesson.id === selected && styles.selected]}>
        <Text style={styles.number}>{index + 1}</Text><Text style={styles.lessonText}>{t(`${lesson.prefix}.name`)}</Text>
        <Text style={styles.tick}>{lesson.id === selected ? "✓" : "›"}</Text>
      </Pressable>)}
    </View>}
  </Card>;
}

// An overview map, separate from the animated anatomical model above it.
function ChestTargetMap({ emphasis }: { emphasis: ChestLesson["emphasis"] }) {
  const { t } = useI18n();
  const accent = "#ba563e", muted = "#e6c9bb";
  return <View accessibilityRole="image" accessibilityLabel={t("chest.map.label")} style={styles.map}>
    <Svg viewBox="0 0 160 172" width={140} height={150} accessibilityElementsHidden>
      <Circle cx={80} cy={18} r={13} fill="#d8c9bb" />
      <Path d="M71 30 L70 39 Q50 39 42 48 L24 87 Q22 94 30 96 L50 67 L56 95 L54 151 L72 162 L80 131 L88 162 L106 151 L104 95 L110 67 L130 96 Q138 94 136 87 L118 48 Q110 39 90 39 L89 30Z" fill="#e8e0d8" stroke="#9b8c81" strokeWidth={1.5}/>
      {[-1,1].map(side => <G key={side} transform={side === -1 ? "translate(160 0) scale(-1 1)" : undefined}>
        <Path d="M82 45 Q100 41 111 50 L105 58 Q93 58 82 54Z" fill={emphasis === "upper" || emphasis === "whole" ? accent : muted}/>
        <Path d="M82 56 Q96 60 105 58 Q104 71 83 76Z" fill={emphasis === "whole" ? accent : muted}/>
        <Path d="M83 76 Q99 74 104 65 Q102 79 83 82Z" fill={emphasis === "lower" || emphasis === "whole" ? accent : muted}/>
        {[0,1,2].map(i => <Path key={i} d={`M84 ${49+i*9} Q94 ${50+i*8} 104 56`} stroke="#fff" strokeWidth={.7} opacity={.6} fill="none"/>)}
      </G>)}
      <Path d="M80 45 L80 83 M71 90 L89 90 M70 101 L90 101 M71 112 L89 112 M80 87 L80 123" stroke="#beb1a5" strokeWidth={1.5} fill="none"/>
    </Svg>
  </View>;
}
const tabs = ["target", "focus", "cautions", "tips"] as const;
export function ChestCoachingPanel({ lesson, onAssisted }: { lesson: ChestLesson; onAssisted: () => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<typeof tabs[number]>("target");
  const text = (key: string) => t(`${lesson.prefix}.${key}`);
  return <Card>
    <View accessibilityRole="tablist" style={styles.tabs}>
      {tabs.map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={t(`chest.tab.${value}`)}
        accessibilityState={{ selected: tab === value }} aria-selected={tab === value} onPress={() => setTab(value)}
        style={[styles.tab, tab === value && styles.selected]}><Text style={styles.tabText}>{t(`chest.tab.${value}`)}</Text></Pressable>)}
    </View>
    <View accessibilityLiveRegion="polite" style={styles.panel}>
      {tab === "target" && <>
        <View style={styles.target}>
          <ChestTargetMap emphasis={lesson.emphasis}/>
          <View style={styles.targetText}><Text style={styles.eyebrow}>{t("chest.primary")}</Text><Heading>{text("target")}</Heading></View>
        </View>
        <Body>{text("why")}</Body>
        <Text style={styles.eyebrow}>{t("chest.secondary")}</Text><Body>{text("secondary")}</Body>
        <Text style={styles.note}>{t("chest.map.note")}</Text>
      </>}
      {tab === "focus" && [1,2,3].map(n => <View style={styles.cue} key={n}><Text style={styles.number}>{n}</Text><View style={styles.grow}><Body>{text(`focus${n}`)}</Body></View></View>)}
      {tab === "cautions" && <>
        {[1,2,3].map(n => <View key={n} style={styles.correction}>
          <Text style={styles.wrong}>× {t("chest.wrong")}</Text><Body>{text(`wrong${n}`)}</Body>
          <Text style={styles.correct}>✓ {t("chest.correct")}</Text><Body>{text(`fix${n}`)}</Body>
        </View>)}
        <Text style={styles.note}>{t("chest.safe")}</Text>
      </>}
      {tab === "tips" && <>
        {[1,2,3].map(n => <View style={styles.cue} key={n}><Text style={styles.number}>{n}</Text><View style={styles.grow}><Body>{text(`tip${n}`)}</Body></View></View>)}
        <Heading>{t("chest.practice")}</Heading><Body>{text("load")}</Body><Body>{text("record")}</Body>
        {lesson.id === "chest-dip" && <Button title={t("chest.assisted")} onPress={onAssisted} />}
      </>}
    </View>
    <Text style={styles.note}>{t("chest.modelNote")}</Text>
  </Card>;
}
const styles = StyleSheet.create({
  list: { gap: 6, marginTop: 8 }, lesson: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 },
  selected: { backgroundColor: "#edf3f5", borderColor: colors.primary }, lessonText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  number: { color: colors.primary, fontSize: 16, fontWeight: "600", minWidth: 18 }, tick: { color: colors.primary, fontSize: 19 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, tab: { minHeight: 48, flexBasis: "46%", flexGrow: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 9, alignItems: "center", justifyContent: "center", padding: 8 }, tabText: { color: colors.text, fontSize: 13, textAlign: "center" },
  panel: { gap: 10, marginTop: 12 }, target: { flexDirection: "row", alignItems: "center", gap: 8 }, map: { flexShrink: 1 }, targetText: { flex: 1, gap: 6 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "600" }, note: { fontSize: 12, lineHeight: 20, color: colors.muted, marginTop: 8 },
  cue: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 5 }, grow: { flex: 1 },
  correction: { gap: 5, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 14 }, wrong: { color: "#8f4638", fontSize: 12, fontWeight: "600" }, correct: { color: colors.success, fontSize: 12, fontWeight: "600", marginTop: 5 },
});
