import React, { useState } from "react";
import { Text } from "react-native";
import { Body, Button, Card, Field, Heading, Page, s } from "../components/ui";
import { useFitness } from "../state";
export const gyms = [
  {
    id: "sample-tokyo",
    name: "ATLAS / TOKYO",
    area: "東京・渋谷",
    maker: "Technogym / Hammer Strength",
    dumbbell: 60,
  },
  {
    id: "sample-osaka",
    name: "STUDIO / OSAKA",
    area: "大阪・梅田",
    maker: "Life Fitness",
    dumbbell: 40,
  },
];
export function GymsScreen() {
  const [query, setQuery] = useState("");
  const { favorites, toggleFavorite } = useFitness();
  const filtered = gyms.filter((g) =>
    `${g.name} ${g.area} ${g.maker}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <Page title="Find your gym." subtitle="理想のトレーニングができる場所へ。">
      <Field
        accessibilityLabel="ジム検索"
        placeholder="エリア・ジム名・メーカーで検索"
        value={query}
        onChangeText={setQuery}
      />
      <Body>
        掲載内容はUI確認用のサンプルです。実在店舗の情報ではありません。
      </Body>
      {filtered.map((g) => (
        <Card key={g.id}>
          <Body>{g.area}</Body>
          <Heading>{g.name}</Heading>
          <Text style={s.number}>
            92<Text style={{ fontSize: 18 }}>% MATCH</Text>
          </Text>
          <Body>メニューマッチ率の表示例 / 計算ロジックはTASK-007で実装</Body>
          <Body>
            {g.maker}
            {"\n"}ダンベル最大 {g.dumbbell} kg
          </Body>
          <Button
            title={
              favorites.includes(g.id) ? "お気に入りを解除" : "お気に入りに追加"
            }
            selected={favorites.includes(g.id)}
            onPress={() => toggleFavorite(g.id)}
          />
        </Card>
      ))}
      {!filtered.length && (
        <Card>
          <Heading>該当するジムがありません</Heading>
          <Body>エリア名やメーカー名を変えて検索してください。</Body>
          <Button title="検索をクリア" onPress={() => setQuery("")} />
        </Card>
      )}
    </Page>
  );
}
