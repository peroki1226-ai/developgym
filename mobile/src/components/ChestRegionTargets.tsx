import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CHEST_REGIONS, chestTargets, chestTargetColour } from "../domain/chestTargets";
import { useI18n } from "../i18n";
import { colors } from "./ui";
export function ChestRegionTargets({ type, detailed = true }: { type: string; detailed?: boolean }) {
  const { t } = useI18n(), targets = chestTargets(type);
  return <View testID="chest-target-profile" style={styles.panel}>
    <Text style={styles.title}>{t("targets.title")}</Text>
    <View style={styles.rows}>{CHEST_REGIONS.map(region => <View key={region} testID={`target-${region}`} style={[styles.region,{borderColor:chestTargetColour(type,region)}]}>
      <View style={[styles.dot,{backgroundColor:chestTargetColour(type,region)}]}/>
      <Text style={styles.label}>{t(`targets.region.${region}`)}</Text>
      <Text style={styles.role}>{t(`targets.role.${targets[region]}`)}</Text>
    </View>)}</View>
    <Text style={styles.note}>{t(detailed ? "targets.note" : "targets.shortNote")}</Text>
  </View>;
}
const styles=StyleSheet.create({panel:{gap:8},title:{fontSize:14,fontWeight:"700",color:colors.text},rows:{gap:6},region:{flexDirection:"row",alignItems:"center",gap:8,borderWidth:1,borderRadius:9,padding:10,minHeight:44},dot:{width:12,height:12,borderRadius:6},label:{fontSize:13,color:colors.text,flex:1},role:{fontSize:12,color:colors.text,flexShrink:1},note:{fontSize:12,lineHeight:18,color:colors.muted}});
