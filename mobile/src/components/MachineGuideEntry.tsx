import React from "react";
import { Pressable, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { useDiscovery } from "../discoveryState";
import { EQUIPMENTS } from "../data/equipment";
import { ExerciseDiagram } from "./ExerciseDiagram";
import { TravelIcon } from "./TravelIcon";
import { colors } from "./ui";

export function MachineGuideEntry() {
  const d = useDiscovery();
  const { t } = useI18n();
  if (!d) return null;
  const first = EQUIPMENTS[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("guide.open")}
      onPress={() => d.openGuide(first.id)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 96,
        padding: 12,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ width: 76 }}>
        <ExerciseDiagram
          type={first.svgType}
          muscleTag={first.muscleTag}
          compact
        />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "500" }}>
          {t("guide.title")}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>
          {t("guide.entryHint")}
        </Text>
      </View>
      <TravelIcon name="arrow" size={18} color={colors.primary} />
    </Pressable>
  );
}
