"""Broad upper-arm skin envelope; keep the accepted torso, joints and grip mesh."""
import numpy as np
from human_anatomy_surface import limb_coordinates, normals


def natural_upper_arm(positions, normal, occlusion, triangles, materials, ids, weights, bones, rest):
    original=positions.copy(); influence=np.zeros(len(positions))
    smooth=lambda v: np.clip(v,0,1)**2*(3-2*np.clip(v,0,1))
    excluded=np.sum(weights*np.isin(ids,[i for i,n in enumerate(bones) if n.startswith(('hand','forearm','head','neck'))]),axis=1)
    for side in ['R','L']:
        name='upperarm.'+side
        t,radial,radius=limb_coordinates(original,rest,name)
        strength=np.sum(weights*(ids==bones.index(name)),axis=1)
        skin=(materials==0)&(excluded<.3)
        chest=(np.abs(original[:,0])<2.06)&(original[:,2]>0)&(original[:,1]>3.8)&(original[:,1]<6.2)
        window=smooth((t-.08)/.17)*smooth((.90-t)/.16)*smooth((strength-.32)/.4)*skin*(~chest)*smooth((.30-excluded)/.20)
        window[window<1e-5]=0
        samples=np.flatnonzero((strength>.55)&skin&(t>.08)&(t<.9)&(~chest))
        # A cubic longitudinal envelope and only two angular harmonics retain
        # the broad anterior/posterior bellies, without individual sculpt knots.
        axis=np.array(rest[name]['tail'])-np.array(rest[name]['head']);axis/=np.linalg.norm(axis)
        front=np.array([0.,0.,1.]);front-=axis*np.dot(front,axis);front/=np.linalg.norm(front)
        outward=np.cross(axis,front)
        angle=np.arctan2(radial@outward,radial@front)
        angular=np.column_stack([np.ones(len(t)),np.cos(angle),np.sin(angle),np.cos(2*angle),np.sin(2*angle)])
        design=np.column_stack([angular*(t-.5)[:,None]**power for power in range(4)])
        fit=np.linalg.lstsq(design[samples],radius[samples],rcond=1e-7)[0]
        target=design@fit
        delta=.20*np.tanh((target-radius)/.20)*window
        positions+=radial/radius[:,None]*delta[:,None]
        influence=np.maximum(influence,window)
    edges=np.concatenate([triangles[:,[0,1]],triangles[:,[1,2]],triangles[:,[2,0]]]);edges=np.concatenate([edges,edges[:,::-1]])
    count=np.maximum(np.bincount(edges[:,0],minlength=len(positions)),1)
    # Fair the join between the broad envelope and the authored shoulder. The
    # negative half-step limits shrinkage, while all joints stay pinned.
    for _ in range(6):
        for step in [.30,-.31]:
            mean=np.zeros_like(positions);np.add.at(mean,edges[:,0],positions[edges[:,1]]);mean/=count[:,None]
            positions+=(mean-positions)*(step*influence)[:,None]
    # Local backtracking preserves winding, including the feathered shoulder seam.
    reference=np.cross(original[triangles[:,1]]-original[triangles[:,0]],original[triangles[:,2]]-original[triangles[:,0]])
    norm=np.sum(reference*reference,axis=1);valid=norm>1e-18
    for _ in range(24):
        faces=np.cross(positions[triangles[:,1]]-positions[triangles[:,0]],positions[triangles[:,2]]-positions[triangles[:,0]])
        bad=valid&(np.sum(reference*faces,axis=1)<.05*norm)
        if not np.any(bad):break
        vertices=np.unique(triangles[bad]);positions[vertices]=original[vertices]+.5*(positions[vertices]-original[vertices])
    else:raise ValueError('Upper-arm envelope inverted a face')
    changed=np.flatnonzero(influence>0);geometric=normals(positions,triangles)
    result=normal.copy();result[changed]=normal[changed]*(1-influence[changed,None])+geometric[changed]*influence[changed,None]
    result[changed]/=np.maximum(np.linalg.norm(result[changed],axis=1)[:,None],1e-9)
    for _ in range(3):
        mean=np.zeros_like(result);np.add.at(mean,edges[:,0],result[edges[:,1]]);mean/=count[:,None]
        result[changed]=result[changed]*(1-.55*influence[changed,None])+mean[changed]*.55*influence[changed,None]
        result[changed]/=np.maximum(np.linalg.norm(result[changed],axis=1)[:,None],1e-9)
    shade=occlusion.copy();shade[changed]=np.round(occlusion[changed]*(1-.45*influence[changed])+255*.45*influence[changed]).astype(np.uint8)
    return positions,result,shade
