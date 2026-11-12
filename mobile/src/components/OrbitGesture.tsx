import React, { PropsWithChildren, useMemo, useRef } from "react";
import { PanResponder, Platform, StyleSheet, View, ViewProps, ViewStyle } from "react-native";
import { Orbit, dragOrbit, normaliseOrbit, clampZoom } from "../domain/guideCamera";
import { useI18n } from "../i18n";

type Props = PropsWithChildren<{enabled:boolean;orbit:Orbit;zoom:number;onOrbit:(value:Orbit)=>void;onZoom:(value:number)=>void}>;
/** Explicit rotation mode leaves ordinary page scrolling alone when disabled.
 * Gestures update camera state only; no secondary animation clock or inertia. */
export function OrbitGesture(props: Props) {
  const {t}=useI18n(), latest=useRef(props),start=useRef(props.orbit),zoom=useRef(props.zoom),pinch=useRef(0);
  latest.current=props;
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>latest.current.enabled,
    onMoveShouldSetPanResponder:()=>latest.current.enabled,
    onPanResponderGrant:()=>{start.current=latest.current.orbit;zoom.current=latest.current.zoom;pinch.current=0;},
    onPanResponderMove:(event,gesture)=>{
      const touches=event.nativeEvent.touches;
      if(touches.length>=2){
        const distance=Math.hypot(touches[0].pageX-touches[1].pageX,touches[0].pageY-touches[1].pageY);
        if(!pinch.current){pinch.current=Math.max(1,distance);zoom.current=latest.current.zoom;}
        else latest.current.onZoom(clampZoom(zoom.current*distance/pinch.current));
      } else if(!pinch.current) latest.current.onOrbit(dragOrbit(start.current,gesture.dx,gesture.dy));
    },
    onPanResponderRelease:(_event,gesture)=>{
      if(!pinch.current)latest.current.onOrbit(dragOrbit(start.current,gesture.dx,gesture.dy));pinch.current=0;
    },
    onPanResponderTerminate:()=>{pinch.current=0;},
    onPanResponderTerminationRequest:()=>!latest.current.enabled,
  }),[]);
  const web=Platform.OS === "web" ? {tabIndex:props.enabled?0 as const:-1 as const,
    "aria-valuemin":-180,"aria-valuemax":180,"aria-valuenow":Math.round(props.orbit.yaw),
    onKeyDown:(event:Parameters<NonNullable<ViewProps["onKeyDown"]>>[0])=>{
      if(!props.enabled)return;
      const key="key" in event?String(event.key):"key" in event.nativeEvent?String(event.nativeEvent.key):"";
      if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(key)){
        event.preventDefault();props.onOrbit(normaliseOrbit({yaw:props.orbit.yaw+(key==="ArrowLeft"?-15:key==="ArrowRight"?15:0),pitch:props.orbit.pitch+(key==="ArrowUp"?10:key==="ArrowDown"?-10:0)}));
      }
    }}:{};
  const touchStyle:ViewStyle & {touchAction?:string}=Platform.OS === "web"?{touchAction:props.enabled?"none":"pan-y"}:{};
  return <View {...responder.panHandlers} {...web} testID="guide-orbit-surface"
    accessible={props.enabled} accessibilityRole={props.enabled?"adjustable":undefined} accessibilityLabel={props.enabled?t("camera.gesture"):undefined}
    accessibilityValue={props.enabled?{min:-180,max:180,now:Math.round(props.orbit.yaw)}:undefined}
    accessibilityActions={[{name:"increment"},{name:"decrement"}]}
    onAccessibilityAction={event=>{if(props.enabled&&["increment","decrement"].includes(event.nativeEvent.actionName))props.onOrbit(normaliseOrbit({...props.orbit,yaw:props.orbit.yaw+(event.nativeEvent.actionName==="decrement"?-15:15)}));}}
    style={[StyleSheet.absoluteFill,touchStyle]}>{props.children}</View>;
}
