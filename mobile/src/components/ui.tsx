import { useI18n } from "../i18n";
import React, {
  PropsWithChildren,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  background: "#f7f8f8",
  surface: "#ffffff",
  text: "#182a3a",
  muted: "#64717c",
  border: "#e3e8eb",
  primary: "#254f70",
  success: "#37675a",
};
export function Page({
  title,
  subtitle,
  children,
  hero,
  tools = true,
  scrollKey,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  hero?: React.ReactNode;
  tools?: boolean;
  scrollKey?: string;
}>) {
  const { t } = useI18n();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useLayoutEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [title, scrollKey]);
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            flexShrink: 1,
          }}
        >
          <TravelIcon name="globe" size={22} color={colors.text} />
          <Text style={s.wordmark}>{t("GymFinder")}</Text>
        </View>
        <LanguageSwitch />
      </View>
      {hero}
      <Text accessibilityRole="header" style={s.title}>
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
      style={s.languages}
    >
      {(["ja", "en"] as const).map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={t(value === "ja" ? "🇯🇵 日本語" : "🇺🇸 English")}
          accessibilityState={{ selected: language === value }}
          onPress={() => setLanguage(value)}
          style={({ pressed }) => [
            s.language,
            language === value && s.languageSelected,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text
            style={[
              s.languageText,
              language === value && { color: colors.text },
            ]}
          >
            {t(value === "ja" ? "🇯🇵 日本語" : "🇺🇸 English").replace(
              /🇯🇵\s*|🇺🇸\s*/g,
              "",
            )}
          </Text>
        </Pressable>
      ))}
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
            minWidth: 48,
            paddingHorizontal: 10,
            justifyContent: "center",
            backgroundColor: d.tool === item.key ? colors.text : colors.surface,
            borderRadius: 8,
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
              color: d.tool === item.key ? "#fff" : colors.muted,
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
export function Disclosure({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={s.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [
          s.disclosureButton,
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text style={s.disclosureTitle}>{title}</Text>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={s.disclosureSymbol}
        >
          {expanded ? "−" : "+"}
        </Text>
      </Pressable>
      <View
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
        style={{ gap: 16, paddingTop: 12, display: expanded ? "flex" : "none" }}
      >
        {children}
      </View>
    </View>
  );
}
export function Button({
  title,
  onPress,
  selected = false,
  disabled = false,
  variant = "secondary",
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        variant === "quiet" && s.quiet,
        selected && s.selected,
        variant === "primary" && s.primaryButton,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          selected && { color: colors.primary },
          variant === "primary" && { color: "#ffffff" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#75838e"
      {...props}
      style={[s.input, props.style]}
    />
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 22,
    gap: 12,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  brand: { color: colors.muted, fontSize: 10, letterSpacing: 2 },
  wordmark: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  languages: { flexDirection: "row", alignItems: "center", gap: 2 },
  language: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "transparent",
  },
  languageSelected: { borderBottomColor: colors.text },
  languageText: { color: colors.muted, fontSize: 11, fontWeight: "500" },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "500",
    letterSpacing: -0.8,
    marginTop: 4,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  heading: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 25,
  },
  body: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    justifyContent: "center",
  },
  selected: { backgroundColor: "#edf2f5", borderColor: "#bacbd8" },
  quiet: {
    borderColor: "transparent",
    backgroundColor: "transparent",
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
  },
  disclosure: { borderTopWidth: 1, borderTopColor: colors.border },
  disclosureButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  disclosureTitle: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
  },
  disclosureSymbol: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: "300",
    paddingHorizontal: 4,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    backgroundColor: "#ffffff",
    padding: 12,
    fontSize: 16,
  },
  number: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
  },
});
