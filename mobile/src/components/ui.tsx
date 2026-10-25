import React, { PropsWithChildren } from "react";
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
  background: "#000000",
  surface: "#101010",
  text: "#ffffff",
  muted: "#d4d4d8",
  border: "#303030",
};
export function Page({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={s.brand}>GYMFINDER / YOUR DAILY STANDARD</Text>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      <Text style={s.subtitle}>{subtitle}</Text>
      {children}
    </ScrollView>
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
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        selected && s.selected,
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={[s.buttonText, selected && { color: "#000000" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#a1a1aa"
      {...props}
      style={[s.input, props.style]}
    />
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  brand: { color: colors.muted, fontSize: 10, letterSpacing: 2 },
  title: {
    color: colors.text,
    fontSize: 40,
    fontFamily: "serif",
    fontWeight: "300",
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
    borderColor: "#555555",
    borderRadius: 14,
    justifyContent: "center",
  },
  selected: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  buttonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#555555",
    borderRadius: 12,
    color: "#ffffff",
    padding: 12,
    fontSize: 16,
  },
  number: {
    color: "#ffffff",
    fontSize: 40,
    fontWeight: "200",
    fontVariant: ["tabular-nums"],
  },
});
