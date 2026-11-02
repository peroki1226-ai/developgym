import React, { useContext } from "react";
import { Image, Pressable, Text, View, StyleSheet } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import { useI18n } from "../i18n";
import { Gym, MatchResult } from "../domain/matching";
import { useFitness } from "../state";
import { useDiscovery } from "../discoveryState";
import { Body, Button, Card, Heading, s, colors } from "./ui";
export function TravelHero() {
  const { t } = useI18n();
  return (
    <View style={styles.hero}>
      <Image
        source={require("../../assets/travel-hero.png")}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />
      <View style={styles.shade}>
        <Text style={styles.heroText}>{t("travel.tagline")}</Text>
      </View>
    </View>
  );
}
export function GymPhoto({
  large = false,
  compact = false,
}: {
  large?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <View>
      <Image
        source={require("../../assets/gym-interior.png")}
        style={{
          width: "100%",
          height: compact ? 82 : large ? 210 : 136,
          borderRadius: 10,
        }}
        accessibilityLabel={t("travel.photo")}
      />
      <Text style={styles.photoLabel}>{t("travel.illustration")}</Text>
    </View>
  );
}
export function MatchMeter({ value }: { value: number | null }) {
  const { t } = useI18n();
  return (
    <View
      accessible
      accessibilityLabel={t("travel.matchValue", {
        0: value === null ? "—" : value,
      })}
      style={{
        width: 82,
        height: 82,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Svg width={82} height={82} style={StyleSheet.absoluteFill}>
        <Circle
          cx={41}
          cy={41}
          r={34}
          stroke={colors.border}
          strokeWidth={3}
          fill="none"
        />
        <Circle
          cx={41}
          cy={41}
          r={34}
          stroke={colors.success}
          strokeWidth={3}
          fill="none"
          strokeDasharray={`${((value || 0) / 100) * 214} 214`}
          rotation={-90}
          origin="41,41"
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontSize: 10, color: colors.muted }}>
        {t("travel.match")}
      </Text>
      <Text style={{ fontSize: 23, fontWeight: "400", color: colors.success }}>
        {value === null ? "—" : value + "%"}
      </Text>
    </View>
  );
}
export function VenueCard({ gym, match }: { gym: Gym; match: MatchResult }) {
  const { t } = useI18n();
  const { favorites, toggleFavorite } = useFitness();
  const d = useDiscovery(),
    nav = useContext(NavigationContext);
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 92 }}>
          <GymPhoto compact />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Heading>{t(gym.name)}</Heading>
          <Body>{t(gym.area)}</Body>
          <Text
            style={{ color: colors.success, fontSize: 17, fontWeight: "500" }}
          >
            {t("travel.match")}{" "}
            {match.percent === null ? "—" : match.percent + "%"}
          </Text>
        </View>
      </View>
      <Text style={styles.tag}>
        {t("travel.dumbbell", { 0: gym.maxDumbbellKg })}
      </Text>
      {match.available.slice(0, 3).map((m) => (
        <Text key={m.id} style={{ color: colors.muted, fontSize: 12 }}>
          ✓ {t(m.name)}
        </Text>
      ))}
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
          title={t("travel.details")}
          onPress={() => {
            d?.openGym(gym.id);
            nav?.navigate("Explore" as never);
          }}
        />
      </View>
      {d && (
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
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { height: 84, width: "100%", borderRadius: 12, overflow: "hidden" },
  shade: {
    flex: 1,
    backgroundColor: "#14253566",
    justifyContent: "flex-end",
    padding: 18,
    gap: 8,
  },
  heroText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "400",
    letterSpacing: 0.2,
  },
  photoLabel: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#182a3ac9",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 10,
  },
  tag: {
    color: colors.muted,
    backgroundColor: "#f3f5f6",
    alignSelf: "flex-start",
    padding: 8,
    borderRadius: 6,
    fontWeight: "400",
  },
});
