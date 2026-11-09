import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Muscle } from "../domain/muscleMotion";
import { useI18n } from "../i18n";

export function MuscleQuickCue({ muscle, progress, returning }: { muscle: Muscle; progress: number; returning: boolean }) {
  const { t } = useI18n();
  const name = ["quads", "adductors", "glutes"].includes(muscle) ? `quick.${muscle}` : `muscle.${muscle}`;
  const state = progress < .03 ? "quick.long" : progress > .97 ? "quick.short" : returning ? "quick.lengthen" : "quick.contract";
  return <View testID="muscle-quick-cue" pointerEvents="none" style={styles.cue}>
    <Text style={styles.text}>{t(name)} · {t(state)}</Text>
  </View>;
}
const styles = StyleSheet.create({ cue: { position: "absolute", bottom: 8, left: 8, right: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,.94)", borderLeftWidth: 3, borderLeftColor: "#b94b3e" }, text: { color: "#602b25", fontSize: 13, fontWeight: "700", textAlign: "center" } });
