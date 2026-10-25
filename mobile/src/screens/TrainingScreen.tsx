import React, { useState } from "react";
import { Alert, View } from "react-native";
import { Body, Button, Card, Field, Heading, Page, s } from "../components/ui";
import { EQUIPMENTS } from "../data/equipment";
import { useFitness } from "../state";
export function TrainingScreen() {
  const [pro, setPro] = useState(false);
  const [selected, setSelected] = useState(EQUIPMENTS[0]);
  const [weight, setWeight] = useState("20");
  const [reps, setReps] = useState("10");
  const [sets, setSets] = useState("3");
  const { addLog } = useFitness();
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
    addLog({ name: selected.name, weight: w, reps: r, sets: n });
    Alert.alert(
      "記録しました",
      "My Pageの統合履歴に追加しました。端末保存の状態はMy Pageで確認できます。",
    );
  }
  return (
    <Page
      title="Move with intent."
      subtitle="フォームを整え、昨日の自分を超える。"
    >
      <View style={s.row}>
        <Button title="初心者" selected={!pro} onPress={() => setPro(false)} />
        <Button
          title="本格モード"
          selected={pro}
          onPress={() => setPro(true)}
        />
      </View>
      <Body>既存の器具ガイド3種目。全12種目の図解は今後追加予定です。</Body>
      <View style={s.row}>
        {EQUIPMENTS.map((eq) => (
          <Button
            key={eq.id}
            title={eq.name}
            selected={eq.id === selected.id}
            onPress={() => setSelected(eq)}
          />
        ))}
      </View>
      <Card>
        <Body>{selected.enName}</Body>
        <Heading>{selected.name}</Heading>
        <Body>{selected.bodyPartLabel}</Body>
        {pro ? (
          <>
            <Body>{selected.proBiomechanics}</Body>
            <Body>{selected.builderTip}</Body>
          </>
        ) : (
          <>
            <Body>{selected.seatSetup}</Body>
            {selected.beginnerSteps.map((step, i) => (
              <Body key={step}>
                {i + 1}. {step}
              </Body>
            ))}
          </>
        )}
        <Heading>フォームの注意点</Heading>
        {selected.ngPoints.map((point) => (
          <Body key={point}>・{point}</Body>
        ))}
      </Card>
      <Card>
        <Heading>セットを記録</Heading>
        <Body>重量（kg） / 自重の場合は0</Body>
        <Field
          accessibilityLabel="重量kg"
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />
        <Body>回数</Body>
        <Field
          accessibilityLabel="回数"
          keyboardType="number-pad"
          value={reps}
          onChangeText={setReps}
        />
        <Body>セット数</Body>
        <Field
          accessibilityLabel="セット数"
          keyboardType="number-pad"
          value={sets}
          onChangeText={setSets}
        />
        <Button title="トレーニングを記録" selected onPress={save} />
      </Card>
    </Page>
  );
}
