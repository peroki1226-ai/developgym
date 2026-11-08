import React from "react";
import { Pressable, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { useFitness } from "../state";
import { Body, Card, colors, Heading } from "./ui";

export function LanguageSettings() {
  const { language, setLanguage, t } = useI18n();
  const { storageStatus } = useFitness();
  return (
    <Card>
      <Heading>{t("language.settings")}</Heading>
      <Body>{t("language.current", { 0: t(`language.mode.${language}`) })}</Body>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("language.choose")} style={{ flexDirection: "row", gap: 8 }}>
        {(["ja", "en"] as const).map(value => {
          const selected = value === language;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={t(`language.mode.${value}`)}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => setLanguage(value)}
              style={({ pressed }) => ({
                flex: 1, minHeight: 52, padding: 12, borderRadius: 10,
                borderWidth: 1, borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : colors.surface,
                alignItems: "center", justifyContent: "center", opacity: pressed ? 0.65 : 1,
              })}
            >
              <Text style={{ color: selected ? "#ffffff" : colors.text, fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                {selected ? "✓ " : ""}{t(`language.mode.${value}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Body>{t("language.scope")}</Body>
      <Body>{t(storageStatus === "saved" ? "language.saved" : storageStatus === "saving" ? "language.saving" : "language.saveError")}</Body>
    </Card>
  );
}
