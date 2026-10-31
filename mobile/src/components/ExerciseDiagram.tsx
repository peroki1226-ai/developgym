import { useI18n } from "../i18n";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Ellipse,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { colors } from "./ui";

export function ExerciseDiagram({
  type,
  muscleTag,
}: {
  type: string;
  muscleTag: string;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badgeLabel}>{t("FORM & TRAJECTORY")}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t(muscleTag)}</Text>
        </View>
      </View>

      <View style={styles.canvasWrapper}>
        <Svg viewBox="0 0 120 96" style={styles.svg}>
          {renderSvgScene(type, t)}
        </Svg>
      </View>
    </View>
  );
}

function renderSvgScene(type: string, t: (message: string) => string) {
  switch (type) {
    case "chest-press":
      return (
        <>
          <Rect x="18" y="16" width="12" height="72" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
          <Line x1="20" y1="28" x2="28" y2="28" stroke="#52525b" strokeWidth="1.5" />
          <Line x1="20" y1="36" x2="28" y2="36" stroke="#52525b" strokeWidth="1.5" />
          <Line x1="20" y1="44" x2="28" y2="44" stroke="#52525b" strokeWidth="1.5" />
          <Line x1="12" y1="88" x2="125" y2="88" stroke="#27272a" strokeWidth="3" />
          <Rect x="42" y="30" width="6" height="36" rx="3" fill="#27272a" stroke="#a1a1aa" strokeWidth="1.2" />
          <Rect x="44" y="65" width="22" height="5" rx="2.5" fill="#27272a" stroke="#a1a1aa" strokeWidth="1.2" />
          <Line x1="52" y1="70" x2="52" y2="88" stroke="#52525b" strokeWidth="3" />
          <Circle cx="56" cy="27" r="6.5" fill="#ffffff" />
          <Line x1="54" y1="35" x2="54" y2="63" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Ellipse cx="59" cy="44" rx="5.5" ry="6.5" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1.5" />
          <Polyline points="54,63 74,64 78,86" fill="none" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points="56,42 48,48 66,45" fill="none" stroke="#52525b" strokeWidth="3.5" strokeDasharray="2 2" />
          <Line x1="57" y1="42" x2="88" y2="42" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
          <Line x1="65" y1="18" x2="89" y2="42" stroke="#d4d4d8" strokeWidth="2.5" />
          <Circle cx="89" cy="42" r="3.5" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
          <Path d="M 70 32 L 106 32" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <Polygon points="106,28 114,32 106,36" fill="#ffffff" />
          <SvgText x="64" y="24" fill="#ffffff" fontSize="8" fontWeight="bold">{t("PRESS FORWARD")}</SvgText>
        </>
      );

    case "pec-fly":
      return (
        <>
          <Rect x="44" y="16" width="32" height="8" rx="3" fill="#27272a" stroke="#52525b" strokeWidth="1.2" />
          <Ellipse cx="60" cy="36" rx="18" ry="9" fill="#a1a1aa" />
          <Circle cx="60" cy="34" r="7.5" fill="#ffffff" />
          <Path d="M 46 41 Q 60 50 74 41" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Path d="M 42 36 Q 22 46 26 62" fill="none" stroke="#52525b" strokeWidth="3.5" strokeDasharray="3 2" strokeLinecap="round" />
          <Path d="M 78 36 Q 98 46 94 62" fill="none" stroke="#52525b" strokeWidth="3.5" strokeDasharray="3 2" strokeLinecap="round" />
          <Path d="M 43 38 Q 42 62 56 74" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
          <Path d="M 77 38 Q 78 62 64 74" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
          <Circle cx="56" cy="74" r="3" fill="#ffffff" />
          <Circle cx="64" cy="74" r="3" fill="#ffffff" />
          <Path d="M 24 66 Q 36 82 52 80" fill="none" stroke="#d4d4d8" strokeWidth="2.5" />
          <Polygon points="50,76 57,80 50,84" fill="#ffffff" />
          <Path d="M 96 66 Q 84 82 68 80" fill="none" stroke="#d4d4d8" strokeWidth="2.5" />
          <Polygon points="70,76 63,80 70,84" fill="#ffffff" />
          <SvgText x="32" y="13" fill="#ffffff" fontSize="8" fontWeight="bold">{t("SWEEP IN AN ARC")}</SvgText>
        </>
      );

    case "incline-smith":
      return (
        <>
          <Line x1="12" y1="88" x2="118" y2="88" stroke="#27272a" strokeWidth="3" />
          <Line x1="64" y1="10" x2="68" y2="88" stroke="#52525b" strokeWidth="3" />
          <Line x1="34" y1="46" x2="62" y2="70" stroke="#27272a" strokeWidth="6" strokeLinecap="round" />
          <Line x1="62" y1="70" x2="78" y2="66" stroke="#27272a" strokeWidth="5" strokeLinecap="round" />
          <Circle cx="40" cy="39" r="5.5" fill="#ffffff" />
          <Line x1="44" y1="44" x2="62" y2="66" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Ellipse cx="52" cy="48" rx="6" ry="4" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1.5" />
          <Polyline points="62,66 78,66 84,86" fill="none" stroke="#a1a1aa" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="52" y1="48" x2="65" y2="24" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <Circle cx="65" cy="24" r="4.5" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
          <Line x1="80" y1="48" x2="78" y2="18" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="74,20 78,12 82,20" fill="#ffffff" />
          <SvgText x="14" y="24" fill="#ffffff" fontSize="8" fontWeight="bold">{t("30\u00b0 FIXED RAIL")}</SvgText>
        </>
      );

    case "cable-machine":
      return (
        <>
          <Rect x="14" y="12" width="8" height="76" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
          <Rect x="98" y="12" width="8" height="76" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
          <Line x1="22" y1="22" x2="52" y2="54" stroke="#d4d4d8" strokeWidth="2" strokeDasharray="2 2" />
          <Line x1="98" y1="22" x2="68" y2="54" stroke="#d4d4d8" strokeWidth="2" strokeDasharray="2 2" />
          <Circle cx="60" cy="28" r="6" fill="#ffffff" />
          <Rect x="52" y="36" width="16" height="24" rx="4" fill="#ffffff" />
          <Rect x="53" y="38" width="14" height="9" rx="2" fill="#d4d4d8" stroke="#000000" strokeWidth="1.2" />
          <Line x1="56" y1="60" x2="54" y2="86" stroke="#a1a1aa" strokeWidth="4.5" strokeLinecap="round" />
          <Line x1="64" y1="60" x2="66" y2="86" stroke="#a1a1aa" strokeWidth="4.5" strokeLinecap="round" />
          <Line x1="52" y1="40" x2="54" y2="55" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <Line x1="68" y1="40" x2="66" y2="55" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <Path d="M 32 42 Q 44 58 54 58" fill="none" stroke="#ffffff" strokeWidth="2.2" />
          <Path d="M 88 42 Q 76 58 66 58" fill="none" stroke="#ffffff" strokeWidth="2.2" />
          <SvgText x="28" y="18" fill="#ffffff" fontSize="8" fontWeight="bold">{t("SQUEEZE TO CENTER")}</SvgText>
        </>
      );

    case "lat-pulldown":
      return (
        <>
          <Rect x="86" y="10" width="12" height="78" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
          <Line x1="48" y1="12" x2="92" y2="12" stroke="#52525b" strokeWidth="3.5" strokeLinecap="round" />
          <Line x1="54" y1="12" x2="54" y2="38" stroke="#d4d4d8" strokeWidth="1.5" strokeDasharray="2 2" />
          <Rect x="44" y="64" width="22" height="5" rx="2" fill="#27272a" />
          <Circle cx="62" cy="57" r="4" fill="#18181b" stroke="#d4d4d8" strokeWidth="1.5" />
          <Circle cx="44" cy="33" r="6" fill="#ffffff" />
          <Line x1="45" y1="40" x2="50" y2="63" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" />
          <Path d="M 42 42 L 48 58 L 40 55 Z" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1.2" />
          <Polyline points="50,63 68,63 70,86" fill="none" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="44" y1="20" x2="64" y2="20" stroke="#52525b" strokeWidth="3" strokeLinecap="round" />
          <Line x1="44" y1="38" x2="64" y2="38" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <Polyline points="46,43 54,38" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <Line x1="24" y1="16" x2="24" y2="44" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="20,42 24,50 28,42" fill="#ffffff" />
          <SvgText x="8" y="60" fill="#ffffff" fontSize="8" fontWeight="bold">{t("PULL TO CHEST")}</SvgText>
        </>
      );

    case "seated-row":
      return (
        <>
          <Rect x="92" y="22" width="12" height="66" rx="2" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />
          <Line x1="15" y1="88" x2="112" y2="88" stroke="#27272a" strokeWidth="3" />
          <Line x1="76" y1="68" x2="80" y2="86" stroke="#52525b" strokeWidth="3.5" />
          <Line x1="92" y1="54" x2="48" y2="54" stroke="#d4d4d8" strokeWidth="1.8" strokeDasharray="2 2" />
          <Rect x="28" y="66" width="20" height="5" rx="2" fill="#27272a" />
          <Circle cx="38" cy="32" r="6" fill="#ffffff" />
          <Line x1="38" y1="39" x2="38" y2="65" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" />
          <Rect x="32" y="42" width="6" height="16" rx="3" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1.2" />
          <Polyline points="38,65 58,68 76,75" fill="none" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points="38,44 30,54 46,54" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="47" cy="54" r="3" fill="#ffffff" />
          <Line x1="78" y1="42" x2="52" y2="42" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="54,38 46,42 54,46" fill="#ffffff" />
          <SvgText x="48" y="34" fill="#ffffff" fontSize="8" fontWeight="bold">{t("ROW TO WAIST")}</SvgText>
        </>
      );

    case "shoulder-press":
      return (
        <>
          <Line x1="15" y1="88" x2="115" y2="88" stroke="#27272a" strokeWidth="3" />
          <Line x1="36" y1="34" x2="42" y2="68" stroke="#27272a" strokeWidth="6" strokeLinecap="round" />
          <Line x1="42" y1="68" x2="64" y2="68" stroke="#27272a" strokeWidth="5" strokeLinecap="round" />
          <Circle cx="52" cy="36" r="6.5" fill="#ffffff" />
          <Line x1="50" y1="43" x2="52" y2="65" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Polyline points="52,65 70,66 74,86" fill="none" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="53" cy="45" r="5.5" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1.5" />
          <Polyline points="53,45 64,48 64,35" fill="none" stroke="#52525b" strokeWidth="3" strokeDasharray="2 2" />
          <Line x1="53" y1="45" x2="58" y2="16" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
          <Circle cx="58" cy="15" r="3.5" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
          <Line x1="78" y1="50" x2="78" y2="18" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="74,20 78,11 82,20" fill="#ffffff" />
          <SvgText x="82" y="34" fill="#ffffff" fontSize="8" fontWeight="bold">{t("PRESS UP")}</SvgText>
        </>
      );

    case "dumbbell-heavy":
      return (
        <>
          <Line x1="12" y1="88" x2="118" y2="88" stroke="#27272a" strokeWidth="3" />
          <Line x1="32" y1="48" x2="58" y2="70" stroke="#27272a" strokeWidth="6" strokeLinecap="round" />
          <Line x1="58" y1="70" x2="76" y2="68" stroke="#27272a" strokeWidth="5" strokeLinecap="round" />
          <Circle cx="38" cy="40" r="5.5" fill="#ffffff" />
          <Line x1="42" y1="45" x2="58" y2="66" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Ellipse cx="50" cy="49" rx="5.5" ry="4" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1.5" />
          <Polyline points="58,66 76,68 82,86" fill="none" stroke="#a1a1aa" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="50" y1="49" x2="56" y2="24" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
          <Rect x="48" y="19" width="16" height="6" rx="2" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
          <Path d="M 70 46 Q 70 28 64 20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="61,23 62,14 68,20" fill="#ffffff" />
          <SvgText x="60" y="36" fill="#ffffff" fontSize="8" fontWeight="bold">{t("DEEP STRETCH")}</SvgText>
        </>
      );

    case "leg-press":
      return (
        <>
          <Line x1="12" y1="88" x2="118" y2="88" stroke="#27272a" strokeWidth="3" />
          <Line x1="22" y1="48" x2="40" y2="74" stroke="#52525b" strokeWidth="6" strokeLinecap="round" />
          <Line x1="40" y1="74" x2="56" y2="70" stroke="#52525b" strokeWidth="5" strokeLinecap="round" />
          <Line x1="56" y1="76" x2="106" y2="26" stroke="#27272a" strokeWidth="3" />
          <Line x1="78" y1="32" x2="92" y2="48" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          <Circle cx="28" cy="40" r="6" fill="#ffffff" />
          <Line x1="31" y1="46" x2="43" y2="69" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Polyline points="43,69 52,48 76,42" fill="none" stroke="#52525b" strokeWidth="4" strokeDasharray="2 2" />
          <Polyline points="43,69 64,54 83,41" fill="none" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="45" y1="67" x2="62" y2="55" stroke="#d4d4d8" strokeWidth="6" strokeLinecap="round" />
          <Line x1="66" y1="28" x2="90" y2="12" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="87,9 96,8 92,16" fill="#ffffff" />
          <SvgText x="38" y="20" fill="#ffffff" fontSize="8" fontWeight="bold">{t("DRIVE SLED UP 45\u00b0")}</SvgText>
        </>
      );

    case "hack-squat":
      return (
        <>
          <Line x1="12" y1="88" x2="118" y2="88" stroke="#27272a" strokeWidth="3" />
          <Line x1="26" y1="82" x2="92" y2="18" stroke="#52525b" strokeWidth="4" />
          <Line x1="22" y1="66" x2="40" y2="86" stroke="#52525b" strokeWidth="5" strokeLinecap="round" />
          <Line x1="58" y1="48" x2="82" y2="24" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          <Circle cx="84" cy="18" r="5.5" fill="#ffffff" />
          <Line x1="78" y1="24" x2="58" y2="44" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Polyline points="58,44 42,48 32,74" fill="none" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="57" y1="44" x2="43" y2="48" stroke="#d4d4d8" strokeWidth="6.5" strokeLinecap="round" />
          <Line x1="70" y1="64" x2="94" y2="40" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="90,38 99,35 96,44" fill="#ffffff" />
          <SvgText x="48" y="76" fill="#ffffff" fontSize="8" fontWeight="bold">{t("SLIDE ALONG 45\u00b0 RAIL")}</SvgText>
        </>
      );

    case "power-rack":
      return (
        <>
          <Rect x="24" y="12" width="72" height="76" fill="none" stroke="#52525b" strokeWidth="3" />
          <Line x1="24" y1="56" x2="96" y2="56" stroke="#d4d4d8" strokeWidth="2.5" strokeDasharray="4 2" />
          <Line x1="16" y1="34" x2="104" y2="34" stroke="#ffffff" strokeWidth="3" />
          <Rect x="20" y="25" width="5" height="18" rx="1.5" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1" />
          <Rect x="95" y="25" width="5" height="18" rx="1.5" fill="#ffffff" stroke="#d4d4d8" strokeWidth="1" />
          <Circle cx="60" cy="24" r="5.5" fill="#ffffff" />
          <Line x1="60" y1="30" x2="54" y2="54" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Polyline points="54,54 68,64 60,86" fill="none" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="54" y1="54" x2="67" y2="63" stroke="#d4d4d8" strokeWidth="6" strokeLinecap="round" />
          <Line x1="82" y1="50" x2="82" y2="20" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="78,22 82,14 86,22" fill="#ffffff" />
          <SvgText x="32" y="52" fill="#ffffff" fontSize="8" fontWeight="bold">{t("SAFETY BARS")}</SvgText>
        </>
      );

    case "abdominal-crunch":
    default:
      return (
        <>
          <Line x1="15" y1="88" x2="115" y2="88" stroke="#27272a" strokeWidth="3" />
          <Rect x="40" y="32" width="6" height="36" rx="3" fill="#27272a" />
          <Rect x="42" y="66" width="22" height="5" rx="2" fill="#27272a" />
          <Line x1="50" y1="64" x2="50" y2="36" stroke="#52525b" strokeWidth="4.5" strokeDasharray="2 2" strokeLinecap="round" />
          <Path d="M 50 64 Q 56 46 68 42" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <Circle cx="72" cy="38" r="6" fill="#ffffff" />
          <Path d="M 55 60 Q 60 52 64 47" fill="none" stroke="#d4d4d8" strokeWidth="5" strokeLinecap="round" />
          <Polyline points="50,65 68,66 72,86" fill="none" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M 54 22 Q 78 22 84 44" fill="none" stroke="#ffffff" strokeWidth="2.5" />
          <Polygon points="80,43 85,51 88,42" fill="#ffffff" />
          <SvgText x="44" y="18" fill="#ffffff" fontSize="8" fontWeight="bold">{t("CURL RIBCAGE DOWN")}</SvgText>
        </>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#050507",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  canvasWrapper: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    width: "100%",
    height: 140,
  },
});
