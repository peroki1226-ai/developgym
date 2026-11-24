import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
        <View style={styles.targetText}><Text style={styles.eyebrow}>{t("chest.primary")}</Text><Heading>{text("target")}</Heading></View>
        <Body>{text("why")}</Body>
        <Text style={styles.eyebrow}>{t("chest.secondary")}</Text><Body>{text("secondary")}</Body>
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
  panel: { gap: 10, marginTop: 12 }, targetText: { gap: 6 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "600" }, note: { fontSize: 12, lineHeight: 20, color: colors.muted, marginTop: 8 },
  cue: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 5 }, grow: { flex: 1 },
  correction: { gap: 5, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 14 }, wrong: { color: "#8f4638", fontSize: 12, fontWeight: "600" }, correct: { color: colors.success, fontSize: 12, fontWeight: "600", marginTop: 5 },
});
