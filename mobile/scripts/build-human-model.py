"""Convert pinned MakeHuman CC0 data into an offline, weighted training mannequin.
No MakeHuman application code is used. Run with Python + NumPy and --source-root.
"""
import argparse, base64, hashlib, json, subprocess
from pathlib import Path
import numpy as np

PIN = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
p = argparse.ArgumentParser()
p.add_argument('--source-root', required=True, type=Path)
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
verts += morph('macrodetails/universal-male-young-maxmuscle-averageweight') * .75
verts += morph('macrodetails/universal-male-young-maxmuscle-minweight') * .25
pectoral_shape = morph('torso/torso-muscle-pectoral-incr')
verts += pectoral_shape * .2
for side in ['l', 'r']:
    for area in ['upperarm', 'lowerarm', 'upperleg', 'lowerleg']:
        verts += morph('armslegs/' + side + '-' + area + '-muscle-incr') * .12
skel = json.loads(read('rigs/default.mhskel'))
weights = json.loads(read('rigs/default_weights.mhw'))
assert skel['license'] == 'CC0' and weights['license'] == 'CC0'
def joint(bone, end):
    return np.mean(verts[skel['joints'][skel['bones'][bone][end]]], axis=0)
# Pose the authored finger chains into a relaxed cylindrical grip before collapsing
# facial/twist controls. Keep the real hand topology and original weighted skinning.
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
tri=positions[indices.reshape(-1,3)]; fn=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
for k in range(3): np.add.at(normal,indices.reshape(-1,3)[:,k],fn)
normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-9)
ww=w[ids]; order=np.argsort(ww,axis=1)[:,-4:]; small=np.take_along_axis(ww,order,axis=1)
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
pec = np.linalg.norm(pectoral_shape[ids],axis=1)
pec = np.clip(pec/max(np.percentile(pec[pec>0],85),1e-8),0,1)
put('chest', pec*band(y,4.0,5.95)*front)
put('upperChest', pec*band(y,4.9,6)*front)
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
                mask=region_weight*band(t,-.05,.8,.15)*facing
                masks[muscle]=np.maximum(masks.get(muscle,np.zeros(n,dtype=np.uint8)),np.round(mask*base*255).astype(np.uint8))
# Compact binary fields are decoded without platform-specific loaders or network requests.
def pack(v,dtype):return base64.b64encode(np.asarray(v,dtype=dtype).tobytes()).decode()
subprocess.check_call(['git','-C',str(a.source_root),'diff','--quiet','HEAD','--',*['makehuman/data/'+f['file'] for f in used]])
out={'version':1,'source':{'project':'MakeHuman','commit':PIN,'license':'CC0-1.0','copyright':weights['copyright'],'files':used},'bones':bones,'rest':rest,'vertexCount':n,'positions':pack(positions,'<f4'),'normals':pack(normal,'<f4'),'indices':pack(indices,'<u2'),'skinIndices':pack(order,'u1'),'skinWeights':pack(small,'<f4'),'materials':pack(materials,'u1'),'muscleMasks':{k:pack(v,'u1') for k,v in masks.items()}}
output=Path(__file__).resolve().parents[1]/'src/data/human/makehuman.json'
output.write_text(json.dumps(out,separators=(',',':'))+'\n')
print(json.dumps({'output':str(output),'vertices':n,'triangles':len(indices)//3,'bones':len(bones),'muscles':{k:int(np.sum(v>0)) for k,v in masks.items()},'bytes':output.stat().st_size},indent=2))
