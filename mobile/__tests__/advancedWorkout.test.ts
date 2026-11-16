import { AdvancedWorkout, advancedLoadType, effortKey, isAdvancedWorkout, loadBasis, parseAdvancedWorkout, setVolume, workoutVolume } from "../src/domain/advancedWorkout";
import { decodeFitnessData, initialFitnessData } from "../src/domain/fitnessStorage";
import { MOTION_TYPES } from "../src/domain/exerciseMotion";
import { proTraining } from "../src/domain/proTraining";
import { translate } from "../src/i18n";
const plan=():AdvancedWorkout=>({version:1,exerciseId:'chest-press',main:[{weight:45,reps:10,rir:2},{weight:40,reps:8,rir:1}],drops:[{afterSet:1,weight:25,reps:6,rir:0}]});
test('different main weights and attached drop stages contribute exactly once without changing inputs',()=>{
  const p=plan(),before=JSON.stringify(p);expect(isAdvancedWorkout(p)).toBe(true);
  expect(workoutVolume(p)).toEqual({main:770,drops:150,total:920,reps:24});expect(JSON.stringify(p)).toBe(before);
  expect(setVolume('dumbbell-heavy',{weight:20,reps:10})).toBe(400);
  expect(setVolume('chest-press',{weight:20,reps:10})).toBe(200);
});
test('bodyweight and assistance never become invented muscle-force estimates',()=>{
  expect(loadBasis('assisted-pull-up')).toBe('assistance');expect(loadBasis('chest-dip')).toBe('added');
  expect(setVolume('assisted-pull-up',{weight:40,reps:10})).toBeNull();
  expect(setVolume('chest-dip',{weight:0,reps:10})).toBeNull();
  expect(setVolume('chest-dip',{weight:10,reps:10})).toBe(100);
  const p={...plan(),exerciseId:'assisted-pull-up',main:[{weight:30,reps:8,rir:1}],drops:[{afterSet:0,weight:40,reps:6,rir:0}]};
  expect(isAdvancedWorkout(p)).toBe(true);expect(workoutVolume(p).total).toBeNull();
  p.drops[0].weight=20;expect(isAdvancedWorkout(p)).toBe(false);
});
test('drop chains must reduce resistance relative to their own preceding main or drop stage',()=>{
  const p=plan();p.drops.push({afterSet:0,weight:30,reps:8,rir:1},{afterSet:1,weight:20,reps:5,rir:null});
  expect(isAdvancedWorkout(p)).toBe(true);
  p.drops[2].weight=26;expect(isAdvancedWorkout(p)).toBe(false);
  p.drops[2].weight=25;expect(isAdvancedWorkout(p)).toBe(false);
  p.drops[2].weight=0;expect(isAdvancedWorkout(p)).toBe(true);
});
test.each([
  (p:AdvancedWorkout)=>{p.main[0].weight=Infinity;},(p:AdvancedWorkout)=>{p.main[0].reps=1.5;},
  (p:AdvancedWorkout)=>{p.main[0].rir=5;},(p:AdvancedWorkout)=>{p.drops[0].afterSet=9;},
  (p:AdvancedWorkout)=>{p.drops[0].afterSet=-1;},(p:AdvancedWorkout)=>{p.drops[0].afterSet=.5;},
  (p:AdvancedWorkout)=>{p.main=[];},(p:AdvancedWorkout)=>{p.main=Array.from({length:21},()=>p.main[0]);},
  (p:AdvancedWorkout)=>{p.exerciseId='constructor';},(p:AdvancedWorkout)=>{p.main[0].rir=NaN;},
])('rejects invalid raw plan case %#',mutate=>{const p=plan();mutate(p);expect(isAdvancedWorkout(p)).toBe(false);});
test('draft parsing rejects empty/exponent/fractional count values and preserves unknown reserve',()=>{
  const draft={weight:'45.5',reps:'10',rir:null};expect(parseAdvancedWorkout('chest-press',[draft],[])?.main[0]).toEqual({weight:45.5,reps:10,rir:null});
  for(const weight of ['', 'NaN','Infinity','1e2','-1'])expect(parseAdvancedWorkout('chest-press',[{...draft,weight}],[])).toBeNull();
  for(const reps of ['','0','1.5','101'])expect(parseAdvancedWorkout('chest-press',[{...draft,reps}],[])).toBeNull();
  expect(effortKey(null)).toBe('advanced.effort.unknown');expect(effortKey(0)).toBe('advanced.effort.limit');
});
test('old fitness versions remain readable and new per-set data survives a complete encode/decode roundtrip',()=>{
  const advanced=plan(),log={id:'advanced',date:'2026-11-16T03:00:00.000Z',name:'chest.press.name',weight:45,reps:10,sets:2,location:'gym' as const,loadType:advancedLoadType(advanced.exerciseId,45),advanced};
  const old={id:'legacy',date:'2026-11-15T03:00:00.000Z',name:'legacy',weight:20,reps:10,sets:3,location:'home' as const,loadType:'dumbbell' as const};
  for(const version of [1,2,3,4]){const d={...initialFitnessData(),version,logs:[old]};expect(decodeFitnessData(JSON.stringify(d)).logs).toEqual([old]);}
  const data={...initialFitnessData(),logs:[log,old]};expect(decodeFitnessData(JSON.stringify(data))).toEqual(data);
  for(const override of [{weight:44},{reps:9},{sets:3},{location:'home'},{loadType:'band'}])expect(()=>decodeFitnessData(JSON.stringify({...data,logs:[{...log,...override}]}))).toThrow();
});
test('all 28 loaded-position and intensification cues resolve independently in Japanese and English',()=>{
  for(const id of MOTION_TYPES)for(const language of ['ja','en'] as const){
    const p=proTraining(id)!;
    for(const key of [p.position,p.intensify]){const text=translate(language,key);expect(text).not.toBe(key);expect(text.length).toBeGreaterThan(20);expect(text.normalize('NFKC')).not.toMatch(language==='ja'?/\p{Script=Latin}/u:/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);}
  }
});
