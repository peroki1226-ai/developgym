import type {EquipmentItem} from './equipment';
import {LEG_LESSONS} from '../domain/legLessons';
/** Existing IDs preserve stored records and favourite/matching references. */
export const LEG_EQUIPMENT:EquipmentItem[]=LEG_LESSONS.map(lesson=>{
 const key=(field:string)=>`${lesson.prefix}.${field}`;
 return {id:lesson.id,svgType:lesson.id,name:key('name'),enName:key('name'),category:key('category'),bodyPart:'legs',bodyPartLabel:key('target'),
 primaryMuscles:[key('target')],secondaryMuscles:[key('secondary')],muscleTag:key('target'),pof:key('action'),summary:key('summary'),seatSetup:key('setup'),
 beginnerSteps:[key('start'),key('work'),key('return')],ngPoints:[key('wrong1'),key('wrong2')],startWeightMale:key('load'),startWeightFemale:key('load'),
 proBiomechanics:key('why'),proAnatomy:key('target'),proVariations:[key('tip1'),key('tip2')],builderTip:key('tip2')};
});
