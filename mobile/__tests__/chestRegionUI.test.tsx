import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ExerciseDiagram } from "../src/components/ExerciseDiagram";
import { LocaleProvider, translate } from "../src/i18n";
jest.mock("../src/components/Motion3DView",()=>({Motion3DView:(props:any)=>{
 require('react').useEffect(()=>props.onReady(),[props.onReady]);
 return require('react').createElement(require('react-native').View,{testID:'region-model',accessibilityLabel:JSON.stringify({focus:props.focus,muscle:props.muscle,view:props.view})});
}}));
test.each(['ja','en'] as const)('%s: region inspection remains available in simple and detailed modes, then hides with colour/SVG',async language=>{
 const t=(key:string)=>translate(language,key);
 await render(<LocaleProvider language={language} setLanguage={()=>{}}><ExerciseDiagram type="chest-press" muscleTag="胸" beginner/></LocaleProvider>);
 expect(screen.getByTestId('chest-region-legend')).toBeTruthy();
 await fireEvent.press(screen.getByRole('button',{name:t('regions.chestUpper')}));
 expect(screen.getByRole('button',{name:t('regions.chestUpper')}).props['aria-pressed']).toBe(true);
 expect(JSON.parse(screen.getByTestId('region-model').props.accessibilityLabel)).toEqual({focus:'muscles',muscle:'upperChest',view:'front'});
 await fireEvent.press(screen.getByRole('button',{name:t('learn.advanced')}));
 expect(screen.getByTestId('chest-region-legend')).toBeTruthy();
 await fireEvent.press(screen.getByRole('button',{name:t('regions.chestLower')}));
 expect(JSON.parse(screen.getByTestId('region-model').props.accessibilityLabel).muscle).toBe('chest');
 await fireEvent.press(screen.getByRole('button',{name:t('muscle.toggle')}));
 expect(screen.queryByTestId('chest-region-legend')).toBeNull();
 await fireEvent.press(screen.getByRole('button',{name:t('muscle.toggle')}));
 expect(screen.getByTestId('chest-region-legend')).toBeTruthy();
 await fireEvent.press(screen.getByRole('radio',{name:t('scene.diagram')}));
 expect(screen.queryByTestId('chest-region-legend')).toBeNull();
});
