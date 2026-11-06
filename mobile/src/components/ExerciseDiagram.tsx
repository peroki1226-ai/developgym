import React, { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg from "react-native-svg";
import { useI18n } from "../i18n";
import { exercisePose, motionAction, motionType, PLAYBACK_SPEEDS } from "../domain/exerciseMotion";
import { motionTeaching } from "../domain/motionTeaching";
import { useExerciseMotion } from "../hooks/useExerciseMotion";
import { ExerciseMotionScene } from "./ExerciseMotionScene";
import { MotionJointDetail } from "./MotionJointDetail";
import { MuscleContractionPanel } from "./MuscleContractionPanel";
import { MotionCue } from "./MotionCue";
import { Button, colors } from "./ui";

type Props = { type: string; muscleTag: string; compact?: boolean; label?: string; active?: boolean };
export function ExerciseDiagram(props: Props) {
  if (props.compact) return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg viewBox="0 0 120 96" style={{ width: "100%", height: 68 }}>
      <ExerciseMotionScene type={props.type} progress={0} />
    </Svg>
  </View>;
  return <MotionDiagram {...props} />;
}
function MotionDiagram({ type, muscleTag, label, active = true }: Props) {
  const { t, language } = useI18n();
  const { width, fontScale } = useWindowDimensions();
  const motion = useExerciseMotion(active, type);
  const [details, setDetails] = useState(true);
  const [anatomy, setAnatomy] = useState(true);
  const [trackWidth, setTrackWidth] = useState(1);
  const pose = exercisePose(type, motion.progress);
  const teaching = motionTeaching(type, pose);
  const phaseLabel = motion.phase === "work" ? motionAction[motionType(type)] : `motion.${motion.phase}`;
  const cues = [t("teaching.start"), t(teaching.workCue), t(teaching.holdCue), t(teaching.returnCue)];
  const activeCue = motion.phase === "work" ? 1 : motion.phase === "hold" ? 2 : motion.phase === "return" ? 3 : 0;
  return <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.caption}>{t("motion.title")}</Text>
      <Text style={styles.badge}>{t(muscleTag)}</Text>
    </View>
    <View style={styles.phaseHeader}>
      <Text style={styles.phase}>{t(phaseLabel)}</Text>
      <Text style={styles.caption}>{t(`motion.camera.${pose.camera}`)}</Text>
    </View>
    <MotionCue key={`${type}:${language}:${width}:${fontScale}`} cues={cues} active={activeCue} />
    <Text style={styles.caption}>{t("motion.speed")}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("motion.speed")} style={styles.speeds}>
      {PLAYBACK_SPEEDS.map(speed => {
        const name = speed === 1 ? "motion.normal" : speed === 0.5 ? "motion.slow" : "motion.extraSlow";
        const checked = motion.speed === speed;
        return <Pressable key={speed} accessibilityRole="radio" accessibilityLabel={t(name)}
          accessibilityState={{ checked }} aria-checked={checked} onPress={() => motion.setSpeed(speed)}
          style={[styles.speedButton, checked && styles.selectedSpeed]}>
          <Text style={[styles.speedText, checked && { color: colors.primary }]}>{t(name)}</Text>
        </Pressable>;
      })}
    </View>
    <Text style={styles.note}>{t(motion.speed === 1 ? "motion.speedNormalHint" : motion.speed === 0.5 ? "motion.speedSlowHint" : "motion.speedExtraSlowHint")}</Text>
    <View style={styles.canvas} accessible accessibilityRole="image"
      accessibilityLabel={t("guide.diagramLabel", { 0: t(label ?? muscleTag) })}>
      <Svg viewBox="0 0 120 96" style={styles.svg}>
        <ExerciseMotionScene type={type} progress={motion.progress} details={details}
          returning={motion.phase === "return" || motion.phase === "hold"} anatomy={anatomy} />
      </Svg>
    </View>
    <View style={styles.header}>
      <Text style={styles.caption}>{t("motion.frameTitle")}</Text>
      <Text style={styles.caption}>{t("motion.frameCount", { 0: motion.frameNumber, 1: motion.frameCount })}</Text>
    </View>
    <View style={styles.playback}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("motion.stepBack")}
        accessibilityState={{ disabled: !motion.canStepBack }} aria-disabled={!motion.canStepBack}
        disabled={!motion.canStepBack} onPress={() => motion.step(-1)}
        style={[styles.stepButton, !motion.canStepBack && { opacity: 0.4 }]}>
        <Text style={styles.stepIcon}>‹</Text>
      </Pressable>
      <Button title={t(motion.running ? "motion.pause" : "motion.play")} onPress={motion.toggle}
        disabled={!motion.canPlay} variant="primary" />
      <Pressable accessibilityRole="button" accessibilityLabel={t("motion.stepForward")}
        accessibilityState={{ disabled: !motion.canStepForward }} aria-disabled={!motion.canStepForward}
        disabled={!motion.canStepForward} onPress={() => motion.step(1)}
        style={[styles.stepButton, !motion.canStepForward && { opacity: 0.4 }]}>
        <Text style={styles.stepIcon}>›</Text>
      </Pressable>
    </View>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={t("motion.position")}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(motion.progress * 100)}
      aria-valuetext={`${Math.round(motion.progress * 100)}%`}
      accessibilityHint={t("motion.seekHint")}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(motion.progress * 100), text: `${Math.round(motion.progress * 100)}%` }}
      accessibilityActions={[{ name: "increment", label: t("motion.forward") }, { name: "decrement", label: t("motion.backward") }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "increment") motion.seek(motion.progress + 0.05);
        if (nativeEvent.actionName === "decrement") motion.seek(motion.progress - 0.05);
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
      <Button title={t("motion.startPose")} onPress={() => motion.seek(0, "work")} variant="quiet" />
      <Button title={t("motion.endPose")} onPress={() => motion.seek(1, "work")} variant="quiet" />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t("muscle.toggle")}
      accessibilityState={{ selected: anatomy }} aria-pressed={anatomy}
      onPress={() => setAnatomy(value => !value)} style={styles.detailToggle}>
      <Text style={styles.detailTitle}>{t(anatomy ? "muscle.on" : "muscle.off")}</Text>
    </Pressable>
    {anatomy && <MuscleContractionPanel key={type} type={type} progress={motion.progress} phase={motion.phase} />}
    <Pressable accessibilityRole="button" accessibilityLabel={t("teaching.details")}
      accessibilityState={{ expanded: details }} aria-expanded={details}
      onPress={() => setDetails(value => !value)} style={styles.detailToggle}>
      <Text style={styles.detailTitle}>{t("teaching.details")}{details ? " −" : " ＋"}</Text>
    </Pressable>
    {details && <MotionJointDetail type={type} progress={motion.progress} />}
    {motion.reduced && <Text style={styles.note}>{t("motion.reducedHint")}</Text>}
    {details && <Text style={styles.note}>{t("teaching.legend")}</Text>}
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
  phaseHeader: { gap: 2, minHeight: 44 },
  canvas: { borderRadius: 12, backgroundColor: "#fbfbfb", overflow: "hidden" },
  svg: { width: "100%", height: 240 },
  detailToggle: { minHeight: 48, justifyContent: "center" },
  detailTitle: { color: colors.primary, fontSize: 12, lineHeight: 20 },
  playback: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  stepButton: { width: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  stepIcon: { fontSize: 26, color: colors.primary },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" },
  speeds: { flexDirection: "row", gap: 6 },
  speedButton: { flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 4 },
  selectedSpeed: { backgroundColor: "#edf3f7", borderColor: "#bdd0df" },
  speedText: { color: colors.muted, fontSize: 12, textAlign: "center" },
  trackTouch: { minHeight: 48, justifyContent: "center", marginHorizontal: 8 },
  track: { height: 4, borderRadius: 3, overflow: "hidden", backgroundColor: "#e5edf2" },
  fill: { height: 4, borderRadius: 3, backgroundColor: colors.primary },
  knob: { position: "absolute", top: 16, width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: "#ffffff" },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});
