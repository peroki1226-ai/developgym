import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { ExpoWebGLRenderingContext, GLViewProps } from "expo-gl";
let GLView: React.ComponentType<GLViewProps> | null = null;
try {
  GLView = require("expo-gl").GLView;
} catch {
  /* Existing binaries can keep using the diagram. */
}
import * as THREE from "three";
import { createTrainingScene } from "../three/trainingScene";
import { Motion3DProps } from "./Motion3DView.types";
export function Motion3DView(props: Motion3DProps) {
  const latest = useRef(props),
    handle = useRef<ReturnType<typeof createTrainingScene> | null>(null),
    context = useRef<ExpoWebGLRenderingContext | null>(null),
    alive = useRef(true);
  latest.current = props;
  useEffect(() => {
    alive.current = true;
    if (!GLView) latest.current.onFailure();
    return () => {
      alive.current = false;
      handle.current?.dispose();
      handle.current = null;
      context.current = null;
    };
  }, []);
  useEffect(() => {
    if (!alive.current || !handle.current) return;
    try {
      handle.current.draw(props);
      context.current?.endFrameEXP();
    } catch {
      latest.current.onFailure();
    }
  }, [
    props.type,
    props.progress,
    props.view,
    props.focus,
    props.anatomy,
    props.transparent,
    props.muscle,
  ]);
  const create = (gl: ExpoWebGLRenderingContext) => {
    if (!alive.current) return;
    context.current = gl;
    try {
      const canvas = {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        style: {},
        addEventListener() {},
        removeEventListener() {},
        setAttribute() {},
        getContext: () => gl,
      };
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas as unknown as HTMLCanvasElement,
        context: gl as unknown as WebGLRenderingContext,
        antialias: true,
        alpha: false,
      });
      handle.current = createTrainingScene(
        renderer,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
      );
      handle.current.draw(latest.current);
      if (gl.getError() !== gl.NO_ERROR)
        throw new Error("Graphics initialization failed");
      gl.endFrameEXP();
      latest.current.onReady();
    } catch {
      latest.current.onFailure();
    }
  };
  if (!GLView) return <View />;
  return (
    <GLView
      testID="training-3d-canvas"
      style={StyleSheet.absoluteFill}
      msaaSamples={2}
      onContextCreate={create}
      onLayout={() => {
        const gl = context.current;
        if (!gl || !handle.current) return;
        try {
          handle.current.resize(gl.drawingBufferWidth, gl.drawingBufferHeight);
          handle.current.draw(latest.current);
          gl.endFrameEXP();
        } catch {
          latest.current.onFailure();
        }
      }}
    />
  );
}
