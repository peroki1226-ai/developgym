import React from "react";
import { Alert, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { Body, Button, Card, Heading, Page, s } from "../components/ui";
import { useFitness } from "../state";
import { gyms } from "../domain/matching";
export function DietScreen() {
  return (
    <Page
      title="Nourish your progress."
      subtitle="小さな積み重ねを、目に見える変化に。"
    >
      <Body>
        以下はサンプル表示です。体重・食事の保存やAI推定は未接続です。
      </Body>
      <Card>
        <Body>WEIGHT / 過去7日間の表示例</Body>
        <Text style={s.number}>
          68.4 <Text style={{ fontSize: 16 }}>kg</Text>
        </Text>
        <View
          accessible
          accessibilityLabel="サンプル体重推移。69.2kgから68.4kgへ減少。"
        >
          <Svg width="100%" height={100} viewBox="0 0 300 100">
            <Polyline
              points="5,16 53,30 101,25 149,48 197,58 245,54 295,84"
              fill="none"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </Svg>
        </View>
        <Body>7日前 69.2kg → 今日 68.4kg（サンプル）</Body>
      </Card>
      <Card>
        <Heading>カロリー & PFC</Heading>
        <Text style={s.number}>
          1,640 <Text style={{ fontSize: 16 }}>/ 2,000 kcal</Text>
        </Text>
        <Body>たんぱく質 120g / 脂質 48g / 炭水化物 182g</Body>
        <Body>
          サンプル目標値。個人に適した栄養目標を設定する機能は今後追加予定です。
        </Body>
      </Card>
      <Card>
        <Body>AI FOOD SCAN</Body>
        <Heading>食事を写真で記録</Heading>
        <Body>写真からカロリーとPFCを推定する機能を準備中です。</Body>
        <Button
          title="写真スキャンについて"
          onPress={() =>
            Alert.alert(
              "準備中",
              "このタスクではUIのみです。カメラ・写真アクセスやAI通信は行いません。",
            )
          }
        />
      </Card>
    </Page>
  );
}
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
