import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AdvancedWorkout, effortKey, loadBasis, RecordedSet, setVolume, workoutVolume } from "../domain/advancedWorkout";
import { muscleSpec } from "../domain/muscleMotion";
import { useI18n } from "../i18n";
import { colors } from "./ui";
export const volumeText = (value: number) => Math.round(value*100)/100;
export function SetLoadMetric({ exerciseId, set }: { exerciseId:string; set:RecordedSet }) {
  const {t}=useI18n(), volume=setVolume(exerciseId,set);
  return <View style={styles.metric}>
    <Text style={styles.text}>{volume===null?t('advanced.volume.unavailable'):t('advanced.volume.value',{0:volumeText(volume)})}</Text>
    <Text style={styles.note}>{t(effortKey(set.rir))}{set.rir!==null?' · '+t(set.rir===4?'advanced.rir.more':'advanced.rir.value',{0:set.rir}):''}</Text>
  </View>;
}
export function AdvancedWorkoutSummary({ workout, showSets=false }: { workout:AdvancedWorkout; showSets?:boolean }) {
  const {t}=useI18n(), volume=workoutVolume(workout);
  const rows=workout.main.flatMap((set,index)=>[
    {label:t('advanced.main.number',{0:index+1}),set},
    ...workout.drops.filter(d=>d.afterSet===index).map((set,i)=>({label:t('advanced.drop.number',{0:index+1,1:i+1}),set})),
  ]);
  const max=Math.max(1,...rows.map(r=>setVolume(workout.exerciseId,r.set)??0));
  return <View testID="advanced-workout-summary" style={styles.summary}>
    <Text style={styles.title}>{t('advanced.target',{0:t(`muscle.${muscleSpec(workout.exerciseId).focus}`)})}</Text>
    <Text testID="advanced-total-volume" style={styles.title}>{t(loadBasis(workout.exerciseId)==='added'?'advanced.volume.added':'advanced.volume.total')}: {volume.total===null?t('advanced.volume.unavailable'):t('advanced.volume.value',{0:volumeText(volume.total)})}</Text>
    <Text style={styles.text}>{t('advanced.counts',{0:workout.main.length,1:workout.drops.length,2:volume.reps})}</Text>
    {showSets&&<>
      <Text style={styles.note}>{t('advanced.volume.comparison')}</Text>
      {rows.map((row,index)=><View key={index} style={styles.row}>
        <Text style={styles.text}>{row.label} · {t(`advanced.set.${loadBasis(workout.exerciseId)}`,{0:row.set.weight,1:row.set.reps})}</Text>
        <SetLoadMetric exerciseId={workout.exerciseId} set={row.set}/>
        <View style={styles.track}><View style={[styles.fill,{width:`${(setVolume(workout.exerciseId,row.set)??0)/max*100}%`}]}/></View>
      </View>)}
    </>}
    <Text style={styles.note}>{t(`advanced.basis.${loadBasis(workout.exerciseId)}`)}</Text>
    <Text style={styles.note}>{t('advanced.volume.note')}</Text>
  </View>;
}
const styles=StyleSheet.create({summary:{gap:8},metric:{gap:3},title:{fontSize:14,lineHeight:22,color:colors.primary,fontWeight:'600'},text:{fontSize:13,lineHeight:21,color:colors.text},note:{fontSize:12,lineHeight:19,color:colors.muted},row:{gap:5,paddingVertical:8,borderBottomWidth:1,borderColor:colors.border},track:{height:5,backgroundColor:'#e4eaf0',borderRadius:3,overflow:'hidden'},fill:{height:5,backgroundColor:colors.primary}});
