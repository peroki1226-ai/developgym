"""GymFinder educational pectoral regions on the authored CC0 human surface.

The clavicles and upper-arm roots anchor the fan. These are regional learning
masks, not an atlas segmentation or a measurement of individual muscle activity.
The same function is used by a full upstream conversion and an offline refresh.
"""
import argparse
import base64
import json
from pathlib import Path
import numpy as np


def pectoral_masks(positions, normals, materials, rest, indices):
    positions = np.asarray(positions, dtype=np.float32)
    normals = np.asarray(normals, dtype=np.float32)
    x, y = np.abs(positions[:, 0]), positions[:, 1]
    clavicle = (rest['clavicle.R']['head'][1] + rest['clavicle.L']['head'][1]) / 2
    shoulder = (abs(rest['upperarm.R']['head'][0]) + abs(rest['upperarm.L']['head'][0])) / 2
    torso = rest['neck']['head'][1] - rest['spine05']['head'][1]
    lateral = np.clip(x / shoulder, 0, 1)
    # The lower sternal fibres sweep up to the axilla; the clavicular edge stays
    # below the collarbone. Do not use morph displacement magnitude: its maximum
    # describes the lower chest bulge, not the full anatomical muscle boundary.
    bottom = clavicle - torso * .245 + torso * .12 * lateral ** 1.8
    top = clavicle - torso * (.012 + .024 * lateral)
    fade = torso * .035
    soft = lambda value, width: np.clip(value / width, 0, 1)
    region = np.minimum(soft(y - bottom, fade), soft(top - y, fade))
    region *= soft(x - shoulder * .025, shoulder * .06)
    region *= soft(shoulder * .96 - x, shoulder * .12)
    # Limit the paint to the anterior ribcage, excluding arms, back and clothing.
    region *= soft(normals[:, 2] + .02, .55) * (materials == 0)
    # Blend along real neighbouring surface vertices so coarse chest polygons
    # do not create a serrated sticker edge. Keep the paint on the ribcage.
    triangles = np.asarray(indices).reshape(-1, 3)
    edges = np.concatenate([triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]])
    edges = np.concatenate([edges, edges[:, ::-1]])
    counts = np.maximum(np.bincount(edges[:, 0], minlength=len(positions)), 1)
    guard = np.minimum(soft(y - bottom + .1, fade), soft(top + .08 - y, fade))
    guard *= soft(x - shoulder * .025, shoulder * .06)
    guard *= soft(shoulder - x, shoulder * .12)
    guard *= soft(normals[:, 2], .3) * (materials == 0)
    for _ in range(4):
        neighbours = np.bincount(edges[:, 0], weights=region[edges[:, 1]], minlength=len(positions)) / counts
        region = (.55 * region + .45 * neighbours) * guard
    upper_border = clavicle - torso * (.115 - .025 * lateral)
    upper = region * soft(y - upper_border, fade)
    return {name: np.round(mask * 255).astype(np.uint8)
            for name, mask in [('chest', region), ('upperChest', upper)]}


def refresh(path, check=False):
    raw = path.read_text()
    data = json.loads(raw)
    unpack = lambda name, dtype: np.frombuffer(base64.b64decode(data[name]), dtype=dtype)
    masks = pectoral_masks(unpack('positions', '<f4').reshape(-1, 3),
                           unpack('normals', '<f4').reshape(-1, 3),
                           unpack('materials', 'u1'), data['rest'], unpack('indices', '<u2'))
    encoded = {k: base64.b64encode(v.tobytes()).decode() for k, v in masks.items()}
    if check:
        if any(data['muscleMasks'][k] != v for k, v in encoded.items()):
            raise SystemExit('Pectoral masks are stale: run human_pectoral_masks.py')
    else:
        data['muscleMasks'].update(encoded)
        path.write_text(json.dumps(data, separators=(',', ':')) + '\n')
    print(json.dumps({'check': check, 'vertices': data['vertexCount'],
                      'coloured': {k: int(np.sum(v > 35)) for k, v in masks.items()}}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asset', type=Path, default=Path(__file__).resolve().parents[1] / 'src/data/human/makehuman.json')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    refresh(args.asset, args.check)
