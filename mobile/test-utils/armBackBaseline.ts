// Frozen selection and original positions from accepted v12 / 759003b. This
// fixture describes the authorised arm/back edit; it is not a new full-body
// snapshot. Protected byte hashes continue to refer to the accepted surface.
import baseline from './fixtures/armBackV12.json';
const edited = new Set(baseline.allowedVertices);
export const outsideArmBack = (vertex: number) => !edited.has(vertex);
export { baseline as armBackBaseline };
