// Accepted v13 / b7ed778: a fixed upper-arm region and original coordinates.
// The rest of the human, including the chest and authored grip skin, is locked.
import baseline from './fixtures/upperArmV13.json';
const allowed=new Set(baseline.allowedVertices);
export const outsideUpperArm=(v:number)=>!allowed.has(v);
export {baseline as upperArmBaseline};
