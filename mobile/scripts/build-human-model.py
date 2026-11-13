"""Convert pinned MakeHuman CC0 data into an offline, weighted training mannequin.
No MakeHuman application code is used. Run with Python + NumPy and --source-root.
"""
import argparse, base64, hashlib, json, subprocess
from pathlib import Path
import numpy as np
from human_pectoral_masks import pectoral_masks

PIN = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
p = argparse.ArgumentParser()
p.add_argument('--source-root', required=True, type=Path)
p.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1]/'src/data/human/makehuman.json')
a = p.parse_args()
head = subprocess.check_output(['git','-C',str(a.source_root),'rev-parse','HEAD'], text=True).strip()
if head != PIN:
    raise SystemExit('Use the pinned MakeHuman commit ' + PIN)
r = a.source_root / 'makehuman/data'
used = []
def read(name):
    f = r / name
    used.append({'file': name, 'sha256': hashlib.sha256(f.read_bytes()).hexdigest()})
    return f.read_text()
verts, faces, group = [], [], ''
for line in read('3dobjs/base.obj').splitlines():
    if line.startswith('v '): verts.append([float(v) for v in line.split()[1:]])
    elif line.startswith('g '): group = line[2:]
    elif line.startswith('f '): faces.append((group, [int(v.split('/')[0]) - 1 for v in line.split()[1:]]))
verts = np.asarray(verts, dtype=np.float64)
def morph(name):
    delta = np.zeros_like(verts)
    for line in read('targets/' + name + '.target').splitlines():
        if line.strip() and not line.startswith('#'):
            v = line.split(); delta[int(v[0])] = [float(x) for x in v[1:]]
    return delta
for ethnic in ['asian', 'caucasian', 'african']:
    verts += morph('macrodetails/' + ethnic + '-male-young') / 3
verts += morph('macrodetails/universal-male-young-maxmuscle-averageweight') * .35
verts += morph('macrodetails/universal-male-young-maxmuscle-minweight') * .65
pectoral_shape = morph('torso/torso-muscle-pectoral-incr')
verts += pectoral_shape * .15
verts += morph('torso/torso-muscle-dorsi-incr') * .4
verts += morph('torso/torso-vshape-incr') * .2
verts += morph('stomach/stomach-tone-incr') * .9
verts += morph('neck/neck-scale-horiz-incr') * .35
for side in ['l', 'r']:
    for area, amount in [('upperarm', .5), ('lowerarm', .3), ('upperleg', .6), ('lowerleg', .45)]:
        verts += morph('armslegs/' + side + '-' + area + '-muscle-incr') * amount
    verts += morph('armslegs/' + side + '-upperarm-shoulder-muscle-incr') * .5
skel = json.loads(read('rigs/default.mhskel'))
weights = json.loads(read('rigs/default_weights.mhw'))
assert skel['license'] == 'CC0' and weights['license'] == 'CC0'
def joint(bone, end):
    return np.mean(verts[skel['joints'][skel['bones'][bone][end]]], axis=0)
# Muscular teaching silhouette: add volume to bellies, taper to zero at joints.
# Bounded muscle-belly refinement on the authored surface. Keep skeletal helpers,
# hands, feet and joint ends fixed; skin and its clothing shell share the sculpt.
sculptable=np.zeros(len(verts),dtype=bool)
for group,poly in faces:
    if group in ['body','helper-tights']: sculptable[poly]=True
for side in ['L','R']:
    for prefix,start_bone,end_bone,amount in [
        ('upperarm','upperarm01','lowerarm01',.38),
        ('upperleg','upperleg01','lowerleg01',.28),
        ('lowerleg','lowerleg01','foot',.20),
    ]:
        h=joint(start_bone+'.'+side,'head'); tail=joint(end_bone+'.'+side,'head')
        axis=tail-h; length=np.linalg.norm(axis); axis/=length
        t=((verts-h)@axis)/length
        radial=verts-h-t[:,None]*length*axis
        region_weight=np.zeros(len(verts))
        for name,entries in weights['weights'].items():
            if name.startswith(prefix) and name.endswith('.'+side):
                for vertex,value in entries: region_weight[vertex]+=value
        window=np.sin(np.pi*np.clip((t-.08)/.84,0,1))**2
        factor=amount*window*np.clip(region_weight,0,1)*sculptable
        verts+=radial*factor[:,None]
# Surface-only anatomy refinement: broad upper pectorals and paired rectus
# bellies, with shallow actual tendon grooves. Never move joint helper points.
skin=np.zeros(len(verts),dtype=bool)
for group,poly in faces:
    if group=='body': skin[poly]=True
x=np.abs(verts[:,0]); y=verts[:,1]; z=verts[:,2]
clavicle=joint('clavicle.L','head')[1]
front=np.clip((z-.4)/.5,0,1)*skin
gauss=lambda cx,cy,sx,sy: np.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2)
relief=-.25*gauss(.78,clavicle-1.48,.62,.42)+.36*gauss(.85,clavicle-.72,.7,.5)
for level in [3.85,3.05,2.3]: relief+=.12*gauss(.38,level,.28,.32)
ab_window=np.clip((y-1.7)/.25,0,1)*np.clip((4.25-y)/.25,0,1)
relief-=.028*np.exp(-(x/.085)**2)*ab_window
for level in [3.45,2.67]: relief-=.018*gauss(.35,level,.7,.08)
verts[:,2]+=relief*front
# Pose the authored finger chains into a relaxed cylindrical grip before collapsing
# facial/twist controls. Keep the real hand topology and original weighted skinning.
bind_verts = verts.copy()
finger_matrices = {}
def rotation(axis, angle):
    axis = axis / max(np.linalg.norm(axis), 1e-9)
    x,y,z = axis; c,s = np.cos(angle),np.sin(angle); q = 1-c
    return np.array([[c+x*x*q,x*y*q-z*s,x*z*q+y*s],[y*x*q+z*s,c+y*y*q,y*z*q-x*s],[z*x*q-y*s,z*y*q+x*s,c+z*z*q]])
flex_axes = {}
for side in ['L','R']:
    middle = joint('finger3-1.'+side,'head')
    along = middle-joint('wrist.'+side,'head'); along /= np.linalg.norm(along)
    across = joint('finger5-1.'+side,'head')-joint('finger2-1.'+side,'head')
    palmar = np.cross(across,along); palmar /= np.linalg.norm(palmar)
    if np.dot(joint('finger1-1.'+side,'head')-middle,palmar)<0: palmar *= -1
    flex_axes[side] = np.cross(along,palmar)
def finger_matrix(name):
    if name in finger_matrices: return finger_matrices[name]
    bone = skel['bones'][name]
    parent = finger_matrix(bone['parent']) if bone['parent'] else np.eye(4)
    result = parent.copy()
    if name.startswith('finger'):
        part = int(name.split('-')[1][0]); thumb = name.startswith('finger1-')
        angle = np.deg2rad(([28,30,22] if thumb else [55,60,35])[part-1])
        axis = parent[:3,:3] @ flex_axes[name[-1]]
        pivot = (parent @ np.r_[joint(name,'head'),1])[:3]
        turn = np.eye(4); turn[:3,:3] = rotation(axis,angle)
        turn[:3,3] = pivot-turn[:3,:3]@pivot
        result = turn @ parent
    finger_matrices[name] = result
    return result
posed = np.zeros_like(verts); totals = np.zeros(len(verts))
for name, entries in weights['weights'].items():
    m = finger_matrix(name)
    vi = np.array([v for v,_ in entries]); value = np.array([w for _,w in entries])
    transformed = verts[vi] @ m[:3,:3].T + m[:3,3]
    np.add.at(posed,vi,transformed*value[:,None]); np.add.at(totals,vi,value)
has_weights = totals>1e-8
verts[has_weights] = posed[has_weights]/totals[has_weights,None]
# The closed-finger channel supplies an actual palm anchor and grip axis.
# Fit its nominal circle to the authored middle-finger chain after posing.
grips = {}
def bind_joint(name, end):
    return np.mean(bind_verts[skel['joints'][skel['bones'][name][end]]], axis=0)
for side in ['R', 'L']:
    wrist = bind_joint('wrist.'+side, 'head')
    mcp = bind_joint('finger3-1.'+side, 'head')
    along = mcp-wrist; along /= np.linalg.norm(along)
    across = bind_joint('finger2-1.'+side,'head')-bind_joint('finger5-1.'+side,'head'); across /= np.linalg.norm(across)
    palm = np.cross(flex_axes[side], along); palm /= np.linalg.norm(palm)
    chain = []
    for name, end in [('finger3-1.'+side,'head')]+[('finger3-'+str(k)+'.'+side,'tail') for k in [1,2,3]]:
        chain.append((finger_matrices[name] @ np.r_[bind_joint(name,end),1])[:3])
    uv = np.array([[(v-mcp)@along,(v-mcp)@palm] for v in chain])
    fit = np.linalg.lstsq(np.c_[2*uv,np.ones(4)], (uv*uv).sum(axis=1),rcond=None)[0]
    centre = mcp + along*fit[0] + palm*fit[1]
    approach = wrist-centre; approach -= across*np.dot(approach,across); approach /= np.linalg.norm(approach)
    grips[side] = {'centre':centre.tolist(),'axis':across.tolist(),'approach':approach.tolist(),'wrist':wrist.tolist()}
# Oppose the thumb toward the closed index finger instead of leaving it dangling.
# CCD preserves each authored phalanx length; this is an offline reference pose.
for side in ['R', 'L']:
    names = ['finger1-'+str(k)+'.'+side for k in [1,2,3]]
    original = [(finger_matrices[names[0]] @ np.r_[bind_joint(names[0],'head'),1])[:3]] + [(finger_matrices[n] @ np.r_[bind_joint(n,'tail'),1])[:3] for n in names]
    chain = [v.copy() for v in original]
    index = [(finger_matrices['finger2-'+str(k)+'.'+side] @ np.r_[bind_joint('finger2-'+str(k)+'.'+side,'tail'),1])[:3] for k in [1,2]]
    target = (index[0]+index[1])*.5 + np.array(grips[side]['axis'])*.18
    for iteration in range(12):
        for j in [2,1,0]:
            v = chain[-1]-chain[j]; w = target-chain[j]
            v /= max(np.linalg.norm(v),1e-9); w /= max(np.linalg.norm(w),1e-9)
            axis = np.cross(v,w); sine = np.linalg.norm(axis)
            if sine < 1e-8: continue
            angle = min(np.arctan2(sine,np.clip(v@w,-1,1)),np.deg2rad(18))
            turn = rotation(axis,angle)
            for k in range(j+1,4): chain[k] = chain[j]+turn@(chain[k]-chain[j])
    for j,name in enumerate(names):
        v = original[j+1]-original[j]; w = chain[j+1]-chain[j]
        v /= np.linalg.norm(v); w /= np.linalg.norm(w); axis=np.cross(v,w)
        turn = np.eye(4)
        if np.linalg.norm(axis)>1e-8: turn[:3,:3] = rotation(axis,np.arctan2(np.linalg.norm(axis),np.clip(v@w,-1,1)))
        turn[:3,3] = chain[j]-turn[:3,:3]@original[j]
        finger_matrices[name] = turn@finger_matrices[name]
posed = np.zeros_like(verts); totals = np.zeros(len(verts))
for name,entries in weights['weights'].items():
    matrix = finger_matrices[name]
    vi = np.array([v for v,_ in entries]); value = np.array([w for _,w in entries])
    np.add.at(posed,vi,(bind_verts[vi]@matrix[:3,:3].T+matrix[:3,3])*value[:,None]); np.add.at(totals,vi,value)
verts[has_weights] = posed[has_weights]/totals[has_weights,None]
# Collapse only twist/facial controls. Preserve the author's spatial skin weights.
bones = ['hip'] + ['spine%02d' % n for n in [5,4,3,2,1]] + ['neck', 'head']
for side in ['R', 'L']:
    bones += [name + '.' + side for name in ['clavicle','upperarm','forearm','hand','thigh','shin','foot']]
def region(name):
    side = '.' + name[-1] if name.endswith(('.L','.R')) else ''
    if name.startswith(('root','pelvis')): return 'hip'
    if name.startswith('spine'): return name
    if name.startswith('neck'): return 'neck'
    if name.startswith('breast'): return 'spine02'
    for prefix, dst in [('clavicle','clavicle'),('shoulder','clavicle'),('upperarm','upperarm'),('lowerarm','forearm'),('wrist','hand'),('finger','hand'),('metacarpal','hand'),('upperleg','thigh'),('lowerleg','shin'),('foot','foot'),('toe','foot')]:
        if name.startswith(prefix): return dst + side
    return 'head'
rest = {}
for name in bones:
    side = name[-1]
    if name == 'hip': h,t = joint('spine05','head'),joint('spine05','tail')
    elif name == 'neck': h,t = joint('neck01','head'),joint('neck03','tail')
    elif name.startswith('clavicle'): h,t = joint('clavicle.'+side,'head'),joint('upperarm01.'+side,'head')
    elif name.startswith('upperarm'): h,t = joint('upperarm01.'+side,'head'),joint('lowerarm01.'+side,'head')
    elif name.startswith('forearm'): h,t = joint('lowerarm01.'+side,'head'),joint('wrist.'+side,'head')
    elif name.startswith('thigh'): h,t = joint('upperleg01.'+side,'head'),joint('lowerleg01.'+side,'head')
    elif name.startswith('shin'): h,t = joint('lowerleg01.'+side,'head'),joint('foot.'+side,'head')
    else: h,t = joint(name if not name.startswith('hand') else 'wrist.'+side,'head'),joint(name if not name.startswith('hand') else 'finger3-1.'+side,'head' if name.startswith('hand') else 'tail')
    rest[name] = {'head':h.tolist(),'tail':t.tolist()}
w = np.zeros((len(verts),len(bones)))
for name, entries in weights['weights'].items():
    k = bones.index(region(name))
    for v,value in entries: w[v,k] += value
# Keep the body, eye spheres and a modest cropped shorts shell; exclude every joint/helper volume.
selected = []
for group, poly in faces:
    cloth = group == 'helper-tights' and -1.5 < np.mean(verts[poly,1]) < 1.5 and np.max(np.abs(verts[poly,0])) < 2.6
    if group == 'body' or group in ['helper-l-eye','helper-r-eye'] or cloth:
        selected.append((poly, 1 if cloth else 2 if 'eye' in group else 0))
ids = sorted({v for poly,_ in selected for v in poly}); remap={v:i for i,v in enumerate(ids)}
positions = verts[ids].copy(); indices=[]; materials=np.zeros(len(ids),dtype=np.uint8)
for poly, mat in selected:
    for v in poly: materials[remap[v]]=mat
    for i in range(1,len(poly)-1): indices.extend([remap[poly[0]],remap[poly[i]],remap[poly[i+1]]])
indices=np.array(indices,dtype='<u2'); normal=np.zeros_like(positions)
# Level the three open garment rings (waist and two leg hems). Selecting faces
# by centroid left a saw-tooth edge; preserve topology and all body vertices.
cloth_triangles=indices.reshape(-1,3)[np.all(materials[indices.reshape(-1,3)]==1,axis=1)]
cloth_edges=np.concatenate([cloth_triangles[:,[0,1]],cloth_triangles[:,[1,2]],cloth_triangles[:,[2,0]]])
cloth_edges,edge_count=np.unique(np.sort(cloth_edges,axis=1),axis=0,return_counts=True)
hem_vertices=np.unique(cloth_edges[edge_count==1])
positions[hem_vertices,1]=np.where(positions[hem_vertices,1]>0,1.5,-1.5)
tri=positions[indices.reshape(-1,3)]; fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
for k in range(3): np.add.at(normal,indices.reshape(-1,3)[:,k],fn)
normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-9)
# The source helper garment has no authored skin weights in some regions.
# Transfer nearby body influences instead of fixing the shorts to the pelvis;
# this prevents holes when the muscular hips/thighs bend against the fabric.
ww=w[ids].copy()
body_ids=np.flatnonzero(materials==0)
garment_bindings=[]
for i in np.flatnonzero(materials==1):
    distance=np.sum((positions[body_ids]-positions[i])**2,axis=1)
    nearest=body_ids[np.argpartition(distance,3)[:3]]
    blend=1/np.maximum(np.sum((positions[nearest]-positions[i])**2,axis=1),1e-8)
    blend/=blend.sum()
    garment_bindings.append({'vertex':int(i),'body':nearest.tolist(),'weights':blend.tolist()})
    ww[i]=np.sum(ww[nearest]*blend[:,None],axis=0)
    outside=np.sum(normal[nearest]*blend[:,None],axis=0); outside/=max(np.linalg.norm(outside),1e-8)
    support=np.sum(positions[nearest]*blend[:,None],axis=0)
    clearance=(positions[i]-support)@outside
    if clearance<.065: positions[i]+=outside*(.065-clearance)
tri=positions[indices.reshape(-1,3)]; fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
normal=np.zeros_like(positions)
for k in range(3): np.add.at(normal,indices.reshape(-1,3)[:,k],fn)
normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-9)
# Mild, geometry-derived cavity shading makes real sculpted folds legible.
# No painted muscle outlines or runtime textures; computed once offline.
triangles=indices.reshape(-1,3)
edges=np.concatenate([triangles[:,[0,1]],triangles[:,[1,2]],triangles[:,[2,0]]])
edges=np.concatenate([edges,edges[:,::-1]])
counts=np.maximum(np.bincount(edges[:,0],minlength=len(positions)),1)
neighbours=np.zeros_like(positions)
np.add.at(neighbours,edges[:,0],positions[edges[:,1]])
neighbours/=counts[:,None]
edge_lengths=np.linalg.norm(positions[edges[:,0]]-positions[edges[:,1]],axis=1)
local_size=np.maximum(np.bincount(edges[:,0],weights=edge_lengths,minlength=len(positions))/counts,1e-6)
cavity=np.maximum(0,np.sum((neighbours-positions)*normal,axis=1)/local_size)
occlusion=np.round((1-.28*np.clip(cavity*3,0,1)) * 255).astype(np.uint8)
occlusion[materials!=0]=255
order=np.argsort(ww,axis=1)[:,-4:]; small=np.take_along_axis(ww,order,axis=1)
small/=np.maximum(small.sum(axis=1)[:,None],1e-9)
missing=small.sum(axis=1)<.1; order[missing]=bones.index('hip'); small[missing]=[1,0,0,0]
# Muscle maps live on this continuous mesh. No separate leaf/striped sticker geometry.
# Region boundaries are learning masks, not an anatomical scan or measured activation.
n=len(ids); masks={}; coords={}
def soft(x,edge=.15): return np.clip(x/edge,0,1)
def band(x,a,b,fade=.2): return np.minimum(soft(x-a,fade),soft(b-x,fade))
y=positions[:,1]; x=np.abs(positions[:,0]); z=positions[:,2]; nz=normal[:,2]
front=soft(nz+.05,.5); back=soft(-nz+.05,.5)
base=(materials!=2).astype(float)
def put(name,mask,t=None,across=None):
    masks[name]=np.round(np.clip(mask*base,0,1)*255).astype(np.uint8)
    if t is not None: coords[name]=np.array([t,across]).T.astype('<f4')
masks.update(pectoral_masks(positions, normal, materials, rest, indices))
put('abs', band(y,1.25,4.5)*band(x,-.2,1.0)*front)
put('lats',band(y,1.6,5)*band(x,.5,2.4)*(back*.8+soft(x-1.2,.4)*.4))
put('midBack',band(y,4.2,6.3)*band(x,.2,2.1)*back)
put('erectors',band(y,.5,5.5)*band(x,0,.65)*back)
put('glutes',band(y,-.5,1.3)*band(x,.2,1.8)*back)
for side in ['R','L']:
    sign=-1 if side=='R' else 1
    for kind,ms in [('upperarm',['biceps','triceps']),('thigh',['quads','hamstrings']),('shin',['soleus'])]:
        h=np.array(rest[kind+'.'+side]['head']); tail=np.array(rest[kind+'.'+side]['tail']); axis=tail-h; length=np.linalg.norm(axis); axis/=length
        t=((positions-h)@axis)/length; radial=positions-h-t[:,None]*length*axis
        region_weight=ww[:,bones.index(kind+'.'+side)]
        surface_front=soft(normal[:,2]+.1,.6); surface_back=soft(-normal[:,2]+.1,.6)
        for muscle in ms:
            facing=surface_back if muscle in ['triceps','hamstrings','soleus'] else surface_front
            mask=region_weight*band(t,.08,.96,.16)*facing
            masks[muscle]=np.maximum(masks.get(muscle,np.zeros(n,dtype=np.uint8)), np.round(np.clip(mask*base,0,1)*255).astype(np.uint8))
        if kind=='upperarm':
            shoulder=region_weight*band(t,-.05,.40,.12)
            for muscle,facing in [('frontShoulder',surface_front),('rearShoulder',surface_back),('sideShoulder',soft(np.abs(normal[:,0])-.15,.55))]:
                masks[muscle]=np.maximum(masks.get(muscle,np.zeros(n,dtype=np.uint8)),np.round(shoulder*facing*base*255).astype(np.uint8))
        if kind=='thigh':
            for muscle,facing in [('adductors',soft(-sign*normal[:,0]-.05,.5)),('hipAbductors',soft(sign*normal[:,0]-.05,.5))]:
                visible = np.maximum(facing, surface_front*soft(-sign*radial[:,0]-.05,.35)*.65) if muscle=='adductors' else facing
                mask=region_weight*band(t,-.05,.8,.15)*visible
                masks[muscle]=np.maximum(masks.get(muscle,np.zeros(n,dtype=np.uint8)),np.round(mask*base*255).astype(np.uint8))
# Compact binary fields are decoded without platform-specific loaders or network requests.
def pack(v,dtype):return base64.b64encode(np.asarray(v,dtype=dtype).tobytes()).decode()
subprocess.check_call(['git','-C',str(a.source_root),'diff','--quiet','HEAD','--',*['makehuman/data/'+f['file'] for f in used]])
out={'version':1,'profile':'muscular-teaching-adult-v4','source':{'project':'MakeHuman','commit':PIN,'license':'CC0-1.0','copyright':weights['copyright'],'files':used},'bones':bones,'rest':rest,'grips':grips,'vertexCount':n,'positions':pack(positions,'<f4'),'normals':pack(normal,'<f4'),'indices':pack(indices,'<u2'),'skinIndices':pack(order,'u1'),'skinWeights':pack(small,'<f4'),'materials':pack(materials,'u1'),'surfaceOcclusion':pack(occlusion,'u1'),'muscleMasks':{k:pack(v,'u1') for k,v in masks.items()}}
out['garmentRevision']='level-hems-v1'
out['garmentBindings']=garment_bindings
output=a.output
output.write_text(json.dumps(out,separators=(',',':'))+'\n')
print(json.dumps({'output':str(output),'vertices':n,'triangles':len(indices)//3,'bones':len(bones),'muscles':{k:int(np.sum(v>0)) for k,v in masks.items()},'bytes':output.stat().st_size},indent=2))
