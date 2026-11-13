import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MotionPhase } from "../domain/exerciseMotion";
import { muscleSpec } from "../domain/muscleMotion";
import { effortAdvice, proTraining, Reserve } from "../domain/proTraining";
import { useI18n } from "../i18n";
import { Button, colors } from "./ui";

type Props = { type: string; phase: MotionPhase; canPlay: boolean; running: boolean; onInspect: (direction: "work" | "return") => void; onPause: () => void };
export function ProTrainingCoach({ type, phase, canPlay, running, onInspect, onPause }: Props) {
  const { t } = useI18n(), profile = proTraining(type);
  const [tab, setTab] = useState<"form" | "finish">("form"), [reserve, setReserve] = useState<Reserve>(2);
  if (!profile) return null;
  return <View testID="pro-training-coach" style={styles.panel}>
    <Text style={styles.title}>{t("pro.title")}</Text>
    <Text style={styles.target}>{t("pro.target", { 0: t(`muscle.${muscleSpec(type).focus}`) })}</Text>
    <View style={styles.row} accessibilityRole="tablist">
      {(["form", "finish"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={t(`pro.tab.${value}`)} accessibilityState={{ selected: tab === value }} aria-selected={tab === value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.selected]}><Text style={styles.text}>{t(`pro.tab.${value}`)}</Text></Pressable>)}
    </View>
    {tab === "form" ? <View style={styles.content}>
      <View style={styles.live}>
        <Text style={styles.label}>{t(`pro.phase.${phase}`)}</Text>
        <Text testID="pro-live-cue" style={styles.text}>{t(phase === "return" ? profile.return : phase === "start" ? profile.avoid : profile.work)}</Text>
      </View>
      {([["pro.work", profile.work], ["pro.return", profile.return], ["pro.avoid", profile.avoid]] as const).map(([label, message]) => <View key={label} style={styles.item}><Text style={styles.label}>{t(label)}</Text><Text style={styles.text}>{t(message)}</Text></View>)}
      <View style={styles.row}>
        <Button title={t("pro.model.work")} variant="quiet" disabled={!canPlay} onPress={() => onInspect("work")} />
        <Button title={t("pro.model.return")} variant="quiet" disabled={!canPlay} onPress={() => onInspect("return")} />
      </View>
      {running && <Button title={t("pro.model.pause")} variant="quiet" onPress={onPause} />}
      <Text style={styles.note}>{t("pro.model.hint")}</Text>
    </View> : <View style={styles.content}>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.label}>{t("pro.reps")}</Text><Text style={styles.text}>{t(profile.compound ? "pro.reps.compound" : "pro.reps.isolation")}</Text></View>
        <View style={styles.metric}><Text style={styles.label}>{t("pro.rest")}</Text><Text style={styles.text}>{t(profile.compound ? "pro.rest.compound" : "pro.rest.isolation")}</Text></View>
        <View style={styles.metric}><Text style={styles.label}>{t("pro.tempo")}</Text><Text style={styles.text}>{t("pro.tempo.value")}</Text></View>
      </View>
      <Text style={styles.label}>{t("pro.reserve.title")}</Text><Text style={styles.note}>{t("pro.reserve.hint")}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t("pro.reserve.title")}>
        {([3, 2, 1, 0] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(`pro.reserve.${value}`)} accessibilityState={{ checked: reserve === value }} aria-checked={reserve === value} onPress={() => setReserve(value)} style={[styles.reserve, reserve === value && styles.selected]}><Text style={styles.text}>{t(`pro.reserve.${value}`)}</Text></Pressable>)}
      </View>
      <Text testID="pro-effort-advice" style={styles.text}>{t(effortAdvice(profile.method, reserve))}</Text>
      <View style={styles.live}><Text style={styles.label}>{t(`pro.method.${profile.method}.title`)}</Text><Text testID="pro-finish-method" style={styles.text}>{t(reserve === 0 ? "pro.method.noExtra" : `pro.method.${profile.method}.body`)}</Text></View>
      <Text style={styles.note}>{t(profile.guard)}</Text><Text style={styles.note}>{t("pro.finish.limit")}</Text>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: "#fff" },
  title: { fontSize: 17, fontWeight: "600", color: colors.text }, target: { fontSize: 13, color: colors.muted },
  content: { gap: 12 }, row: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tab: { flex: 1, minHeight: 48, padding: 9, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 9 },
  reserve: { flexGrow: 1, flexBasis: "20%", minWidth: 55, minHeight: 48, padding: 7, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 9 },
  selected: { borderColor: colors.primary, backgroundColor: "#edf3f5" },
  label: { fontSize: 13, lineHeight: 20, fontWeight: "600", color: colors.text }, text: { fontSize: 13, lineHeight: 21, color: colors.text }, note: { fontSize: 12, lineHeight: 19, color: colors.muted },
  live: { padding: 11, gap: 5, borderRadius: 10, backgroundColor: "#f2f4f5" }, item: { gap: 4 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { flexGrow: 1, minWidth: 78, gap: 4, padding: 9, backgroundColor: "#f7f7f7", borderRadius: 9 },
});
