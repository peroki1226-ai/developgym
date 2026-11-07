import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { MotionPhase } from "../domain/exerciseMotion";
import { Muscle, muscleSpec } from "../domain/muscleMotion";
import { muscleLengthPicture } from "../domain/muscleLength";
import { useI18n } from "../i18n";
import { Button, colors } from "./ui";
const red = "#b95749";
function Picture({
  progress,
  stabilizing = false,
  live = false,
}: {
  progress: number;
  stabilizing?: boolean;
  live?: boolean;
}) {
  const d = muscleLengthPicture(progress, stabilizing),
    middle = (d.start + d.end) / 2;
  return (
    <Svg
      viewBox="0 0 320 130"
      style={{ width: "100%", height: live ? 140 : 74 }}
    >
      {live && (
        <>
          <Line
            x1={d.start}
            x2={d.referenceEnd}
            y1={22}
            y2={22}
            stroke="#b5b5b5"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Line
            x1={d.referenceEnd}
            x2={d.referenceEnd}
            y1={18}
            y2={112}
            stroke="#c2c2c2"
            strokeDasharray="4 4"
          />
        </>
      )}
      <Path
        testID={live ? "coach-muscle-shape" : undefined}
        d={`M ${d.start},65 C ${d.start + 23},${65 - d.radius} ${d.end - 23},${65 - d.radius} ${d.end},65 C ${d.end - 23},${65 + d.radius} ${d.start + 23},${65 + d.radius} ${d.start},65 Z`}
        fill={red}
        stroke="#7d3d35"
        strokeWidth={1.5}
      />
      {[-0.5, 0, 0.5].map((f) => (
        <Path
          key={f}
          d={`M ${d.start + 7},65 Q ${middle},${65 + d.radius * f * 1.6} ${d.end - 7},65`}
          fill="none"
          stroke="#f4c0b5"
          strokeWidth={1.7}
        />
      ))}
      {[d.start, d.end].map((x, i) => (
        <React.Fragment key={i}>
          <Circle
            testID={live ? `coach-end-${i}` : undefined}
            cx={x}
            cy={65}
            r={6}
            fill="#fff"
            stroke="#7d3d35"
            strokeWidth={2}
          />
          <Circle
            cx={x}
            cy={42}
            r={9}
            fill="#fff"
            stroke="#65443d"
            strokeWidth={1.2}
          />
          <Path
            testID={live ? `coach-number-${i}` : undefined}
            d={
              i === 0
                ? `M ${x - 3},40 L ${x},37 L ${x},47 M ${x - 3},47 L ${x + 3},47`
                : `M ${x - 4},39 C ${x - 4},35 ${x + 4},35 ${x + 4},39 C ${x + 4},42 ${x - 3},43 ${x - 4},47 L ${x + 4},47`
            }
            fill="none"
            stroke="#65443d"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </React.Fragment>
      ))}
      <Line
        testID={live ? "coach-distance" : undefined}
        x1={d.start}
        x2={d.end}
        y1={108}
        y2={108}
        stroke="#7d3d35"
        strokeWidth={2}
      />
      {[d.start, d.end].map((x, i) => (
        <Line
          key={i}
          x1={x}
          x2={x}
          y1={101}
          y2={115}
          stroke="#7d3d35"
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}
type Props = {
  type: string;
  progress: number;
  phase: MotionPhase;
  muscle: Muscle;
  direction: "work" | "return";
  completed: "work" | "return" | null;
  onSelect: (m: Muscle) => void;
  onInspect: (d: "work" | "return") => void;
  onPlay: () => void;
  running: boolean;
  canPlay: boolean;
};
export function MuscleLengthCoach({
  type,
  progress,
  phase,
  muscle,
  direction,
  completed,
  onSelect,
  onInspect,
  onPlay,
  running,
  canPlay,
}: Props) {
  const { t } = useI18n(),
    spec = muscleSpec(type),
    iso = spec.stabilizing?.includes(muscle) ?? false;
  const label = iso
    ? "coach.same"
    : progress > 0.95
      ? "coach.nowShort"
      : progress < 0.05
        ? "coach.nowLong"
        : phase === "return"
          ? "coach.getLonger"
          : phase === "work"
            ? "coach.getShorter"
            : "coach.lookEnds";
  const liveDirection =
    phase === "return"
      ? "return"
      : phase === "work"
        ? "work"
        : (completed ?? direction);
  return (
    <View testID="muscle-live-caption" style={styles.panel}>
      <Text style={styles.title}>
        {t(iso ? "coach.isoTitle" : "coach.title")}
      </Text>
      <View
        style={styles.choices}
        accessibilityRole="radiogroup"
        accessibilityLabel={t("muscle.select")}
      >
        {spec.primary.map((m) => (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityLabel={t(`muscle.${m}`)}
            accessibilityState={{ checked: muscle === m }}
            aria-checked={muscle === m}
            onPress={() => onSelect(m)}
            style={[styles.muscle, muscle === m && styles.selected]}
          >
            <Text style={styles.muscleText}>{t(`muscle.${m}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.definition}>
        {t(iso ? "coach.isoDefinition" : "coach.definition")}
      </Text>
      <View style={styles.pair}>
        {(["work", "return"] as const).map((d) => (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={t(
              iso
                ? d === "work"
                  ? "coach.inspectWork"
                  : "coach.inspectReturn"
                : d === "work"
                  ? "load.shorten"
                  : "load.lengthen",
            )}
            accessibilityState={{ selected: direction === d }}
            aria-pressed={direction === d}
            onPress={() => onInspect(d)}
            style={[styles.card, direction === d && styles.selected]}
          >
            <Text style={styles.cardTitle}>
              {t(
                iso
                  ? d === "work"
                    ? "coach.duringWork"
                    : "coach.duringReturn"
                  : d === "work"
                    ? "coach.long"
                    : "coach.short",
              )}
            </Text>
            <Picture progress={d === "work" ? 0 : 1} stabilizing={iso} />
            <Text style={styles.cardHint}>
              {t(
                iso
                  ? d === "work"
                    ? "coach.keepWork"
                    : "coach.keepReturn"
                  : d === "work"
                    ? "coach.toShort"
                    : "coach.toLong",
              )}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text testID="coach-state" style={styles.state}>
        {t(label)}
      </Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t(iso ? "coach.same" : "coach.lookEnds")}
      >
        <Picture progress={progress} stabilizing={iso} live />
      </View>
      <Text style={styles.distance}>
        {t(
          iso
            ? "coach.keepDistance"
            : liveDirection === "return"
              ? "coach.endsApart"
              : "coach.endsCloser",
        )}
      </Text>
      <Text style={styles.note}>{t("coach.exaggerated")}</Text>
      <Button
        title={t(
          running
            ? "coach.pause"
            : iso
              ? direction === "work"
                ? "coach.playWork"
                : "coach.playReturn"
              : direction === "work"
                ? "coach.playShort"
                : "coach.playLong",
        )}
        onPress={onPlay}
        disabled={!canPlay}
        variant="primary"
      />
      <Text testID="coach-complete" style={styles.complete}>
        {t(
          completed
            ? iso
              ? "coach.isoDone"
              : completed === "work"
                ? "coach.workDone"
                : "coach.returnDone"
            : "coach.stops",
        )}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ead8d2",
    borderRadius: 14,
    backgroundColor: "#fcf5f2",
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  definition: { color: colors.text, fontSize: 15, lineHeight: 24 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  muscle: {
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e4deda",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  muscleText: { color: "#7d3d35", fontSize: 14, fontWeight: "600" },
  pair: { flexDirection: "row", gap: 8 },
  card: {
    flex: 1,
    padding: 7,
    borderWidth: 1,
    borderColor: "#e4deda",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  selected: { borderColor: red, backgroundColor: "#f8eae4" },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  cardHint: { color: "#7d3d35", fontSize: 12, lineHeight: 20 },
  state: {
    color: "#7d3d35",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  distance: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  complete: { fontSize: 13, lineHeight: 21, color: colors.text },
  note: { fontSize: 11, lineHeight: 17, color: colors.muted },
});
