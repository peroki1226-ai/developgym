import { NavigationContext } from "@react-navigation/native";
import { useDiscovery } from "../discoveryState";
import { useDirectory } from "../directoryState";
import { DirectorySavedVenues } from "../components/DirectoryVenueCard";
import { EQUIPMENTS } from "../data/equipment";
import { homeExercises } from "../domain/homeTraining";
import { useI18n } from "../i18n";
import React, { useState, useContext } from "react";
import { Text, View } from "react-native";
import { Body, Button, Card, Heading, Page, s } from "../components/ui";
import { useFitness } from "../state";
import { GymContributionForm, GymPosts } from "../components/GymCommunity";
import { LanguageSettings } from "../components/LanguageSettings";
const systemExerciseNames = new Set(
  [...EQUIPMENTS, ...homeExercises].map((item) => item.name),
);
export function MyPageScreen() {
  const directory = useDirectory();
  const { t, formatDate } = useI18n();
  const d = useDiscovery(),
    nav = useContext(NavigationContext);
  const { logs, favorites, storageStatus, gymCatalog, community } =
    useFitness();
  const [selectedGym, setSelectedGym] = useState(gymCatalog[0].id);
  return (
    <Page
      title="Made by you."
      subtitle={t("ジムでも、自宅でも。すべての積み重ねをひとつに。")}
    >
      {d && (
        <Card>
          <Heading>{t("travel.passport")}</Heading>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            {[
              ["travel.logCount", logs.length],
              [
                "travel.favoriteTitle",
                favorites.length + (directory?.saved.length ?? 0),
              ],
              ["travel.menuCount", d.profile.menuIds.length],
            ].map(([label, count]) => (
              <View key={label} style={{ gap: 6 }}>
                <Text
                  style={{ color: "#254f70", fontSize: 28, fontWeight: "500" }}
                >
                  {count}
                </Text>
                <Body>{t(String(label))}</Body>
              </View>
            ))}
          </View>
          <Button
            title={t("travel.myMenu")}
            onPress={() => nav?.navigate("Menu" as never)}
          />
        </Card>
      )}
      <LanguageSettings />
      <Body>{t("記録・お気に入り・自宅器具はこの端末に保存します。")}</Body>
      <Body>{t("🌐 言語は画面上部のボタンで切り替えられます。")}</Body>
      <Card>
        <Body>{t("統合履歴 / 合計セット")}</Body>
        <Text style={s.number}>
          {logs.reduce((sum, log) => sum + log.sets, 0)}{" "}
          <Text
            style={{
              fontSize: 16,
            }}
          >
            {t("sets")}
          </Text>
        </Text>
        <Body>
          {storageStatus === "saved"
            ? t("端末に保存済み")
            : storageStatus === "saving"
              ? t("端末に保存中…")
              : t("保存に失敗しています。再試行してください。")}
        </Body>
        <Heading>{t("トレーニング統合履歴")}</Heading>
        {logs.length ? (
          logs.map((log) => (
            <View key={log.id}>
              <Body>{log.location === "home" ? t("🏠 自宅") : t("ジム")}</Body>
              <Body>
                {formatDate(log.date)} /{" "}
                {systemExerciseNames.has(log.name) ? t(log.name) : log.name}
              </Body>
              <Body>
                {log.loadType === "bodyweight"
                  ? t("自重")
                  : log.loadType === "band"
                    ? t("バンド")
                    : `${log.weight}${t("kg")}${log.loadType === "dumbbell" ? t("（片手）") : ""}`}{" "}
                × {log.reps}
                {t("回 × ")}
                {log.sets}
                {t("セット")}
              </Body>
            </View>
          ))
        ) : (
          <Body>
            {t(
              "まだ記録がありません。Training または Home で最初のセットを記録しましょう。",
            )}
          </Body>
        )}
      </Card>
      <Card>
        <Heading>{t("お気に入りジム")}</Heading>
        {favorites.length ? (
          gymCatalog
            .filter((g) => favorites.includes(g.id))
            .map((g) => (
              <Body key={g.id}>
                {t(g.name)} / {t(g.area)}
                {t("（サンプル）")}
              </Body>
            ))
        ) : !directory?.saved.length ? (
          <Body>{t("Gyms タブからお気に入りを追加できます。")}</Body>
        ) : null}
        <DirectorySavedVenues />
      </Card>
      <Card>
        <Heading>{t("あなたの投稿")}</Heading>
        <Body>
          {t("設備修正 ")}
          {community.specs.length}
          {t("件 / 写真 ")}
          {community.photos.length}
          {t("件 / レビュー ")}
          {community.reviews.length}
          {t("件")}
        </Body>
        <View style={s.row}>
          {gymCatalog.map((g) => (
            <Button
              key={g.id}
              title={t("投稿先: {0}", {
                "0": t(g.name),
              })}
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
