import { useI18n } from "../i18n";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { ExerciseDiagram } from "../components/ExerciseDiagram";
import {
  Body,
  Button,
  Card,
  Disclosure,
  Field,
  Heading,
  Page,
  s,
} from "../components/ui";
import { EQUIPMENTS, EquipmentItem } from "../data/equipment";
import { useFitness } from "../state";
export function TrainingScreen({
  initialEquipmentId,
  onBack,
  active = true,
}: { initialEquipmentId?: string; onBack?: () => void; active?: boolean } = {}) {
  const { t } = useI18n();
  const [pro, setPro] = useState(false);
  const [selectedPart, setSelectedPart] = useState<string>("all");
  const [selected, setSelected] = useState<EquipmentItem>(
    () => EQUIPMENTS.find((e) => e.id === initialEquipmentId) ?? EQUIPMENTS[0],
  );
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
        t("入力を確認"),
        t("重量は0〜1000kg、回数・セットは1〜100の整数で入力してください。"),
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
      t("記録しました"),
      t("My Pageの「ジム」統合履歴に追加しました。端末に自動保存されます。"),
    );
  }
  return (
    <View style={{ flex: 1 }}>
      {onBack && (
        <View style={{ paddingHorizontal: 22 }}>
          <Button title={t("guide.back")} variant="quiet" onPress={onBack} />
        </View>
      )}
      <Page
        title={onBack ? "guide.title" : "Move with intent."}
        subtitle={t(
          onBack
            ? "guide.entryHint"
            : "正しい軌道とフォームで、怪我を防ぎ最大の筋肥大を引き出す。",
        )}
        tools={!onBack}
        scrollKey={selected.id}
      >
        {/* Mode Switcher */}
        <View style={s.row}>
          <Button
            title={t("🔰 初心者モード")}
            selected={!pro}
            onPress={() => setPro(false)}
          />
          <Button
            title={t("⚡ 本格モード（生体力学）")}
            selected={pro}
            onPress={() => setPro(true)}
          />
        </View>

        {/* SVG Form & Trajectory Diagram */}
        <Heading>{t(selected.name)}</Heading>
        <ExerciseDiagram
          type={selected.svgType}
          muscleTag={selected.muscleTag}
          label={selected.name}
          active={active}
        />

        {/* Detailed Guide Card */}
        <Card>
          <View style={styles.titleRow}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Heading>{t(selected.name)}</Heading>
            </View>
            <View style={styles.pofBadge}>
              <Text style={styles.pofText}>{t(selected.pof)}</Text>
            </View>
          </View>

          <Body>{t(selected.bodyPartLabel)}</Body>
          <Body>{t(selected.summary)}</Body>

          <View style={styles.divider} />

          {pro /* Pro Mode: Biomechanics & Variations */ ? (
            <>
              <Heading>{t("解剖学的ターゲット")}</Heading>
              <Body>{t(selected.proAnatomy)}</Body>

              <Heading>{t("生体力学（Biomechanics）")}</Heading>
              <Body>{t(selected.proBiomechanics)}</Body>

              <Heading>{t("バリエーション & 刺激変化")}</Heading>
              {selected.proVariations.map((v) => (
                <Body key={v}>• {t(v)}</Body>
              ))}

              <Heading>{t("ビルダーの極意（Builder Tip）")}</Heading>
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>💡 {t(selected.builderTip)}</Text>
              </View>
            </> /* Beginner Mode: Seat Setup, Steps, NG Points */
          ) : (
            <>
              <Heading>{t("シート・器具のセッティング")}</Heading>
              <Body>{t(selected.seatSetup)}</Body>

              <Heading>{t("正しい動作手順")}</Heading>
              {selected.beginnerSteps.map((step, i) => (
                <Body key={step}>
                  {i + 1}. {t(step)}
                </Body>
              ))}

              <Heading>{t("推奨スタート重量の目安")}</Heading>
              <Body>
                {t("男性: ")}
                {t(selected.startWeightMale)}
                {t(" / 女性:")} {t(selected.startWeightFemale)}
              </Body>

              <Heading>{t("フォームの注意点（NG）")}</Heading>
              {selected.ngPoints.map((point) => (
                <Body key={point}>⚠️ {t(point)}</Body>
              ))}
            </>
          )}
        </Card>

        <Disclosure title={t("guide.changeMachine")}>
          {/* Body Part Filter */}
          <Heading>{t("部位で絞り込む")}</Heading>
          <View style={s.row}>
            {[
              {
                id: "all",
                label: t("guide.allMachines", { 0: EQUIPMENTS.length }),
              },
              {
                id: "chest",
                label: t("胸"),
              },
              {
                id: "back",
                label: t("背中"),
              },
              {
                id: "legs",
                label: t("脚"),
              },
              {
                id: "shoulder",
                label: t("肩"),
              },
              {
                id: "arm",
                label: t("腕"),
              },
              {
                id: "abs",
                label: t("腹筋"),
              },
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
          <Heading>
            {t("種目を選択 (")}
            {filteredEquipments.length}
            {t("件)")}
          </Heading>
          <View style={s.row}>
            {filteredEquipments.map((eq) => (
              <Button
                key={eq.id}
                title={t(eq.name)}
                selected={eq.id === selected.id}
                onPress={() => setSelected(eq)}
              />
            ))}
          </View>
        </Disclosure>

        {/* Quick Workout Logger */}
        <Card>
          <Heading>{t("セットを記録（{0}）", { 0: t(selected.name) })}</Heading>
          <Body>{t("重量（kg） / 自重の場合は0")}</Body>
          <Field
            accessibilityLabel={t("重量kg")}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Body>{t("回数（Reps）")}</Body>
          <Field
            accessibilityLabel={t("回数")}
            keyboardType="number-pad"
            value={reps}
            onChangeText={setReps}
          />
          <Body>{t("セット数（Sets）")}</Body>
          <Field
            accessibilityLabel={t("セット数")}
            keyboardType="number-pad"
            value={sets}
            onChangeText={setSets}
          />
          <Button title={t("ジムトレーニングを記録")} selected onPress={save} />
        </Card>
      </Page>
    </View>
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
    backgroundColor: "#e8f2ff",
    borderWidth: 1,
    borderColor: "#dce8f8",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pofText: {
    color: "#254f70",
    fontSize: 10,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#edf5ff",
    marginVertical: 4,
  },
  tipBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dce8f8",
    borderRadius: 12,
    padding: 12,
  },
  tipText: {
    color: "#183153",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
});
