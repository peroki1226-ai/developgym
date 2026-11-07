import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { MotionPhase } from "../domain/exerciseMotion";
import { contractionFrame, Muscle, muscleSpec } from "../domain/muscleMotion";
import { muscleLoadLesson } from "../domain/muscleLoad";
import { useI18n } from "../i18n";
import { Button, colors } from "./ui";

type Props = {
  type: string;
  progress: number;
  phase: MotionPhase;
  selectedMuscle?: Muscle;
  onSelect?: (muscle: Muscle) => void;
  onInspect?: (phase: "work" | "return") => void;
  onSlowPlay?: () => void;
  running?: boolean;
  canPlay?: boolean;
};
const red = "#b95749";
function Arrow({
  a,
  b,
  y,
  color = red,
}: {
  a: number;
  b: number;
  y: number;
  color?: string;
}) {
  const sign = Math.sign(b - a);
  return (
    <G>
      <Line x1={a} x2={b} y1={y} y2={y} stroke={color} strokeWidth={2.5} />
      <Path
        d={`M ${b - sign * 6},${y - 4} L ${b},${y} L ${b - sign * 6},${y + 4}`}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
      />
    </G>
  );
}
function Bundle({
  length,
  radius,
  y,
  ghost = false,
  testID,
}: {
  length: number;
  radius: number;
  y: number;
  ghost?: boolean;
  testID?: string;
}) {
  const start = 130 - length / 2,
    end = 260 - start;
  return (
    <G opacity={ghost ? 0.25 : 1}>
      <Path
        testID={testID}
        d={`M ${start},${y} C ${start + 18},${y - radius} ${end - 18},${y - radius} ${end},${y} C ${end - 18},${y + radius} ${start + 18},${y + radius} ${start},${y} Z`}
        fill={ghost ? "none" : red}
        stroke={ghost ? "#6f6f6f" : "#7d3d35"}
        strokeWidth={1}
        strokeDasharray={ghost ? "4 4" : undefined}
      />
      {!ghost && (
        <>
          {[-0.55, 0, 0.55].map((f) => (
            <Path
              key={f}
              d={`M ${start + 8},${y} Q 130,${y + radius * f * 1.6} ${end - 8},${y}`}
              fill="none"
              stroke="#f4beb0"
              strokeWidth={1.4}
            />
          ))}
          <Line
            x1={start - 17}
            x2={start}
            y1={y}
            y2={y}
            stroke="#8b8b8b"
            strokeWidth={3}
          />
          <Line
            x1={end}
            x2={end + 17}
            y1={y}
            y2={y}
            stroke="#8b8b8b"
            strokeWidth={3}
          />
          {[start - 20, end + 20].map((x) => (
            <Circle
              key={x}
              cx={x}
              cy={y}
              r={4}
              fill="#fff"
              stroke="#777"
              strokeWidth={1.5}
            />
          ))}
        </>
      )}
    </G>
  );
}
export function MuscleLiveInset({
  type,
  progress,
  phase,
  selectedMuscle,
}: Props) {
  const { t } = useI18n();
  const selected = selectedMuscle ?? muscleSpec(type).focus;
  const { frame, movement } = muscleLoadLesson(type, selected, progress, phase);
  return (
    <View testID="muscle-live-caption" style={styles.inset}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.choiceText}>{t(`muscle.${selected}`)}</Text>
        <Text style={styles.note}>{t(frame.label)}</Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t("load.live")}
        style={{ width: 128 }}
      >
        <Svg viewBox="0 0 260 94" style={{ width: "100%", height: 54 }}>
          <Bundle
            length={frame.length * 1.5}
            radius={frame.radius * 1.8}
            y={54}
          />
          {movement !== "still" && (
            <>
              <Arrow
                a={movement === "inward" ? 53 : 93}
                b={movement === "inward" ? 93 : 53}
                y={18}
              />
              <Arrow
                a={movement === "inward" ? 207 : 167}
                b={movement === "inward" ? 167 : 207}
                y={18}
              />
            </>
          )}
        </Svg>
        <Text style={[styles.note, { textAlign: "center" }]}>
          {t(`load.${movement}`)}
        </Text>
      </View>
    </View>
  );
}

export function MuscleContractionPanel({
  type,
  progress,
  phase,
  selectedMuscle,
  onSelect,
  onInspect,
  onSlowPlay,
  running,
  canPlay,
}: Props) {
  const { t } = useI18n(),
    spec = muscleSpec(type);
  const [local, setLocal] = useState<Muscle>(spec.focus),
    [detail, setDetail] = useState(false);
  const requested = selectedMuscle ?? local;
  const selected = spec.primary.includes(requested) ? requested : spec.focus;
  const lesson = muscleLoadLesson(type, selected, progress, phase),
    frame = lesson.frame;
  const stable = contractionFrame(type, selected, 0, "work");
  return (
    <View style={styles.panel} testID="muscle-contraction-panel">
      <Text style={styles.title}>{t("load.title")}</Text>
      <Text style={styles.note}>{t("load.current")}</Text>
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
            accessibilityState={{ checked: selected === m }}
            aria-checked={selected === m}
            onPress={() => {
              setLocal(m);
              onSelect?.(m);
            }}
            style={[styles.choice, selected === m && styles.selected]}
          >
            <View style={styles.dot} />
            <Text style={styles.choiceText}>{t(`muscle.${m}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text testID="muscle-phase" style={styles.phase}>
        {t(frame.label)}
      </Text>
      <Text style={styles.bodyAction}>
        {t("load.body")}：{t(lesson.action)}
      </Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t("muscle.diagram", {
          0: t(`muscle.${selected}`),
          1: t(frame.label),
        })}
      >
        <Svg viewBox="0 0 260 132" style={styles.svg}>
          <SvgText
            x={130}
            y={18}
            fontSize={12}
            textAnchor="middle"
            fill="#65443d"
          >
            {t(`load.${lesson.movement}`)}
          </SvgText>
          <Bundle
            length={stable.length * 1.5}
            radius={stable.radius * 1.8}
            y={64}
            ghost
          />
          <Bundle
            testID="muscle-bundle"
            length={frame.length * 1.5}
            radius={frame.radius * 1.8}
            y={64}
          />
          {lesson.movement !== "still" && (
            <G testID="muscle-length-direction">
              <Arrow
                a={lesson.movement === "inward" ? 53 : 93}
                b={lesson.movement === "inward" ? 93 : 53}
                y={32}
              />
              <Arrow
                a={lesson.movement === "inward" ? 207 : 167}
                b={lesson.movement === "inward" ? 167 : 207}
                y={32}
              />
            </G>
          )}
          <G testID="muscle-pull-arrows">
            <Arrow a={40} b={102} y={108} />
            <Arrow a={220} b={158} y={108} />
          </G>
          <SvgText
            x={130}
            y={129}
            fontSize={11}
            textAnchor="middle"
            fill="#65443d"
          >
            {t("load.pull")}
          </SvgText>
        </Svg>
      </View>
      <Text style={styles.explanation}>{t(lesson.explanation)}</Text>
      {lesson.state === "lengthening" && (
        <Text style={styles.emphasis}>{t("load.returnTension")}</Text>
      )}
      <View style={styles.forceBox}>
        <View style={styles.forceRow}>
          <Text style={styles.pull}>→ ←</Text>
          <Text style={styles.forceLabel}>{t("load.pull")}</Text>
        </View>
        <View style={styles.forceRow}>
          <Text style={styles.external}>← →</Text>
          <Text style={styles.forceLabel}>{t("load.resistance")}</Text>
        </View>
        <Text style={styles.note}>{t("load.forceHint")}</Text>
        <Text testID="load-source" style={styles.source}>
          {t(lesson.source)}
        </Text>
      </View>
      <Text style={styles.subtitle}>{t("load.compare")}</Text>
      <View style={styles.comparison}>
        {(["work", "return"] as const).map((direction) => {
          const f = contractionFrame(
            type,
            selected,
            direction === "work" ? 1 : 0,
            direction,
          );
          return (
            <Pressable
              key={direction}
              accessibilityRole="button"
              accessibilityLabel={t(
                direction === "work" ? "load.shorten" : "load.lengthen",
              )}
              onPress={() => onInspect?.(direction)}
              disabled={!onInspect}
              style={[
                styles.compareCard,
                (phase === direction || frame.isometric) && styles.activeCard,
              ]}
            >
              <Text style={styles.cardTitle}>
                {t(
                  frame.isometric
                    ? "load.stabilizeCard"
                    : direction === "work"
                      ? "load.shortCard"
                      : "load.longCard",
                )}
              </Text>
              <Svg viewBox="0 0 260 100" style={styles.smallSvg}>
                <Bundle
                  length={f.length * 1.5}
                  radius={f.radius * 1.8}
                  y={50}
                />
              </Svg>
            </Pressable>
          );
        })}
      </View>
      {onSlowPlay && (
        <Button
          title={t(running ? "motion.pause" : "load.slowPlay")}
          onPress={onSlowPlay}
          disabled={!canPlay}
          variant="primary"
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("load.details")}
        accessibilityState={{ expanded: detail }}
        aria-expanded={detail}
        onPress={() => setDetail((v) => !v)}
        style={styles.choice}
      >
        <Text style={styles.subtitle}>
          {t("load.details")}
          {detail ? " −" : " ＋"}
        </Text>
      </Pressable>
      {detail && (
        <View>
          <Text style={styles.note}>{t("muscle.sarcomere")}</Text>
          <Svg viewBox="0 0 180 72" style={styles.detailSvg}>
            <Rect
              x={8}
              y={3}
              width={164}
              height={66}
              rx={7}
              fill="#fff"
              stroke="#ddd"
            />
            <G testID="sarcomere-filaments">
              {[28, 44].map((y) => (
                <G key={y}>
                  <Line
                    x1={frame.zLeft}
                    x2={frame.zLeft + 42}
                    y1={y - 3}
                    y2={y - 3}
                    stroke={red}
                    strokeWidth={2}
                  />
                  <Line
                    x1={frame.zRight}
                    x2={frame.zRight - 42}
                    y1={y + 3}
                    y2={y + 3}
                    stroke={red}
                    strokeWidth={2}
                  />
                  <Line
                    x1={63}
                    x2={117}
                    y1={y}
                    y2={y}
                    stroke="#5b514f"
                    strokeWidth={3}
                  />
                  {[70, 80, 90, 100, 110].map((x) => (
                    <Path
                      key={x}
                      d={`M ${x},${y} l -1.5,-3 M ${x + 1},${y} l 1.5,3`}
                      stroke="#5b514f"
                      strokeWidth={1}
                    />
                  ))}
                </G>
              ))}
              {[frame.zLeft, frame.zRight].map((x, i) => (
                <Line
                  key={i}
                  x1={x}
                  x2={x}
                  y1={17}
                  y2={55}
                  stroke="#8b4840"
                  strokeWidth={2}
                />
              ))}
            </G>
          </Svg>
          <Text style={styles.note}>{t("muscle.filamentLegend")}</Text>
          <Text style={styles.note}>
            {t(frame.isometric ? "muscle.isoHint" : "load.detailHint")}
          </Text>
        </View>
      )}
      <Text style={styles.note}>{t("load.noStrength")}</Text>
      <Text style={styles.note}>{t("muscle.limit")}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  inset: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#faf0ec",
    borderWidth: 1,
    borderColor: "#ead8d2",
  },
  panel: {
    padding: 14,
    gap: 9,
    backgroundColor: "#faf8f7",
    borderWidth: 1,
    borderColor: "#e5dedb",
    borderRadius: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    minHeight: 48,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e4deda",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  selected: { borderColor: "#ae6b5f", backgroundColor: "#f7eeeb" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: red },
  choiceText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  subtitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  phase: { color: "#7d3d35", fontSize: 18, lineHeight: 26, fontWeight: "700" },
  bodyAction: { color: colors.text, fontSize: 14, lineHeight: 22 },
  svg: { width: "100%", height: 170 },
  smallSvg: { width: "100%", height: 64 },
  detailSvg: { width: "100%", height: 124 },
  explanation: { color: colors.text, fontSize: 14, lineHeight: 23 },
  emphasis: {
    color: "#7d3d35",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },
  forceBox: { backgroundColor: "#fff", borderRadius: 12, padding: 11, gap: 7 },
  forceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pull: { color: red, fontSize: 24, fontWeight: "700", width: 70 },
  external: { color: "#555", fontSize: 24, fontWeight: "700", width: 70 },
  forceLabel: { flex: 1, color: colors.text, fontSize: 13 },
  source: { color: colors.text, fontSize: 13, lineHeight: 21 },
  comparison: { flexDirection: "row", gap: 8 },
  compareCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 8,
    backgroundColor: "#fff",
  },
  activeCard: { borderColor: "#ae6b5f", backgroundColor: "#f7eeeb" },
  cardTitle: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.text,
    fontWeight: "600",
  },
  note: { color: colors.muted, fontSize: 12, lineHeight: 20 },
});
