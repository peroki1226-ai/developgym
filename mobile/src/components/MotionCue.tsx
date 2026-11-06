import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "./ui";

/** Reserve the tallest phase cue so changing instructions does not move the model. */
export function MotionCue({ cues, active }: { cues: readonly string[]; active: number }) {
  const [height, setHeight] = useState(80);
  return <View style={[styles.box, { minHeight: height }]}>
    <Text testID="motion-current-cue" style={styles.text}>{cues[active]}</Text>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      aria-hidden style={styles.measure}>
      {cues.map((cue, index) => <Text key={index} style={styles.text}
        onLayout={({ nativeEvent }) => setHeight(value => Math.max(value, Math.ceil(nativeEvent.layout.height)))}>{cue}</Text>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  box: { position: "relative", overflow: "hidden" },
  text: { color: colors.text, fontSize: 12, lineHeight: 20 },
  measure: { position: "absolute", top: 0, left: 0, right: 0, opacity: 0 },
});
