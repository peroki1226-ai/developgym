import { useI18n } from "../i18n";
import React, { useState } from "react";
import { Alert, View } from "react-native";
import { Body, Button, Card, Field, Heading, Page, s } from "../components/ui";
import {
  alternativesFor,
  bodyParts,
  BodyPart,
  gymAlternatives,
  homeGear,
  parseDumbbellMax,
  recommendHome,
  validateHomeLog,
} from "../domain/homeTraining";
import { useFitness } from "../state";
export function HomeScreen() {
  const { t } = useI18n();
  const {
    homeProfile: profile,
    setHomeProfile,
    addLog,
    storageStatus,
  } = useFitness();
  const [maxDraft, setMaxDraft] = useState(String(profile.maxDumbbellKg));
  const [part, setPart] = useState<BodyPart>("chest");
  const [mode, setMode] = useState<"part" | "alternative">("part");
  const [gymId, setGymId] = useState<string>("chest-press");
  const [exerciseId, setExerciseId] = useState("");
  const [weight, setWeight] = useState("5");
  const [reps, setReps] = useState("10");
  const [sets, setSets] = useState("3");
  const exercises =
    mode === "part"
      ? recommendHome(profile, part)
      : alternativesFor(gymId, profile);
  const selected = exercises.find((e) => e.id === exerciseId) ?? exercises[0];
  function saveMax() {
    const kg = parseDumbbellMax(maxDraft);
    if (kg === null) {
      Alert.alert(
        t("入力を確認"),
        t("ダンベル上限は0より大きく100kg以下で入力してください。"),
      );
      return;
    }
    setHomeProfile({
      ...profile,
      maxDumbbellKg: kg,
    });
  }
  function record() {
    if (!selected) return;
    const error = validateHomeLog(selected, profile, weight, reps, sets);
    if (error) {
      Alert.alert(t("入力を確認"), t(error));
      return;
    }
    addLog({
      name: selected.name,
      weight: selected.load === "dumbbell" ? Number(weight) : 0,
      reps: Number(reps),
      sets: Number(sets),
      location: "home",
      loadType: selected.load,
    });
    Alert.alert(
      t("履歴に追加しました"),
      t(
        "My Pageの「🏠 自宅」で確認できます。端末保存の状態も画面で確認してください。",
      ),
    );
  }
  return (
    <Page
      title="Your space. Your pace."
      subtitle={t("自宅を、あなた専用のトレーニング空間に。")}
    >
      <Body>
        {storageStatus === "saved"
          ? t("端末に保存済み")
          : storageStatus === "saving"
            ? t("端末に保存中…")
            : t("保存に失敗しています。再試行してください。")}
      </Body>
      <Card>
        <Heading>{t("自宅器具プロファイル")}</Heading>
        <Body>
          {t(
            "所有器具は複数登録できます。自重のみモードでも登録内容は残ります。",
          )}
        </Body>
        <View style={s.row}>
          <Button
            title={t("自重のみ")}
            selected={profile.bodyweightOnly}
            onPress={() =>
              setHomeProfile({
                ...profile,
                bodyweightOnly: !profile.bodyweightOnly,
              })
            }
          />
          {homeGear.map((g) => (
            <Button
              key={g.id}
              title={t(g.label)}
              selected={profile.gear.includes(g.id)}
              onPress={() =>
                setHomeProfile({
                  ...profile,
                  gear: profile.gear.includes(g.id)
                    ? profile.gear.filter((id) => id !== g.id)
                    : [...profile.gear, g.id],
                })
              }
            />
          ))}
        </View>
        {profile.bodyweightOnly && (
          <Body>{t("現在は器具を使わない種目だけを表示しています。")}</Body>
        )}
        {profile.gear.includes("dumbbell") && (
          <>
            <Body>
              {t("ダンベル最大重量（片手あたり）: ")}
              {profile.maxDumbbellKg}
              {t("kg")}
            </Body>
            <Field
              accessibilityLabel={t("ダンベル最大重量kg")}
              keyboardType="decimal-pad"
              value={maxDraft}
              onChangeText={setMaxDraft}
            />
            <Button title={t("最大重量を保存")} onPress={saveMax} />
            {maxDraft !== String(profile.maxDumbbellKg) && (
              <Body>{t("最大重量に未保存の変更があります。")}</Body>
            )}
          </>
        )}
      </Card>
      <View style={s.row}>
        <Button
          title={t("部位別メニュー")}
          selected={mode === "part"}
          onPress={() => setMode("part")}
        />
        <Button
          title={t("ジム種目から代替を探す")}
          selected={mode === "alternative"}
          onPress={() => setMode("alternative")}
        />
      </View>
      {mode === "part" ? (
        <>
          <Heading>{t("鍛えたい部位")}</Heading>
          <View style={s.row}>
            {bodyParts.map((p) => (
              <Button
                key={p.id}
                title={t(p.label)}
                selected={part === p.id}
                onPress={() => setPart(p.id)}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <Heading>{t("代替したいジム種目")}</Heading>
          <View style={s.row}>
            {gymAlternatives.map((g) => (
              <Button
                key={g.id}
                title={t(g.name)}
                selected={gymId === g.id}
                onPress={() => setGymId(g.id)}
              />
            ))}
          </View>
          <Body>
            {t(
              "同じ部位を鍛えるための候補です。マシンと負荷・動作が完全に同じではありません。",
            )}
          </Body>
        </>
      )}
      <Card>
        <Heading>
          {mode === "part"
            ? t("所有器具でできるメニュー")
            : t("ALTERNATIVE / 家トレ候補")}
        </Heading>
        <Body>
          {t(
            "器具を使う候補と自重種目から選べます。無理のない負荷と痛みのない範囲で行ってください。",
          )}
        </Body>
        <View style={s.row}>
          {exercises.map((e) => (
            <Button
              key={e.id}
              title={t(e.name)}
              selected={selected?.id === e.id}
              onPress={() => setExerciseId(e.id)}
            />
          ))}
        </View>
        {!exercises.length && (
          <Body>
            {t(
              "現在の器具では代替候補がありません。器具プロファイルを変更するか、別のジム種目を選んでください。",
            )}
          </Body>
        )}
      </Card>
      {selected && (
        <Card>
          <Heading>
            {t("記録 / ")}
            {t(selected.name)}
          </Heading>
          <Body>{t(selected.cue)}</Body>
          <Body>
            {t("必要器具:")}{" "}
            {selected.requires
              .map((id) => t(homeGear.find((g) => g.id === id)!.label))
              .join(" + ") || t("器具なし")}
          </Body>
          {selected.load === "dumbbell" ? (
            <>
              <Body>
                {t("使用重量（片手kg / 上限{0}kg）", {
                  0: profile.maxDumbbellKg,
                })}
              </Body>
              <Field
                accessibilityLabel={t("家トレ重量kg")}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </>
          ) : (
            <Body>
              {selected.load === "band"
                ? t("バンド負荷 / 回数で記録")
                : t("自重 / 回数で記録")}
            </Body>
          )}
          <Body>{t("回数")}</Body>
          <Field
            accessibilityLabel={t("家トレ回数")}
            keyboardType="number-pad"
            value={reps}
            onChangeText={setReps}
          />
          <Body>{t("セット数")}</Body>
          <Field
            accessibilityLabel={t("家トレセット数")}
            keyboardType="number-pad"
            value={sets}
            onChangeText={setSets}
          />
          <Button title={t("家トレを記録")} selected onPress={record} />
        </Card>
      )}
    </Page>
  );
}
