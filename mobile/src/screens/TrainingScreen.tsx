import { LegCoursePicker, LegCoachingPanel } from "../components/LegCoaching";
import { legLesson } from "../domain/legLessons";
import { AdvancedWorkoutLogger } from "../components/AdvancedWorkoutLogger";
import { ProTrainingCoach } from "../components/ProTrainingCoach";
import { ChestCoursePicker, ChestCoachingPanel } from "../components/ChestCoaching";
import { chestLesson } from "../domain/chestLessons";
import { useI18n } from "../i18n";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
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
  const [proModelOpen, setProModelOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<string>("all");
  const [selected, setSelected] = useState<EquipmentItem>(
    () => EQUIPMENTS.find((e) => e.id === initialEquipmentId) ?? EQUIPMENTS[0],
  );
  const [weight, setWeight] = useState(initialEquipmentId === "chest-dip" ? "0" : "");
  const [reps, setReps] = useState("10");
  const [sets, setSets] = useState("3");
  const { addLog } = useFitness();
  const lesson = chestLesson(selected.id);
  const leg = legLesson(selected.id);
  function selectEquipment(id: string) {
    const next = EQUIPMENTS.find(e => e.id === id);
    if (next && next.id !== selected.id) { setSelected(next); setWeight(id === "chest-dip" ? "0" : ""); setProModelOpen(false); }
  }
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
  const equipmentSelector = (
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
                  if (first) selectEquipment(first.id);
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
                onPress={() => selectEquipment(eq.id)}
              />
            ))}
          </View>
        </Disclosure>
  );
  return (
    <View testID="training-screen" style={{ flex: 1 }}>
      {onBack && (
        <View style={{ paddingHorizontal: 22 }}>
          <Button title={t("guide.back")} variant="quiet" onPress={onBack} />
        </View>
      )}
      <Page
        title={pro ? "advanced.screen.title" : onBack ? "guide.title" : "Move with intent."}
        subtitle={t(
          pro ? "advanced.screen.hint" : onBack
            ? "guide.entryHint"
            : "正しい軌道とフォームで、怪我を防ぎ最大の筋肥大を引き出す。",
        )}
        tools={!onBack}
        scrollKey={selected.id}
        contentKey="training-form"
        keyboardDismissMode="none"
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
            onPress={() => { if(!pro)setProModelOpen(false);setPro(true); }}
          />
        </View>

        {!pro && <ChestCoursePicker selected={selected.id} onSelect={selectEquipment} />}
        {!pro && <LegCoursePicker selected={selected.id} onSelect={selectEquipment} />}
        {pro && equipmentSelector}
        <Heading>{t(selected.name)}</Heading>
        {pro && <ProTrainingCoach key={`coach:${selected.id}`} type={selected.svgType} phase="start" canPlay={false} running={false} advancedOnly/>}
        {!pro && <ExerciseDiagram
          type={selected.svgType}
          muscleTag={selected.muscleTag}
          label={selected.name}
          active={active}
          beginner={!pro}
          beginnerGuide={selected}
          showMuscleExplanations={!pro}
          showProCoach={false}
        />}

        {!pro && lesson && <ChestCoachingPanel key={lesson.id} lesson={lesson} onAssisted={() => selectEquipment("assisted-dip")} />}
        {!pro && leg && <LegCoachingPanel key={leg.id} lesson={leg} />}
        {/* Beginner setup and ordinary instructions */}
        {!pro && <Card>
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

          <Heading>{t("シート・器具のセッティング")}</Heading>
          <Body>{t(selected.seatSetup)}</Body>

          <Heading>{t("正しい動作手順")}</Heading>
          {selected.beginnerSteps.map((step, i) => (
            <Body key={step}>
              {i + 1}. {t(step)}
            </Body>
          ))}

          <Heading>{t("推奨スタート重量の目安")}</Heading>
          <Body>{selected.startWeightMale === selected.startWeightFemale ? t(selected.startWeightMale) : <>
            {t("男性: ")}{t(selected.startWeightMale)}{t(" / 女性:")} {t(selected.startWeightFemale)}
          </>}</Body>

          <Heading>{t("フォームの注意点（NG）")}</Heading>
          {selected.ngPoints.map((point) => (
            <Body key={point}>⚠️ {t(point)}</Body>
          ))}
        </Card>}

        {!pro && lesson && <Body>{t(`${lesson.prefix}.record`)}</Body>}
        {!pro && equipmentSelector}

        {/* Beginner logger stays independent of advanced entries. */}
        {!pro && <Card>
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
        </Card>}
        <AdvancedWorkoutLogger key={`logger:${selected.id}`} active={pro} exerciseId={selected.svgType} name={selected.name} initialWeight={weight} initialReps={reps} initialSets={sets}/>
        {pro && <View>
          <Pressable accessibilityRole="button" accessibilityLabel={t("advanced.model.open")} accessibilityState={{expanded:proModelOpen}} aria-expanded={proModelOpen}
            onPress={()=>setProModelOpen(value=>!value)} style={styles.modelToggle}><Text style={styles.modelLabel}>{t("advanced.model.open")}</Text><Text>{proModelOpen?'−':'+'}</Text></Pressable>
          {proModelOpen&&<ExerciseDiagram
          type={selected.svgType}
          muscleTag={selected.muscleTag}
          label={selected.name}
          active={active}
          beginner={!pro}
          beginnerGuide={selected}
          showMuscleExplanations={!pro}
          showProCoach={false}
        />}
        </View>}
      </Page>
    </View>
  );
}
const styles = StyleSheet.create({
  modelToggle: {minHeight:48,padding:12,borderWidth:1,borderColor:'#dce8f8',borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  modelLabel: {fontSize:14,lineHeight:22,color:'#254f70',flexShrink:1},
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
