# Spacegroup Atlas

A walkable, GPU-instanced crystallography world for **Meta Quest 3** and desktop browsers. No npm, external JavaScript libraries, textures, web fonts, or network assets are required. The distribution contains regular HTML and JavaScript files.

## Start here

### Desktop preview (no installation required)

Unzip the folder, then **double-click `index.html`** in Chrome/Edge/Firefox. The desktop preview does not require WebXR. Drag on the scene to look around, use **WASD** to walk, hold **Shift** to move faster, use **Q/E** to turn, or **[ / ]** to move through groups. The group picker and controls live in the upper-left panel.

You may also run an ordinary local web server for development:

```shell
cd spacegroup_atlas
python -m http.server 8000
```

Open `http://localhost:8000` **on your computer**. On a Quest headset, an ordinary LAN HTTP address such as `http://192.168.1.100:8000` generally does **not** grant WebXR permissions. Use HTTPS on the headset.

### Meta Quest 3 — HTTPS is required

The simplest method requires no Android SDK or app compilation:

1. Create a GitHub repository for this project, and upload the **contents** of the `spacegroup_atlas` folder (`index.html`, `main.js`, etc.) to the repository root.
2. In **Settings → Pages**, choose **Deploy from a branch**, with the `main` branch and `/(root)` folder. Save.
3. When GitHub Pages shows your deployed site, open its HTTPS address (`https://USERNAME.github.io/REPOSITORY/`) in **Meta Quest Browser**.
4. Select **ENTER IMMERSIVE VR**. Allow the immersive session. You can now move around your periodic space.

[Meta Quest Browser documentation](https://developers.meta.com/vr/documentation/web/) confirms its immersive WebXR support. [Meta's WebXR compatibility guidance](https://developers.meta.com/vr/documentation/web/port-vr-xr/) documents the HTTPS requirement.

The app is self-contained once hosted: the VR page fetches only the files uploaded with it.

## Controls

| Input | Action |
| --- | --- |
| Desktop mouse drag | Turn / look |
| Desktop WASD | Move on horizontal plane |
| Desktop Shift | Sprint |
| Desktop Q / E | Turn left / right |
| Desktop `[` / `]` | Previous / next group |
| Desktop 1–0 | Jump to the first ten groups (0 selects the tenth) |
| Quest left thumbstick | Smooth locomotion, relative to gaze direction |
| Quest right thumbstick | 30° snap turns |
| Quest A (right-hand face button) | Next space group |
| Quest X (left-hand face button) | Previous space group |
| Quest B | Toggle 3D lattice scaffold |
| Quest Y | Toggle ground mosaic |
| Quest system controls | Exit immersive VR |

Locomotion is intentionally unconstrained (no collision/teleport) in this first laboratory. Find yourself a safe stationary play area; physical room boundaries remain controlled by the headset.

## Supported space groups

These are **space groups**, not merely 32 point groups. Every displayed asymmetric F-shaped sculpture is produced by applying the group's **actual 3D affine symmetry operations** to a generic motif, modulo primitive lattice translations. The number of orbit instances in a primitive cell agrees with the order of its crystallographic point group for this generic point.

| International number | Hermann–Mauguin | Distinguishing operations |
| --- | --- | --- |
| 1 | P1 | Translations only |
| 2 | P-1 | Central inversion |
| 3 | P2 | Twofold axis along b |
| 47 | Pmmm | Three perpendicular mirror families |
| 75 | P4 | Fourfold axis |
| 76 | P4₁ | 90° screw + quarter period translation |
| 99 | P4mm | Fourfold rotations and vertical mirrors |
| 143 | P3 | Threefold rotation |
| 168 | P6 | Sixfold rotation |
| 183 | P6mm | Sixfold rotation and mirrors |
| 221 | Pm-3m | All 48 signed coordinate permutations |

The symbol `P4₁` uses the subscript 1; ASCII notation: `P41`. `Pm-3m` is ASCII for `Pm\bar{3}m`. We use conventional unique-b settings for monoclinic and a hexagonal basal basis for trigonal and hexagonal.

## Mathematical architecture

Each lattice is specified by a basis matrix \(B\), with columns \(\mathbf a,\mathbf b,\mathbf c\). A point is

\[
\mathbf x=B(\mathbf n+\mathbf u), \qquad \mathbf n\in\mathbb Z^3, \quad \mathbf u\in[0,1)^3.
\]

Space-group operations act in fractional coordinates as

\[
\mathbf u\mapsto R\mathbf u+\mathbf t.
\]

The closure of the operation generators is built by multiplication of affine pairs and by reducing translation components modulo integers. Geometric orientations use the true Cartesian linear map \(BRB^{-1}\). In particular, improper operations *actually mirror the asymmetric geometry*, not just its positions.

The group-generated sculpture motif is **exact** (subject to numerical precision). The planar floor guide is intentionally not part of the symmetry-preserving object. It is a navigation aid, not a claim that a horizontal floor is invariant under a group that inverts vertical coordinates. Likewise, the 3D lattice scaffold is an optional reference layer, and its finite truncation is not a globally invariant object.

## How the environment stays large without excessive compute

- **GPU instancing:** Three meshes (cubes for rods, pyramids for lattice nodes, one asymmetric multi-box motif) are reused for every copy. There are a handful of draw calls, not thousands of scene objects.
- **Two radii:** The large distant radius draws cheap lattice guides; the smaller detailed radius draws full motif orbits. Change both sliders on desktop before entering VR, if desired.
- **No baked world:** Crossing a lattice-cell boundary rebuilds the neighborhood around the viewer. The number of active instances remains bounded as you walk.
- **Floating origin:** Beyond 48 cells from the current origin, the local scene is translated by an exact lattice period and global integer cell coordinates keep track of progress. Visible precision remains stable while the world appears unbounded.
- **Lightweight materials:** One direct diffuse/ambient shader, distance fog, simple geometry, no dynamic shadows, no postprocessing, no texture downloads.
- **XR resolution:** The XR framebuffer starts at 0.85 nominal scale where the runtime honors the option.

### Suggested Quest performance settings

The shipped defaults are a distant radius of **17 cells** and full-detail radius of **3 cells**. For especially dense groups such as `Pm-3m`, or if frames drop, reduce the detailed radius to **2** and the distant radius to **12** before pressing Enter VR. Prefer adjusting this to assuming a particular headset framerate: device settings, thermal state, browser version, and compositor resolution differ.

### Limitations of this first version

- The controller layout follows the typical Meta Touch WebXR gamepad mapping; mappings can differ across runtime versions.
- No collisions, teleportation, audio, persistence, or object editing yet.
- Only eleven exemplar space groups, not all 230.
- Ground mosaic is a simple procedural planar guide, not a full crystallographic Wyckoff-position visualization.
- VR hardware testing/performance benchmarking has **not** been performed as part of preparing this code. The JavaScript syntax and all group closures were checked, and scene generation was exercised using a mock WebGL context.

## Source files

- `index.html`: UI styles, page controls, and WebGL canvas.
- `main.js`: all math, geometry, shaders, 3D renderer, streaming, and WebXR movement.
- `tests/test_groups.js`: Node.js test of closure orders and length-preserving transformations.

The project uses the MIT License; feel free to modify the motifs or build this into your more ambitious world.
