import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg from "react-native-svg";
import { useI18n } from "../i18n";
import { exercisePose, motionAction, motionType } from "../domain/exerciseMotion";
import { useExerciseMotion } from "../hooks/useExerciseMotion";
import { ExerciseMotionScene } from "./ExerciseMotionScene";
import { Button, colors } from "./ui";

type Props = { type: string; muscleTag: string; compact?: boolean; label?: string; active?: boolean };
export function ExerciseDiagram(props: Props) {
  if (props.compact) return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg viewBox="0 0 120 96" style={{ width: "100%", height: 68 }}>
      <ExerciseMotionScene type={props.type} progress={0} />
    </Svg>
  </View>;
  return <MotionDiagram key={props.type} {...props} />;
}
function MotionDiagram({ type, muscleTag, label, active = true }: Props) {
  const { t } = useI18n();
  const motion = useExerciseMotion(active);
  const [trackWidth, setTrackWidth] = useState(1);
  const pose = exercisePose(type, motion.progress);
  const phaseLabel = motion.phase === "work" ? motionAction[motionType(type)] : `motion.${motion.phase}`;
  return <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.caption}>{t("motion.title")}</Text>
      <Text style={styles.badge}>{t(muscleTag)}</Text>
    </View>
    <View style={styles.header}>
      <Text style={styles.phase}>{t(phaseLabel)}</Text>
      <Text style={styles.caption}>{t(`motion.camera.${pose.camera}`)}</Text>
    </View>
    <View style={styles.canvas} accessible accessibilityRole="image"
      accessibilityLabel={t("guide.diagramLabel", { 0: t(label ?? muscleTag) })}>
      <Svg viewBox="0 0 120 96" style={styles.svg}>
        <ExerciseMotionScene type={type} progress={motion.progress} />
      </Svg>
    </View>
    <View style={styles.controls}>
      <Button title={t(motion.running ? "motion.pause" : "motion.play")} onPress={motion.toggle}
        disabled={!motion.canPlay} variant="primary" />
      <Button title={t("motion.slow")} selected={motion.slow} onPress={motion.toggleSlow} />
    </View>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={t("motion.position")}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(motion.progress * 100)}
      aria-valuetext={`${Math.round(motion.progress * 100)}%`}
      accessibilityHint={t("motion.seekHint")}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(motion.progress * 100), text: `${Math.round(motion.progress * 100)}%` }}
      accessibilityActions={[{ name: "increment", label: t("motion.forward") }, { name: "decrement", label: t("motion.backward") }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "increment") motion.seek(motion.progress + 0.1);
        if (nativeEvent.actionName === "decrement") motion.seek(motion.progress - 0.1);
      }}
      onLayout={({ nativeEvent }) => setTrackWidth(Math.max(1, nativeEvent.layout.width))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={({ nativeEvent }) => motion.seek(nativeEvent.locationX / trackWidth)}
      onResponderMove={({ nativeEvent }) => motion.seek(nativeEvent.locationX / trackWidth)}
      style={styles.trackTouch}>
      <View style={styles.track}><View style={[styles.fill, { width: `${motion.progress * 100}%` }]} /></View>
      <View style={[styles.knob, { left: `${motion.progress * 100}%` }]} />
    </View>
    <View style={styles.controls}>
      <Button title={t("motion.startPose")} onPress={() => motion.seek(0)} variant="quiet" />
      <Button title={t("motion.endPose")} onPress={() => motion.seek(1)} variant="quiet" />
    </View>
    {motion.reduced && <Text style={styles.note}>{t("motion.reducedHint")}</Text>}
    <Text style={styles.note}>{t("motion.legend")}</Text>
    <Text style={styles.note}>{t("motion.hint")}</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  badge: { color: colors.primary, backgroundColor: "#edf3f7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11 },
  phase: { color: colors.text, fontWeight: "600", fontSize: 16 },
  canvas: { borderRadius: 12, backgroundColor: "#fbfcfd", overflow: "hidden" },
  svg: { width: "100%", height: 240 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" },
  trackTouch: { minHeight: 48, justifyContent: "center", marginHorizontal: 8 },
  track: { height: 4, borderRadius: 3, overflow: "hidden", backgroundColor: "#e5edf2" },
  fill: { height: 4, borderRadius: 3, backgroundColor: colors.primary },
  knob: { position: "absolute", top: 16, width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: "#ffffff" },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});
