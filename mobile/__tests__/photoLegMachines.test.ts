import * as THREE from 'three';
import {trainingFrame3d,sub3,dot3,length3,unit3,HUMAN_SEGMENTS} from '../src/domain/training3d';
import {createRealisticHuman} from '../src/three/realisticHuman';
const part=(f:ReturnType<typeof trainingFrame3d>,id:string)=>{const value=f.equipment.find(e=>e.id===id);expect(value).toBeDefined();return value!;};

test.each(['power-rack','smith-squat'])('%s forearms stay perpendicular to the bar, with elbows below the hands and unchanged bone lengths',type=>{
 for(let i=0;i<=40;i++){const f=trainingFrame3d(type,i/40),bar=unit3(sub3(f.body.arms[1][2],f.body.arms[0][2]));
 for(const [root,elbow,hand] of f.body.arms){const forearm=sub3(hand,elbow);expect(dot3(unit3(forearm),bar)).toBeCloseTo(0,7);expect(elbow[1]).toBeLessThan(hand[1]-10);expect(elbow[0]).toBeCloseTo(hand[0],7);expect(length3(sub3(elbow,root))).toBeCloseTo(HUMAN_SEGMENTS.upperArm,6);expect(length3(forearm)).toBeCloseTo(HUMAN_SEGMENTS.forearmGrip,6);}
 }
 const h=createRealisticHuman(new THREE.Group());try{for(const p of [0,.5,1]){h.draw(trainingFrame3d(type,p),true);for(const c of h.mesh.userData.handContacts)expect(c.error).toBeLessThan(1e-6);for(const g of h.mesh.userData.gripSurfaces)expect(g.minimumClearance).toBeGreaterThan(.024);}}finally{h.dispose();}
});
test('Smith silver columns, rear storage and loaded bar are separate rigid mechanisms',()=>{
 const start=trainingFrame3d('smith-squat',0),end=trainingFrame3d('smith-squat',1);
 for(const side of [-1,1]){
 expect(part(start,'smith-squat-upright'+side).color).toBe('satin');expect(part(start,'smith-squat-upright'+side).size[0]).toBeGreaterThan(5);
 for(const id of ['smith-squat-guide'+side,'smith-squat-stop'+side,'smith-squat-storage-weight'+side+'450'])expect(part(end,id)).toEqual(part(start,id));
 const a=part(start,'smith-squat-plate'+side+'0').a,b=part(end,'smith-squat-plate'+side+'0').a;expect(b[0]).toBe(a[0]);expect(b[2]).toBe(a[2]);expect(b[1]).toBeGreaterThan(a[1]+8);
 }
});
test('photo-style angled press has a stationary reclined orange seat, 45-degree rails and a rigid loaded foot carriage',()=>{
 const start=trainingFrame3d('leg-press',0,'incline'),base=part(start,'footplate'),rail=part(start,'sled-guide1'),direction=unit3(sub3(rail.b!,rail.a));
 expect(direction[1]).toBeCloseTo(Math.SQRT1_2,7);expect(direction[2]).toBeCloseTo(Math.SQRT1_2,7);
 expect(part(start,'backrest').color).toBe('orangePad');expect(part(start,'bench-seat').color).toBe('orangePad');
 expect(Math.asin(unit3(sub3(start.body.shoulder,start.body.hip))[1])*180/Math.PI).toBeCloseTo(40,6);
 for(let i=0;i<=40;i++){const f=trainingFrame3d('leg-press',i/40,'incline'),delta=sub3(part(f,'footplate').a,base.a);
 for(const id of ['backrest','bench-seat','sled-guide1','sled-guide-1','incline-press-safety-stop1'])expect(part(f,id)).toEqual(part(start,id));
 expect(f.body.hip).toEqual(start.body.hip);
 for(const id of ['sled-bearing1','sled-bearing-1','sled-weight10','sled-weight-10']){const movement=sub3(part(f,id).a,part(start,id).a);expect(length3(sub3(movement,delta))).toBeLessThan(1e-6);}
 expect(Math.abs(dot3(delta,unit3([0,1,-1])))).toBeLessThan(1e-6);
 }
 const seated=trainingFrame3d('leg-press',.5,'seated');expect(seated.equipment.some(e=>e.id.startsWith('seated-press-stack'))).toBe(true);expect(seated.equipment.some(e=>e.color==='orangePad')).toBe(false);
});
