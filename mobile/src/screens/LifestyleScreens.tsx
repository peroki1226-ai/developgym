import React, { useState } from "react";
import { Text, View } from "react-native";
import { Body, Button, Card, Heading, Page, s } from "../components/ui";
import { useFitness } from "../state";
import { GymContributionForm, GymPosts } from "../components/GymCommunity";
export function MyPageScreen() {
  const { logs, favorites, storageStatus, gymCatalog, community } =
    useFitness();
  const [selectedGym, setSelectedGym] = useState(gymCatalog[0].id);
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
          gymCatalog
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
        <Heading>あなたの投稿</Heading>
        <Body>
          設備修正 {community.specs.length}件 / 写真 {community.photos.length}件
          / レビュー {community.reviews.length}件
        </Body>
        <View style={s.row}>
          {gymCatalog.map((g) => (
            <Button
              key={g.id}
              title={`投稿先: ${g.name}`}
              selected={selectedGym === g.id}
              onPress={() => setSelectedGym(g.id)}
            />
          ))}
        </View>
        <GymPosts gymId={selectedGym} />
        <GymContributionForm key={selectedGym} gymId={selectedGym} />
      </Card>
    </Page>
  );
}
