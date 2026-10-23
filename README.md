# Spacegroup Atlas — Symmetry Lab v0.2

A room-scale symmetry laboratory for Meta Quest 3 Browser (WebXR) and desktop browsers. No libraries, account, runtime build process, CDN, or installation required. Published as a static website.

**This is a prototype, not a headset-validated release.** The group operations and assets pass automatic checks; shader execution, input mapping, and framerate have not yet been verified on physical Quest 3 hardware.

## Install / update GitHub Pages

1. Download the release ZIP, and **extract** it on your computer.
2. In your **public GitHub repository**, remove the old top-level `index.html`, `main.js`, and (if present) `style.css`. You can also leave older unrelated files, although removing them keeps the repository clean.
3. Upload **the contents** of the extracted `Spacegroup_Atlas_v0_2` folder (not its containing folder) into the repository **root**: `index.html`, `main.js`, `style.css`, `assets/`, `README.md`.
4. Ensure Settings → Pages → Deploy from a branch → `main` → `/(root)` is enabled. Visit your existing `https://<username>.github.io/<repository>/` URL.
5. Open the same HTTPS link in Meta Quest Browser and choose **ENTER IMMERSIVE VR**.

If you'd rather make a fresh repository, upload the unzipped contents to the empty repository and enable GitHub Pages the same way. All assets must retain their relative paths; `assets/archer.mesh`, etc., are loaded by `main.js`.

For testing on PC, it is preferable to use a local HTTP server rather than opening `index.html` directly: e.g. `python -m http.server 8000` from the extracted project folder and then open `http://localhost:8000/`.

## Controller mappings (Quest Touch)

| Action | Controller |
|---|---|
| Walk / strafe in head-heading direction | Left thumbstick |
| Snap turn 30° | Right thumbstick left/right |
| Fly up/down (when ground off) | Right thumbstick up/down |
| **Pick up / release** nearest aimed orbit copy | **Left trigger** |
| Open/close world-anchored readable menu | **Right B** |
| In menu: select row | Right thumbstick up/down |
| In menu: decrease/increase setting | Right thumbstick left/right |
| In menu: activate/increase setting | Right A / right trigger |
| Cycle space group forward/back | Right A / left Y outside menu |
| Cycle motif | Left X outside menu |

For picking, point the left controller at a motif and squeeze its trigger. If no ray hit is found, the app searches for a nearby motif within 65 cm of your head. Another left-trigger click drops it. The seed's complete orbit updates in real time; the selected copy moves with the **headset-derived upright body frame**, so looking up does not pitch the object. Because no torso tracker is used, turning your head left/right also rotates that frame.

The world menu appears in a **fixed position in the virtual room when opened**; it does not follow your eyes. Use B to dismiss it. The outer HTML controls are available on desktop without exiting VR.

Desktop: WASD move; Q/E turn; R/F ascend/descend; mouse drag look; C attach/V release (aim from gaze); `[` and `]` cycle group; M cycles motif; H opens/closes a world menu.

## Experiments

- **Mirror-carrying (`Pm`, #6):** start with the archer. Approach one copy, aim and pick it up with the left trigger, walk past a mirror plane, and observe its reflected partner. The **whole orbit remains continuous**. A notification marks changes in the canonical representative; the world geometry itself never jumps. The setting uses the **a-unique** realization with normal along X.
- **Room-scale specimen:** start with 60 cm periods, adjustable to 10–125 cm. The finite taxicab crop uses smooth per-instance screen-door fade. In the 'follows viewer' setting the fade center is continuous in lattice coordinates, not snapped to whichever cell contains your head. The pool includes a zero-opacity halo to prevent a visible rebuild seam. The GPU budget may **reduce the effective radius**, notably for highly symmetric groups with many copies; this is reported in the status panel.
- **Fundamental-domain-safe preset:** uses a conservative centered sphere that fits inside the orbit Dirichlet domain at the initial seed location. This is **not an arbitrary polyhedral mesh clip** or a full dynamic collision solver. Once picked up, the motif may cross boundaries and overlap orbit members. For static meshes, containment within the safe sphere guarantees nonintersecting copies at initial placement. Touching or collisions are not automatically prevented after a move.
- **Opaque or line pattern panels:** choose Opaque or Line motif and switch five Kenney texture variants. The small panels act as 2D oriented motifs in 3D; they are not full polyhedral wallpaper skins yet.
- **Screw cross-section:** activate **3D field cross-section**, which switches to `P4₁` if necessary. The shader constructs a 3D periodic field by symmetrizing a spatial kernel under four screw powers. A horizontal slice shows its intersection; slide **Slice height** or enable animation to sweep through height. It is a procedural invariant field, **not yet an imported custom 3D volume filling the fundamental polyhedron**. The slice's appearance changes under the screw quarter-turn.
- **Animation:** with `P4`, `P4₁`, `P4mm`, `Pmmm`, or `Pm-3m`, the animation sweeps the seed through a **continuous interpolation toward a proper group generator** and regenerates its entire orbit. At each time the orbit is still exactly symmetric. For the `P4₁` slice, animation moves the section plane vertically. Improper operations (mirrors/inversion) cannot be connected continuously to identity by proper rigid rotations, so those groups have no rigid generator animation yet.
- **Anchors:** the menu's Reference anchor cycles among volume center, face center, vertex, and edge midpoint. It translates the **entire specimen** to bring the reference point in front of the viewer, without teleporting the physically tracked player. These are reference-cell positions, not guaranteed distinct Wyckoff classes in every group.

## Scope and exactness

Included groups: `P1` (#1), `P-1` (#2), `Pm` (#6; a-unique setting), `P4` (#75), `P4₁` (#76), `P4mm` (#99), `Pmmm` (#47), `Pm-3m` (#221).

Each symmetry acts as an affine isometry `x ↦ R x + t`, with integral lattice translations and proper fractional screw displacement. Each orbit copy draws the same transformed seed. Carrying a visible copy with group operation `g` and body-motion increment `D` updates the canonical seed pose as `H_new = g⁻¹ D g H_grab`.

The infinite **mathematical pattern** is exactly symmetric, but **any finite crop, viewer-relative fade, guide, ground reference, highlighting notification, and physical observer are not part of that invariant pattern**. The actual GPU display is finite and approximate. On screen-door fading, stereoscopic dithering and temporal shimmering are possible; an `Alpha blending (experimental)` comparison and a `Hard cutoff` mode are also supplied.

## Assets, licensing, and performance

The static forest models `target`, `tree`, and `archer` were converted from **Kenney Mini Forest (CC0)** to compact interleaved mesh data, retaining the source color-map image. Archer skeletal animations are deliberately not imported: this release uses its **rest pose** and applies rigid-space-group actions to that pose. The opaque and line patterns come from **Kenney Pattern Pack and Pattern Pack Lines (CC0)**. Their three original license notices are retained in `assets/`.

The JavaScript/CSS and instructions are MIT licensed (see `LICENSE`). The Kenney assets remain CC0 (credit not legally required; generously provided by [Kenney](https://kenney.nl/)).

Optimization: WebGL2 instanced rendering with shared static geometry, fixed-size per-instance buffers, vertex-computed taxicab fades, and a hard per-motif copy budget. The code does not ship Three.js, and does not issue individual draw calls per copy. The shader's Bayer dither uses screen coordinates and may cause **stereo mismatch or shimmer** on a headset; compare alternate fades. The prototype is intentionally not guaranteed to hold a target framerate on an untested physical Quest 3.

## Verify source

`node --check main.js`

`node tests/mathematical_checks.js`

The second script uses a mock WebGL context to verify the group closures, orthogonality, screw powers, and asset loading/instance generation. It does **not** validate shader compilation, headset XR tracking, or runtime frame rate.
