import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  Body,
  Button,
  Card,
  Disclosure,
  Field,
  Heading,
  Page,
  s,
} from "../components/ui";
import {
  DirectoryStorageNotice,
  DirectoryVenueCard,
  openDirectoryLink,
} from "../components/DirectoryVenueCard";
import {
  gymBrands,
  initialDirectorySelection,
  normalized,
  prefectures,
} from "../data/gymDirectory";
import {
  DirectoryCategory,
  DirectoryError,
  DirectoryVenue,
  searchDirectory,
} from "../domain/gymDirectory";
import { useI18n } from "../i18n";
import { useDiscovery } from "../discoveryState";

export function DirectoryScreen() {
  const d = useDiscovery()!,
    { language, t } = useI18n();
  const initial = initialDirectorySelection(d.profile.query);
  const [brandId, setBrandId] = useState<string | null>(initial.brandId),
    [prefectureCode, setPrefectureCode] = useState(initial.prefectureCode),
    [category, setCategory] = useState<DirectoryCategory>("all"),
    [keyword, setKeyword] = useState(initial.keyword),
    [prefectureSearch, setPrefectureSearch] = useState(""),
    [results, setResults] = useState<DirectoryVenue[] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const generation = useRef(0),
    controller = useRef<AbortController | null>(null);
  const brand = gymBrands.find((b) => b.id === brandId),
    prefecture = prefectures.find((p) => p.code === prefectureCode)!;
  useEffect(() => {
    generation.current += 1;
    controller.current?.abort();
    setResults(null);
    setError(null);
    setBusy(false);
    return () => {
      generation.current += 1;
      controller.current?.abort();
    };
  }, [brandId, prefectureCode, category, keyword]);
  async function search() {
    const id = ++generation.current;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const venues = await searchDirectory(
        { prefectureCode, brandId, category, keyword },
        active.signal,
      );
      if (id === generation.current) setResults(venues);
    } catch (e) {
      if (id === generation.current)
        setError(
          e instanceof DirectoryError && e.code === "rate"
            ? "directory.rateError"
            : "directory.searchError",
        );
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  return (
    <Page
      title="directory.title"
      subtitle={t("directory.subtitle")}
      tools={false}
    >
      <Button
        title={t("travel.back")}
        variant="quiet"
        onPress={() => d.setPage("home")}
      />
      <DirectoryStorageNotice />
      <Card>
        <Heading>{t("directory.filters")}</Heading>
        <Body>
          {t("directory.selected", {
            0: prefecture.name[language],
            1: brand?.name[language] ?? t("directory.allBrands"),
          })}
        </Body>
        <Disclosure title={t("directory.chooseBrand")}>
          <View style={s.row}>
            <Button
              title={t("directory.allBrands")}
              selected={brandId === null}
              onPress={() => setBrandId(null)}
            />
            {gymBrands.map((b) => (
              <Button
                key={b.id}
                title={b.name[language]}
                selected={brandId === b.id}
                onPress={() => {
                  setBrandId(b.id);
                  setKeyword("");
                  if (b.preferredPrefecture)
                    setPrefectureCode(b.preferredPrefecture);
                }}
              />
            ))}
          </View>
        </Disclosure>
        <Disclosure title={t("directory.choosePrefecture")}>
          <Field
            accessibilityLabel={t("directory.prefectureSearch")}
            placeholder={t("directory.prefectureSearch")}
            value={prefectureSearch}
            onChangeText={setPrefectureSearch}
          />
          <View style={s.row}>
            {prefectures
              .filter((p) =>
                normalized(p.name.ja + " " + p.name.en).includes(
                  normalized(prefectureSearch),
                ),
              )
              .map((p) => (
                <Button
                  key={p.code}
                  title={p.name[language]}
                  selected={p.code === prefectureCode}
                  onPress={() => setPrefectureCode(p.code)}
                />
              ))}
          </View>
        </Disclosure>
        <Field
          accessibilityLabel={t("directory.keyword")}
          placeholder={t("directory.keyword")}
          value={keyword}
          maxLength={100}
          onChangeText={setKeyword}
        />
        <View style={s.row}>
          {(["all", "women", "public", "local"] as const).map((value) => (
            <Button
              key={value}
              title={t(`directory.category.${value}`)}
              selected={category === value}
              onPress={() => setCategory(value)}
            />
          ))}
        </View>
        <Button
          title={t(busy ? "directory.searching" : "directory.search")}
          variant="primary"
          disabled={busy}
          onPress={search}
        />
        <Body>{t("directory.coverage")}</Body>
      </Card>
      {brand && (
        <Card>
          <Heading>{brand.name[language]}</Heading>
          {brand.womenFocused && <Body>{t("directory.womenBrandNote")}</Body>}
          {brand.website && (
            <Button
              title={t("directory.officialSearch")}
              onPress={() =>
                openDirectoryLink(brand.website!, t("directory.linkError"))
              }
            />
          )}
          <Body>{t("directory.branchNote")}</Body>
        </Card>
      )}
      {error && (
        <Card>
          <Body>{t(error)}</Body>
          <Button title={t("再試行")} onPress={search} />
        </Card>
      )}
      {results !== null && (
        <Heading>{t("directory.resultCount", { 0: results.length })}</Heading>
      )}
      {results?.map((venue) => (
        <DirectoryVenueCard key={venue.id} venue={venue} />
      ))}
      {results?.length === 0 && (
        <Card>
          <Heading>{t("directory.empty")}</Heading>
          <Body>{t("directory.emptyHint")}</Body>
        </Card>
      )}
      <Body>{t("directory.attribution")}</Body>
      <Button
        title={t("directory.copyright")}
        variant="quiet"
        onPress={() =>
          openDirectoryLink(
            "https://www.openstreetmap.org/copyright",
            t("directory.linkError"),
          )
        }
      />
    </Page>
  );
}
