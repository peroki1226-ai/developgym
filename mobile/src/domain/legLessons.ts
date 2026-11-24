import type { MotionType, MotionFrame } from './exerciseMotion';
import { clampProgress } from './exerciseMotion';
export type LegLesson={id:MotionType;prefix:string;startsStanding:boolean};
export const LEG_LESSONS:readonly LegLesson[]=[
  {id:"power-rack",prefix:"leg.squat",startsStanding:true},
  {id:"smith-squat",prefix:"leg.smith",startsStanding:true},
  {id:"leg-press",prefix:"leg.press",startsStanding:false},
  {id:"leg-extension",prefix:"leg.extension",startsStanding:false},
  {id:"seated-calf-raise",prefix:"leg.calf",startsStanding:false},
  {id:"hip-adduction",prefix:"leg.adduction",startsStanding:false},
  {id:"hack-squat",prefix:"leg.hack",startsStanding:true},
];
export const legLesson=(id:string)=>LEG_LESSONS.find(l=>l.id===id);
export function legCyclePosition(type:string,frame:MotionFrame,completed=false){
 if(completed)return 1;
 return legLesson(type)?.startsStanding ? frame.phase==="return"?(1-frame.progress)/2:frame.phase==="hold"?0:.5+frame.progress/2 : frame.phase==="return"?1-frame.progress/2:frame.progress/2;
}
export function legCyclePose(type:string,value:number){
 const t=clampProgress(value),standing=legLesson(type)?.startsStanding??false;
 return {progress:standing?Math.abs(2*t-1):1-Math.abs(2*t-1),direction:(standing?t<.5:t>.5)?"return" as const:"work" as const,completed:t===1};
}
export const LEG_MENU_GUIDES:Readonly<Record<string,string>>={"m-squat":"power-rack","m-smith-squat":"smith-squat","m-leg-press":"leg-press","m-leg-extension":"leg-extension","m-calf-raise":"seated-calf-raise","m-adduction":"hip-adduction","m-hack-squat":"hack-squat"};
