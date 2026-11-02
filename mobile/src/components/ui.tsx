import { useI18n } from "../i18n";
import React, { PropsWithChildren, useContext, useLayoutEffect, useRef } from "react";
import { NavigationContext } from "@react-navigation/native";
import { useDiscovery } from "../discoveryState";
import { TravelIcon } from "./TravelIcon";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
export const colors = {
  background: "#f5f9ff",
  surface: "#ffffff",
  text: "#102b4e",
  muted: "#5d718b",
  border: "#dfebfa",
  primary: "#0878f9",
  success: "#00b982",
};
export function Page({
  title,
  subtitle,
  children,
  hero,
  tools = true,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  hero?: React.ReactNode;
  tools?: boolean;
}>) {
  const { t } = useI18n();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useLayoutEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [title]);
  return (
    <ScrollView
      ref={scroll}
      key={title}
      style={s.page}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <TravelIcon name="globe" size={30} />
        <LanguageSwitch />
      </View>
      {!hero && tools && (
        <Text style={s.brand}>{t("GYMFINDER / YOUR DAILY STANDARD")}</Text>
      )}
      {hero}
      <Text
        accessibilityRole="header"
        style={[s.title, Boolean(hero) && { fontSize: 22 }]}
      >
        {t(title)}
      </Text>
      {!hero && <Text style={s.subtitle}>{subtitle}</Text>}
      {!hero && tools && <TrainingTools />}
      {children}
    </ScrollView>
  );
}
export function LanguageSwitch() {
  const { language, setLanguage, t } = useI18n();
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={t("言語 / Language")}
      style={[s.row, { justifyContent: "flex-end" }]}
    >
      <Button
        title={t("🇯🇵 日本語")}
        selected={language === "ja"}
        onPress={() => setLanguage("ja")}
      />
      <Button
        title={t("🇺🇸 English")}
        selected={language === "en"}
        onPress={() => setLanguage("en")}
      />
    </View>
  );
}
export function TrainingTools() {
  const d = useDiscovery(),
    nav = useContext(NavigationContext);
  const { t } = useI18n();
  if (!d || !nav) return null;
  return (
    <View style={s.row}>
      {[
        { key: "gyms", label: "nav.gyms" },
        { key: "training", label: "nav.training" },
        { key: "home", label: "nav.home" },
        { key: "diet", label: "nav.diet" },
      ].map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityState={{ selected: d.tool === item.key }}
          style={{
            minHeight: 48,
            paddingHorizontal: 8,
            justifyContent: "center",
            backgroundColor: d.tool === item.key ? "#0878f9" : "#eaf3ff",
            borderRadius: 12,
          }}
          onPress={() => {
            if (item.key === "gyms") {
              d.setTool(null);
              d.setPage("home");
              nav.navigate("Explore" as never);
            } else d.setTool(item.key as "training" | "home" | "diet");
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: d.tool === item.key ? "#fff" : "#0878f9",
            }}
          >
            {t(item.label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={s.card}>{children}</View>;
}
export function Heading({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={s.heading}>
      {children}
    </Text>
  );
}
export function Body({ children }: PropsWithChildren) {
  return <Text style={s.body}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  selected = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        selected && s.selected,
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={[s.buttonText, selected && { color: "#ffffff" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#7d91a9"
      {...props}
      style={[s.input, props.style]}
    />
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  brand: { color: colors.muted, fontSize: 10, letterSpacing: 2 },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 8,
  },
  card: {
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: "600" },
  body: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#dce8f8",
    borderRadius: 14,
    justifyContent: "center",
  },
  selected: { backgroundColor: "#0878f9", borderColor: "#0878f9" },
  buttonText: { color: "#0878f9", fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#dce8f8",
    borderRadius: 12,
    color: "#183153",
    backgroundColor: "#ffffff",
    padding: 12,
    fontSize: 16,
  },
  number: {
    color: "#0878f9",
    fontSize: 40,
    fontWeight: "200",
    fontVariant: ["tabular-nums"],
  },
});
