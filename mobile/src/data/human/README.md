# Training mannequin source

`makehuman.json` is an offline derivative of MakeHuman **graphical assets**, pinned to
`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`:

https://github.com/makehumancommunity/makehuman/tree/a8bc2d54ff0ac92e78ff71431b1023eda42bf482

The base OBJ, morph targets, default skeleton and weights explicitly identify their
license as **CC0**. See the upstream `LICENSE.md`, `LICENSE.ASSETS.md` and the
individual asset headers. The full CC0 text is retained at
`mobile/assets/licenses/MAKEHUMAN-CC0.md`.

Source asset credits: MakeHuman contributors, Manuel Bastioni, Data Collection AB,
Joel Palmius and Jonas Hauquier. The source weights state `(c) 2021 Data Collection
AB, Joel Palmius, Jonas Hauquier`. MakeHuman **application code** is AGPL and is not
copied into GymFinder. The converter and runtime retargeting code are GymFinder
code, operating on the CC0 graphical data.

Rebuild using Python and NumPy, with the pinned upstream checkout available locally:

```sh
python mobile/scripts/build-human-model.py --source-root /path/to/makehuman
```

The converter checks the upstream commit and clean source files. The generated
JSON embeds hashes for every source asset, little-endian binary vertex/index data,
normalized authored weights, 22 grouped bone controls and learning masks. Joint
helpers, skirt/hair/genital helpers and unused clothing are omitted; fingers are
posed into a relaxed grip and the tights helper is cropped to training shorts.

The torso/limb shape is authored human geometry. Muscle masks, pose retargeting,
nominal muscle paths and bounded muscle-belly deformation are **illustrations**,
not a scan, fascicle/force measurement, clinical musculoskeletal simulation or a
manufacturer-matched machine model. Shown colour on the shorts projects the target
region through the garment. The asset ships with the app; no model download or
external image/texture service is used at runtime.

Pectoral learning masks use the authored clavicle and upper-arm landmarks. Their
lower border rises toward the axilla, excludes the abdomen and preserves a small
sternal separation; the clavicular region is a subset of the whole pectoral fan.
They do not use the pectoral morph's displacement magnitude, which overemphasized
the lower bulge. Geometry, skeleton, weights and CC0 source hashes remain authored
data. The runtime's qualitative fibre directions fan toward the upper arm.

A full conversion uses `scripts/human_pectoral_masks.py`. To refresh **only** the
two pectoral masks in an existing bundled asset, without an upstream checkout:

```sh
python mobile/scripts/human_pectoral_masks.py
python mobile/scripts/human_pectoral_masks.py --check
```

The refresh preserves all other asset fields. Boundaries and deformations remain
educational illustrations, not a clinical anatomical atlas or an activation map.

## Muscular adult profile (photo-reference revision)

The `muscular-adult-v2` profile uses the pinned CC0 pectoral, deltoid, arm, back,
abdomen, thigh, calf and neck morphs. Bounded surface refinements add muscle-belly
volume, paired rectus bellies and shallow tendon grooves while keeping skeletal
helpers and joint ends fixed. Coefficients are in `build-human-model.py`.

The full converter recomputes rest frames, grip anchors, normals and all learning
masks from this surface. It transfers body weights to the shorts shell and gives
it a small clearance so it follows the hips and thighs instead of intersecting
them. Runtime torso retargeting preserves cross-sections along the spine rather
than tilting the chest downward with each independent rest-bone direction. A
straight two-point spine uses linear interpolation to avoid endpoint distortion.

`surfaceOcclusion` bakes a mild, geometry-derived cavity term (one byte per vertex)
for real surface folds. It has no painted muscle outlines or activity estimate.
Shape and cavity shading remain when target-muscle colour is off. The profile
retains 13,905 vertices, 27,720 triangles and one human mesh; it adds no rendering
loop, runtime texture/model download or new dependency.

The photograph guides muscular volume and transitions, not identity or exact
body measurements. Full regeneration from the pinned source is required for this
profile; the pectoral-only refresh command still changes only its two masks.
The earlier geometry/mask digests are intentionally replaced for this resculpt.

## Natural athletic profile (v3; supersedes the muscular v2 shape)

`natural-athletic-adult-v3` uses the same pinned CC0 source, topology and 23 source
files. The blend is leaner, with less added deltoid/arm/thigh bulk and lower-pec
projection, and more evenly distributed upper-pectoral relief. This is a revised
illustrative adult, not a claim that the earlier bulky body type is impossible.
Full regeneration updates the rest landmarks, garment weights and muscle masks;
the mask-only refresh must preserve this new profile's shape digest.

Runtime skinning now blends rigid motion with dual quaternions and retains an
affine stretch residual for the retargeted skeleton. This preserves joint volume
through bending/twisting while retaining exact single-bone transformations.
Authored limb/foot cross-sections stay at the common body scale, instead of
thickening when a target bone is longer. Grip targets, machine mechanisms and
exercise IDs are unchanged. Fully rigid vertices use a direct affine fast path.

The matte muted skin and eye-white/iris/pupil vertex colours are separate from
the target-muscle overlay. Switching off the overlay restores those natural
surface colours. There are no skin photographs, runtime textures, additional
meshes or animation clocks. The neutral skin is an illustrative palette, not a
reconstruction of a particular person. Real-device performance and visual
acceptance remain separate from automated tests and desktop WebGL inspection.


## Muscular teaching profile (v4; user-requested anatomy visibility)

`muscular-teaching-adult-v4` retains v3's skeleton, authored grips, topology,
23 CC0 inputs, tapered joints and volume-preserving skinning. Surface-only
belly sculpting adds visible upper-arm, thigh and calf volume; upper-pectoral
relief is broader. Joint helper points and hand/foot targets are unchanged.
Normals, cavity shading, clothing clearance/weights and masks are regenerated
from this surface together, rather than retaining masks from a different shape.

The runtime draws a small, reusable fan guide on barycentric samples of the
posed anterior chest. Full fan lines show orientation; a bright inner segment
illustrates shortening/lengthening, with endpoint markers and reversible arrows.
This segment is a learning aid, not a measured fascicle or a skin strain estimate:
skin may stretch over the moving shoulder while the underlying muscle shortens.
The muscle belly changes with the existing qualitative muscle-path model. No
colour intensity or illustrated distance is claimed as measured activation/force.
Guides hide with anatomy off and for other target muscles. There are no network
assets or additional animation clocks. Bench exercises also have an oblique
overhead camera and a fixed chest inspection window.

## Grip surface and tailored garment revision (TASK-047)

The accepted v4 body, bone landmarks, source hand pose, original CC0 inputs and
non-garment skin weights remain unchanged. `garmentRevision: level-hems-v1`
levels the existing waist/leg boundary rings without adding polygons. Offline
`garmentBindings` retain three nearby body vertices and normalized weights;
after skinning, the garment is kept outside its actual posed body support. This
prevents waist/leg edges from disappearing into the body while hips bend.

The runtime adapts the curved finger and palm surface to each explicit handle
radius. A smooth cylindrical fit preserves finger spacing along the grip, fades
to zero before the wrist and transforms surface normals. The handle radius now
includes its outer rib envelope. Surface-contact diagnostics check actual skin
clearance and contact vertices, rather than only the nominal hand centre. Opaque
contact markers are omitted in hands focus so they cannot hide the fingers.

Subtle rest-space skin variation, brow/lip tones, a smaller iris/pupil transition
and separate skin/eye/fabric roughness improve the neutral appearance. Target
colour and the existing fibre guide are independent. There are no new textures,
downloads, meshes, dependencies or animation clocks. This is an improved teaching
model, not a photoreal scan or a force/contact-pressure simulation.

## Balanced athletic profile (v5; TASK-047 follow-up)

User feedback identified excessive arching and an unbalanced silhouette in views
around the body. `balanced-athletic-adult-v5` supersedes the v4 shape: bounded
belly sculpt coefficients are reduced on upper arms, thighs and calves; upper
pectoral/abdominal relief is moderated; posterior lumbar hollowing is softened
and the waist is slightly less cinched. Skeletal helpers, hand reference geometry,
grip anchors, topology and the same 23 pinned CC0 source files are retained.
Normals, masks, garment weights/bindings and cavity shading are regenerated from
this actual surface together. The profile remains a muscular teaching adult,
not a universal set of body measurements or a clinical posture model.

`torsoRetarget` uses one continuous source reference from pelvis to upper spine.
Previously each vertebra removed its own curved source depth independently,
which pushed the ribcage forward relative to pelvis and shoulder attachments.
Neutral sections now share one affine reference; intentional exercise flexion
is retained. Generic 2D head offsets no longer become backward 3D neck tilt:
the head follows the upper-spine direction. The hand-surface fit, garment support
correction and skin/eye/fabric materials from the grip revision remain active.
The flat bench stays level; its lower bar height is adjusted to the revised chest
surface while its lower-chest alignment and upper endpoint stay fixed.

## Regional definition (v6; TASK-048)

`defined-athletic-adult-v6` retains the v5 continuous torso reference and neutral
posture. Only the requested visible anatomy is resculpted: the clavicular chest
has a separate upper belly and a shallow sternal/oblique division; upper-arm
belly refinement increases from .20 to .30 with the same zero-at-joint window;
paired abdominal relief increases from .08 to .10. Broad lateral posterior lats
and scapular bellies add depth and a shallow boundary, with an explicit exclusion
of the central lumbar strip. These are authored sculpt coefficients, not measured
percentages of muscle size. Thigh/calf coefficients and all joint helpers stay fixed.

The same 23 pinned CC0 inputs, topology, rest skeleton, grip references and 3,094
rigid hand vertices are preserved. Normals, the 17 masks, garment support bindings
and cavity shading are rebuilt from the surface; clothing weights may refresh
through their support bindings. Existing target tint/fibre animation remains an
educational illustration, not a simulation of forces or measured activation.

## Bodybuilder anatomy (v7; TASK-052)

`bodybuilder-anatomy-v7` uses a contest-bodybuilding physique as a visual reference
for muscle mass and separation. It is an original CC0-based teaching model, not
a scan or replica of a named competitor. Compared with v6, upper-arm bellies,
outer deltoid caps, forearms, quadriceps/hamstrings and posterior calves are fuller.
Upper pectoral, abdominal/oblique, scapular, trapezius and latissimus volumes have
shallow geometric boundaries. Geometry-derived cavity shading makes these folds
legible with target tint off. There are no painted black muscle lines or new textures.
The supplied front/posing/back photographs guide the final proportions: pectorals
form a broad, smoothly rounded fan below the clavicles instead of isolated bumps;
abdominal bellies have flattened rounded-rectangular centres. Warm skin with softer
specular highlights makes the actual surface contours visible while moving.
The same shorts-shell topology is shortened to upper-thigh training trunks so the
quadriceps remain visible. Waist/groin coverage is retained and cloth support is
rebound to the actual body surface (`short-training-hems-v2`).

The sculpt tapers at tendon/joint ends, keeps anterior shins restrained and excludes
the neutral lumbar strip from added posterior torso mass. Source joints, topology,
hand/grip references, retargeting and the single animation clock remain unchanged.
The same pinned CC0 inputs reproduce positions, normals, masks, clothing support
and shading together. Shape coefficients are authoring controls rather than real
muscle-volume measurements. Target tint indicates the intended exercise region;
it does not measure force or activation. Pro mode still hides contraction theory.

## Regional definition (v8; TASK-053)

`regional-definition-v8` retains v7's skeleton, mass, hands and topology. A shallow
clavicular/sternocostal groove follows the same clavicle/axilla landmarks as the
chest masks. Geometry-derived cavity shading is refreshed. The renderer adds a
rest-surface definition field: the chest division and other mask boundaries retain
soft contrast as the body moves, including when target colouring is disabled.
In chest exercises, amber identifies the clavicular region and coral the
sternocostal region; both remain identifiable when only upper chest is targeted.
Active masks still exclusively drive the existing deformation/tint attributes.
These are educational regional colours, not measured activation or force. The
legend lets each region be inspected close up, uses the selected language, stays
outside the canvas, and is hidden with
colouring off or the SVG view. There is no new mesh, texture, animation clock,
record schema or runtime dependency.

## Anatomical surface rework (v9; user correction to TASK-053)

`anatomical-surface-v9` refines only torso and limb skin with conforming curved
edge samples. Face, hands, feet, joint ends and clothing topology remain authored;
new skin vertices interpolate the original weights. The surface now has 24,000
vertices / 47,910 triangles, capped at 24,000 vertices, in the same single mesh.
`human_anatomy_surface.py` sculpts distinct pectoral fans, deltoid insertions,
biceps/triceps compartments, rectus/obliques/serratus, scapular/trapezius/lat
contours, quadriceps/hamstrings and paired posterior calves. It uses actual
surface relief with bounded valleys and tendon taper, not a global size increase
or additional muscle objects. Normals, AO, masks and cloth bindings are regenerated.
The previous broad mask-boundary shading is reduced so real surface contours
carry the neutral, uncoloured view. References are the supplied front/posing/back
physique photographs; user acceptance is based on the actual uncoloured model,
not on automated tests or identification colours alone.

The refined neutral view uses softer cavity shading, a low frontal bounce light
and a skin roughness of 0.54. Inspection mode fades equipment further so pads
do not obscure muscle contours. The existing dual-quaternion skinning and its animation clock are retained.


## Photo-reference pectoral fan (v10; further user correction to TASK-053)

`photo-pectoral-fan-v10` replaces the stacked chest relief with a continuous
anterior fan over an oval ribcage. The supplied 2026-11-18 front photograph guides
the broad clavicular slope, narrow sternal separation, rounded lower belly and
rising axillary end. The crown lies lower at mid-width than at either end.
The source sternum stays fixed. Depth alone changes in the anterior chest and
its subpectoral transition; every X/Y coordinate, topology, authored weight,
bone, grip and garment binding is retained byte-for-byte from v9. Model counts
remain 24,000 vertices / 47,910 triangles in one mesh, using the same 23 CC0 inputs.

`shape_pectoral_fan` runs after garment bindings so the chest change cannot alter
a distant garment neighbour chosen from equal-distance candidates. Four pairs
of local, depth-only fairing smooth the patch edge without moving attachments.
The surface and chest masks use the same `pectoral_borders` silhouette. Chest,
upper-chest and the three neighbouring arm/shoulder learning masks are refreshed;
other masks remain unchanged. Normal/AO data are regenerated, with existing
lighting, material, animation deformation and pectoral fibre cues retained.

This is a shape correction to the training mannequin, not a photographic scan.
Visual acceptance must compare the actual uncoloured model with the supplied
reference in front, oblique, side and moving poses. Tests do not grant visual LGTM.


## Lower pectoral smoothing (v11; user accepts v10 upper/middle chest)

`photo-pectoral-lower-smooth-v11` keeps v10's approved upper and middle chest.
Only the lower rim and its immediate ribcage transition use local quadratic
surface fits. A compact feathered window ends before the chest crown. Fits
correct depth by at most 0.051 authored units and supply continuous analytic
normals; cavity shading is refreshed within that same window. No X/Y coordinate,
triangle, weight, bone, grip or garment binding changes. The protected 23,488
vertices retain position/normal/AO bytes exactly; the upper-chest mask is also
unchanged. The whole-chest mask changes by at most one byte at six protected
vertices through its existing neighbouring-mask smoothing, with no visible
anatomical-boundary change. Lower-region arm/shoulder masks are refreshed normally.

The lower-rim normal residual falls from 0.07185 to 0.03165 in the inspection
sample. This is a rendering continuity metric, not an anatomical or force
measurement and not a substitute for visual acceptance. Vertex/triangle counts,
lighting, materials, active contraction, frame cost and storage schemas remain
unchanged. The generator performs the fit offline with NumPy only.


## Subpectoral torso bridge (v12; user correction below the coloured chest)

`photo-subpectoral-bridge-v12` repairs the broad hollow between the pectoral
fan and upper abdomen that rim-only smoothing left behind. Boundary heights are
sampled from the existing skin at the lower chest and upper abdominal wall.
An outward, monotone interpolation fills the depression with a feathered join;
it never lowers a source vertex. The lower boundary follows the upper abdominal
curve so the remaining abdominal definition is retained. The source is not
recoloured or relit to conceal the hollow.

Only anterior depth below the lower fifth of the fan changes. All X/Y, topology,
weights, bones, grips and garment bindings remain fixed. Upper/middle pectoral
positions, normals and AO are unchanged; 22,798 protected vertices keep the same
position/normal/AO bytes as v11. The modified region now includes the upper
abdominal transition, which was outside the previous narrow-rim correction.
Normal fields use the same local quadratic fit, with three normal-fairing passes
for the bridge; both fitting and shading updates run offline. The original v11
rim fit uses its original support and depth behaviour.

Geometry regressions bound the undercut below the coloured chest and prevent
an artificial central pit. Runtime deformation also feathers the lower attachment:
its chest-only contraction scale rises smoothly from 0.15 at the lower boundary
to 1 at one third of fan height. Upper/middle contraction remains exactly unchanged;
other muscles retain their existing deformation. A single precomputed CPU array
supplies two scalar weights in the existing deformation loop, with no additional
frame loop, clock, scene node or storage schema.

Posed regressions cover press, fly and dip at start, midpoint and end, plus exact
upper/middle deformation preservation. Review must inspect target colouring on
and off in the actual app through the movement. Lighting, materials and model
vertex/triangle counts are unchanged. A reference photograph cannot serve as a
clinical model or a measured activation/force map.

## Natural arm/back surface (v13; TASK-058)

`photo-natural-arm-back-v13` removes small knotted ridges in the upper arms,
forearms and posterior torso while retaining broad deltoid, biceps, triceps,
scapular and latissimus volumes. `human_arm_back_surface.py` runs after the
accepted v12 sculpt/masks: three local quadratic-fit passes, feathered by skin
weights and surface orientation, followed by bounded normal/AO fairing. A local
face-orientation backtrack prevents inverted scapular triangles. A shared elbow
window also protects joint geometry where upper-arm/forearm weights overlap;
the accepted elbow taper remains unchanged. This is an
offline asset change, with no extra runtime meshes, textures or frame loops.

18,901 vertices outside the authorised region keep their v12 position, normal
and AO bytes. All topology, bones, skin weights, grip references, muscle masks,
garment bindings, chest shape and movement paths remain unchanged. Frozen v12
indices/positions in the test fixture define this authorised edit independently
of the replacement asset. Older whole-body hash assertions now scope to those
protected vertices; expected values were calculated from accepted commit
`759003b`, not from the new surface. Numerical tests also retain broad extents,
limit displacement and check triangle orientation and neighbouring-normal
variation. These checks support, rather than replace, front/side/rear visual
review in the actual app with target colouring both on and off.
