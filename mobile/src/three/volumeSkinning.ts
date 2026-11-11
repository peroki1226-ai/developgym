import * as THREE from "three";

/** Dual-quaternion rotation/translation, plus an affine stretch residual.
 * Single-bone vertices retain their exact authored transform. Blended joints
 * retain volume instead of the linear skinning 'candy-wrapper' collapse. */
export class VolumeSkinner {
  private real: THREE.Quaternion[];
  private dual: THREE.Quaternion[];
  private stretch: THREE.Matrix3[];
  private normalResidual: THREE.Matrix3[];
  private fullNormals: THREE.Matrix3[];
  private transforms: readonly THREE.Matrix4[] = [];
  private rotation = new THREE.Matrix3();
  private inverse = new THREE.Matrix3();
  private matrix = new THREE.Matrix4();
  private translation = new THREE.Quaternion();
  private r = new THREE.Quaternion();
  private d = new THREE.Quaternion();
  private t = new THREE.Quaternion();
  private residual = new THREE.Vector3();
  private normal = new THREE.Vector3();
  constructor(count: number, private scale = 1) {
    this.real=Array.from({length:count},()=>new THREE.Quaternion());
    this.dual=Array.from({length:count},()=>new THREE.Quaternion());
    this.stretch=Array.from({length:count},()=>new THREE.Matrix3());
    this.normalResidual=Array.from({length:count},()=>new THREE.Matrix3());
    this.fullNormals=Array.from({length:count},()=>new THREE.Matrix3());
  }
  update(transforms: readonly THREE.Matrix4[]) {
    this.transforms=transforms;
    transforms.forEach((transform,i)=>{
      this.rotation.setFromMatrix4(transform).multiplyScalar(1/this.scale);
      // Polar decomposition handles nonuniform retargeting without treating
      // shear as a rotation. This runs per bone, not per vertex.
      for(let n=0;n<5;n++) {
        this.inverse.copy(this.rotation).invert().transpose();
        for(let k=0;k<9;k++)this.rotation.elements[k]=(this.rotation.elements[k]+this.inverse.elements[k])*.5;
      }
      this.matrix.setFromMatrix3(this.rotation);
      const q=this.real[i].setFromRotationMatrix(this.matrix).normalize(), e=transform.elements;
      this.rotation.setFromMatrix4(this.matrix.makeRotationFromQuaternion(q));
      this.translation.set(e[12],e[13],e[14],0);
      this.dual[i].multiplyQuaternions(this.translation,q);
      const dual=this.dual[i];dual.set(dual.x*.5,dual.y*.5,dual.z*.5,dual.w*.5);
      this.stretch[i].setFromMatrix4(transform);
      this.fullNormals[i].getNormalMatrix(transform);
      this.normalResidual[i].copy(this.fullNormals[i]).multiplyScalar(this.scale);
      for(let k=0;k<9;k++) {
        this.stretch[i].elements[k]-=this.rotation.elements[k]*this.scale;
        this.normalResidual[i].elements[k]-=this.rotation.elements[k];
      }
    });
  }
  apply(point: THREE.Vector3, normal: THREE.Vector3, ids: Uint8Array, weights: Float32Array, offset: number, out: THREE.Vector3, outNormal: THREE.Vector3) {
    let largest=0,reference=0;
    for(let j=0;j<4;j++)if(weights[offset+j]>largest){largest=weights[offset+j];reference=ids[offset+j];}
    if(largest>.999999) {
      out.copy(point).applyMatrix4(this.transforms[reference]);
      outNormal.copy(normal).applyMatrix3(this.fullNormals[reference]).normalize();
      return;
    }
    const ref=this.real[reference];
    this.r.set(0,0,0,0);this.d.set(0,0,0,0);out.set(0,0,0);outNormal.set(0,0,0);
    for(let j=0;j<4;j++) {
      const weight=weights[offset+j];if(!weight)continue;
      const id=ids[offset+j],q=this.real[id],dual=this.dual[id],w=weight*(ref.dot(q)<0?-1:1);
      this.r.set(this.r.x+q.x*w,this.r.y+q.y*w,this.r.z+q.z*w,this.r.w+q.w*w);
      this.d.set(this.d.x+dual.x*w,this.d.y+dual.y*w,this.d.z+dual.z*w,this.d.w+dual.w*w);
      out.addScaledVector(this.residual.copy(point).applyMatrix3(this.stretch[id]),weight);
      outNormal.addScaledVector(this.normal.copy(normal).applyMatrix3(this.normalResidual[id]),weight);
    }
    const norm=Math.max(1e-12,this.r.length());
    this.r.set(this.r.x/norm,this.r.y/norm,this.r.z/norm,this.r.w/norm);
    this.d.set(this.d.x/norm,this.d.y/norm,this.d.z/norm,this.d.w/norm);
    const orthogonal=this.r.dot(this.d);
    this.d.set(this.d.x-this.r.x*orthogonal,this.d.y-this.r.y*orthogonal,this.d.z-this.r.z*orthogonal,this.d.w-this.r.w*orthogonal);
    this.t.copy(this.r).conjugate().premultiply(this.d);
    out.add(this.residual.copy(point).multiplyScalar(this.scale).applyQuaternion(this.r));
    out.x+=2*this.t.x;out.y+=2*this.t.y;out.z+=2*this.t.z;
    outNormal.add(this.normal.copy(normal).applyQuaternion(this.r)).normalize();
  }
}
