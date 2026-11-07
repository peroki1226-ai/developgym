import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createTrainingScene } from "../three/trainingScene";
import { Motion3DProps } from "./Motion3DView.types";
export function Motion3DView(props: Motion3DProps) {
  const canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef(props),
    handle = useRef<ReturnType<typeof createTrainingScene> | null>(null);
  latest.current = props;
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    let alive = true;
    const lose = (event: Event) => {
      event.preventDefault();
      if (alive) latest.current.onFailure();
    };
    node.addEventListener("webglcontextlost", lose);
    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: node,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      const box = node.getBoundingClientRect();
      handle.current = createTrainingScene(
        renderer,
        Math.max(1, box.width),
        Math.max(1, box.height),
        Math.min(window.devicePixelRatio || 1, 2),
      );
      handle.current.draw(latest.current);
      latest.current.onReady();
    } catch {
      latest.current.onFailure();
    }
    const resize = new ResizeObserver(() => {
      if (!alive || !handle.current) return;
      const box = node.getBoundingClientRect();
      try {
        handle.current.resize(Math.max(1, box.width), Math.max(1, box.height));
        handle.current.draw(latest.current);
      } catch {
        latest.current.onFailure();
      }
    });
    resize.observe(node);
    return () => {
      alive = false;
      resize.disconnect();
      node.removeEventListener("webglcontextlost", lose);
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);
  useEffect(() => {
    try {
      handle.current?.draw(props);
    } catch {
      props.onFailure();
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
  return React.createElement("canvas", {
    ref: canvas,
    "data-testid": "training-3d-canvas",
    style: { width: "100%", height: "100%", display: "block" },
    "aria-hidden": true,
  });
}
