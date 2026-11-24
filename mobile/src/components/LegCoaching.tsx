import React,{useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {LEG_LESSONS,LegLesson} from '../domain/legLessons';
import {useI18n} from '../i18n';
import {Card,Heading,Body,Button,colors} from './ui';
export function LegCoursePicker({selected,onSelect}:{selected:string;onSelect:(id:string)=>void}){
 const {t}=useI18n(),[open,setOpen]=useState(false);
 return <Card><Heading>{t('leg.course.title')}</Heading><Body>{t('leg.course.hint')}</Body>
 <Button title={t('leg.course.choose')} variant="quiet" onPress={()=>setOpen(v=>!v)}/>
 {open&&<View accessibilityRole="radiogroup" accessibilityLabel={t('leg.course.title')} style={styles.stack}>
 {LEG_LESSONS.map((lesson,i)=><Pressable key={lesson.id} accessibilityRole="radio" accessibilityLabel={t('leg.course.select',{0:t(`${lesson.prefix}.name`)})} accessibilityState={{checked:selected===lesson.id}} aria-checked={selected===lesson.id} onPress={()=>{onSelect(lesson.id);setOpen(false)}} style={[styles.choice,selected===lesson.id&&styles.selected]}>
 <Text style={styles.number}>{i+1}</Text><Text style={styles.text}>{t(`${lesson.prefix}.name`)}</Text><Text>{selected===lesson.id?'✓':'›'}</Text></Pressable>)}
 </View>}</Card>;
}
const tabs=['target','focus','cautions','tips'] as const;
export function LegCoachingPanel({lesson}:{lesson:LegLesson}){
 const {t}=useI18n(),[tab,setTab]=useState<typeof tabs[number]>('target'),text=(field:string)=>t(`${lesson.prefix}.${field}`);
 return <Card><View accessibilityRole="tablist" style={styles.tabs}>
 {tabs.map(value=><Pressable key={value} accessibilityRole="tab" accessibilityLabel={t(`leg.tab.${value}`)} accessibilityState={{selected:tab===value}} aria-selected={tab===value} onPress={()=>setTab(value)} style={[styles.tab,tab===value&&styles.selected]}><Text style={styles.text}>{t(`leg.tab.${value}`)}</Text></Pressable>)}
 </View><View testID="leg-coaching-content" accessibilityLiveRegion="polite" style={styles.stack}>
 {tab==='target'&&<><Heading>{t('leg.primary')}</Heading><Body>{text('target')}</Body><Body>{text('why')}</Body><Heading>{t('leg.secondary')}</Heading><Body>{text('secondary')}</Body></>}
 {tab==='focus'&&[1,2].map(i=><Body key={i}>{i}. {text(`focus${i}`)}</Body>)}
 {tab==='cautions'&&<>{[1,2].map(i=><View key={i} style={styles.stack}><Text style={styles.wrong}>× {t('leg.wrong')}</Text><Body>{text(`wrong${i}`)}</Body><Text style={styles.correct}>✓ {t('leg.correct')}</Text><Body>{text(`fix${i}`)}</Body></View>)}<Body>{t('leg.safe')}</Body></>}
 {tab==='tips'&&<><Body>{text('tip1')}</Body><Body>{text('tip2')}</Body><Body>{text('load')}</Body><Body>{text('record')}</Body></>}
 </View></Card>;
}
const styles=StyleSheet.create({stack:{gap:10,marginTop:10},tabs:{flexDirection:'row',flexWrap:'wrap',gap:8},tab:{minHeight:48,flexBasis:'46%',flexGrow:1,justifyContent:'center',alignItems:'center',padding:10,borderWidth:1,borderColor:colors.border,borderRadius:10},choice:{minHeight:52,flexDirection:'row',alignItems:'center',gap:12,padding:12,borderWidth:1,borderColor:colors.border,borderRadius:10},selected:{backgroundColor:'#edf3f5',borderColor:colors.primary},number:{color:colors.primary,fontWeight:'600'},text:{color:colors.text,fontSize:13,flexShrink:1},wrong:{color:'#8f4638'},correct:{color:colors.success}});
