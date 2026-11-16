import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import App from "../App";
import { ChestSetupGuide } from "../src/components/ChestSetupGuide";
import { Language, LocaleProvider, translate } from "../src/i18n";
import ja from "../src/i18n/ja.json";
import en from "../src/i18n/en.json";
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
const examples = [
  ["dumbbell-heavy","chest.db"], ["pec-fly","chest.fly"], ["incline-hammer-press","chest.hammer"],
  ["incline-bench-press","chest.inclineSmith"], ["barbell-bench-press","chest.bench"],
  ["cable-machine","chest.cable"], ["chest-dip","chest.dip"],
] as const;
const view = (type:string, language:Language) => <LocaleProvider language={language} setLanguage={()=>{}} syncDocument={false}><ChestSetupGuide type={type}/></LocaleProvider>;

test.each(["ja","en"] as const)("%s: all seven additional chest guides expose equipment-specific setup and emphasis without language mixing", async language => {
  const t = (key:string)=>translate(language,key);
  for(const [type,prefix] of examples){
    const ui = await render(view(type,language));
    const title=`${prefix}.settings.title`;
    expect(ui.getByRole("button",{name:t(title)}).props.accessibilityState.expanded).toBe(false);
    expect(ui.getByText(t(`${prefix}.settings.summary`))).toBeTruthy();
    await fireEvent.press(ui.getByRole("button",{name:t(title)}));
    for(const suffix of ['fit','emphasis','check']) expect(ui.getByText(t(`${prefix}.settings.${suffix}`))).toBeTruthy();
    expect(ui.queryAllByRole('radio').length).toBe(type==='dumbbell-heavy'||type==='incline-bench-press'?4:0);
    await ui.unmount();
  }
  for(const [key,value] of Object.entries(language==='ja'?ja:en).filter(([key])=>key.startsWith('chest.angle.')||key.includes('.settings.')||key.startsWith('chest.settings.'))){
    expect(value).not.toBe(key);
    expect(value.normalize('NFKC')).not.toMatch(language==='ja'?/\p{Script=Latin}/u:/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u);
  }
});
test.each([
  ["dumbbell-heavy","chest.db","ja"], ["dumbbell-heavy","chest.db","en"],
  ["incline-bench-press","chest.inclineSmith","ja"], ["incline-bench-press","chest.inclineSmith","en"],
] as const)("%s/%s/%s: angle comparisons explain changing chest and shoulder involvement and reopen without losing selection", async(type,prefix,language)=>{
  const t=(key:string)=>translate(language,key);
  await render(view(type,language));
  const toggle=()=>screen.getByRole('button',{name:t(`${prefix}.settings.title`)});
  await fireEvent.press(toggle());
  expect(screen.getByRole('radio',{name:t('chest.angle.low.label')}).props.accessibilityState.checked).toBe(true);
  for(const id of ['flat','low','mid','high']){
    await fireEvent.press(screen.getByRole('radio',{name:t(`chest.angle.${id}.label`)}));
    expect(screen.getByRole('image',{name:t(`chest.angle.${id}.image`)})).toBeTruthy();
    expect(screen.getByText(t(`chest.angle.${id}.effect`))).toBeTruthy();
    expect(screen.getByText(t('chest.angle.limit'))).toBeTruthy();
  }
  await fireEvent.press(toggle()); expect(screen.queryByRole('radiogroup')).toBeNull();
  await fireEvent.press(toggle());
  expect(screen.getByRole('radio',{name:t('chest.angle.high.label')}).props.accessibilityState.checked).toBe(true);
});
test("language changes preserve comparison state; changing exercise resets the new guide", async()=>{
  const {rerender}=await render(view('dumbbell-heavy','ja'));
  await fireEvent.press(screen.getByRole('button',{name:translate('ja','chest.db.settings.title')}));
  await fireEvent.press(screen.getByRole('radio',{name:translate('ja','chest.angle.mid.label')}));
  await rerender(view('dumbbell-heavy','en'));
  expect(screen.getByRole('radio',{name:translate('en','chest.angle.mid.label')}).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole('image',{name:translate('en','chest.angle.mid.image')})).toBeTruthy();
  await rerender(view('incline-bench-press','en'));
  expect(screen.getByRole('button',{name:translate('en','chest.inclineSmith.settings.title')}).props.accessibilityState.expanded).toBe(false);
  await fireEvent.press(screen.getByRole('button',{name:translate('en','chest.inclineSmith.settings.title')}));
  expect(screen.getByRole('radio',{name:translate('en','chest.angle.low.label')}).props.accessibilityState.checked).toBe(true);
});
test("non-chest exercises have no setup comparison and chest press retains its existing seat panel", async()=>{
  const {rerender}=await render(view('lat-pulldown','ja'));
  expect(screen.queryByTestId('chest-equipment-setup')).toBeNull();
  expect(screen.queryByTestId('chest-press-seat-guide')).toBeNull();
  await rerender(view('chest-press','ja'));
  expect(screen.getByTestId('chest-press-seat-guide')).toBeTruthy();
  expect(screen.queryByTestId('chest-equipment-setup')).toBeNull();
});
test("the real incline Smith guide keeps angle information through beginner/advanced mode changes and returns to flat-bench-specific guidance", async()=>{
  const t=(key:string)=>translate('ja',key);
  await render(<App/>); await screen.findByText('理想のジムを探そう。');
  await fireEvent.press(screen.getByRole('button',{name:t('guide.open')}));
  await fireEvent.press(screen.getByRole('button',{name:t('guide.changeMachine')}));
  await fireEvent.press(screen.getByRole('button',{name:t('chest.inclineSmith.name')}));
  await fireEvent.press(screen.getByRole('button',{name:t('chest.inclineSmith.settings.title')}));
  await fireEvent.press(screen.getByRole('radio',{name:t('chest.angle.high.label')}));
  await fireEvent.press(screen.getByRole('button',{name:t('learn.advanced')}));
  expect(screen.getByRole('radio',{name:t('chest.angle.high.label')}).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(screen.getByRole('button',{name:t('chest.bench.name')}));
  await fireEvent.press(screen.getByRole('button',{name:t('chest.bench.settings.title')}));
  expect(screen.getByText(t('chest.bench.settings.fit'))).toBeTruthy();
  expect(screen.queryByRole('radio',{name:t('chest.angle.low.label')})).toBeNull();
});
