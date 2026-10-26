import React, { useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Body, Button, Card, Field, Heading, Page, s } from "../components/ui";
import { WeightChart } from "../components/WeightChart";
import {
  dailyTotals,
  localDateKey,
  MealSlot,
  mealSlots,
  mockMeal,
  parseNumber,
  pfcPercent,
  validDate,
} from "../domain/nutrition";
import { useFitness } from "../state";
export function DietScreen() {
  const { diet, setDietGoals, addWeight, addMeal, removeMeal, storageStatus } =
    useFitness();
  const [date, setDate] = useState(localDateKey);
  const [dateDraft, setDateDraft] = useState(date);
  const [weight, setWeight] = useState("");
  const [target, setTarget] = useState(
    diet.targetWeightKg === null ? "" : String(diet.targetWeightKg),
  );
  const [goal, setGoal] = useState(String(diet.calorieGoal));
  const [slot, setSlot] = useState<MealSlot>("breakfast");
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [f, setF] = useState("");
  const [c, setC] = useState("");
  const [source, setSource] = useState<"manual" | "mock">("manual");
  const [photo, setPhoto] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const totals = dailyTotals(diet.meals, date),
    ratios = pfcPercent(totals);
  const meals = diet.meals.filter((m) => m.date === date);
  const weights = [...diet.weights].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const current = weights.at(-1);
  const percent = (totals.kcal / diet.calorieGoal) * 100;
  const invalid = (message: string) => Alert.alert("入力を確認", message);
  function changeDate() {
    if (
      !validDate(dateDraft) ||
      dateDraft > localDateKey() ||
      dateDraft < "1900-01-01"
    ) {
      invalid(
        "記録日は1900年以降、今日までのYYYY-MM-DD形式で入力してください。",
      );
      return;
    }
    setDate(dateDraft);
  }
  function saveGoals() {
    const kg = target.trim() === "" ? null : parseNumber(target, 20, 400);
    const calories = parseNumber(goal, 100, 10000);
    if ((target.trim() !== "" && kg === null) || calories === null) {
      invalid(
        "目標体重は20〜400kg（未設定なら空欄）、目標カロリーは100〜10000kcalで入力してください。",
      );
      return;
    }
    setDietGoals({ targetWeightKg: kg, calorieGoal: calories });
    Alert.alert("目標を更新しました", "端末保存の状態は画面で確認できます。");
  }
  function recordWeight() {
    const kg = parseNumber(weight, 20, 400);
    if (kg === null) {
      invalid("体重は20〜400kgで入力してください。");
      return;
    }
    addWeight({ date, kg });
    setWeight("");
    Alert.alert(
      "体重を記録しました",
      `${date} / ${kg}kg。同じ日付の記録は更新されます。`,
    );
  }
  function resetMeal() {
    setName("");
    setKcal("");
    setP("");
    setF("");
    setC("");
    setSource("manual");
    setPhoto(null);
  }
  function recordMeal() {
    const values = {
      kcal: parseNumber(kcal, 0, 10000),
      p: parseNumber(p, 0, 1000),
      f: parseNumber(f, 0, 1000),
      c: parseNumber(c, 0, 1000),
    };
    if (
      !name.trim() ||
      name.trim().length > 80 ||
      values.kcal === null ||
      values.p === null ||
      values.f === null ||
      values.c === null
    ) {
      invalid(
        "食事名は1〜80文字、kcalは0〜10000、P/F/Cはそれぞれ0〜1000gで入力してください。空欄は0では扱いません。",
      );
      return;
    }
    addMeal({
      date,
      slot,
      name: name.trim(),
      source,
      kcal: values.kcal,
      p: values.p,
      f: values.f,
      c: values.c,
    });
    resetMeal();
  }
  async function scan() {
    if (scanning) return;
    setScanning(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        exif: false,
        base64: false,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) throw new Error("No image");
      setPhoto(uri);
      setSource("mock");
      setName("写真の食事（モック）");
      setKcal(String(mockMeal.kcal));
      setP(String(mockMeal.p));
      setF(String(mockMeal.f));
      setC(String(mockMeal.c));
    } catch {
      Alert.alert(
        "写真を開けませんでした",
        "写真の選択を再試行するか、手入力してください。",
      );
    } finally {
      setScanning(false);
    }
  }
  return (
    <Page
      title="Nourish your progress."
      subtitle="食事と体重を、あなたのペースで記録。"
    >
      <Body>
        {storageStatus === "saved"
          ? "端末に保存済み"
          : storageStatus === "saving"
            ? "端末に保存中…"
            : "保存に失敗しています。再試行してください。"}
      </Body>
      <Card>
        <Heading>記録日</Heading>
        <Body>体重・食事の追加と表示に使用します。</Body>
        <Field
          accessibilityLabel="記録日"
          placeholder="YYYY-MM-DD"
          value={dateDraft}
          onChangeText={setDateDraft}
        />
        <View style={s.row}>
          <Button title="日付を表示" onPress={changeDate} />
          <Button
            title="今日を表示"
            onPress={() => {
              const today = localDateKey();
              setDate(today);
              setDateDraft(today);
            }}
          />
        </View>
        <Body>表示・保存先: {date}</Body>
      </Card>
      <Card>
        <Heading>現在体重・目標</Heading>
        <Text style={s.number}>{current ? `${current.kg} kg` : "— kg"}</Text>
        <Body>
          {current
            ? `最終記録: ${current.date}`
            : "まだ体重の記録がありません。"}
        </Body>
        <Body>目標体重（kg / 空欄で未設定）</Body>
        <Field
          accessibilityLabel="目標体重kg"
          keyboardType="decimal-pad"
          value={target}
          onChangeText={setTarget}
        />
        <Body>1日の目標カロリー（kcal）</Body>
        <Field
          accessibilityLabel="目標カロリー"
          keyboardType="decimal-pad"
          value={goal}
          onChangeText={setGoal}
        />
        <Button title="目標を保存" onPress={saveGoals} />
        <Body>{date}の体重（kg）</Body>
        <Field
          accessibilityLabel="体重kg"
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />
        <Button title="体重を記録" onPress={recordWeight} />
        <WeightChart weights={diet.weights} target={diet.targetWeightKg} />
      </Card>
      <Card>
        <Heading>カロリー & PFC / {date}</Heading>
        <Text style={s.number}>
          {totals.kcal.toFixed(0)}{" "}
          <Text style={{ fontSize: 16 }}>/ {diet.calorieGoal} kcal</Text>
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="摂取カロリー達成率"
          accessibilityValue={{ min: 0, max: 100, now: Math.min(100, percent) }}
          style={{
            height: 10,
            backgroundColor: "#303030",
            borderRadius: 5,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 10,
              backgroundColor: "#ffffff",
              width: `${Math.min(100, percent)}%`,
            }}
          />
        </View>
        <Body>
          {totals.kcal > diet.calorieGoal
            ? `目標を${(totals.kcal - diet.calorieGoal).toFixed(0)}kcal超えています`
            : `目標まで${(diet.calorieGoal - totals.kcal).toFixed(0)}kcal`}
        </Body>
        {(["p", "f", "c"] as const).map((key, i) => (
          <View key={key}>
            <Body>
              {["P / タンパク質", "F / 脂質", "C / 炭水化物"][i]}:{" "}
              {totals[key].toFixed(1)}g / {ratios[key].toFixed(1)}%
            </Body>
            <View style={{ height: 4, backgroundColor: "#303030" }}>
              <View
                style={{
                  height: 4,
                  width: `${ratios[key]}%`,
                  backgroundColor: ["#ffffff", "#d4d4d8", "#a1a1aa"][i],
                }}
              />
            </View>
          </View>
        ))}
        <Body>
          PFC比率はP・Cを4kcal/g、Fを9kcal/gとして熱量換算します。食品表示のkcalと換算値は一致しない場合があります。
        </Body>
      </Card>
      <Card>
        <Heading>食事を記録</Heading>
        <View style={s.row}>
          {mealSlots.map((m) => (
            <Button
              key={m.id}
              title={m.label}
              selected={slot === m.id}
              onPress={() => setSlot(m.id)}
            />
          ))}
        </View>
        <Body>
          写真モックは画像内容に関係なく580kcal /
          P52g・F16g・C55gです。AI解析・写真送信は行いません。値を確認・修正して保存してください。
        </Body>
        <Button
          title={scanning ? "写真を選択中…" : "写真を選んでモック推定"}
          onPress={() => void scan()}
          disabled={scanning}
        />
        {photo && (
          <Image
            source={{ uri: photo }}
            accessibilityLabel="選択した食事写真（保存・送信しません）"
            style={{ height: 140, width: "100%", borderRadius: 12 }}
          />
        )}
        {source === "mock" && <Body>モック推定（要確認）</Body>}
        <Field
          accessibilityLabel="食事名"
          placeholder="食事名"
          maxLength={80}
          value={name}
          onChangeText={setName}
        />
        {[
          { label: "カロリーkcal", value: kcal, set: setKcal },
          { label: "タンパク質g", value: p, set: setP },
          { label: "脂質g", value: f, set: setF },
          { label: "炭水化物g", value: c, set: setC },
        ].map((field) => (
          <View key={field.label}>
            <Body>{field.label}</Body>
            <Field
              accessibilityLabel={field.label}
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={field.set}
            />
          </View>
        ))}
        <Button title="食事を保存" selected onPress={recordMeal} />
        <Button title="入力をクリア" onPress={resetMeal} />
      </Card>
      <Card>
        <Heading>食事履歴 / {date}</Heading>
        {!meals.length && <Body>この日の食事はまだ記録されていません。</Body>}
        {meals.map((m) => (
          <View
            key={m.id}
            style={{
              gap: 8,
              borderBottomWidth: 1,
              borderColor: "#303030",
              paddingBottom: 12,
            }}
          >
            <Body>
              {mealSlots.find((s) => s.id === m.slot)!.label} / {m.name}
              {m.source === "mock" ? "（モック推定）" : ""}
            </Body>
            <Body>
              {m.kcal}kcal / P:{m.p}g F:{m.f}g C:{m.c}g
            </Body>
            <Button
              title={`${m.name}を削除`}
              onPress={() =>
                Alert.alert("食事を削除", `${m.name}を削除しますか？`, [
                  { text: "キャンセル", style: "cancel" },
                  {
                    text: "削除",
                    style: "destructive",
                    onPress: () => removeMeal(m.id),
                  },
                ])
              }
            />
          </View>
        ))}
      </Card>
    </Page>
  );
}
