import * as THREE from "three";
import asset from "../data/human/makehuman.json";

// Region identification colours, never measured activation or force levels.
export { CHEST_REGION_COLOURS } from "../domain/muscleRegionColours";
export function chestDivisionHeight(x: number) {
  const collar = asset.rest["clavicle.L"].head[1];
  const torso = asset.rest.neck.head[1] - asset.rest.spine05.head[1];
  const lateral = Math.min(1, Math.abs(x / asset.rest["upperarm.L"].head[0]));
  return collar - torso * (.115 - .025 * lateral);
}
/** Rest-surface fields interpolate with the same mesh as the moving skin.
 * x: signed clavicular/sternocostal distance; y: anterior chest coverage;
 * z: soft boundary of the other regional learning masks. No screen-space lines.
 */
export function humanDefinition(positions: Float32Array, materials: Uint8Array, masks: Record<string, Uint8Array>) {
  const fields = new Float32Array(materials.length * 3);
  for (let i = 0; i < materials.length; i++) {
    fields[i * 3] = THREE.MathUtils.clamp(positions[i * 3 + 1] - chestDivisionHeight(positions[i * 3]), -1, 1);
    if (materials[i] !== 0) continue;
    fields[i * 3 + 1] = Math.min(1, (masks.chest?.[i] ?? 0) / 60);
    let edge = 0;
    for (const name of Object.keys(masks)) {
      if (name === "chest" || name === "upperChest") continue;
      const value = masks[name][i] / 255;
      edge = Math.max(edge, 4 * value * (1 - value));
    }
    fields[i * 3 + 2] = edge;
  }
  return fields;
}
// A broad, shallow division remains visible with target colouring switched off.
export const DEFINITION_FRAGMENT = `
float chestDivision = (1.0 - smoothstep(0.025, 0.13, abs(vDefinition.x))) * vDefinition.y;
float regionalCavity = max(chestDivision * 0.22, vDefinition.z * 0.14);
diffuseColor.rgb *= 1.0 - regionalCavity;
`;
