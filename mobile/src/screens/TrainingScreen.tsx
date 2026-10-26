import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ExerciseDiagram } from "../components/ExerciseDiagram";
import { Body, Button, Card, Field, Heading, Page, s } from "../components/ui";
import { EQUIPMENTS, EquipmentItem } from "../data/equipment";
import { useFitness } from "../state";

export function TrainingScreen() {
  const [pro, setPro] = useState(false);
  const [selectedPart, setSelectedPart] = useState<string>("all");
  const [selected, setSelected] = useState<EquipmentItem>(EQUIPMENTS[0]);
  const [weight, setWeight] = useState("30");
  const [reps, setReps] = useState("10");
  const [sets, setSets] = useState("3");
  const { addLog } = useFitness();

  const filteredEquipments = EQUIPMENTS.filter(
    (e) => selectedPart === "all" || e.bodyPart === selectedPart,
  );

  function save() {
    const w = Number(weight),
      r = Number(reps),
      n = Number(sets);
    if (
      !weight.trim() ||
      !Number.isFinite(w) ||
      w < 0 ||
      w > 1000 ||
      !Number.isInteger(r) ||
      r < 1 ||
      r > 100 ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > 100
    ) {
      Alert.alert(
        "入力を確認",
        "重量は0〜1000kg、回数・セットは1〜100の整数で入力してください。",
      );
      return;
    }
    addLog({
      name: selected.name,
      weight: w,
      reps: r,
      sets: n,
      location: "gym",
      loadType: w > 0 ? "weight" : "bodyweight",
    });
    Alert.alert(
      "記録しました",
      "My Pageの「ジム」統合履歴に追加しました。端末に自動保存されます。",
    );
  }

  return (
    <Page
      title="Move with intent."
      subtitle="正しい軌道とフォームで、怪我を防ぎ最大の筋肥大を引き出す。"
    >
      {/* Mode Switcher */}
      <View style={s.row}>
        <Button
          title="🔰 初心者モード"
          selected={!pro}
          onPress={() => setPro(false)}
        />
        <Button
          title="⚡ 本格モード（生体力学）"
          selected={pro}
          onPress={() => setPro(true)}
        />
      </View>

      {/* Body Part Filter */}
      <Heading>部位で絞り込む</Heading>
      <View style={s.row}>
        {[
          { id: "all", label: "全12種目" },
          { id: "chest", label: "胸" },
          { id: "back", label: "背中" },
          { id: "legs", label: "脚" },
          { id: "shoulder", label: "肩" },
          { id: "arm", label: "腕" },
          { id: "abs", label: "腹筋" },
        ].map((p) => (
          <Button
            key={p.id}
            title={p.label}
            selected={selectedPart === p.id}
            onPress={() => {
              setSelectedPart(p.id);
              const first = EQUIPMENTS.find(
                (e) => p.id === "all" || e.bodyPart === p.id,
              );
              if (first) setSelected(first);
            }}
          />
        ))}
      </View>

      {/* Equipment Selector */}
      <Heading>種目を選択 ({filteredEquipments.length}件)</Heading>
      <View style={s.row}>
        {filteredEquipments.map((eq) => (
          <Button
            key={eq.id}
            title={eq.name}
            selected={eq.id === selected.id}
            onPress={() => setSelected(eq)}
          />
        ))}
      </View>

      {/* SVG Form & Trajectory Diagram */}
      <ExerciseDiagram
        type={selected.svgType}
        muscleTag={selected.muscleTag}
      />

      {/* Detailed Guide Card */}
      <Card>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Body>{selected.enName}</Body>
            <Heading>{selected.name}</Heading>
          </View>
          <View style={styles.pofBadge}>
            <Text style={styles.pofText}>{selected.pof}</Text>
          </View>
        </View>

        <Body>{selected.bodyPartLabel}</Body>
        <Body>{selected.summary}</Body>

        <View style={styles.divider} />

        {pro ? (
          /* Pro Mode: Biomechanics & Variations */
          <>
            <Heading>解剖学的ターゲット</Heading>
            <Body>{selected.proAnatomy}</Body>

            <Heading>生体力学（Biomechanics）</Heading>
            <Body>{selected.proBiomechanics}</Body>

            <Heading>バリエーション & 刺激変化</Heading>
            {selected.proVariations.map((v) => (
              <Body key={v}>• {v}</Body>
            ))}

            <Heading>ビルダーの極意（Builder Tip）</Heading>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>💡 {selected.builderTip}</Text>
            </View>
          </>
        ) : (
          /* Beginner Mode: Seat Setup, Steps, NG Points */
          <>
            <Heading>シート・器具のセッティング</Heading>
            <Body>{selected.seatSetup}</Body>

            <Heading>正しい動作手順</Heading>
            {selected.beginnerSteps.map((step, i) => (
              <Body key={step}>
                {i + 1}. {step}
              </Body>
            ))}

            <Heading>推奨スタート重量の目安</Heading>
            <Body>
              男性: {selected.startWeightMale} / 女性:{" "}
              {selected.startWeightFemale}
            </Body>

            <Heading>フォームの注意点（NG）</Heading>
            {selected.ngPoints.map((point) => (
              <Body key={point}>⚠️ {point}</Body>
            ))}
          </>
        )}
      </Card>

      {/* Quick Workout Logger */}
      <Card>
        <Heading>セットを記録（{selected.name}）</Heading>
        <Body>重量（kg） / 自重の場合は0</Body>
        <Field
          accessibilityLabel="重量kg"
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />
        <Body>回数（Reps）</Body>
        <Field
          accessibilityLabel="回数"
          keyboardType="number-pad"
          value={reps}
          onChangeText={setReps}
        />
        <Body>セット数（Sets）</Body>
        <Field
          accessibilityLabel="セット数"
          keyboardType="number-pad"
          value={sets}
          onChangeText={setSets}
        />
        <Button title="ジムトレーニングを記録" selected onPress={save} />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  pofBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pofText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 4,
  },
  tipBox: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 12,
    padding: 12,
  },
  tipText: {
    color: "#f4f4f5",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
});
