"""Offline fairing of arm/back skin; keep muscle bulk and all contact references.

Fits broad quadratic skin patches to remove short-wavelength sculpt ripples,
not the anatomy's broad bellies. No runtime layers, textures or extra vertices.
"""
import numpy as np
from human_anatomy_surface import limb_coordinates, normals


def arm_back_regions(positions, normal, materials, skin_indices, skin_weights, bones, rest):
    smooth = lambda v: np.clip(v, 0, 1)**2*(3-2*np.clip(v, 0, 1))
    weight = lambda names: np.sum(skin_weights*np.isin(skin_indices,[i for i,n in enumerate(bones) if any(n.startswith(s) for s in names)]),axis=1)
    excluded = weight(['hand','head','neck','foot'])
    skin = (materials==0)&(excluded<.001)
    regions = []
    for side in ['R','L']:
        influence = np.zeros(len(positions))
        support = np.zeros(len(positions),dtype=bool)
        for kind in ['upperarm','forearm']:
            bone=bones.index(kind+'.'+side)
            strength=np.sum(skin_weights*(skin_indices==bone),axis=1)
            t,_,_=limb_coordinates(positions,rest,kind+'.'+side)
            window=smooth((t+.06)/.23)*smooth((.94-t)/.18)
            influence=np.maximum(influence,smooth((strength-.10)/.45)*window)
            support|=strength>.08
        regions.append((influence*skin,support&skin,.72))
    x,y,z=np.abs(positions[:,0]),positions[:,1],positions[:,2]
    spine=weight(['spine','clavicle'])
    influence=smooth((spine-.18)/.35)*smooth((y-1.75)/.45)*smooth((6.25-y)/.35)
    influence*=smooth((-z-.08)/.38)*smooth((-normal[:,2]-.10)/.40)*smooth((2.12-x)/.25)
    influence*=smooth((x-.06)/.22)
    regions.append((influence*skin,(spine>.12)&(z<.1)&skin,.84))
    # Chest, anterior ribs, elbows/wrists, head, fingers, clothing and legs stay
    # byte-identical outside this explicit influence. Protect the chest fan even
    # where shoulder weights blend into it.
    chest=(x<2.06)&(z>0)&(y>3.8)&(y<6.2)
    for influence,_,_ in regions:
        influence[chest]=0
        influence[influence<1e-5]=0
    return regions


def naturalise_arm_back(positions, normal, occlusion, triangles, materials, skin_indices, skin_weights, bones, rest):
    original=positions.copy()
    regions=arm_back_regions(original,normal,materials,skin_indices,skin_weights,bones,rest)
    influence=np.maximum.reduce([r[0] for r in regions])
    changed=np.flatnonzero(influence>0)
    # Fixed support memberships avoid sliding an armpit or crossing into the
    # opposing surface of the torso while fitting the arm's curved cylinder.
    for _ in range(3):
        source=positions.copy()
        current_normal=normals(source,triangles)
        updates=np.zeros_like(source)
        for amount,support,radius in regions:
            candidates=np.flatnonzero(support)
            for vertex in np.flatnonzero(amount>0):
                delta=source[candidates]-source[vertex]
                distance=np.sum(delta*delta,axis=1)
                facing=current_normal[candidates]@current_normal[vertex]
                keep=(distance<radius*radius)&(facing>.35)
                ids=candidates[keep]
                if len(ids)<12: continue
                delta=delta[keep]; n=current_normal[vertex]
                axis=np.array([1.,0,0]) if abs(n[0])<.7 else np.array([0.,1,0])
                u=np.cross(n,axis);u/=np.linalg.norm(u);v=np.cross(n,u)
                a,b=delta@u/radius,delta@v/radius
                design=np.column_stack([np.ones(len(ids)),a,b,a*a,a*b,b*b])
                weights=(1-distance[keep]/radius**2)**2*facing[keep]**2
                weighted=np.sqrt(weights)
                fit=np.linalg.lstsq(design*weighted[:,None],(delta@n)*weighted,rcond=1e-6)[0]
                step=np.clip(fit[0],-.10,.10)*.9*amount[vertex]
                updates[vertex]+=n*step
        # Overlapping shoulder/back memberships must not double the correction.
        divisor=np.maximum(1,np.sum([r[0]>0 for r in regions],axis=0))
        positions+=updates/divisor[:,None]
    # Keep the mean normal displacement near zero in each compartment. This
    # limits bulk loss while the small peaks/valleys exchange their relief.
    delta=positions-original
    correction=np.zeros_like(positions); memberships=np.zeros(len(positions))
    for amount,_,_ in regions:
        average=float(np.sum(np.sum(delta*normal,axis=1)*amount)/max(np.sum(amount),1e-9))
        correction+=normal*(average*amount)[:,None];memberships+=amount>0
    positions-=correction/np.maximum(memberships,1)[:,None]
    # Forearm and upper-arm blend weights overlap at the elbow. Protect that
    # joint as a whole, not just each bone's separate end window; otherwise the
    # neighbouring forearm patch can subtly narrow the accepted elbow taper.
    smooth=lambda v: np.clip(v,0,1)**2*(3-2*np.clip(v,0,1))
    joint_fade=np.ones(len(positions))
    for side in ['R','L']:
        name='upperarm.'+side
        strength=np.sum(skin_weights*(skin_indices==bones.index(name)),axis=1)
        t,_,_=limb_coordinates(original,rest,name)
        fade=smooth((.90-t)/.14)+smooth((t-1.08)/.14)
        joint_fade=np.minimum(joint_fade,np.where(strength>.08,fade,1))
    positions=original+(positions-original)*joint_fade[:,None]
    # A close pair of scapular folds must never turn a triangle inside out.
    # Locally backtrack only its affected vertices, retaining the broad fairing
    # everywhere else. Compare against the original oriented surface, not a
    # fitted shading normal that could conceal an inversion.
    reference=np.cross(original[triangles[:,1]]-original[triangles[:,0]],original[triangles[:,2]]-original[triangles[:,0]])
    valid=np.linalg.norm(reference,axis=1)>1e-9
    for _ in range(20):
        faces=np.cross(positions[triangles[:,1]]-positions[triangles[:,0]],positions[triangles[:,2]]-positions[triangles[:,0]])
        unsafe=valid&(np.sum(reference*faces,axis=1)<=.05*np.sum(reference*reference,axis=1))
        if not np.any(unsafe): break
        vertices=np.unique(triangles[unsafe])
        positions[vertices]=original[vertices]+.5*(positions[vertices]-original[vertices])
    else:
        raise ValueError('Arm/back fairing could not preserve face orientation')
    geometric=normals(positions,triangles)
    fitted=normal.copy();fitted[changed]=normal[changed]*(1-influence[changed,None])+geometric[changed]*influence[changed,None]
    fitted[changed]/=np.maximum(np.linalg.norm(fitted[changed],axis=1)[:,None],1e-9)
    edges=np.concatenate([triangles[:,[0,1]],triangles[:,[1,2]],triangles[:,[2,0]]]);edges=np.concatenate([edges,edges[:,::-1]])
    count=np.maximum(np.bincount(edges[:,0],minlength=len(positions)),1)
    for _ in range(2):
        mean=np.zeros_like(fitted);np.add.at(mean,edges[:,0],fitted[edges[:,1]]);mean/=count[:,None]
        mean/=np.maximum(np.linalg.norm(mean,axis=1)[:,None],1e-9)
        amount=.45*influence[changed,None]
        fitted[changed]=fitted[changed]*(1-amount)+mean[changed]*amount
        fitted[changed]/=np.maximum(np.linalg.norm(fitted[changed],axis=1)[:,None],1e-9)
    mean=np.zeros_like(positions);np.add.at(mean,edges[:,0],positions[edges[:,1]]);mean/=count[:,None]
    length=np.linalg.norm(positions[edges[:,0]]-positions[edges[:,1]],axis=1)
    size=np.maximum(np.bincount(edges[:,0],weights=length,minlength=len(positions))/count,1e-6)
    cavity=np.maximum(0,np.sum((mean-positions)*fitted,axis=1)/size)
    shade=(1-.10*np.clip(cavity*3,0,1))*255
    result=occlusion.copy()
    result[changed]=np.round(occlusion[changed]*(1-influence[changed])+shade[changed]*influence[changed]).astype(np.uint8)
    return positions,fitted,result
