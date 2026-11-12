import type { View3 } from "./training3d";

export type Orbit = { yaw: number; pitch: number };
export const DEFAULT_GUIDE_ZOOM = 1.15;
export function clampZoom(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(2.5, value)) : DEFAULT_GUIDE_ZOOM;
}
export function normaliseOrbit(value: Orbit): Orbit {
  const yaw = Number.isFinite(value.yaw) ? value.yaw : -25;
  return { yaw: ((yaw + 180) % 360 + 360) % 360 - 180,
    pitch: Math.max(-75, Math.min(80, Number.isFinite(value.pitch) ? value.pitch : 13.5)) };
}
export function orbitForView(view: View3): Orbit {
  return view === "above" ? {yaw:-18.435,pitch:72.452}
    : view === "below" ? {yaw:-25,pitch:-45}
    : {yaw:view === "side" ? -90 : view === "right" ? 90 : view === "back" ? -155 : -25,pitch:13.496};
}
export const dragOrbit = (start: Orbit, dx: number, dy: number) => normaliseOrbit({yaw:start.yaw-dx*.5,pitch:start.pitch+dy*.3});
