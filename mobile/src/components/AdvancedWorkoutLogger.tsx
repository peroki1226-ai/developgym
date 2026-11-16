import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { advancedLoadType, DropDraft, loadBasis, MAX_DROP_SETS, MAX_MAIN_SETS, parseAdvancedWorkout, SetDraft } from "../domain/advancedWorkout";
import { useI18n } from "../i18n";
import { useFitness } from "../state";
import { AdvancedWorkoutSummary, SetLoadMetric } from "./AdvancedWorkoutSummary";
import { Body, Button, Card, Field, Heading, colors } from "./ui";

type Props={active:boolean;exerciseId:string;name:string;initialWeight:string;initialReps:string;initialSets:string};
export function AdvancedWorkoutLogger(p:Props) {
  const {t}=useI18n(),{addLog}=useFitness(),initialized=useRef(false);
  const [main,setMain]=useState<SetDraft[]>([]),[drops,setDrops]=useState<DropDraft[]>([]),[count,setCount]=useState('3'),[error,setError]=useState('');
  const basis=loadBasis(p.exerciseId);
  useEffect(()=>{
    if(!p.active||initialized.current)return;
    initialized.current=true;
    const n=/^\d+$/.test(p.initialSets)&&Number(p.initialSets)>=1&&Number(p.initialSets)<=MAX_MAIN_SETS?Number(p.initialSets):3;
    setCount(String(n));setMain(Array.from({length:n},()=>({weight:p.initialWeight||(basis==='added'?'0':''),reps:p.initialReps||'10',rir:null})));
  },[p.active,p.initialWeight,p.initialReps,p.initialSets,basis]);
  if(!p.active)return null;
  const candidate=parseAdvancedWorkout(p.exerciseId,main,drops);
  const changeCount=(value:string)=>{
    setError('');
    if(/^\d+$/.test(value)&&Number(value)>=1&&Number(value)<=MAX_MAIN_SETS){
      const n=Number(value);
      if(drops.some(d=>d.afterSet>=n)){setError('advanced.error.orphan');return;}
      setMain(old=>Array.from({length:n},(_,i)=>old[i]??{...(old[old.length-1]??{weight:'',reps:'10',rir:null})}));
    }
    setCount(value);
  };
  const save=()=>{
    if(!candidate||Number(count)!==main.length||!/^\d+$/.test(count)) {setError('advanced.error.input');return;}
    const first=candidate.main[0];
    addLog({name:p.name,weight:first.weight,reps:first.reps,sets:candidate.main.length,location:'gym',
      loadType:advancedLoadType(p.exerciseId,first.weight),advanced:candidate});
    setError('');Alert.alert(t('記録しました'),t('advanced.saved'));
  };
  const stage=(draft:SetDraft,label:string,onChange:(value:SetDraft)=>void)=>{
    const parsed=parseAdvancedWorkout(p.exerciseId,[draft],[]);
    return <View style={styles.fields}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.field}><Body>{t(`advanced.weight.${basis}`)}</Body><Field accessibilityLabel={t('advanced.weight.label',{0:label})} keyboardType="decimal-pad" value={draft.weight} onChangeText={weight=>{setError('');onChange({...draft,weight});}}/></View>
        <View style={styles.field}><Body>{t('advanced.reps')}</Body><Field accessibilityLabel={t('advanced.reps.label',{0:label})} keyboardType="number-pad" value={draft.reps} onChangeText={reps=>{setError('');onChange({...draft,reps});}}/></View>
      </View>
      <Text style={styles.note}>{t('advanced.rir.title')}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('advanced.rir.label',{0:label})}>
        {([null,0,1,2,3,4] as const).map(value=><Pressable key={String(value)} accessibilityRole="radio" accessibilityLabel={t(value===null?'advanced.rir.clearLabel':'advanced.rir.choiceLabel',{0:label,1:value??''})}
          accessibilityState={{checked:draft.rir===value}} aria-checked={draft.rir===value} onPress={()=>onChange({...draft,rir:value})} style={[styles.rir,draft.rir===value&&styles.selected]}>
          <Text style={styles.text}>{value===null?t('advanced.rir.unknown'):t(value===4?'advanced.rir.more':'advanced.rir.value',{0:value})}</Text>
        </Pressable>)}
      </View>
      {parsed&&<SetLoadMetric exerciseId={p.exerciseId} set={parsed.main[0]}/>}
    </View>;
  };
  return <Card>
    <View testID="advanced-workout-logger" style={styles.fields}>
      <Heading>{t('advanced.record.title')}</Heading>
      <Body>{t('advanced.main.count')}</Body>
      <Field accessibilityLabel={t('advanced.main.count')} keyboardType="number-pad" value={count} onChangeText={changeCount}/>
      {main.map((draft,index)=><View key={index} style={styles.stage}>
        {stage(draft,t('advanced.main.number',{0:index+1}),value=>setMain(old=>old.map((s,i)=>i===index?value:s)))}
      </View>)}
      <Heading>{t('advanced.drop.title')}</Heading>
      <Text style={styles.note}>{t(basis==='assistance'?'advanced.drop.assistance':'advanced.drop.hint')}</Text>
      {drops.map((draft,index)=><View key={index} style={styles.stage}>
        <Text style={styles.note}>{t('advanced.drop.parent')}</Text>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('advanced.drop.parentLabel',{0:index+1})}>
          {main.map((_,i)=><Pressable key={i} accessibilityRole="radio" accessibilityLabel={t('advanced.drop.attach',{0:index+1,1:i+1})} accessibilityState={{checked:draft.afterSet===i}} aria-checked={draft.afterSet===i}
            onPress={()=>{setError('');setDrops(old=>old.map((s,j)=>j===index?{...s,afterSet:i}:s));}} style={[styles.rir,draft.afterSet===i&&styles.selected]}><Text style={styles.text}>{t('advanced.main.number',{0:i+1})}</Text></Pressable>)}
        </View>
        {stage(draft,t('advanced.drop.stage',{0:index+1}),value=>setDrops(old=>old.map((s,i)=>i===index?{...s,...value}:s)))}
        <Button title={t('advanced.drop.remove',{0:index+1})} variant="quiet" onPress={()=>{setError('');setDrops(old=>old.filter((_,i)=>i!==index));}}/>
      </View>)}
      <Button title={t('advanced.drop.add')} variant="quiet" disabled={drops.length>=MAX_DROP_SETS||main.length===0} onPress={()=>{setError('');setDrops(old=>[...old,{afterSet:main.length-1,weight:'',reps:'',rir:null}]);}}/>
      {candidate?<AdvancedWorkoutSummary workout={candidate}/>:<Body>{t('advanced.volume.pending')}</Body>}
      {error!==''&&<Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>}
      <Button title={t('advanced.record.save')} onPress={save}/>
    </View>
  </Card>;
}
const styles=StyleSheet.create({fields:{gap:10},label:{fontSize:14,lineHeight:22,color:colors.primary,fontWeight:'600'},text:{fontSize:12,lineHeight:20,color:colors.text},note:{fontSize:12,lineHeight:20,color:colors.muted},row:{flexDirection:'row',flexWrap:'wrap',gap:6},field:{flexGrow:1,flexBasis:'45%'},stage:{borderWidth:1,borderColor:colors.border,padding:12,borderRadius:10,gap:8},rir:{minWidth:48,minHeight:48,padding:7,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border,borderRadius:8},selected:{backgroundColor:'#edf3f5',borderColor:colors.primary},error:{fontSize:13,lineHeight:21,color:'#974332'}});
