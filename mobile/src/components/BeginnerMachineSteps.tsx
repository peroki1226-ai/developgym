import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useI18n } from "../i18n";
import { colors } from "./ui";

export const LEARNING_STEPS = ["posture", "hands", "feet", "move"] as const;
export type LearningStep = typeof LEARNING_STEPS[number];
export type BeginnerGuideData = {
  seatSetup: string;
  beginnerSteps: readonly string[];
  ngPoints: readonly string[];
  startWeightMale: string;
  startWeightFemale: string;
};

const paths = [
  "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM9 10v7h8v5M6 10v10h8M12 11l5 3",
  "M7 13V7a1.5 1.5 0 0 1 3 0v5-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v7c0 7-10 8-13 2l-3-5a1.5 1.5 0 0 1 2-2l3 3",
  "M7 3c-3 0-4 6-3 9l1 3c-2 4-1 6 1 6s3-2 2-6l2-6c1-3 0-6-3-6ZM17 6c3 0 4 6 3 9l-1 3c2 4 1 5-1 5s-3-1-2-5l-2-6c-1-3 0-6 3-6Z",
  "M9 7v10l9-5ZM21 7a10 10 0 1 1-5-5M17 1l1 4 4-1",
];

export function BeginnerMachineSteps({ step, onSelect, hint, breathing }: {
  step: LearningStep; onSelect: (step: LearningStep) => void; hint: string; breathing?: string;
}) {
  const { t } = useI18n();
  return <View testID="beginner-machine-lesson" style={styles.lesson}>
    <Text style={styles.title}>{t("learn.title")}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("learn.steps")} style={styles.row}>
      {LEARNING_STEPS.map((value, index) => <Pressable key={value}
        accessibilityRole="radio" accessibilityLabel={t(`learn.${value}`)}
        accessibilityState={{ checked: step === value }} aria-checked={step === value}
        onPress={() => onSelect(value)} style={[styles.step, step === value && styles.selected]}>
        <Svg width={26} height={26} viewBox="0 0 24 24" accessibilityElementsHidden>
          <Path d={paths[index]} fill="none" stroke={step === value ? colors.primary : colors.muted} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={[styles.label, step === value && { color: colors.primary }]}>{t(`learn.${value}`)}</Text>
      </Pressable>)}
    </View>
    <Text testID="beginner-step-hint" style={styles.hint}>{hint}</Text>
    {breathing && <Text testID="beginner-breathing" style={styles.hint}>{breathing}</Text>}
  </View>;
}

export function BeginnerSetupNotes({ guide }: { guide: BeginnerGuideData }) {
  const { t } = useI18n();
  return <View testID="beginner-setup-notes" style={styles.lesson}>
    <Text style={styles.title}>{t("learn.startWeight")}</Text>
    <View style={[styles.row, { flexWrap: "wrap" }]}>
      {guide.startWeightMale === guide.startWeightFemale ? <Text style={styles.weight}>{t(guide.startWeightMale)}</Text> : <>
        <Text style={styles.weight}>{t("男性: ")}{t(guide.startWeightMale)}</Text>
        <Text style={styles.weight}>{t("learn.femaleWeight", { 0: t(guide.startWeightFemale) })}</Text>
      </>}
    </View>
    {guide.ngPoints.map(point => <Text key={point} style={styles.hint}>{t("learn.caution", { 0: t(point) })}</Text>)}
  </View>;
}

const styles = StyleSheet.create({
  lesson: { gap: 10 }, title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  row: { flexDirection: "row", gap: 5 },
  step: { flex: 1, minWidth: 48, minHeight: 68, paddingVertical: 8, alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  selected: { borderColor: colors.primary, backgroundColor: "#f0f6ff" },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600", textAlign: "center" },
  hint: { color: colors.text, fontSize: 13, lineHeight: 21 },
  weight: { color: colors.text, backgroundColor: "#f0f6ff", borderRadius: 8, padding: 8, fontSize: 12, flexShrink: 1 },
});
