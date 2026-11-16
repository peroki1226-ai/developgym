import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TrainingScreen } from "../src/screens/TrainingScreen";
import { FitnessProvider } from "../src/state";
import { Language, LocaleProvider, translate } from "../src/i18n";
import { EQUIPMENTS } from "../src/data/equipment";
import { FITNESS_STORAGE_KEY } from "../src/domain/fitnessStorage";
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("../src/components/Motion3DView", () => ({ Motion3DView: (props:any) => {
  require("react").useEffect(()=>props.onReady(),[props.onReady]);
  return require("react").createElement(require("react-native").View,{testID:"ready-pro-model"});
}}));
jest.setTimeout(25000);
const view=(language:Language)=><FitnessProvider><LocaleProvider language={language} setLanguage={()=>{}}><TrainingScreen/></LocaleProvider></FitnessProvider>;
const absentTheory=(language:Language)=>{
  expect(screen.queryByTestId('muscle-live-caption')).toBeNull();
  expect(screen.queryByTestId('muscle-contraction-panel')).toBeNull();
  expect(screen.queryByTestId('muscle-quick-cue')).toBeNull();
  expect(screen.queryByTestId('chest-anatomy-state')).toBeNull();
  expect(screen.queryByRole('button',{name:translate(language,'coach.details')})).toBeNull();
  expect(screen.queryByText(translate(language,'生体力学（Biomechanics）'))).toBeNull();
  expect(screen.queryByText(translate(language,'解剖学的ターゲット'))).toBeNull();
};

test.each(['ja','en'] as const)('%s: all 28 exercises omit theory in the actual pro mode and keep training controls',async language=>{
  const t=(key:string)=>translate(language,key);
  await render(view(language));
  await screen.findByText(t('Move with intent.'));
  await fireEvent.press(screen.getByRole('button',{name:t('⚡ 本格モード（生体力学）')}));
  await fireEvent.press(screen.getByRole('button',{name:t('guide.changeMachine')}));
  for(const equipment of EQUIPMENTS){
    await fireEvent.press(screen.getByRole('button',{name:t(equipment.name)}));
    absentTheory(language);
    expect(screen.getByTestId('pro-training-coach')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button',{name:t('advanced.model.open')}));
    expect(screen.getByRole('button',{name:t('motion.play')})).toBeTruthy();
    expect(screen.getByRole('radio',{name:t('motion.extraSlow')})).toBeTruthy();
    await fireEvent.press(screen.getByRole('button',{name:t('muscle.toggle')}));
    await fireEvent.press(screen.getByRole('button',{name:t('muscle.toggle')}));
    absentTheory(language);
    expect(screen.getByRole('button',{name:t('advanced.record.save')})).toBeTruthy();
  }
});
test.each(['ja','en'] as const)('%s: switching modes preserves beginner explanations, practical advice and workout inputs',async language=>{
  jest.spyOn(Alert,'alert').mockImplementation(()=>{});
  const t=(key:string)=>translate(language,key);
  await render(view(language));await screen.findByText(t('Move with intent.'));
  await fireEvent.changeText(screen.getByLabelText(t('重量kg')),'45');
  await fireEvent.press(screen.getByRole('button',{name:t('learn.advanced')}));
  expect(screen.getByTestId('muscle-live-caption')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button',{name:t('coach.details')}));
  expect(screen.getByTestId('muscle-contraction-panel')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button',{name:t('⚡ 本格モード（生体力学）')}));
  absentTheory(language);
  await fireEvent.press(screen.getByRole('button',{name:t('advanced.model.open')}));
  await fireEvent.press(screen.getByRole('button',{name:t('motion.endPose')}));
  expect(screen.getByRole('adjustable').props.accessibilityValue.now).toBe(100);
  await fireEvent.press(screen.getByRole('button',{name:t('press.seat.title')}));
  expect(screen.getByRole('radio',{name:t('press.seat.standard.label')})).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab',{name:t('pro.tab.finish')}));
  await fireEvent.press(screen.getByRole('radio',{name:t('pro.reserve.0')}));
  expect(screen.getByTestId('pro-effort-advice')).toBeTruthy();
  absentTheory(language);
  await fireEvent.press(screen.getByRole('button',{name:t('🔰 初心者モード')}));
  await fireEvent.press(screen.getByRole('button',{name:t('learn.advanced')}));
  expect(screen.getByTestId('muscle-live-caption')).toBeTruthy();
  expect(screen.getByLabelText(t('重量kg')).props.value).toBe('45');
  await fireEvent.press(screen.getByRole('button',{name:t('⚡ 本格モード（生体力学）')}));
  await fireEvent.press(screen.getByRole('button',{name:t('advanced.record.save')}));
  await waitFor(async()=>expect(JSON.parse((await AsyncStorage.getItem(FITNESS_STORAGE_KEY))!).logs[0]).toMatchObject({weight:45,reps:10,sets:3,location:'gym'}));
});
