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
