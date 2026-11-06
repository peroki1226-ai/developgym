import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { exercisePose } from "../domain/exerciseMotion";
import { enlargedJoint, motionTeaching } from "../domain/motionTeaching";
import { useI18n } from "../i18n";
import { ArticulatedLimb } from "./ArticulatedLimb";
import { SurfaceKind } from "../domain/articulatedSurface";
import { colors } from "./ui";

export function MotionJointDetail({ type, progress }: { type: string; progress: number }) {
  const { t } = useI18n();
  const prefix = `joint-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const kind: SurfaceKind = ["abdominal-crunch", "back-extension"].includes(type) ? "trunk"
    : ["leg-press", "hack-squat", "power-rack", "leg-extension", "seated-leg-curl", "hip-abduction", "hip-adduction", "seated-calf-raise"].includes(type) ? "leg" : "arm";
  const info = motionTeaching(type, exercisePose(type, progress));
  const joint = enlargedJoint(info.joint);
  const start = useMemo(() => enlargedJoint(motionTeaching(type, exercisePose(type, 0)).joint), [type]);
  const points = (p: typeof joint) => p.map(v => v.join(",")).join(" ");
  const a = Math.atan2(joint[0][1] - 40, joint[0][0] - 40);
  const b = Math.atan2(joint[2][1] - 40, joint[2][0] - 40);
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const arc = `M ${40 + 11 * Math.cos(a)} ${40 + 11 * Math.sin(a)} A 11 11 0 0 ${delta >= 0 ? 1 : 0} ${40 + 11 * Math.cos(b)} ${40 + 11 * Math.sin(b)}`;
  return <View style={styles.panel}>
    <View accessible accessibilityRole="image" accessibilityLabel={t("teaching.zoomLabel", { 0: t(info.jointLabel) })}>
      <Svg viewBox="0 0 80 80" width={90} height={90}>
        <Circle cx={40} cy={40} r={34} fill="#f4f4f4" />
        <Polyline points={points(start)} fill="none" stroke="#b5b5b5" strokeWidth={2} strokeDasharray="3 3" />
        <ArticulatedLimb limb={joint} kind={kind} prefix={prefix} scale={1.5} />
        <Path d={arc} fill="none" stroke="#444444" strokeWidth={1.3} />


      </Svg>
    </View>
    <View style={styles.copy}>
      <Text style={styles.title}>{t(info.jointLabel)}</Text>
      <Text style={styles.note}>{t("teaching.fixed", { 0: t(info.fixedLabel) })}</Text>
      <Text style={styles.note}>{t("teaching.moving", { 0: t(info.movingLabel) })}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  panel: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 12, backgroundColor: "#f6f9fb" },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  title: { color: colors.text, fontSize: 13, fontWeight: "600" },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});
