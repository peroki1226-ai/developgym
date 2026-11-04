import React from "react";
import { Alert, Linking } from "react-native";
import { Body, Button, Card, Heading, s } from "./ui";
import { View } from "react-native";
import { useI18n } from "../i18n";
import { prefectures } from "../data/gymDirectory";
import {
  DirectoryVenue,
  venueDisplayName,
  venueRouteUrl,
} from "../domain/gymDirectory";
import { useDirectory } from "../directoryState";

export function openDirectoryLink(url: string, errorLabel: string) {
  Linking.openURL(url).catch(() => Alert.alert(errorLabel));
}
export function DirectoryVenueCard({ venue }: { venue: DirectoryVenue }) {
  const { language, t } = useI18n(),
    store = useDirectory();
  const saved = Boolean(store?.saved.some((v) => v.id === venue.id));
  return (
    <Card>
      <Heading>{venueDisplayName(venue, language)}</Heading>
      <Body>
        {
          prefectures.find((p) => p.code === venue.prefectureCode)!.name[
            language
          ]
        }
      </Body>
      {venue.women !== "unknown" && (
        <Body>
          {t(
            venue.women === "tagged"
              ? "directory.womenTagged"
              : "directory.womenBrand",
          )}
        </Body>
      )}
      {venue.publicFacility && <Body>{t("directory.publicTagged")}</Body>}
      <Body>{t("directory.unknownSpecs")}</Body>
      <View style={s.row}>
        <Button
          title={t(saved ? "directory.unsave" : "directory.save")}
          selected={saved}
          disabled={!store?.ready || Boolean(store?.error)}
          onPress={() => store?.toggle(venue)}
        />
        <Button
          title={t("directory.route")}
          onPress={() =>
            openDirectoryLink(venueRouteUrl(venue), t("directory.linkError"))
          }
        />
        <Button
          title={t("directory.source")}
          onPress={() =>
            openDirectoryLink(venue.sourceUrl, t("directory.linkError"))
          }
        />
        {venue.website && (
          <Button
            title={t("directory.website")}
            onPress={() =>
              openDirectoryLink(venue.website!, t("directory.linkError"))
            }
          />
        )}
      </View>
      <Body>{t("directory.sourceNote")}</Body>
    </Card>
  );
}
export function DirectorySavedVenues() {
  const { t } = useI18n(),
    store = useDirectory();
  return (
    <>
      <DirectoryStorageNotice />
      {store?.saved.map((venue) => (
        <DirectoryVenueCard key={venue.id} venue={venue} />
      ))}
      {Boolean(store?.saved.length) && (
        <>
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
        </>
      )}
    </>
  );
}
export function DirectoryStorageNotice() {
  const { t } = useI18n(),
    store = useDirectory();
  return store?.error ? (
    <Card>
      <Body>{t("directory.storageError")}</Body>
      <Button title={t("再試行")} onPress={store.retry} />
    </Card>
  ) : null;
}
