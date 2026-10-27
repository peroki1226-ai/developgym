import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Body, Button, Card, Field, Heading, Page, s } from "../components/ui";
import { equipmentName, findGyms, menus, parts } from "../domain/matching";
import { GymContributionForm, GymPosts } from "../components/GymCommunity";
import { useFitness } from "../state";
const toggle = (items: string[], id: string) =>
  items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
export function GymsScreen() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [menuIds, setMenuIds] = useState<string[]>([
    "m-incline-db",
    "m-incline-smith",
    "m-hack-squat",
    "m-squat",
  ]);
  const [partIds, setPartIds] = useState<string[]>([]);
  const [requiredKg, setRequiredKg] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showParts, setShowParts] = useState(false);
  const [postingGym, setPostingGym] = useState<string | null>(null);
  const { favorites, toggleFavorite, gymCatalog } = useFitness();
  const preferences = useMemo(
    () => ({ menuIds, partIds, requiredDumbbellKg: requiredKg }),
    [menuIds, partIds, requiredKg],
  );
  const results = useMemo(
    () => findGyms(preferences, query, region, requiredKg, gymCatalog),
    [preferences, query, region, requiredKg, gymCatalog],
  );
  function reset() {
    setQuery("");
    setRegion("all");
    setRequiredKg(0);
  }
  return (
    <Page title="Find your gym." subtitle="理想のトレーニングができる場所へ。">
      <Body>
        Webプロトタイプ由来の検証用データです。店舗の設備・重量・メーカーは未確認です。
      </Body>
      <Field
        accessibilityLabel="ジム検索"
        placeholder="エリア・ジム名・メーカーで検索"
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.row}>
        {[
          { id: "all", label: "すべての地域" },
          { id: "tokyo", label: "東京" },
          { id: "global", label: "海外" },
        ].map((r) => (
          <Button
            key={r.id}
            title={r.label}
            selected={region === r.id}
            onPress={() => setRegion(r.id)}
          />
        ))}
      </View>
      <Card>
        <Heading>あなたのトレーニング</Heading>
        <Body>
          選択種目 {menuIds.length} / 対象部位 {partIds.length}
        </Body>
        <Button
          title={showMenu ? "種目選択を閉じる" : "やりたい種目を選ぶ"}
          onPress={() => setShowMenu(!showMenu)}
        />
        {showMenu && (
          <>
            <View style={s.row}>
              {menus.map((m) => (
                <Button
                  key={m.id}
                  title={m.name}
                  selected={menuIds.includes(m.id)}
                  onPress={() => setMenuIds((old) => toggle(old, m.id))}
                />
              ))}
            </View>
            <Button title="種目をすべて解除" onPress={() => setMenuIds([])} />
          </>
        )}
        <Button
          title={showParts ? "対象部位を閉じる" : "対象部位を選ぶ（任意）"}
          onPress={() => setShowParts(!showParts)}
        />
        {showParts && (
          <>
            <View style={s.row}>
              {parts.map((p) => (
                <Button
                  key={p.id}
                  title={p.name}
                  selected={partIds.includes(p.id)}
                  onPress={() => setPartIds((old) => toggle(old, p.id))}
                />
              ))}
            </View>
            <Button
              title="対象部位をすべて解除"
              onPress={() => setPartIds([])}
            />
          </>
        )}
        <Body>
          選択種目65% + 部位の器具保有率20% +
          重量条件15%。未選択の項目は充足扱い、全条件一致の種目選択は99%。最低スコアは15%です。実行可否は下の一覧で確認してください。
        </Body>
      </Card>
      <Card>
        <Heading>必要なダンベル重量</Heading>
        <Body>片手あたりの重量。選択値以上を備える店舗だけ表示します。</Body>
        <View style={s.row}>
          {[0, 20, 40, 60, 90].map((kg) => (
            <Button
              key={kg}
              title={kg ? `${kg}kg以上` : "重量指定なし"}
              selected={requiredKg === kg}
              onPress={() => setRequiredKg(kg)}
            />
          ))}
        </View>
      </Card>
      <Heading>マッチ率順 / {results.length}件</Heading>
      {results.map(({ gym: g, match }) => (
        <Card key={g.id}>
          <Body>{g.area}</Body>
          <Heading>{g.name}</Heading>
          <Text
            accessibilityLabel={`${g.name} マッチ率 ${match.percent === null ? "未選択" : `${match.percent}%`}`}
            style={s.number}
          >
            {match.percent ?? "—"}
            <Text style={{ fontSize: 18 }}>% MATCH</Text>
          </Text>
          {match.percent === null && (
            <Body>種目・部位・重量を選ぶと計算します。</Body>
          )}
          <Body>
            {g.spec}
            {"\n"}ダンベル最大 {g.maxDumbbellKg} kg{"\n"}
            {g.dumbbellRange}
          </Body>
          <Heading>✓ Available / 実行可能</Heading>
          {match.available.length ? (
            match.available.map((m) => <Body key={m.id}>✓ {m.name}</Body>)
          ) : (
            <Body>
              {menuIds.length
                ? "対応する選択種目がありません。"
                : "種目が未選択です。"}
            </Body>
          )}
          <Heading>✕ Missing / 不足</Heading>
          {match.missing.map((m) => (
            <Body key={m.id}>✕ {m.name}</Body>
          ))}
          {match.missingEquipment.map((id) => (
            <Body key={id}>不足器具: {equipmentName(id)}</Body>
          ))}
          {!match.dbOk && (
            <Body>
              必要ダンベル {requiredKg}kg / 店舗最大 {g.maxDumbbellKg}kg
            </Body>
          )}
          {!match.missing.length && !match.missingEquipment.length && (
            <Body>
              {match.percent === null
                ? "条件を選択してください。"
                : "指定条件での不足はありません。"}
            </Body>
          )}
          <Button
            title={
              favorites.includes(g.id) ? "お気に入りを解除" : "お気に入りに追加"
            }
            selected={favorites.includes(g.id)}
            onPress={() => toggleFavorite(g.id)}
          />
          <GymPosts gymId={g.id} />
          <Button
            title={
              postingGym === g.id
                ? `${g.name}の投稿フォームを閉じる`
                : `${g.name}に投稿する`
            }
            onPress={() => setPostingGym(postingGym === g.id ? null : g.id)}
          />
          {postingGym === g.id && (
            <GymContributionForm key={g.id} gymId={g.id} />
          )}
        </Card>
      ))}
      {!results.length && (
        <Card>
          <Heading>該当するジムがありません</Heading>
          <Body>検索語・地域・必要重量を変更してください。</Body>
          <Button title="検索をクリア" onPress={reset} />
        </Card>
      )}
    </Page>
  );
}
