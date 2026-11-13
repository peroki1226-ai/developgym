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
