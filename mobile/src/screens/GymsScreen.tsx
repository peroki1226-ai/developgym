import { useI18n } from "../i18n";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Body, Button, Card, Field, Heading, Page, s } from "../components/ui";
import { equipmentName, findGyms, menus, parts } from "../domain/matching";
import { GymContributionForm, GymPosts } from "../components/GymCommunity";
import { useFitness } from "../state";
const toggle = (items: string[], id: string) =>
  items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
export function GymsScreen() {
  const { t } = useI18n();
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
    () => ({
      menuIds,
      partIds,
      requiredDumbbellKg: requiredKg,
    }),
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
    <Page
      title="Find your gym."
      subtitle={t("理想のトレーニングができる場所へ。")}
    >
      <Body>
        {t(
          "Webプロトタイプ由来の検証用データです。店舗の設備・重量・メーカーは未確認です。",
        )}
      </Body>
      <Field
        accessibilityLabel={t("ジム検索")}
        placeholder={t("エリア・ジム名・メーカーで検索")}
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.row}>
        {[
          {
            id: "all",
            label: t("すべての地域"),
          },
          {
            id: "tokyo",
            label: t("東京"),
          },
          {
            id: "global",
            label: t("海外"),
          },
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
        <Heading>{t("あなたのトレーニング")}</Heading>
        <Body>
          {t("選択種目 ")}
          {menuIds.length}
          {t(" / 対象部位 ")}
          {partIds.length}
        </Body>
        <Button
          title={showMenu ? t("種目選択を閉じる") : t("やりたい種目を選ぶ")}
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
            <Button
              title={t("種目をすべて解除")}
              onPress={() => setMenuIds([])}
            />
          </>
        )}
        <Button
          title={
            showParts ? t("対象部位を閉じる") : t("対象部位を選ぶ（任意）")
          }
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
              title={t("対象部位をすべて解除")}
              onPress={() => setPartIds([])}
            />
          </>
        )}
        <Body>
          {t(
            "選択種目65% + 部位の器具保有率20% + 重量条件15%。未選択の項目は充足扱い、全条件一致の種目選択は99%。最低スコアは15%です。実行可否は下の一覧で確認してください。",
          )}
        </Body>
      </Card>
      <Card>
        <Heading>{t("必要なダンベル重量")}</Heading>
        <Body>
          {t("片手あたりの重量。選択値以上を備える店舗だけ表示します。")}
        </Body>
        <View style={s.row}>
          {[0, 20, 40, 60, 90].map((kg) => (
            <Button
              key={kg}
              title={
                kg
                  ? t("{0}kg以上", {
                      "0": kg,
                    })
                  : t("重量指定なし")
              }
              selected={requiredKg === kg}
              onPress={() => setRequiredKg(kg)}
            />
          ))}
        </View>
      </Card>
      <Heading>
        {t("マッチ率順 / ")}
        {results.length}
        {t("件")}
      </Heading>
      {results.map(({ gym: g, match }) => (
        <Card key={g.id}>
          <Body>{g.area}</Body>
          <Heading>{g.name}</Heading>
          <Text
            accessibilityLabel={t("{0} マッチ率 {1}", {
              "0": g.name,
              "1": match.percent === null ? t("未選択") : `${match.percent}%`,
            })}
            style={s.number}
          >
            {match.percent ?? "—"}
            <Text
              style={{
                fontSize: 18,
              }}
            >
              % MATCH
            </Text>
          </Text>
          {match.percent === null && (
            <Body>{t("種目・部位・重量を選ぶと計算します。")}</Body>
          )}
          <Body>
            {g.spec}
            {"\n"}
            {t("ダンベル最大 ")}
            {g.maxDumbbellKg} kg{"\n"}
            {t(g.dumbbellRange)}
          </Body>
          <Heading>{t("✓ Available / 実行可能")}</Heading>
          {match.available.length ? (
            match.available.map((m) => <Body key={m.id}>✓ {m.name}</Body>)
          ) : (
            <Body>
              {menuIds.length
                ? t("対応する選択種目がありません。")
                : t("種目が未選択です。")}
            </Body>
          )}
          <Heading>{t("✕ Missing / 不足")}</Heading>
          {match.missing.map((m) => (
            <Body key={m.id}>✕ {m.name}</Body>
          ))}
          {match.missingEquipment.map((id) => (
            <Body key={id}>
              {t("不足器具: ")}
              {equipmentName(id)}
            </Body>
          ))}
          {!match.dbOk && (
            <Body>
              {t("必要ダンベル ")}
              {requiredKg}
              {t("kg / 店舗最大 ")}
              {g.maxDumbbellKg}kg
            </Body>
          )}
          {!match.missing.length && !match.missingEquipment.length && (
            <Body>
              {match.percent === null
                ? t("条件を選択してください。")
                : t("指定条件での不足はありません。")}
            </Body>
          )}
          <Button
            title={
              favorites.includes(g.id)
                ? t("お気に入りを解除")
                : t("お気に入りに追加")
            }
            selected={favorites.includes(g.id)}
            onPress={() => toggleFavorite(g.id)}
          />
          <GymPosts gymId={g.id} />
          <Button
            title={
              postingGym === g.id
                ? t("{0}の投稿フォームを閉じる", {
                    "0": g.name,
                  })
                : t("{0}に投稿する", {
                    "0": g.name,
                  })
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
          <Heading>{t("該当するジムがありません")}</Heading>
          <Body>{t("検索語・地域・必要重量を変更してください。")}</Body>
          <Button title={t("検索をクリア")} onPress={reset} />
        </Card>
      )}
    </Page>
  );
}
