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
