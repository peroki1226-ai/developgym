import { legLesson, legCyclePose, legCyclePosition } from "../domain/legLessons";
import { ChestRegionTargets } from "./ChestRegionTargets";
import { GuideCameraControls } from "./GuideCameraControls";
import { OrbitGesture } from "./OrbitGesture";
import { Orbit, DEFAULT_GUIDE_ZOOM, orbitForView } from "../domain/guideCamera";
import { MotionScrubber } from "./MotionScrubber";
import { ChestLiveLesson } from "./ChestLiveLesson";
import { ChestSetupGuide } from "./ChestSetupGuide";
import { ProTrainingCoach } from "./ProTrainingCoach";
import { chestCyclePose, chestCyclePosition } from "../domain/chestMotion";
import { chestLesson } from "../domain/chestLessons";
import { guidePose } from "../domain/photoChestProjection";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg from "react-native-svg";
import { useI18n } from "../i18n";
import {
  exercisePose,
  motionAction,
  motionType,
  PLAYBACK_SPEEDS,
} from "../domain/exerciseMotion";
import { motionTeaching } from "../domain/motionTeaching";
import { useExerciseMotion } from "../hooks/useExerciseMotion";
import { ExerciseMotionScene } from "./ExerciseMotionScene";
import { MotionJointDetail } from "./MotionJointDetail";
import { MuscleContractionPanel } from "./MuscleContractionPanel";
import { MuscleLengthCoach } from "./MuscleLengthCoach";
import { Motion3DView } from "./Motion3DView";
import { Focus3, View3, LegPressVariant, ChestPressVariant, dipFinishAmount } from "../domain/training3d";
import { MuscleQuickCue } from "./MuscleQuickCue";
import { Muscle, muscleSpec } from "../domain/muscleMotion";
import { rearMuscles } from "../domain/muscleLoad";
import { MotionCue } from "./MotionCue";
import { Button, colors } from "./ui";
import { BeginnerGuideData, BeginnerMachineSteps, BeginnerSetupNotes, LEARNING_STEPS, LearningStep } from "./BeginnerMachineSteps";

type Props = {
  type: string;
  muscleTag: string;
  compact?: boolean;
  label?: string;
  active?: boolean;
  beginner?: boolean;
  beginnerGuide?: BeginnerGuideData;
  /** Hide theory in the global pro mode while keeping model/colour controls. */
  showMuscleExplanations?: boolean;
  showProCoach?: boolean;
};
export function ExerciseDiagram(props: Props) {
  if (props.compact)
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg viewBox="0 0 120 96" style={{ width: "100%", height: 68 }}>
          <ExerciseMotionScene type={props.type} progress={0} />
        </Svg>
      </View>
    );
  return <MotionDiagram {...props} />;
}
function MotionDiagram({ type, muscleTag, label, active = true, beginner = false, beginnerGuide, showMuscleExplanations = true, showProCoach = true }: Props) {
  const { t, language } = useI18n();
  const leg = legLesson(type);
  const startProgress = leg?.startsStanding ? 1 : 0;
  const initialView:View3 = type === "seated-calf-raise" ? "side" : "front";
  const { width, fontScale } = useWindowDimensions();
  const motion = useExerciseMotion(active, type, false);
  const [details, setDetails] = useState(true);
  const [anatomy, setAnatomy] = useState(true);
  const [lessonDirection, setLessonDirection] = useState<"work" | "return">(
    "work",
  );
  const [mechanismOpen, setMechanismOpen] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<Muscle>(
    muscleSpec(type).focus,
  );
  const [mode, setMode] = useState<"spatial" | "diagram">("spatial");
  const [view, setView] = useState<View3>(initialView);
  const [orbit,setOrbit]=useState<Orbit>();
  const [zoom,setZoom]=useState(DEFAULT_GUIDE_ZOOM);
  const [rotating,setRotating]=useState(false);
  const chooseView=(value:View3)=>{setView(value);setOrbit(undefined);setTransparent(value === "back" || focus === "muscles");};
  const [focus, setFocus] = useState<Focus3>("whole");
  const [transparent, setTransparent] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [learningStep, setLearningStep] = useState<LearningStep>("posture");
  const [advanced, setAdvanced] = useState(false);
  const controlsVisible = !beginner || advanced;
  const [legPressVariant, setLegPressVariant] = useState<LegPressVariant>("seated");
  const [pressVariant,setPressVariant]=useState<ChestPressVariant>("middle");
  const modelVariant=type==="chest-press"?pressVariant:type==="leg-press"?legPressVariant:undefined;
  const fail = useCallback(() => {
    setFailed(true);
    setRotating(false);
    setReady(false);
    setMode("diagram");
  }, []);
  const loaded = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (mode !== "spatial" || ready) return;
    const timer = setTimeout(fail, 8000);
    return () => clearTimeout(timer);
  }, [mode, ready, fail]);
  useEffect(() => {
    setFocus("whole");
    setView(initialView);setOrbit(undefined);setZoom(DEFAULT_GUIDE_ZOOM);setRotating(false);
    setSelectedMuscle(muscleSpec(type).focus);
    setLessonDirection("work");
    setMechanismOpen(false);
  }, [type]);
  useEffect(() => {
    if (!beginner) { if(leg)motion.seek(startProgress,"work"); return; }
    motion.seek(type === "chest-dip" ? 1 : startProgress, "work");
    if (chestLesson(type) || leg) motion.setSpeed(.5);
    setLearningStep("posture"); setAdvanced(false);
    setFocus("whole"); setView(initialView); setTransparent(false);
  }, [type, beginner]);
  const chooseLearningStep = (step: LearningStep) => {
    motion.seek(type === "chest-dip" && step !== "move" ? 1 : startProgress, "work"); setLearningStep(step);
    setFocus(step === "hands" ? "hands" : step === "feet" ? "feet" : "whole");
    setView((step === "posture" || step === "move") && !["super-fly","incline-bench-press","barbell-bench-press","cable-machine"].includes(type) ? "side" : "front");
    setTransparent(false);
  };
  const inspectLesson = (direction: "work" | "return") => {
    setLessonDirection(direction);
    motion.seek(0.5, direction);
  };
  const selectMuscle = (muscle: Muscle) => {
    setSelectedMuscle(muscle);
    setFocus("muscles");
    setTransparent(true);
    setView(rearMuscles.includes(muscle) ? "back" : "front");
  };
  const [trackWidth, setTrackWidth] = useState(1);
  const pose = guidePose(type, motion.progress, modelVariant);
  const lesson = chestLesson(type);
  const teaching = motionTeaching(type, pose);
  const footHint = ["assisted-pull-up", "assisted-dip"].includes(type) ? "scene.kneeHint"
    : type === "leg-extension" ? "learn.extensionFeet"
    : type === "seated-leg-curl" ? "learn.curlFeet"
    : type === "hip-adduction" ? "learn.adductionFeet"
    : type === "hip-abduction" ? "learn.abductionFeet"
    : type === "back-extension" ? "learn.backExtensionFeet" : "learn.feetHint";
  const phaseStep = motion.phase === "start" ? 0 : motion.phase === "return" ? 2 : 1;
  const phaseInstruction = motion.phase === "hold" ? (lesson ? `${lesson.prefix}.hold` : teaching.holdCue)
    : beginnerGuide?.beginnerSteps[phaseStep] ?? (motion.phase === "start" ? "teaching.start" : motion.phase === "return" ? teaching.returnCue : teaching.workCue);
  const learningHint = leg && learningStep === "hands" ? t(`${leg.prefix}.hands`)
    : leg && learningStep === "feet" ? t(`${leg.prefix}.feet`)
    : learningStep === "posture" ? t("learn.setup", { 0: t(beginnerGuide?.seatSetup ?? "learn.postureHint") })
    : learningStep === "hands" ? t(lesson ? `${lesson.prefix}.hands` : type === "back-extension" ? "scene.crossHandsHint" : "learn.handsHint")
    : learningStep === "feet" ? t(lesson ? `${lesson.prefix}.feet` : footHint) : t(phaseInstruction);
  const guidedChest = beginner && !advanced && !!lesson;
  const guidedLeg = beginner && !advanced && !!leg;
  const legPosition = leg ? legCyclePosition(type,motion,motion.completedRepetition) : 0;
  const legPhase = legPosition<.001||legPosition>.999 ? "start" : Math.abs(legPosition-.5)<.001 ? "hold" : legPosition<.5 ? leg?.startsStanding?"return":"work" : leg?.startsStanding?"work":"return";
  const prepareLegMotion=()=>{
    if(learningStep!=="move"){chooseLearningStep("move");setView(view);}
    setAnatomy(true);
  };
  const playLeg=()=>{
    prepareLegMotion();
    if(motion.running||motion.repetitionActive)motion.toggle();
    else motion.playRepetition(leg?.startsStanding??false);
  };
  const inspectLeg=(value:number)=>{
    prepareLegMotion();const pose=legCyclePose(type,value);setLessonDirection(pose.direction);motion.inspectRepetition(pose.progress,pose.direction,pose.completed);
  };
  const focusChest = () => {
    if (focus === "muscles") { setFocus("whole"); setTransparent(false); }
    else { setSelectedMuscle(muscleSpec(type).focus); setFocus("muscles"); setView(["barbell-bench-press","incline-bench-press","dumbbell-heavy","incline-smith"].includes(type) ? "above" : "front");setOrbit(undefined); setTransparent(true); }
  };
  const prepareChestMotion = () => {
    if (learningStep !== "move") {
      chooseLearningStep("move"); setView(view);
      if (focus === "muscles") {setFocus(focus);setTransparent(true);}
      motion.seek(type === "chest-dip" ? 1 : 0, "work");
    }
    setAnatomy(true);
  };
  const playChest = () => {
    prepareChestMotion();
    if (motion.running || motion.repetitionActive) motion.toggle();
    else motion.playRepetition(type === "chest-dip");
  };
  const inspectChest = (position: number) => {
    prepareChestMotion();
    const pose = chestCyclePose(type, position);
    motion.inspectRepetition(pose.progress, pose.direction, pose.completed);
  };
  const breathing = leg ? legPhase==="start" ? t("learn.breath.start") : legPhase==="hold" ? t("learn.breath.hold") : t(legPhase==="return"?"leg.breathe.return":"leg.breathe.work") : t(`learn.breath.${motion.phase}`);
  const phaseLabel =
    motion.phase === "work"
      ? motionAction[motionType(type)]
      : `motion.${motion.phase}`;
  const cues = [
    t("teaching.start"),
    t(teaching.workCue),
    t(teaching.holdCue),
    t(teaching.returnCue),
  ];
  const activeCue =
    motion.phase === "work"
      ? 1
      : motion.phase === "hold"
        ? 2
        : motion.phase === "return"
          ? 3
          : 0;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.caption}>{t("motion.title")}</Text>
        <Text style={styles.badge}>{t(muscleTag)}</Text>
      </View>
      {beginner && !advanced && <BeginnerMachineSteps step={learningStep} onSelect={chooseLearningStep} hint={learningHint} breathing={learningStep === "move" ? breathing : undefined} />}
      {guidedChest && learningStep !== "move" && <Button title={t("chest.live.watch")} onPress={playChest} disabled={!motion.canPlay} />}
      {controlsVisible && <>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("scene.mode")}
        style={styles.speeds}
      >
        {(["spatial", "diagram"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={t(`scene.${value}`)}
            accessibilityState={{ checked: mode === value }}
            aria-checked={mode === value}
            onPress={() => {
              if (value === mode) return;
              setRotating(false);
              if (value === "spatial") {
                setFailed(false);
                setReady(false);
              }
              setMode(value);
            }}
            style={[styles.speedButton, mode === value && styles.selectedSpeed]}
          >
            <Text style={styles.speedText}>{t(`scene.${value}`)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.speeds}>
        {(["setup", "move", "return"] as const).map((step) => (
          <Pressable
            key={step}
            accessibilityRole="button"
            accessibilityLabel={t(`scene.${step}`)}
            style={styles.speedButton}
            onPress={() =>
              motion.seek(
                step === "setup" ? 0 : step === "move" ? 1 : 0.5,
                step === "return" ? "return" : "work",
              )
            }
          >
            <Text style={styles.speedText}>{t(`scene.${step}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>{t("scene.stepHint")}</Text>

      </>}
      {type === "leg-press" && <View style={styles.speeds} accessibilityRole="radiogroup" accessibilityLabel={t("machine.legPressType")}>
        {(["seated", "incline"] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(`machine.${value}`)} accessibilityState={{ checked: legPressVariant === value }} aria-checked={legPressVariant === value} style={[styles.speedButton, legPressVariant === value && styles.selectedSpeed]} onPress={() => { motion.seek(0); setLegPressVariant(value); }}>
          <Text style={styles.speedText}>{t(`machine.${value}`)}</Text>
        </Pressable>)}
      </View>}
      {mode === "spatial" && <GuideCameraControls type={type} view={view} orbit={orbit} zoom={zoom} rotating={rotating}
        onView={chooseView} onOrbit={setOrbit} onZoom={setZoom} onRotate={()=>setRotating(v=>!v)}
        onFit={()=>{setZoom(1);setFocus("whole");setTransparent(false);}}
        onReset={()=>{setView(initialView);setOrbit(undefined);setZoom(DEFAULT_GUIDE_ZOOM);setRotating(false);setTransparent(focus === "muscles");}}/>}
      {guidedChest && <View style={styles.speeds}>
        <Button title={t(focus === "muscles" ? "anatomy.showWhole" : "anatomy.inspect")} variant="quiet" onPress={focusChest}/>
      </View>}
      {type==='chest-press'&&<View testID="press-position-controls" style={{gap:8}}>
       <Text style={styles.detailTitle}>{t('press.variant.title')}</Text>
       <View accessibilityRole="radiogroup" accessibilityLabel={t('press.variant.title')} style={styles.speeds}>
         {(['upper','middle','lower'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={t('press.variant.'+value)} accessibilityState={{checked:pressVariant===value}} aria-checked={pressVariant===value} style={[styles.speedButton,pressVariant===value&&styles.selectedSpeed]} onPress={()=>{motion.seek(0);setPressVariant(value);setSelectedMuscle(value==='upper'?'upperChest':'chest');setAnatomy(true);setView('side');setOrbit(undefined);}}><Text style={styles.note}>{t('press.variant.'+value)}</Text></Pressable>)}
       </View>
       <Text testID="press-position-cue" style={styles.note}>{t('press.variant.'+pressVariant+'.cue')}</Text>
       <Text style={styles.note}>{t('press.variant.limit')}</Text>
     </View>}
      <View
        style={[styles.canvas, mode === "spatial" && styles.spatialCanvas]}
        accessible={!rotating}
        accessibilityRole={rotating?undefined:"image"}
        accessibilityLabel={t("guide.diagramLabel", {
          0: t(label ?? muscleTag),
        })}
      >
        {mode === "spatial" ? (
          <OrbitGesture enabled={rotating} orbit={orbit??orbitForView(view)} zoom={zoom} onOrbit={setOrbit} onZoom={setZoom}>
            <Motion3DView
              type={type}
              variant={modelVariant}
              guidance={guidedChest && learningStep === "move"}
              returning={motion.phase === "return"}
              progress={motion.progress}
              anatomy={anatomy}
              view={view}
              orbit={orbit}
              zoom={zoom}
              focus={focus}
              transparent={transparent}
              muscle={focus === "muscles" || ["leg-press", "leg-extension", "hip-adduction"].includes(type) ? selectedMuscle : undefined}
              onReady={loaded}
              onFailure={fail}
            />
            {!ready && (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.note}>{t("scene.loading")}</Text>
              </View>
            )}
          </OrbitGesture>
        ) : (
          <Svg viewBox="0 0 120 96" style={styles.svg}>
            <ExerciseMotionScene
              type={type}
              variant={modelVariant}
              progress={motion.progress}
              details={details}
              guidance={guidedChest && learningStep === "move"}
              returning={motion.phase === "return" || motion.phase === "hold"}
              anatomy={anatomy}
              selectedMuscle={focus === "muscles" ? selectedMuscle : undefined}
            />
          </Svg>
        )}
        {showMuscleExplanations && guidedChest && lesson && anatomy && <View testID="chest-anatomy-overlay" pointerEvents="none" style={anatomyStyles.overlay}>
          <Text style={anatomyStyles.target}>{t("anatomy.target",{0:type==="chest-press"?t("targets.region."+pressVariant):t(`${lesson.prefix}.target`)})}</Text>
          <Text testID="chest-anatomy-state" style={anatomyStyles.state}>{t(motion.progress < .03 ? "anatomy.long" : motion.progress > .97 ? "anatomy.short" : motion.phase === "return" ? "anatomy.lengthening" : "anatomy.shortening")}</Text>
          {type === "chest-dip" && dipFinishAmount(motion.progress)>.05 && motion.phase !== "return" && <Text testID="dip-attention-caption" style={styles.note}>{t("dip.finish.marker")}</Text>}
        </View>}
        {showMuscleExplanations && anatomy && ["leg-press", "leg-extension", "hip-adduction"].includes(type) && <MuscleQuickCue muscle={selectedMuscle} progress={motion.progress} returning={motion.phase === "return"} />}
        {beginner && !advanced && learningStep === "move" && <View pointerEvents="none" testID="beginner-phase-overlay" style={styles.phaseOverlay}>
          <Text testID={leg?"leg-phase-caption":undefined} style={styles.detailTitle}>{t(`learn.phase.${leg?legPhase:motion.phase}`)}</Text>
          <Text style={styles.note}>{breathing}</Text>
        </View>}
      </View>
      {showMuscleExplanations && guidedLeg && leg && <View testID="leg-model-manual-scrubber" style={{gap:8}}>
        <Text style={styles.detailTitle}>{t("leg.live.title")}</Text>
        <Text style={styles.note}>{t(`${leg.prefix}.target`)}</Text>
        <MotionScrubber value={legCyclePosition(type,motion,motion.completedRepetition)} label={t("leg.live.scrub")} onChange={inspectLeg}/>
        <Text style={styles.note}>{t("leg.live.drag")}</Text>
        <Button title={t(motion.running?"leg.live.pause":legCyclePosition(type,motion,motion.completedRepetition)>0&&legCyclePosition(type,motion,motion.completedRepetition)<1?"leg.live.resume":"leg.live.play")} onPress={playLeg} disabled={!motion.canPlay}/>
        <View style={styles.controls}>
          <Button title={t("leg.live.previous")} variant="quiet" onPress={()=>inspectLeg(Math.max(0,legCyclePosition(type,motion,motion.completedRepetition)-.05))}/>
          <Text style={styles.note}>{Math.round(legCyclePosition(type,motion,motion.completedRepetition)*100)}%</Text>
          <Button title={t("leg.live.next")} variant="quiet" onPress={()=>inspectLeg(Math.min(1,legCyclePosition(type,motion,motion.completedRepetition)+.05))}/>
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel={t("leg.live.speed")} style={styles.speeds}>
          {PLAYBACK_SPEEDS.map(speed=><Pressable key={speed} accessibilityRole="radio" accessibilityLabel={t(`leg.live.speed.${speed}`)} accessibilityState={{checked:motion.speed===speed}} aria-checked={motion.speed===speed} onPress={()=>motion.setSpeed(speed)} style={[styles.speedButton,motion.speed===speed&&styles.selectedSpeed]}><Text style={styles.speedText}>{t(`leg.live.speed.${speed}`)}</Text></Pressable>)}
        </View>
        <Text style={styles.note}>{t("leg.live.note")}</Text>
      </View>}
      {showMuscleExplanations && guidedChest && lesson && <View testID="model-manual-scrubber" style={{ gap: 4 }}>
        <Text style={styles.detailTitle}>{t("chest.live.title")}</Text>
        <MotionScrubber value={chestCyclePosition(type,motion,motion.completedRepetition)} label={t("chest.live.scrub")} onChange={inspectChest}/>
        <Text style={styles.note}>{t("chest.live.drag")}</Text>
      </View>}
      {showMuscleExplanations && guidedChest && lesson && <View testID="model-example-playback">
        <Button title={t(motion.running?"chest.live.pause":chestCyclePosition(type,motion,motion.completedRepetition)>0&&chestCyclePosition(type,motion,motion.completedRepetition)<1?"chest.live.resume":"chest.live.play")} onPress={playChest} disabled={!motion.canPlay}/>
      </View>}
        {mode === "spatial" && anatomy && !!lesson && <View testID="chest-region-legend" style={{ gap: 4, paddingHorizontal: 8 }}>
        <ChestRegionTargets type={type} variant={modelVariant} detailed={showMuscleExplanations}/>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {([['upperChest', 'regions.chestUpper', colors.border], ['chest', 'regions.chestLower', colors.border]] as const).map(([region, key, colour]) => <Pressable key={region} accessibilityRole="button" accessibilityLabel={t(key)} aria-pressed={focus === "muscles" && selectedMuscle === region} accessibilityState={{ selected: focus === "muscles" && selectedMuscle === region }} onPress={() => {
            selectMuscle(region); setOrbit(undefined);
            setView(["barbell-bench-press", "incline-bench-press", "dumbbell-heavy", "incline-smith"].includes(type) ? "above" : "front");
          }} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: colour, borderRadius: 10 }}>
            <Text style={styles.note}>{t(key)}</Text>
          </Pressable>)}
        </View>
        <Text style={styles.note}>{t("regions.identification")}</Text>
      </View>}
      <ChestSetupGuide showIllustrations={false} type={type} pressVariant={pressVariant} onPressVariant={value=>{motion.seek(0);setPressVariant(value);setSelectedMuscle(value==="upper"?"upperChest":"chest");setAnatomy(true);setView("side");setOrbit(undefined);}}/>
      {showMuscleExplanations && guidedChest && lesson && <ChestLiveLesson externalPlayback externalScrubber showIllustrations={false} lesson={lesson} frame={motion} position={chestCyclePosition(type,motion,motion.completedRepetition)}
        running={motion.running} canPlay={motion.canPlay} completed={motion.completedRepetition} reduced={motion.reduced} speed={motion.speed} view={view} externalCamera spatial={mode === "spatial"} focused={focus === "muscles"}
        onPlay={playChest} onSeek={inspectChest} onSpeed={motion.setSpeed}
        onRestart={() => {prepareChestMotion();motion.seek(type === "chest-dip" ? 1 : 0,"work");motion.playRepetition(type === "chest-dip");}}
        onView={chooseView}
        onFocus={focusChest}/>}
      {beginner && !advanced && learningStep === "posture" && beginnerGuide && <BeginnerSetupNotes guide={beginnerGuide} />}
      {beginner && !advanced && <View style={{ gap: 8 }}>

      {guidedChest && learningStep === "move" && <Text style={styles.note}>{t("chest.live.phases")}</Text>}
        {learningStep !== "move" ? <Button title={t("learn.next", { 0: t(`learn.${LEARNING_STEPS[LEARNING_STEPS.indexOf(learningStep) + 1]}`) })} onPress={() => chooseLearningStep(LEARNING_STEPS[LEARNING_STEPS.indexOf(learningStep) + 1])} /> : <>
          <Button title={t(motion.running ? "learn.pause" : "learn.playWork")} disabled={!motion.canPlay} onPress={() => motion.running ? motion.toggle() : motion.playSegment("work")} />
          <Button title={t("learn.playReturn")} disabled={!motion.canPlay || motion.running} variant="quiet" onPress={() => motion.playSegment("return")} />
          <View style={styles.controls}>
            <Button title={t("motion.startPose")} variant="quiet" onPress={() => motion.seek(startProgress, "work")} />
            <Button title={t("motion.endPose")} variant="quiet" onPress={() => motion.seek(1-startProgress, "work")} />
          </View>
          {motion.reduced && !guidedChest && <Text style={styles.note}>{t("motion.reducedHint")}</Text>}
        </>}
      </View>}
      {beginner && <Button title={t(advanced ? "learn.simple" : "learn.advanced")} variant="quiet" onPress={() => { if (advanced) chooseLearningStep(learningStep); setAdvanced(!advanced); }} />}
      {showProCoach && controlsVisible && <ProTrainingCoach key={type} type={type} phase={motion.phase} canPlay={motion.canPlay} running={motion.running}
        onInspect={direction => { setAnatomy(true); selectMuscle(muscleSpec(type).focus); setLessonDirection(direction); motion.playSegment(direction); }}
        onPause={motion.toggle} />}
      {showMuscleExplanations && anatomy && controlsVisible && (
        <MuscleLengthCoach showIllustrations={false}
          type={type}
          progress={motion.progress}
          phase={motion.phase}
          muscle={selectedMuscle}
          direction={lessonDirection}
          completed={motion.completedSegment}
          onSelect={selectMuscle}
          onInspect={(direction) => {
            setLessonDirection(direction);
            motion.seek(direction === "work" ? 0 : 1, direction);
          }}
          running={motion.running}
          canPlay={motion.canPlay}
          onPlay={() => {
            if (motion.running) motion.toggle();
            else {
              if (focus !== "muscles") selectMuscle(selectedMuscle);
              motion.playSegment(lessonDirection);
            }
          }}
        />
      )}

      {failed && (
        <Text accessibilityRole="alert" style={styles.note}>
          {t("scene.failed")}
        </Text>
      )}
      {controlsVisible && <>
      {mode === "spatial" && (
        <>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t("scene.focus")}
            style={styles.speeds}
          >
            {(["whole", "hands", "feet", "muscles"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={t(`scene.${value}`)}
                accessibilityState={{ checked: focus === value }}
                aria-checked={focus === value}
                onPress={() => {
                  setFocus(value);
                  if (value === "muscles") {
                    setAnatomy(true);
                    setTransparent(true);
                    setView(
                      rearMuscles.includes(selectedMuscle) ? "back" : "front",
                    );
                  }
                }}
                style={[
                  styles.speedButton,
                  focus === value && styles.selectedSpeed,
                ]}
              >
                <Text style={styles.speedText}>{t(`scene.${value}`)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.contactHint}>
            {t(
              focus === "whole"
                ? ["assisted-pull-up", "assisted-dip"].includes(type)
                  ? "scene.assistedHint"
                  : type === "rear-delt-fly"
                    ? "scene.rearFlyHint"
                    : [
                          "seated-row",
                          "preacher-curl",
                          "seated-calf-raise",
                        ].includes(type)
                      ? "scene.seatOnlyHint"
                      : type === "back-extension"
                        ? "scene.backextHint"
                        : type === "hack-squat"
                          ? "scene.hackHint"
                          : [
                                "cable-machine",
                                "power-rack",
                                "triceps-pushdown",
                              ].includes(type)
                            ? "scene.standingHint"
                            : "scene.seatedHint"
                : focus === "hands"
                  ? type === "back-extension"
                    ? "scene.crossHandsHint"
                    : "scene.handsHint"
                  : focus === "feet"
                    ? ["assisted-pull-up", "assisted-dip"].includes(type)
                      ? "scene.kneeHint"
                      : "scene.feetHint"
                    : "scene.targetHint",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("scene.transparent")}
            accessibilityState={{ selected: transparent }}
            aria-pressed={transparent}
            onPress={() => setTransparent((v) => !v)}
            style={styles.detailToggle}
          >
            <Text style={styles.detailTitle}>
              {t(transparent ? "scene.solid" : "scene.transparent")}
            </Text>
          </Pressable>
        </>
      )}
      <View style={styles.header}>
        <Text style={styles.caption}>{t("motion.frameTitle")}</Text>
        <Text style={styles.caption}>
          {t("motion.frameCount", {
            0: motion.frameNumber,
            1: motion.frameCount,
          })}
        </Text>
      </View>
      <View style={styles.playback}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("motion.stepBack")}
          accessibilityState={{ disabled: !motion.canStepBack }}
          aria-disabled={!motion.canStepBack}
          disabled={!motion.canStepBack}
          onPress={() => motion.step(-1)}
          style={[styles.stepButton, !motion.canStepBack && { opacity: 0.4 }]}
        >
          <Text style={styles.stepIcon}>‹</Text>
        </Pressable>
        <Button
          title={t(motion.running ? "motion.pause" : "motion.play")}
          onPress={motion.toggle}
          disabled={!motion.canPlay}
          variant="primary"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("motion.stepForward")}
          accessibilityState={{ disabled: !motion.canStepForward }}
          aria-disabled={!motion.canStepForward}
          disabled={!motion.canStepForward}
          onPress={() => motion.step(1)}
          style={[
            styles.stepButton,
            !motion.canStepForward && { opacity: 0.4 },
          ]}
        >
          <Text style={styles.stepIcon}>›</Text>
        </Pressable>
      </View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t("motion.position")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(motion.progress * 100)}
        aria-valuetext={`${Math.round(motion.progress * 100)}%`}
        accessibilityHint={t("motion.seekHint")}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(motion.progress * 100),
          text: `${Math.round(motion.progress * 100)}%`,
        }}
        accessibilityActions={[
          { name: "increment", label: t("motion.forward") },
          { name: "decrement", label: t("motion.backward") },
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === "increment")
            motion.seek(motion.progress + 0.05);
          if (nativeEvent.actionName === "decrement")
            motion.seek(motion.progress - 0.05);
        }}
        onLayout={({ nativeEvent }) =>
          setTrackWidth(Math.max(1, nativeEvent.layout.width))
        }
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={({ nativeEvent }) =>
          motion.seek(nativeEvent.locationX / trackWidth)
        }
        onResponderMove={({ nativeEvent }) =>
          motion.seek(nativeEvent.locationX / trackWidth)
        }
        style={styles.trackTouch}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${motion.progress * 100}%` }]} />
        </View>
        <View style={[styles.knob, { left: `${motion.progress * 100}%` }]} />
      </View>
      <View style={styles.controls}>
        <Button
          title={t("motion.startPose")}
          onPress={() => motion.seek(startProgress, "work")}
          variant="quiet"
        />
        <Button
          title={t("motion.endPose")}
          onPress={() => motion.seek(1-startProgress, "work")}
          variant="quiet"
        />
      </View>
      <View style={styles.phaseHeader}>
        <Text style={styles.phase}>{t(phaseLabel)}</Text>
        <Text style={styles.caption}>
          {t(
            mode === "spatial"
              ? `scene.${view}`
              : `motion.camera.${pose.camera}`,
          )}
        </Text>
      </View>
      {showMuscleExplanations && anatomy && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("coach.details")}
          accessibilityState={{ expanded: mechanismOpen }}
          aria-expanded={mechanismOpen}
          onPress={() => setMechanismOpen((v) => !v)}
          style={styles.detailToggle}
        >
          <Text style={styles.detailTitle}>
            {t("coach.details")}
            {mechanismOpen ? " −" : " ＋"}
          </Text>
        </Pressable>
      )}
      {showMuscleExplanations && anatomy && mechanismOpen && (
        <MuscleContractionPanel showIllustrations={false}
          key={type}
          type={type}
          progress={motion.progress}
          phase={motion.phase}
          selectedMuscle={selectedMuscle}
          onSelect={selectMuscle}
          onInspect={inspectLesson}
          compactDetails
        />
      )}

      <MotionCue
        key={`${type}:${language}:${width}:${fontScale}`}
        cues={cues}
        active={activeCue}
      />
      <Text style={styles.caption}>{t("motion.speed")}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("motion.speed")}
        style={styles.speeds}
      >
        {PLAYBACK_SPEEDS.map((speed) => {
          const name =
            speed === 1
              ? "motion.normal"
              : speed === 0.5
                ? "motion.slow"
                : "motion.extraSlow";
          const checked = motion.speed === speed;
          return (
            <Pressable
              key={speed}
              accessibilityRole="radio"
              accessibilityLabel={t(name)}
              accessibilityState={{ checked }}
              aria-checked={checked}
              onPress={() => motion.setSpeed(speed)}
              style={[styles.speedButton, checked && styles.selectedSpeed]}
            >
              <Text
                style={[styles.speedText, checked && { color: colors.primary }]}
              >
                {t(name)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>
        {t(
          motion.speed === 1
            ? "motion.speedNormalHint"
            : motion.speed === 0.5
              ? "motion.speedSlowHint"
              : "motion.speedExtraSlowHint",
        )}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("muscle.toggle")}
        accessibilityState={{ selected: anatomy }}
        aria-pressed={anatomy}
        onPress={() => setAnatomy((value) => !value)}
        style={styles.detailToggle}
      >
        <Text style={styles.detailTitle}>
          {t(anatomy ? "muscle.on" : "muscle.off")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("teaching.details")}
        accessibilityState={{ expanded: details }}
        aria-expanded={details}
        onPress={() => setDetails((value) => !value)}
        style={styles.detailToggle}
      >
        <Text style={styles.detailTitle}>
          {t("teaching.details")}
          {details ? " −" : " ＋"}
        </Text>
      </Pressable>
      {details && <MotionJointDetail type={type} progress={motion.progress} />}
      {motion.reduced && (
        <Text style={styles.note}>{t("motion.reducedHint")}</Text>
      )}
      {details && <Text style={styles.note}>{t("teaching.legend")}</Text>}
      <Text style={styles.note}>
        {t(showMuscleExplanations ? mode === "spatial" ? "scene.legend" : "motion.legend" : "pro.model.legend")}
      </Text>
      <Text style={styles.note}>{t("motion.hint")}</Text>
      </>}
    </View>
  );
}
const styles = StyleSheet.create({
  phaseOverlay: { position: "absolute", top: 8, left: 8, right: 8, borderRadius: 8, padding: 8, backgroundColor: "rgba(255,255,255,0.92)", gap: 3 },
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  badge: {
    color: colors.primary,
    backgroundColor: "#edf3f7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
  },
  phase: { color: colors.text, fontWeight: "600", fontSize: 16 },
  phaseHeader: { gap: 2, minHeight: 44 },
  canvas: { borderRadius: 12, backgroundColor: "#fbfbfb", overflow: "hidden" },
  spatialCanvas: { height: 400 },
  loading: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f2f2f2",
  },
  contactHint: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 21,
    minHeight: 63,
  },
  svg: { width: "100%", height: 240 },
  detailToggle: { minHeight: 48, justifyContent: "center" },
  detailTitle: { color: colors.primary, fontSize: 12, lineHeight: 20 },
  playback: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stepButton: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  stepIcon: { fontSize: 26, color: colors.primary },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  speeds: { flexDirection: "row", gap: 6 },
  speedButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  selectedSpeed: { backgroundColor: "#edf3f7", borderColor: "#bdd0df" },
  speedText: { color: colors.muted, fontSize: 12, textAlign: "center" },
  trackTouch: { minHeight: 48, justifyContent: "center", marginHorizontal: 8 },
  track: {
    height: 4,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#e5edf2",
  },
  fill: { height: 4, borderRadius: 3, backgroundColor: colors.primary },
  knob: {
    position: "absolute",
    top: 16,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});

const anatomyStyles = StyleSheet.create({
  overlay:{position:"absolute",bottom:8,left:8,right:8,padding:9,borderRadius:10,backgroundColor:"rgba(255,255,255,.95)",borderLeftWidth:4,borderLeftColor:"#b94b3e",gap:3},
  target:{fontSize:12,fontWeight:"700",color:"#803426"},state:{fontSize:13,fontWeight:"600",color:"#222f39"},
});
