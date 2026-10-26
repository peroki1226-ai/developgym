import React from "react";
import { Alert, Text, View } from "react-native";
import { Body, Button, Card, Heading, Page, s } from "../components/ui";
import { useFitness } from "../state";
import { gyms } from "../domain/matching";
export function MyPageScreen() {
  const { logs, favorites, storageStatus } = useFitness();
  return (
    <Page
      title="Made by you."
      subtitle="ジムでも、自宅でも。すべての積み重ねをひとつに。"
    >
      <Body>記録・お気に入り・自宅器具はこの端末に保存します。</Body>
      <Card>
        <Body>統合履歴 / 合計セット</Body>
        <Text style={s.number}>
          {logs.reduce((sum, log) => sum + log.sets, 0)}{" "}
          <Text style={{ fontSize: 16 }}>sets</Text>
        </Text>
        <Body>
          {storageStatus === "saved"
            ? "端末に保存済み"
            : storageStatus === "saving"
              ? "端末に保存中…"
              : "保存に失敗しています。再試行してください。"}
        </Body>
        <Heading>トレーニング統合履歴</Heading>
        {logs.length ? (
          logs.map((log) => (
            <View key={log.id}>
              <Body>{log.location === "home" ? "🏠 自宅" : "ジム"}</Body>
              <Body>
                {log.date} / {log.name}
              </Body>
              <Body>
                {log.loadType === "bodyweight"
                  ? "自重"
                  : log.loadType === "band"
                    ? "バンド"
                    : `${log.weight}kg${log.loadType === "dumbbell" ? "（片手）" : ""}`}{" "}
                × {log.reps}回 × {log.sets}セット
              </Body>
            </View>
          ))
        ) : (
          <Body>
            まだ記録がありません。Training または Home
            で最初のセットを記録しましょう。
          </Body>
        )}
      </Card>
      <Card>
        <Heading>お気に入りジム</Heading>
        {favorites.length ? (
          gyms
            .filter((g) => favorites.includes(g.id))
            .map((g) => (
              <Body key={g.id}>
                {g.name} / {g.area}（サンプル）
              </Body>
            ))
        ) : (
          <Body>Gyms タブからお気に入りを追加できます。</Body>
        )}
      </Card>
      <Card>
        <Heading>あなたの知識を、みんなへ。</Heading>
        <Body>
          器具メーカー・ダンベル重量・設備写真の投稿機能は準備中です。
        </Body>
        <Button
          title="設備スペック投稿について"
          onPress={() =>
            Alert.alert(
              "準備中",
              "投稿フォームとサーバー保存は今後のタスクで実装します。",
            )
          }
        />
      </Card>
    </Page>
  );
}
