import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { MotionFrame, PlaybackSpeed } from "../domain/exerciseMotion";
import { ChestLesson } from "../domain/chestLessons";
import { View3 } from "../domain/training3d";
import { useI18n } from "../i18n";
import { MotionScrubber } from "./MotionScrubber";
import { Button, colors } from "./ui";

type Props={lesson:ChestLesson;frame:MotionFrame;position:number;running:boolean;canPlay:boolean;completed:boolean;reduced:boolean;
  speed:PlaybackSpeed;view:View3;focused:boolean;onPlay:()=>void;onRestart:()=>void;onSeek:(value:number)=>void;
  onSpeed:(speed:PlaybackSpeed)=>void;onView:(view:View3)=>void;onFocus:()=>void};
export function ChestLiveLesson(p:Props) {
  const {t}=useI18n(), progress=p.frame.progress, returning=p.frame.phase==="return";
  const start=90+24*progress, end=230-24*progress, radius=8+6*progress;
  return <View testID="chest-live-lesson" style={styles.panel}>
    <Text style={styles.title}>{t("chest.live.title")}</Text>
    <Button title={t(p.running?"chest.live.pause":p.position>0&&p.position<1?"chest.live.resume":"chest.live.play")} onPress={p.onPlay} disabled={!p.canPlay}/>
    <Text style={styles.note}>{t("chest.live.drag")}</Text>
    <MotionScrubber value={p.position} label={t("chest.live.scrub")} onChange={p.onSeek}/>
    <View style={styles.row}>
      <Button title={t("chest.live.previous")} variant="quiet" onPress={()=>p.onSeek(Math.max(0,p.position-.05))}/>
      <Text style={styles.percent}>{Math.round(p.position*100)}%</Text>
      <Button title={t("chest.live.next")} variant="quiet" onPress={()=>p.onSeek(Math.min(1,p.position+.05))}/>
    </View>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("chest.live.speed")} style={styles.row}>
      {([1,.5,.25] as const).map(speed=><Pressable key={speed} accessibilityRole="radio" accessibilityLabel={t(`chest.live.speed.${speed}`)}
        accessibilityState={{checked:p.speed===speed}} aria-checked={p.speed===speed} onPress={()=>p.onSpeed(speed)} style={[styles.option,p.speed===speed&&styles.selected]}><Text style={styles.text}>{t(`chest.live.speed.${speed}`)}</Text></Pressable>)}
    </View>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("scene.camera")} style={styles.row}>
      {(["front","side","back"] as const).map(view=><Pressable key={view} accessibilityRole="radio" accessibilityLabel={t(`scene.${view}`)}
        accessibilityState={{checked:p.view===view}} aria-checked={p.view===view} onPress={()=>p.onView(view)} style={[styles.option,p.view===view&&styles.selected]}><Text style={styles.text}>{t(`scene.${view}`)}</Text></Pressable>)}
    </View>
    <Button title={t(p.focused?"chest.live.whole":"chest.live.focus")} variant="quiet" onPress={p.onFocus}/>
    <View testID="chest-live-muscle" style={styles.muscle}>
      <Text style={styles.muscleTitle}>{t(p.completed?"chest.live.complete":`chest.live.${p.frame.phase}`)}</Text>
      <Svg viewBox="0 0 320 50" height={55} width="100%" accessibilityElementsHidden>
        <Line x1={90} y1={25} x2={230} y2={25} stroke="#b6a7a3" strokeDasharray="4 3"/>
        <Path testID="chest-live-fiber" d={`M${start} 25 Q160 ${25-radius*2} ${end} 25 Q160 ${25+radius*2} ${start} 25Z`} fill="#b95749"/>
        {[-1,1].map(side=>{const x=160+side*80, sign=returning?side:-side;return <Path key={side} d={`M${x-sign*12} 25 H${x+sign*8} M${x+sign*2} 20 L${x+sign*8} 25 L${x+sign*2} 30`} fill="none" stroke="#7d3d35" strokeWidth={2}/>})}
      </Svg>
      <Text testID="chest-live-cue" style={styles.text}>{t(`${p.lesson.prefix}.${returning?"returnCue":"moveCue"}`)}</Text>
      <Text style={styles.note}>{t("chest.live.schematic")}</Text>
    </View>
    <Text style={styles.note}>{t("chest.live.legend")}</Text>
    <Button title={t("chest.live.restart")} onPress={p.onRestart} disabled={!p.canPlay} variant="quiet"/>
    {p.reduced&&<Text style={styles.note}>{t("motion.reducedHint")}</Text>}
  </View>;
}
const styles=StyleSheet.create({panel:{gap:10,borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,backgroundColor:"#fff"},title:{fontSize:15,fontWeight:"600",color:colors.text},note:{fontSize:12,lineHeight:19,color:colors.muted},row:{flexDirection:"row",alignItems:"center",gap:6,flexWrap:"wrap"},option:{flex:1,minHeight:48,borderWidth:1,borderColor:colors.border,borderRadius:9,justifyContent:"center",alignItems:"center",padding:6},selected:{borderColor:colors.primary,backgroundColor:"#edf3f5"},text:{fontSize:13,lineHeight:21,color:colors.text},percent:{fontSize:12,color:colors.muted},muscle:{padding:10,borderRadius:10,backgroundColor:"#faf1ee",gap:5},muscleTitle:{fontSize:14,fontWeight:"600",color:"#7d3d35"}});
