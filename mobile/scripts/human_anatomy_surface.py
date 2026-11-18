"""Offline, continuous anatomical surface refinement. No runtime geometry layers.

Preserve the authored grip/face/foot vertices and skeletal helper references.
New edge samples inherit skin weights; all incident triangles share the sample.
"""
import numpy as np
from human_pectoral_masks import pectoral_borders


def normals(positions, triangles):
    p = positions[triangles]
    faces = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])
    result = np.zeros_like(positions)
    for k in range(3):
        np.add.at(result, triangles[:, k], faces)
    return result / np.maximum(np.linalg.norm(result, axis=1)[:, None], 1e-9)


def limb_coordinates(positions, rest, name):
    head, tail = np.array(rest[name]['head']), np.array(rest[name]['tail'])
    axis = tail - head
    length = np.linalg.norm(axis)
    axis /= length
    t = (positions - head) @ axis / length
    radial = positions - head - t[:, None] * length * axis
    radius = np.maximum(np.linalg.norm(radial, axis=1), 1e-8)
    return t, radial, radius


def refine_surface(positions, triangles, materials, weights, bones, rest):
    original_count = len(positions)
    for iteration in range(4):
        allowed = np.zeros(len(positions), dtype=bool)
        # Refine torso and muscle bellies, never the head, fingers or joint ends.
        spine = weights[:, [i for i, name in enumerate(bones) if name.startswith('spine')]].sum(axis=1)
        allowed |= (spine > .25) & (positions[:, 1] > 1.3) & (positions[:, 1] < 6.25)
        limb_allowed = np.zeros(len(positions), dtype=bool)
        for side in ['R', 'L']:
            for kind in ['upperarm', 'forearm', 'thigh', 'shin']:
                t, _, _ = limb_coordinates(positions, rest, kind+'.'+side)
                region=(weights[:, bones.index(kind+'.'+side)] > .35) & (t > .06) & (t < .88)
                allowed |= region; limb_allowed |= region
        excluded = weights[:, [i for i, n in enumerate(bones) if n.startswith(('hand', 'foot', 'head', 'neck'))]].sum(axis=1)
        allowed &= (materials == 0) & (excluded < .04)
        if iteration == 2:
            allowed &= (spine > .5) & (positions[:,1] > 1.5) & (positions[:,1] < 6.2)
        if iteration == 3:
            allowed &= limb_allowed
        edges = np.concatenate([triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]])
        edges = np.unique(np.sort(edges, axis=1), axis=0)
        length = np.linalg.norm(positions[edges[:, 1]] - positions[edges[:, 0]], axis=1)
        candidates = np.flatnonzero(allowed[edges].all(axis=1) & (length > (.14 if iteration >= 2 else .24)))
        budget = 24000 - len(positions)
        if budget <= 0 or not len(candidates):
            break
        candidates = candidates[np.argsort(-length[candidates], kind='stable')[:budget]]
        selected = edges[candidates]
        normal = normals(positions, triangles)
        a, b = positions[selected[:, 0]], positions[selected[:, 1]]
        na, nb = normal[selected[:, 0]], normal[selected[:, 1]]
        chord = b - a
        # Cubic point-normal edge: smooth curved skin instead of flat midpoints.
        c1 = (2*a+b-(chord*na).sum(axis=1)[:, None]*na)/3
        c2 = (2*b+a+(chord*nb).sum(axis=1)[:, None]*nb)/3
        offset = (a+b+3*(c1+c2))/8 - (a+b)/2
        size = np.linalg.norm(offset, axis=1)
        offset *= np.minimum(1, .07/np.maximum(size, 1e-9))[:, None]
        midpoints = (a+b)/2 + offset
        lookup = {tuple(edge): len(positions)+i for i, edge in enumerate(selected)}
        refined = []
        for tri in triangles:
            v = list(map(int, tri))
            mids = [lookup.get(tuple(sorted((v[i], v[(i+1)%3])))) for i in range(3)]
            count = sum(x is not None for x in mids)
            if not count:
                refined.append(v)
            elif count == 3:
                a0,b0,c0=v; ab,bc,ca=mids
                refined.extend([[a0,ab,ca],[ab,b0,bc],[ca,bc,c0],[ab,bc,ca]])
            else:
                turn = next(i for i, m in enumerate(mids) if m is not None) if count == 1 else (next(i for i,m in enumerate(mids) if m is None)+1)%3
                a0,b0,c0=[v[(i+turn)%3] for i in range(3)]
                ab,bc,ca=[mids[(i+turn)%3] for i in range(3)]
                if count == 1:
                    refined.extend([[a0,ab,c0],[ab,b0,c0]])
                else:
                    refined.extend([[b0,bc,ab],[a0,ab,c0],[ab,bc,c0]])
        positions = np.concatenate([positions, midpoints])
        weights = np.concatenate([weights, (weights[selected[:, 0]]+weights[selected[:, 1]])/2])
        materials = np.concatenate([materials, np.zeros(len(selected), dtype=materials.dtype)])
        triangles = np.asarray(refined, dtype=np.uint16)
    return positions, triangles, materials, weights, original_count


def sculpt_anatomy(positions, materials, weights, bones, rest):
    """Belly contours and intermuscular valleys; no uniform volume multiplier."""
    p = positions.copy()
    x, y, z = np.abs(p[:, 0]), p[:, 1], p[:, 2]
    skin = (materials == 0).astype(float)
    smooth = lambda v: np.clip(v, 0, 1)**2*(3-2*np.clip(v, 0, 1))
    band = lambda v, a, b, f: smooth((v-a)/f)*smooth((b-v)/f)
    g = lambda v, c, width: np.exp(-((v-c)/width)**2)
    front = smooth((z-.35)/.6)*skin
    back = smooth((-z-.25)/.6)*skin
    collar = rest['clavicle.L']['head'][1]
    # Clavicular fan, sternocostal belly and the fold into the humeral insertion.
    lateral = np.clip(x/1.85, 0, 1)
    lower_edge = collar-1.30+.67*lateral**1.6
    division = collar-.63+.13*lateral
    chest_window = band(x,.08,1.87,.24)*band(y,lower_edge-.06,collar-.05,.18)
    relief = (.13*g(y,division+.24,.25)+.10*g(y,(division+lower_edge)/2,.30)) * chest_window
    relief -= .035*g(x,0,.09)*band(y,4.55,5.85,.16)
    # Flat rectus bellies, tendinous intersections, oblique/serratus transitions.
    abdomen = band(x,.05,.98,.14)*band(y,1.85,4.45,.22)
    for level in [4.03,3.25,2.47]:
        relief += .075*np.exp(-((x-.40)/.30)**4-((y-level)/.27)**4)*abdomen
    relief -= .055*g(x,0,.13)*band(y,1.9,4.45,.25)
    for level in [3.64,2.86]:
        relief -= .055*g(y,level-.045*x*x,.12)*band(x,.08,.93,.14)
    oblique = .86+.14*(y-2.3)
    relief += .055*g(x,oblique+.16,.19)*band(y,2.0,4.15,.35)
    relief -= .035*g(x,oblique-.06,.09)*band(y,2.15,4.0,.25)
    for level in [3.85,4.18,4.51]:
        relief += .020*g(y,level+.42*(x-1.15),.14)*band(x,1.02,1.78,.22)
    positions[:, 2] += relief*front
    # Trapezius diamond, scapular contours, sweeping lats and paired erectors.
    upper_back = band(y,4.1,6.25,.25)*band(x,.15,1.8,.2)
    back_relief = .085*g(x,.47+.55*(6.0-y),.42)*upper_back
    back_relief -= .055*g(y,5.50-.60*x,.10)*band(x,.35,1.8,.2)*band(y,4.1,5.7,.2)
    back_relief -= .055*g(y,4.45-.25*x,.12)*band(x,.55,1.9,.25)
    lat_axis = .74+.36*(y-2.25)
    back_relief += .070*g(x,lat_axis,.42)*band(y,2.2,4.95,.45)
    back_relief -= .045*g(x,lat_axis-.48,.12)*band(y,2.5,4.55,.30)
    back_relief += .045*g(x,.32,.17)*band(y,1.8,4.6,.3)
    back_relief -= .025*g(x,0,.10)*band(y,2.0,5.5,.3)
    positions[:, 2] -= back_relief*back
    # Limb compartments follow authored bone axes and taper to zero at joints.
    for side in ['R','L']:
        sign = -1 if side == 'R' else 1
        for kind in ['upperarm','forearm','thigh','shin']:
            name = kind+'.'+side
            t, radial, radius = limb_coordinates(p, rest, name)
            facing = radial[:, 2]/radius
            outer = sign*radial[:, 0]/radius
            window = np.sin(np.pi*np.clip((t-.10)/.78,0,1))**2
            coverage = np.clip(weights[:, bones.index(name)],0,1)*skin*window
            anterior, posterior = smooth((facing+.05)/.65), smooth((-facing+.05)/.65)
            value = np.zeros(len(p))
            if kind == 'upperarm':
                # The deltoid has a V-shaped distal insertion, not a round ball.
                border = .27+.13*np.clip(outer,0,1)
                value += .10*g(t,.19,.13)*smooth((outer+.2)/.8)
                value -= .13*g(t,border,.075)*smooth((outer+.15)/.55)
                biceps = band(t,.32,.88,.10)*anterior
                value += (.10*g(outer,.20,.44)-.035*g(outer,-.23,.18))*biceps
                value -= .11*g(outer,.76,.20)*band(t,.36,.86,.12)
                value += (.085*g(outer,.25,.38)+.055*g(outer,-.38,.30)-.045*g(outer,-.08,.18))*posterior*band(t,.30,.88,.12)
            elif kind == 'forearm':
                value += .045*(g(outer,.40,.25)+g(outer,-.35,.3))*anterior
                value -= .030*g(outer,.08+.20*t,.22)*anterior
            elif kind == 'thigh':
                # Rectus femoris and vasti, including the medial knee teardrop.
                value += (.09*g(outer,0,.28)+.085*g(outer,.65,.24))*anterior
                value += .10*g(t,.73,.14)*g(outer,-.55,.24)*anterior
                value -= .13*(g(outer,.32+.08*t,.15)+g(outer,-.31-.08*t,.15))*anterior*band(t,.20,.84,.12)
                value += .065*(g(outer,-.35,.27)+g(outer,.35,.27))*posterior
                value -= .055*g(outer,0,.13)*posterior*band(t,.25,.84,.10)
            else:
                value += .085*(g(outer,-.34,.29)+g(outer,.34,.29))*posterior*band(t,.15,.72,.13)
                value -= .080*g(outer,0,.17)*posterior*band(t,.18,.68,.12)
            positions += radial/radius[:, None]*(value*coverage)[:, None]
    return positions


def fair_surface(positions, triangles, materials, weights, bones, rest):
    """Six low-pass/nonshrinking pairs remove facets between relief samples."""
    allowed = np.zeros(len(positions), dtype=bool)
    spine = weights[:, [i for i,n in enumerate(bones) if n.startswith('spine')]].sum(axis=1)
    allowed |= (spine > .25) & (positions[:,1] > 1.3) & (positions[:,1] < 6.25)
    for side in ['R','L']:
        for kind in ['upperarm','forearm','thigh','shin']:
            t,_,_=limb_coordinates(positions,rest,kind+'.'+side)
            allowed |= (weights[:,bones.index(kind+'.'+side)]>.35) & (t>.10) & (t<.88)
    excluded=weights[:,[i for i,n in enumerate(bones) if n.startswith(('hand','foot','head','neck'))]].sum(axis=1)
    allowed &= (materials==0) & (excluded<.04)
    edges=np.concatenate([triangles[:,[0,1]],triangles[:,[1,2]],triangles[:,[2,0]]])
    edges=np.unique(np.sort(edges,axis=1),axis=0)
    edges=np.concatenate([edges,edges[:,::-1]])
    count=np.maximum(np.bincount(edges[:,0],minlength=len(positions)),1)
    for _ in range(6):
        for amount in [.40,-.41]:
            neighbour=np.zeros_like(positions)
            np.add.at(neighbour,edges[:,0],positions[edges[:,1]])
            neighbour/=count[:,None]
            positions[allowed]+=(neighbour[allowed]-positions[allowed])*amount
    return positions


def shape_pectoral_fan(positions, triangles, materials, rest):
    """A broad sternal fan sweeps into the axilla, not two hanging domes.

    Reconstruct depth only in the anterior chest. Preserve X/Y, surface topology,
    authored weights and all other regions. Run after fairing so the shared
    tessellation and the accepted limb/abdominal surfaces stay identical.
    """
    x, y, z = np.abs(positions[:, 0]), positions[:, 1], positions[:, 2]
    collar = (rest['clavicle.L']['head'][1]+rest['clavicle.R']['head'][1])/2
    shoulder = (abs(rest['upperarm.L']['head'][0])+abs(rest['upperarm.R']['head'][0]))/2
    smooth = lambda v: np.clip(v, 0, 1)**2*(3-2*np.clip(v, 0, 1))
    lateral = x/shoulder
    # Photo reference: the sternal end stops higher, the lower belly rounds
    # down, then the border sweeps up into the anterior axillary fold.
    bottom, top, _ = pectoral_borders(x, rest)
    height = np.maximum(top-bottom,.25)
    t = (y-bottom)/height
    v = np.clip(t,0,1)
    # A rounded lower-third crown and a long, shallow clavicular slope.
    peak = 1.4/(1.4+2.7)
    belly = v**1.4*(1-v)**2.7/(peak**1.4*(1-peak)**2.7)
    medial = smooth(x/.32)
    tendon = smooth((shoulder*1.02-x)/.40)
    fan = .30*medial*tendon*belly
    # An oval thorax underlies the muscle. No constant-depth flat shelf and no
    # extra spherical lobe under the sternal end.
    ribs = 1.42*np.sqrt(np.maximum(.12,1-(x/(shoulder*1.11))**2))
    ribs *= 1-.08*smooth((y-(collar-.30))/.30)
    ribs += .045*np.exp(-(x/.22)**2)
    target = ribs+fan
    # A shallow clavicular transition; never a detached upper-chest strip.
    divide = collar-.63+.13*np.clip(lateral,0,1)
    target -= .008*np.exp(-((y-divide)/.13)**2)*medial*tendon
    # Blend across the subpectoral ribcage as well; stopping exactly on the
    # lower fold leaves a corrugated rim from the previous stacked sculpts.
    guard = smooth((y-(collar-1.72))/.35)*smooth((collar+.09-y)/.22)
    # The sternal attachment remains on its authored surface. Raising a strip
    # down the midline creates a false round pit where that strip ends.
    guard *= smooth((x-.04)/.30)
    guard *= smooth((shoulder*1.07-x)/.28)*smooth((z-.45)/.60)
    guard *= materials==0
    positions[:,2] += (target-z)*guard
    # Fair only chest depth at the feathered edge. Do not move attachment X/Y
    # or pull the accepted abdomen, shoulders or limbs into the chest patch.
    edges = np.concatenate([triangles[:,[0,1]],triangles[:,[1,2]],triangles[:,[2,0]]])
    edges = np.unique(np.sort(edges,axis=1),axis=0)
    edges = np.concatenate([edges,edges[:,::-1]])
    count = np.maximum(np.bincount(edges[:,0],minlength=len(positions)),1)
    for _ in range(4):
        for amount in [.35,-.36]:
            mean = np.bincount(edges[:,0],weights=positions[edges[:,1],2],minlength=len(positions))/count
            positions[:,2] += (mean-positions[:,2])*amount*guard
    return positions


def smooth_lower_pectoral(positions, normal, occlusion, triangles, materials, rest):
    """Local quadratic skin patches remove the corrugated lower rim only.

    Keep the approved crown/clavicular surface and every other region exactly.
    Fit a smooth height field, including its analytic normal, over nearby skin.
    This is offline; the mesh, rig and runtime work remain unchanged.
    """
    x, y, z = np.abs(positions[:,0]), positions[:,1], positions[:,2]
    bottom, top, shoulder = pectoral_borders(x, rest)
    t = (y-bottom)/np.maximum(top-bottom,.25)
    smooth = lambda v: np.clip(v,0,1)**2*(3-2*np.clip(v,0,1))
    influence = smooth((.30-t)/.12)*smooth((t+.25)/.18)
    influence *= smooth((x-.04)/.24)*smooth((shoulder*.99-x)/.24)
    influence *= smooth((z-.45)/.45)*smooth((y-4.18)/.10)*(materials==0)
    return _fit_skin_patch(positions,normal,occlusion,triangles,materials,rest,influence)


def _fit_skin_patch(positions, normal, occlusion, triangles, materials, rest, influence,
                    min_y=3.95, adjust_depth=True, normal_passes=0):
    x,y,z = np.abs(positions[:,0]),positions[:,1],positions[:,2]
    shoulder = abs(rest['upperarm.L']['head'][0])
    changed = np.flatnonzero(influence>0)
    front = (z>.40) if adjust_depth else (normal[:,2]>0)
    support = np.flatnonzero((materials==0)&front&(x<shoulder*1.08)&(y>min_y)&(y<6.1))
    original = positions.copy()
    fitted_normal = normal.copy()
    radius = .36
    for vertex in changed:
        delta = (original[support,:2]-original[vertex,:2])/radius
        distance = (delta*delta).sum(axis=1)
        local = distance<1
        if local.sum()<10:
            continue
        dx,dy = delta[local].T
        weight = np.exp(-distance[local]/.40)*(1-distance[local])**2
        basis = np.stack([np.ones(len(dx)),dx,dy,dx*dx,dx*dy,dy*dy],axis=1)
        design = basis*np.sqrt(weight[:,None])
        values = original[support[local],2]*np.sqrt(weight)
        coefficients = np.linalg.lstsq(design,values,rcond=1e-6)[0]
        amount = influence[vertex]*.85
        correction = np.clip(coefficients[0]-original[vertex,2],-.06,.06)
        if adjust_depth:
            positions[vertex,2] += amount*correction
        direction = np.array([-coefficients[1]/radius,-coefficients[2]/radius,1.])
        direction /= np.linalg.norm(direction)
        fitted_normal[vertex] = normal[vertex]*(1-amount)+direction*amount
        fitted_normal[vertex] /= np.linalg.norm(fitted_normal[vertex])
    # Derive cavity shading from the corrected surface, retaining untouched AO.
    edges = np.concatenate([triangles[:,[0,1]],triangles[:,[1,2]],triangles[:,[2,0]]])
    edges = np.concatenate([edges,edges[:,::-1]])
    count = np.maximum(np.bincount(edges[:,0],minlength=len(positions)),1)
    for _ in range(normal_passes):
        neighbors = np.zeros_like(fitted_normal)
        np.add.at(neighbors,edges[:,0],fitted_normal[edges[:,1]])
        neighbors /= count[:,None]
        neighbors /= np.maximum(np.linalg.norm(neighbors,axis=1)[:,None],1e-9)
        amount = .55*influence[changed,None]
        blend = fitted_normal[changed]*(1-amount)+neighbors[changed]*amount
        fitted_normal[changed] = blend/np.maximum(np.linalg.norm(blend,axis=1)[:,None],1e-9)
    mean = np.zeros_like(positions)
    np.add.at(mean,edges[:,0],positions[edges[:,1]])
    mean /= count[:,None]
    lengths = np.linalg.norm(positions[edges[:,0]]-positions[edges[:,1]],axis=1)
    scale = np.maximum(np.bincount(edges[:,0],weights=lengths,minlength=len(positions))/count,1e-6)
    cavity = np.maximum(0,((mean-positions)*fitted_normal).sum(axis=1)/scale)
    shade = (1-.16*np.clip(cavity*3,0,1))*255
    result_ao = np.round(occlusion*(1-influence)+shade*influence).astype(np.uint8)
    return positions, fitted_normal, result_ao


def bridge_subpectoral_wall(positions, normal, occlusion, triangles, materials, rest):
    """Fill the hollow below the coloured chest into a continuous torso wall.

    Boundary depths come from the existing chest and upper abdomen. A monotone,
    outward curve between them removes the undercut; it never excavates skin.
    The approved upper/middle pectoral surface remains fixed.
    """
    p = positions.copy()
    x,y = p[:,0],p[:,1]
    shoulder = abs(rest['upperarm.L']['head'][0])
    smooth = lambda v: np.clip(v,0,1)**2*(3-2*np.clip(v,0,1))
    grid = np.linspace(-shoulder*1.03,shoulder*1.03,161)
    bottom,top,_ = pectoral_borders(grid,rest)
    upper_y = bottom+.20*(top-bottom)*smooth(np.abs(grid)/.30)
    lower_y = 3.90-.18*(grid/shoulder)**2
    # Intersect the anterior skin, including the lateral wall where Z is small.
    valid = np.all((materials[triangles]==0)&(p[triangles,1]>3.0)&(p[triangles,1]<6.2),axis=1)
    a,b,c = [p[triangles[valid,k]] for k in range(3)]
    determinant = (b[:,1]-c[:,1])*(a[:,0]-c[:,0])+(c[:,0]-b[:,0])*(a[:,1]-c[:,1])
    usable = np.abs(determinant)>1e-10
    denominator = np.where(usable,determinant,1)
    def depth(px,py):
        u = ((b[:,1]-c[:,1])*(px-c[:,0])+(c[:,0]-b[:,0])*(py-c[:,1]))/denominator
        v = ((c[:,1]-a[:,1])*(px-c[:,0])+(a[:,0]-c[:,0])*(py-c[:,1]))/denominator
        hit = usable&(u>=-1e-6)&(v>=-1e-6)&(1-u-v>=-1e-6)
        return np.max((u*a[:,2]+v*b[:,2]+(1-u-v)*c[:,2])[hit]) if hit.any() else np.nan
    def boundary(heights):
        values = np.array([depth(px,py) for px,py in zip(grid,heights)])
        finite = np.isfinite(values)
        values = np.interp(grid,grid[finite],values[finite])
        # Remove triangle-scale variation from the control curve only.
        padded = np.pad(values,(2,2),mode='edge')
        return np.convolve(padded,np.array([1,4,6,4,1])/16,mode='valid')
    lower_z,upper_z = boundary(lower_y),boundary(upper_y)
    y0 = np.interp(x,grid,lower_y); y1 = np.interp(x,grid,upper_y)
    z0 = np.interp(x,grid,lower_z); z1 = np.interp(x,grid,upper_z)
    t = np.clip((y-y0)/np.maximum(y1-y0,.3),0,1)
    roundness = .40+.60*smooth(np.abs(x)/(shoulder*.80))
    outward = t+roundness*t*(1-t)
    target = z0+(z1-z0)*outward
    influence = smooth((y-y0)/.28)*smooth((y1-y)/.20)
    influence *= smooth((shoulder*1.02-np.abs(x))/.24)
    influence *= smooth(normal[:,2]/.20)*(materials==0)
    lift = np.clip(target-p[:,2],0,.65)
    positions[:,2] += lift*influence
    return _fit_skin_patch(positions,normal,occlusion,triangles,materials,rest,influence,
                           min_y=3.1,adjust_depth=False,normal_passes=3)
