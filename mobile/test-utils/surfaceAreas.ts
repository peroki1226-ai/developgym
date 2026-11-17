/** Barycentric surface areas make coverage comparisons independent of local
 * tessellation density. Raw vertex counts are not physical painted areas. */
export function surfaceAreas(positions: Float32Array, triangles: Uint16Array) {
  const result = new Float64Array(positions.length / 3);
  for (let i=0;i<triangles.length;i+=3) {
    const a=triangles[i]*3,b=triangles[i+1]*3,c=triangles[i+2]*3;
    const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
    const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
    const area=Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)/6;
    for(let k=0;k<3;k++)result[triangles[i+k]]+=area;
  }
  return result;
}
