import { CHEST_MENU_GUIDES } from "../domain/chestLessons";
import React, { useContext, useMemo, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import {
  Body,
  Button,
  Card,
  Disclosure,
  Field,
  Heading,
  Page,
  s,
  colors,
} from "../components/ui";
import { GymPhoto, MatchMeter, VenueCard } from "../components/TravelCards";
import { EQUIPMENTS } from "../data/equipment";
import { MachineGuideEntry } from "../components/MachineGuideEntry";
import { DirectorySavedVenues } from "../components/DirectoryVenueCard";
import { useDirectory } from "../directoryState";
import { GymMap } from "../components/GymMap";
import { GymContributionForm, GymPosts } from "../components/GymCommunity";
import { useI18n, translate } from "../i18n";
import { useFitness } from "../state";
import { useDiscovery } from "../discoveryState";
import {
  calculateMatch,
  equipment,
  equipmentName,
  findGyms,
  menus,
  parts,
} from "../domain/matching";
import { routeUrl } from "../domain/discovery";
const toggle = (items: string[], id: string) =>
  items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
function useResults() {
  const d = useDiscovery()!,
    { gymCatalog } = useFitness(),
    p = d.profile;
  return findGyms(
    {
      menuIds: p.menuIds,
      partIds: p.partIds,
      requiredDumbbellKg: p.requiredKg,
    },
    p.query,
    p.region,
    p.requiredKg,
    gymCatalog,
    (s) => `${translate("ja", s)} ${translate("en", s)}`,
  );
}
export function SearchMenuScreen() {
  const { t } = useI18n(),
    d = useDiscovery()!,
    nav = useContext(NavigationContext);
  const [query, setQuery] = useState(""),
    [body, setBody] = useState("all");
  const filtered = menus.filter(
    (m) =>
      (body === "all" ||
        (body === "legs"
          ? ["quads", "hamstrings", "glutes", "calves"].some((part) =>
              m.part.startsWith(part),
            )
          : m.part.startsWith(body))) &&
      `${t(m.name)} ${m.name}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <Page title="travel.menuTitle" subtitle={t("travel.menuSubtitle")}>
      <MachineGuideEntry />
      <Disclosure title={t("guide.browse")}>
        {EQUIPMENTS.map((e) => (
          <Button
            key={e.id}
            title={t("guide.openMachine", { 0: t(e.name) })}
            onPress={() => d.openGuide(e.id)}
          />
        ))}
      </Disclosure>
      <Card>
        <Heading>{t("travel.byBody")}</Heading>
        <View style={s.row}>
          {[
            ["all", "travel.all"],
            ["chest", "胸"],
            ["back", "背中"],
            ["delt", "肩"],
            ["biceps", "腕"],
            ["legs", "脚"],
            ["abs", "腹筋"],
          ].map(([id, label]) => (
            <Button
              key={id}
              title={t(label)}
              selected={body === id}
              onPress={() => setBody(id)}
            />
          ))}
        </View>
        <Field
          accessibilityLabel={t("travel.menuSearch")}
          placeholder={t("travel.menuSearch")}
          value={query}
          onChangeText={setQuery}
        />
      </Card>
      <Card>
        <Heading>
          {t("travel.selectedMenus", { 0: d.profile.menuIds.length })}
        </Heading>
        {menus
          .filter((m) => d.profile.menuIds.includes(m.id))
          .map((m) => (
            <Button
              key={m.id}
              title={t("travel.removeMenu", { 0: t(m.name) })}
              onPress={() =>
                d.update({ menuIds: toggle(d.profile.menuIds, m.id) })
              }
            />
          ))}
        <Body>{t("travel.menuSaved")}</Body>
        <Button
          title={t("種目をすべて解除")}
          onPress={() => d.update({ menuIds: [] })}
        />
      </Card>
      <Heading>{t("travel.availableMenus")}</Heading>
      {filtered.map((m) => {
        const guide = EQUIPMENTS.find(e => e.id === CHEST_MENU_GUIDES[m.id]);
        return <View key={m.id} style={{gap:4}}>
          <Button title={t(m.name)} selected={d.profile.menuIds.includes(m.id)}
            onPress={() => d.update({menuIds:toggle(d.profile.menuIds,m.id)})}/>
          {guide && <Button title={t("chest.menu.form",{0:t(guide.name)})} variant="quiet" onPress={()=>d.openGuide(guide.id)}/>}
        </View>;
      })}
      {!filtered.length && <Body>{t("travel.noMenus")}</Body>}
      <Button
        title={t("travel.seeResults")}
        variant="primary"
        selected
        onPress={() => {
          d.setPage("results");
          nav?.navigate("Explore" as never);
        }}
      />
    </Page>
  );
}
export function MapScreen() {
  const { t } = useI18n(),
    d = useDiscovery()!,
    results = useResults(),
    nav = useContext(NavigationContext);
  const [selected, setSelected] = useState("gold");
  const chosen = results.find((r) => r.gym.id === selected) || results[0];
  return (
    <Page
      tools={false}
      title="travel.mapTitle"
      subtitle={t("travel.mapSubtitle")}
    >
      <Button
        title={t("directory.entry")}
        onPress={() => {
          d.setPage("directory");
          nav?.navigate("Explore" as never);
        }}
      />
      <Field
        accessibilityLabel={t("ジム検索")}
        value={d.profile.query}
        placeholder={t("エリア・ジム名・メーカーで検索")}
        onChangeText={(query) => d.update({ query })}
      />
      <View style={s.row}>
        {[
          ["all", "travel.all"],
          ["tokyo", "東京"],
          ["global", "海外"],
        ].map(([region, label]) => (
          <Button
            key={region}
            title={t(label)}
            selected={d.profile.region === region}
            onPress={() => d.update({ region })}
          />
        ))}
      </View>
      <GymMap
        gyms={results.map((r) => r.gym)}
        selected={chosen?.gym.id || "gold"}
        onSelect={setSelected}
      />
      {chosen && <VenueCard gym={chosen.gym} match={chosen.match} />}
      <Heading>{t("travel.nearby")}</Heading>
      {results.map(({ gym: g }) => (
        <Button
          key={g.id}
          title={t(g.name)}
          selected={chosen?.gym.id === g.id}
          onPress={() => setSelected(g.id)}
        />
      ))}
      {!results.length && <Body>{t("該当するジムがありません")}</Body>}
    </Page>
  );
}
export function FavoritesScreen() {
  const directory = useDirectory();
  const { t } = useI18n(),
    { favorites, gymCatalog } = useFitness(),
    d = useDiscovery()!,
    results = gymCatalog
      .filter((g) => favorites.includes(g.id))
      .map((gym) => ({
        gym,
        match: calculateMatch(gym, {
          menuIds: d.profile.menuIds,
          partIds: d.profile.partIds,
          requiredDumbbellKg: d.profile.requiredKg,
        }),
      })),
    nav = useContext(NavigationContext);
  return (
    <Page
      tools={false}
      title="travel.favoriteTitle"
      subtitle={t("travel.favoriteSubtitle")}
    >
      {results.map(({ gym, match }) => (
        <VenueCard key={gym.id} gym={gym} match={match} />
      ))}
      {Boolean(directory?.saved.length) && (
        <Heading>{t("directory.savedTitle")}</Heading>
      )}
      <DirectorySavedVenues />
      {!results.length && !directory?.saved.length && (
        <Card>
          <Heading>{t("travel.noFavorites")}</Heading>
          <Body>{t("travel.favoriteHint")}</Body>
          <Button
            title={t("travel.search")}
            selected
            onPress={() => {
              d.update({ query: "", region: "all", requiredKg: 0 });
              d.setPage("home");
              nav?.navigate("Explore" as never);
            }}
          />
        </Card>
      )}
    </Page>
  );
}
export function GymDetailScreen() {
  const { t } = useI18n(),
    d = useDiscovery()!,
    { gymCatalog, favorites, toggleFavorite, community } = useFitness();
  const [section, setSection] = useState<"equipment" | "info" | "reviews">(
    "equipment",
  );
  const gym = gymCatalog.find((g) => g.id === d.gymId);
  if (!gym)
    return (
      <Page
        tools={false}
        title="travel.details"
        subtitle={t("該当するジムがありません")}
      >
        <Button title={t("travel.back")} onPress={() => d.setPage("home")} />
      </Page>
    );
  const match = calculateMatch(gym, {
    menuIds: d.profile.menuIds,
    partIds: d.profile.partIds,
    requiredDumbbellKg: d.profile.requiredKg,
  });
  const reviews = community.reviews.filter((r) => r.gymId === gym.id);
  const rating = reviews.length
    ? (reviews.reduce((v, r) => v + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  return (
    <Page
      tools={false}
      title="travel.details"
      subtitle={t("travel.sampleData")}
    >
      <Button title={t("travel.back")} onPress={() => d.setPage("results")} />
      <GymPhoto large />
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1 }}>
          <Heading>{t(gym.name)}</Heading>
          <Body>{t(gym.area)}</Body>
          {rating && (
            <Body>
              {t("travel.localRating", { 0: rating, 1: reviews.length })}
            </Body>
          )}
        </View>
        <MatchMeter value={match.percent} />
      </View>
      <View style={s.row}>
        <Button
          title={
            favorites.includes(gym.id)
              ? t("お気に入りを解除")
              : t("お気に入りに追加")
          }
          selected={favorites.includes(gym.id)}
          onPress={() => toggleFavorite(gym.id)}
        />
        <Button
          title={t(
            d.compare.includes(gym.id)
              ? "travel.removeComparison"
              : "travel.addComparison",
          )}
          selected={d.compare.includes(gym.id)}
          disabled={d.compare.length === 2 && !d.compare.includes(gym.id)}
          onPress={() => d.toggleCompare(gym.id)}
        />
      </View>
      <Card>
        <Heading>{t("travel.equipmentCoverage")}</Heading>
        <Text
          style={{ fontSize: 30, color: colors.primary, fontWeight: "500" }}
        >
          {gym.installed.length} / {equipment.length}
        </Text>
        <Body>{t("travel.dumbbell", { 0: gym.maxDumbbellKg })}</Body>
      </Card>
      <View style={s.row}>
        {[
          ["equipment", "travel.equipment"],
          ["info", "travel.info"],
          ["reviews", "travel.reviews"],
        ].map(([key, label]) => (
          <Button
            key={key}
            title={t(label)}
            selected={section === key}
            onPress={() => setSection(key as typeof section)}
          />
        ))}
      </View>
      {section === "equipment" && (
        <>
          <Card>
            <Heading>{t("travel.equipment")}</Heading>
            <Body>{t(gym.spec)}</Body>
            {gym.installed.map((id) => {
              const guide = EQUIPMENTS.find((e) => e.id === id);
              return (
                <View key={id} style={{ gap: 4 }}>
                  <Body>✓ {t(equipmentName(id))}</Body>
                  {guide && (
                    <Button
                      title={t("guide.openMachine", { 0: t(guide.name) })}
                      variant="quiet"
                      onPress={() => d.openGuide(guide.id)}
                    />
                  )}
                </View>
              );
            })}
          </Card>
          <Card>
            <Heading>{t("✓ Available / 実行可能")}</Heading>
            {match.available.map((m) => (
              <Body key={m.id}>✓ {t(m.name)}</Body>
            ))}
            <Heading>{t("✕ Missing / 不足")}</Heading>
            {match.missing.map((m) => (
              <Body key={m.id}>× {t(m.name)}</Body>
            ))}
          </Card>
        </>
      )}
      {section === "info" && (
        <Card>
          <Heading>{t("travel.info")}</Heading>
          <Body>{t("travel.unverifiedInfo")}</Body>
          <Button
            title={t("travel.openMaps")}
            onPress={() => openRoute(gym, t)}
          />
        </Card>
      )}
      {section === "reviews" && (
        <>
          <GymPosts gymId={gym.id} />
          <GymContributionForm gymId={gym.id} />
        </>
      )}
      <Button
        title={t("travel.goGym")}
        variant="primary"
        selected
        onPress={() => openRoute(gym, t)}
      />
      <Button
        title={t("travel.compareCount", { 0: d.compare.length })}
        disabled={d.compare.length !== 2}
        onPress={() => d.setPage("compare")}
      />
    </Page>
  );
}
function openRoute(
  gym: Parameters<typeof routeUrl>[0],
  t: (key: string) => string,
) {
  Linking.openURL(routeUrl(gym)).catch(() =>
    Alert.alert(t("入力を確認"), t("travel.routeError")),
  );
}
export function ComparisonScreen() {
  const { t } = useI18n(),
    d = useDiscovery()!,
    { gymCatalog } = useFitness();
  const chosen = d.compare
    .map((id) => gymCatalog.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));
  return (
    <Page
      tools={false}
      title="travel.compareTitle"
      subtitle={t("travel.compareSubtitle")}
    >
      <Button title={t("travel.back")} onPress={() => d.setPage("results")} />
      {chosen.length !== 2 && <Body>{t("travel.selectTwo")}</Body>}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        {chosen.map((g) => {
          const match = calculateMatch(g, {
            menuIds: d.profile.menuIds,
            partIds: d.profile.partIds,
            requiredDumbbellKg: d.profile.requiredKg,
          });
          return (
            <View key={g.id} style={{ flex: 1, gap: 12 }}>
              <GymPhoto />
              <Heading>{t(g.name)}</Heading>
              <MatchMeter value={match.percent} />
              <Body>{t("travel.dumbbell", { 0: g.maxDumbbellKg })}</Body>
              <Body>
                {t("travel.equipmentCount", { 0: g.installed.length })}
              </Body>
              <Body>{t(g.area)}</Body>
              <Body>{t("travel.unverifiedInfo")}</Body>
              <Button
                title={t("travel.details")}
                onPress={() => d.openGym(g.id)}
              />
              <Button
                title={t("travel.removeComparison")}
                onPress={() => d.toggleCompare(g.id)}
              />
            </View>
          );
        })}
      </View>
    </Page>
  );
}
export function EquipmentSearchScreen() {
  const { t } = useI18n(),
    d = useDiscovery()!,
    { gymCatalog } = useFitness();
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const matching = equipment.filter((e) =>
    `${t(e.name)} ${t(e.brand)} ${e.name} ${e.brand}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <Page
      tools={false}
      title="travel.equipmentSearch"
      subtitle={t("travel.equipmentSubtitle")}
    >
      <Button title={t("travel.back")} onPress={() => d.setPage("home")} />
      <Field
        accessibilityLabel={t("travel.equipmentSearch")}
        placeholder={t("travel.equipmentPlaceholder")}
        value={query}
        onChangeText={setQuery}
      />
      {matching.map((e) => (
        <Card key={e.id}>
          <Heading>{t(e.name)}</Heading>
          <Body>{t(e.brand)}</Body>
          <Button
            title={t("travel.findEquipmentGyms", {
              0: gymCatalog.filter((g) => g.installed.includes(e.id)).length,
            })}
            selected={selected === e.id}
            onPress={() => setSelected(e.id)}
          />
        </Card>
      ))}
      {!matching.length && <Body>{t("travel.noEquipment")}</Body>}
      {selected && (
        <>
          <Heading>{t("travel.equipmentGyms")}</Heading>
          {gymCatalog
            .filter((g) => g.installed.includes(selected))
            .map((g) => (
              <Button
                key={g.id}
                title={t(g.name)}
                onPress={() => d.openGym(g.id)}
              />
            ))}
        </>
      )}
    </Page>
  );
}
export function RecommendationsScreen() {
  const { t } = useI18n(),
    d = useDiscovery()!,
    results = useResults()
      .filter((r) => r.match.percent !== null)
      .slice(0, 3);
  return (
    <Page
      tools={false}
      title="travel.suggestions"
      subtitle={t("travel.suggestionExplanation")}
    >
      <Button title={t("travel.back")} onPress={() => d.setPage("home")} />
      <Card>
        <Heading>
          {t("travel.recommendationCount", { 0: results.length })}
        </Heading>
        <Body>{t("travel.notAi")}</Body>
      </Card>
      {results.map(({ gym, match }) => (
        <VenueCard key={gym.id} gym={gym} match={match} />
      ))}
      {!results.length && (
        <Body>{t("種目・部位・重量を選ぶと計算します。")}</Body>
      )}
    </Page>
  );
}
