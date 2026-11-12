import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { View3, benchViews } from "../domain/training3d";
import { Orbit, clampZoom, normaliseOrbit, orbitForView } from "../domain/guideCamera";
import { useI18n } from "../i18n";
import { Button, colors } from "./ui";

type Props={type:string;view:View3;orbit?:Orbit;zoom:number;rotating:boolean;onView:(v:View3)=>void;onOrbit:(v:Orbit)=>void;onZoom:(v:number)=>void;onRotate:()=>void;onFit:()=>void;onReset:()=>void};
export function GuideCameraControls(p:Props){
  const {t}=useI18n(),orbit=p.orbit??orbitForView(p.view);
  return <View testID="guide-camera-controls" style={styles.panel}>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("scene.camera")} style={styles.row}>
      {benchViews(p.type).map(v=><Pressable key={v} accessibilityRole="radio" accessibilityLabel={t(`scene.${v}`)}
        accessibilityState={{checked:!p.orbit&&p.view===v}} aria-checked={!p.orbit&&p.view===v} onPress={()=>p.onView(v)} style={[styles.preset,!p.orbit&&p.view===v&&styles.selected]}><Text style={styles.text}>{t(`scene.${v}`)}</Text></Pressable>)}
    </View>
    <View style={styles.row}>
      <Button title={t("camera.zoomOut")} variant="quiet" disabled={p.zoom<=1} onPress={()=>p.onZoom(clampZoom(p.zoom-.15))}/>
      <Text testID="guide-zoom-value" style={styles.text}>{t("camera.zoom",{0:Math.round(p.zoom*100)})}</Text>
      <Button title={t("camera.zoomIn")} variant="quiet" disabled={p.zoom>=2.5} onPress={()=>p.onZoom(clampZoom(p.zoom+.15))}/>
    </View>
    <Button title={t(p.rotating?"camera.lock":"camera.unlock")} variant="quiet" onPress={p.onRotate}/>
    {p.rotating&&<>
      <Text style={styles.note}>{t("camera.dragHint")}</Text>
      <View style={styles.row}>{(["left","right","up","down"] as const).map(d=><Button key={d} title={t(`camera.turn.${d}`)} variant="quiet" onPress={()=>p.onOrbit(normaliseOrbit({yaw:orbit.yaw+(d==="left"?-15:d==="right"?15:0),pitch:orbit.pitch+(d==="up"?10:d==="down"?-10:0)}))}/>)}</View>
    </>}
    <View style={styles.row}><Button title={t("camera.fit")} variant="quiet" onPress={p.onFit}/><Button title={t("camera.reset")} variant="quiet" onPress={p.onReset}/></View>
    {p.orbit&&<Text testID="guide-orbit-value" style={styles.note}>{t("camera.angles",{0:Math.round(p.orbit.yaw),1:Math.round(p.orbit.pitch)})}</Text>}
  </View>;
}
const styles=StyleSheet.create({panel:{gap:6},row:{flexDirection:"row",flexWrap:"wrap",gap:6,alignItems:"center"},preset:{minHeight:48,flexBasis:"30%",flexGrow:1,borderWidth:1,borderColor:colors.border,borderRadius:9,alignItems:"center",justifyContent:"center",padding:7},selected:{borderColor:colors.primary,backgroundColor:"#edf3f5"},text:{fontSize:13,color:colors.text},note:{fontSize:12,lineHeight:19,color:colors.muted}});
