import React, { useMemo, useRef } from "react";
import { PanResponder, Platform, StyleSheet, View, ViewProps } from "react-native";
import { clampProgress } from "../domain/exerciseMotion";
import { colors } from "./ui";

/** Touch dragging, tapping and accessibility adjustment all drive the same pose. */
export function MotionScrubber({ value, label, onChange }: {value: number; label: string; onChange: (value:number)=>void}) {
  const track = useRef<React.ComponentRef<typeof View>>(null);
  const width = useRef(1), left = useRef(0), ready = useRef(false), latestX = useRef(0), change = useRef(onChange);
  change.current = onChange;
  const responder = useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder: ()=>true,
    onMoveShouldSetPanResponder: ()=>true,
    onPanResponderGrant: event=>{
      ready.current=false; latestX.current=event.nativeEvent.pageX;
      track.current?.measureInWindow((x,_y,w)=>{left.current=x;width.current=Math.max(1,w);ready.current=true;change.current(clampProgress((latestX.current-x)/width.current));});
    },
    onPanResponderMove: event=>{latestX.current=event.nativeEvent.pageX;if(ready.current)change.current(clampProgress((latestX.current-left.current)/width.current));},
    onPanResponderRelease: event=>{
      const x=event.nativeEvent.changedTouches[0]?.pageX ?? event.nativeEvent.pageX;
      if(ready.current)change.current(clampProgress((x-left.current)/width.current));
    },
    onPanResponderTerminationRequest: ()=>false,
  }),[]);
  const web = Platform.OS === "web" ? {
    "aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round(value*100),"aria-valuetext":`${Math.round(value*100)}%`,tabIndex:0 as const,
    onKeyDown:(event:Parameters<NonNullable<ViewProps["onKeyDown"]>>[0])=>{
      const key="key" in event?String(event.key):"key" in event.nativeEvent?String(event.nativeEvent.key):"";
      const delta=key==="ArrowRight"||key==="ArrowUp"?.05:key==="ArrowLeft"||key==="ArrowDown"?-.05:0;
      if(delta||key==="Home"||key==="End"){event.preventDefault();onChange(key==="Home"?0:key==="End"?1:clampProgress(value+delta));}
    },
  }:{};
  return <View ref={track} {...web} testID="chest-motion-scrubber" accessible accessibilityRole="adjustable" accessibilityLabel={label}
    accessibilityValue={{min:0,max:100,now:Math.round(value*100),text:`${Math.round(value*100)}%`}}
    accessibilityActions={[{name:"increment"},{name:"decrement"}]}
    onAccessibilityAction={event=>{const action=event.nativeEvent.actionName;if(action==="increment"||action==="decrement")onChange(clampProgress(value+(action==="increment"?.05:-.05)));}}
    onLayout={event=>{width.current=Math.max(1,event.nativeEvent.layout.width);}}
    style={styles.touch} {...responder.panHandlers}>
    <View pointerEvents="none" style={styles.track}><View style={[styles.fill,{width:`${clampProgress(value)*100}%`}]} /></View>
    <View pointerEvents="none" style={[styles.thumb,{left:`${clampProgress(value)*100}%`}]} />
  </View>;
}
const styles=StyleSheet.create({touch:{height:48,justifyContent:"center",marginHorizontal:12},track:{height:5,backgroundColor:"#dce4e8",borderRadius:3},fill:{height:5,borderRadius:3,backgroundColor:colors.primary},thumb:{position:"absolute",width:24,height:24,borderRadius:12,marginLeft:-12,backgroundColor:colors.primary,borderWidth:3,borderColor:"white",top:12}});
