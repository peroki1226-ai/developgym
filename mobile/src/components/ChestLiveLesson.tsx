import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Path } from "react-native-svg";
import { MotionFrame, PlaybackSpeed } from "../domain/exerciseMotion";
import { ChestLesson, chestContractionEmphasis } from "../domain/chestLessons";
import { View3, benchViews, dipFinishAmount } from "../domain/training3d";
import { useI18n } from "../i18n";
import { MotionScrubber } from "./MotionScrubber";
import { Button, colors } from "./ui";

type Props={lesson:ChestLesson;frame:MotionFrame;position:number;running:boolean;canPlay:boolean;completed:boolean;reduced:boolean;
  speed:PlaybackSpeed;view:View3;spatial?:boolean;externalCamera?:boolean;focused:boolean;onPlay:()=>void;onRestart:()=>void;onSeek:(value:number)=>void;
  onSpeed:(speed:PlaybackSpeed)=>void;onView:(view:View3)=>void;onFocus:()=>void};
export function ChestLiveLesson(p:Props) {
  const {t}=useI18n(), progress=p.frame.progress, returning=p.frame.phase==="return";

  const emphasis=chestContractionEmphasis(p.lesson.id);
  return <View testID="chest-live-lesson" style={styles.panel}>
    <Text style={styles.title}>{t("chest.live.title")}</Text>
    <Button title={t(p.running?"chest.live.pause":p.position>0&&p.position<1?"chest.live.resume":"chest.live.play")} onPress={p.onPlay} disabled={!p.canPlay}/>
    <View style={styles.row}>
      <Button title={t("anatomy.inspectLong")} variant="quiet" onPress={()=>p.onSeek(p.lesson.id === "chest-dip" ? .5 : 0)}/>
      <Button title={t("anatomy.inspectShort")} variant="quiet" onPress={()=>p.onSeek(p.lesson.id === "chest-dip" ? 0 : .5)}/>
    </View>
    <Text style={styles.note}>{t("anatomy.legend")}</Text>
    <Text style={styles.note}>{t("anatomy.band")}</Text>
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
    {!p.externalCamera && <View accessibilityRole="radiogroup" accessibilityLabel={t("scene.camera")} style={styles.row}>
      {(p.spatial === false ? benchViews(p.lesson.id).filter(v=>v!=="above") : benchViews(p.lesson.id)).map(view=><Pressable key={view} accessibilityRole="radio" accessibilityLabel={t(`scene.${view}`)}
        accessibilityState={{checked:p.view===view}} aria-checked={p.view===view} onPress={()=>p.onView(view)} style={[styles.option,p.view===view&&styles.selected]}><Text style={styles.text}>{t(`scene.${view}`)}</Text></Pressable>)}
    </View>}
    <Button title={t(p.focused?"chest.live.whole":"chest.live.focus")} variant="quiet" onPress={p.onFocus}/>
    <View testID="chest-live-muscle" style={styles.muscle}>
      <Text style={styles.muscleTitle}>{t(p.completed?"chest.live.complete":`chest.live.${p.frame.phase}`)}</Text>
      <Svg viewBox="0 0 320 106" height={110} width="100%" accessibilityElementsHidden>
        <Path d="M94 12 L122 7 L142 16 Q160 22 178 16 L198 7 L226 12 L239 54 L219 62 L209 99 L111 99 L101 62 L81 54 Z" fill="#ddd0c1" stroke="#a49282" strokeWidth={1}/>
        <Line x1={160} y1={22} x2={160} y2={97} stroke="#b9a898"/>
        {[-1,1].map(side=>{
          const tip=160+side*(57-12*emphasis*progress),y=38-5*progress;
          const chest=`M${160+side*4} 24 Q${160+side*31} 18 ${tip} ${y} Q${160+side*43} ${76+progress*5*emphasis} ${160+side*4} 72 Z`;
          return <G key={side}>
            <Path testID={side===-1?"chest-live-fiber":undefined} d={chest} fill="#bb5143"/>
            {Array.from({length:6},(_,i)=><Path key={i} d={`M${160+side*7} ${27+i*7} Q${160+side*29} ${30+i*5+progress*4} ${tip-side*4} ${y+2}`} fill="none" stroke="#ffe6ab" strokeWidth={1.2}/>)}
            {[-1,1].map(end=>{const x=160+side*30+end*10,sign=(returning?1:-1)*end;return <Path key={end} d={`M${x-sign*5} 49 H${x+sign*5} M${x+sign} 45 L${x+sign*5} 49 L${x+sign} 53`} fill="none" stroke="#fff" strokeWidth={2}/>})}
          </G>;
        })}
      </Svg>
      <Text testID="chest-live-cue" style={styles.text}>{t(`${p.lesson.prefix}.${returning?"returnCue":"moveCue"}`)}</Text>
      {p.lesson.id === "chest-dip" && <View testID="dip-finish-coaching" style={styles.dipCue}>
        <Text style={styles.muscleTitle}>{t(returning?"dip.finish.release":dipFinishAmount(progress)>.05?"dip.finish.active":"dip.finish.path")}</Text>
        <Text style={styles.text}>{t("dip.finish.image")}</Text>
        <Text style={styles.note}>{t("dip.finish.limit")}</Text>
      </View>}
      <Text style={styles.note}>{t("chest.live.schematic")}</Text>
    </View>
    <Text style={styles.note}>{t("chest.live.legend")}</Text>
    <Text style={styles.note}>{t("anatomy.note")}</Text>
    <Button title={t("chest.live.restart")} onPress={p.onRestart} disabled={!p.canPlay} variant="quiet"/>
    {p.reduced&&<Text style={styles.note}>{t("motion.reducedHint")}</Text>}
  </View>;
}
const styles=StyleSheet.create({dipCue:{gap:4,padding:9,borderWidth:1,borderColor:"#dfc89e",borderRadius:9,backgroundColor:"#fffaf0"},panel:{gap:10,borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12,backgroundColor:"#fff"},title:{fontSize:15,fontWeight:"600",color:colors.text},note:{fontSize:12,lineHeight:19,color:colors.muted},row:{flexDirection:"row",alignItems:"center",gap:6,flexWrap:"wrap"},option:{flex:1,minHeight:48,borderWidth:1,borderColor:colors.border,borderRadius:9,justifyContent:"center",alignItems:"center",padding:6},selected:{borderColor:colors.primary,backgroundColor:"#edf3f5"},text:{fontSize:13,lineHeight:21,color:colors.text},percent:{fontSize:12,color:colors.muted},muscle:{padding:10,borderRadius:10,backgroundColor:"#faf1ee",gap:5},muscleTitle:{fontSize:14,fontWeight:"600",color:"#7d3d35"}});
