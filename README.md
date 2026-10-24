# Spacegroup Atlas v0.9 — all 230 space groups and restored v0.3-style specimen scaling

A browser-based WebGL2/WebXR space-group laboratory for Meta Quest 3 and desktop. All 230 three-dimensional crystallographic space groups are supported, with their actual conventional-cell rotational and fractional-translational operations. No Blender, Node, CDN, npm, or login is required at runtime.

## Install

Extract `Spacegroup_Atlas_Quest3_v0.9.zip` to the **root** of the existing GitHub Pages repository, replacing v0.8. Preserve the directory structure, particularly:

- `index.html`, `style.css`, `main.js`
- `spacegroups-data.js` — complete 230-group operation catalog; **new, required**
- `fundamental-faces.js` — the geometric face data for **all 230**; **required**
- `assets-inline.js`, `volume-inline.js`, and the `assets/` directory.

Hard-refresh Quest Browser after uploading; cache-busting URLs in `index.html` use v0.9.

`index.html` can also be opened on desktop as a file; assets are included in inlined fallback bundles. GitHub Pages (HTTPS) is needed for Quest's immersive WebXR mode.

## What changed in v0.9

### 1. Restored v0.3-style whole-specimen cell scaling

**Cell period** scales the full crystal specimen uniformly about the *fixed lattice origin* (the cell origin used by the group renderer). This is intentionally simple, like v0.3: a 2× period doubles distances between corresponding lattice points **and doubles the motifs themselves**. The relative motif size remains fixed. No inverse-size effect. No camera- or viewer-centered anchor calculation. The visual scene will grow or shrink around the origin even if that moves nearby cells past the viewer.

**Motif size** is now a **percentage relative to cell period**, not an absolute number of centimeters. It changes motif size without changing the cell period. The default 27% at a 0.60-meter period gives approximately the same 16-centimeter motif baseline as v0.8, before automatic safe-size clamping. New placements and group changes respect the same relative sizing at any period. Custom grabbed motifs preserve their pose and rotate/scale together with the specimen while the period changes.

**Tracked headset, player position, and floor are not transformed**. The floor remains at y = -0.018 m in the WebXR local-floor reference. The specimen's fixed lattice origin is not a floor reference, and neither moving it nor scaling around it changes the floor height. The floor plane may appear to move *relative to the rescaled crystal*, as it should, because the crystal changes in world space while the floor stays put.

To verify visually: in P1, enable lattice guides, set period 0.60 m then 1.20 m. Corresponding grid corners must separate by 2× and the archer must also grow by 2×, while the floor stays at the same physical height and the view never jumps. Change **Motif size** afterward: only the archer changes, not the grid. Decreasing back to 0.60 m restores original geometry.

### 2. Browse all 230 space groups

The complete dataset is generated from the standardized **Gemmi crystallographic space-group tables** ([reference](https://gemmi.readthedocs.io/en/latest/symmetry.html)), including centered cosets and screw/glide translations. The included catalog has all 230 international numbers, Hermann–Mauguin symbols, Hall symbols, one setting per number, 32 crystallographic point-group labels, crystal-system labels, Bravais centering types, and full finite operation lists. Default origin/setting choices follow Gemmi's tables; some numbers admit alternative conventional settings not included here.

On desktop, use the **Crystal system** → **Point group** selectors, search by number, symbol, or Hall notation, then choose a group. A quick-jump list covers familiar educational examples including P1, P-1, Pm, P4, P4₁, Pmmm, Pm-3m, Fm-3m, and Ia-3d. The selected group's metadata and operation count appear beneath the selector.

In Quest, open the menu (B) and use its first three rows: **Crystal system**, **Point group**, and **Group**. Right-stick left/right or A/X changes the selected value. Within a point group the Group row browses only its member space groups, avoiding a 230-item linear scroll.

### 3. Correct noncubic lattice geometry

Each crystal system now uses an appropriate conventional-cell metric. Space-group operations are integer fractional-coordinate transformations 

`f ↦ R f + t`

transformed into world coordinates with the actual cell basis `B`:

`X ↦ X_origin + B [R B⁻¹ (X-X_origin) + t + n]`.

Hexagonal/trigonal operations therefore produce actual oblique hexagonal geometry instead of distorted rotations in a cubic coordinate system. Monoclinic, orthorhombic, and tetragonal conventional-cell proportions also differ from cubic. **Sample shapes are illustrative, not experimentally measured lattice constants.** The scalar cell-size slider scales the whole shape.

### 4. All representations retain their roles

- **Contained motif**: entire orbit of the original Kenney archer, target, or tree under the chosen space group. Motif size is a fixed fraction of cell period. The instance generator drops copies that would be invisible beyond the selected fade cutoff, reducing GPU workload.
- **2D Fill**: precomputed Dirichlet/Voronoi fundamental-domain faces, including oblique internal boundaries and cell-wall planes, for *all 230* groups. Full-resolution Kenney opaque and translucent line patterns, alpha, and several-cell crop settings are retained. The **geometry** follows the exact space-group orbit. **Caveat**: the decorative material texture is sampled by periodic fractional coordinate rather than being strictly symmetrized under *every* one of the 230 nontrivial groups. Geometric symmetry is exact; decorative linework under every group operation is not yet guaranteed. It remains especially important to distinguish texture discontinuities from real orbit boundaries.
- **3D Fill**: one moving opaque section through an oak, walnut, or strata solid, or its optional complete one-cell exterior. The supplied 128³ material field is remapped onto a 144³ periodic voxel grid for compatibility with 1/3-, 1/4-, 1/6-, and 1/8-cell translations. That resampling does **not** add genuine texture detail; the underlying source remains 128³. Its volume is symmetry-averaged at discrete voxel positions through group generators, subject to voxel-interpolation approximation.

Fill modes have no animation. The contained motif generator demonstration is experimental and not supported uniformly across all groups.

### 5. Performance

A high-order group can contain **up to 192 operations per primitive cell**. The Quest-safe preset automatically starts with a smaller extent for these groups (typically one or two periods), and the renderer avoids submitting copies outside the fade cutoff. You can expand the extent with the Balanced/Extended/Custom options; performance may drop sharply, especially in transparent 2D Fill mode. This tradeoff is explicitly selectable, not a change to the mathematical space group.

## Validation and limitations

- Full 230-group operation sets and generator closures checked against Gemmi, with each operation preserving its group's crystal-system metric.
- Full 230 Dirichlet face datasets generated from Euclidean Voronoi construction in the corresponding noncubic cell and clipped to the conventional cell; generators in `tools/`.
- `node --check main.js` and `python tools/test_shaders.py`: all five GLSL ES3 shader pairs compile and link in the available OpenGL ES3 driver.
- `python tools/test_controls_mock.py`: all 230 groups load in the UI; search, crystal-system filtering, high-order group switching, fill geometry initialization, section upload, and whole-specimen period scaling are checked in a DOM simulator with mocked WebGL drawing calls.

**Not validated here:** real browser WebGL raster output (Chromium in this workspace refuses to initialize WebGL2), native Quest performance, headset stereo, or controller behavior on every space group. The mock browser tests are *control tests*, not visual rendering tests. Please verify on your Quest before relying on this as a final visual release.

## Development and licenses

`tools/build_group_database.py` regenerates `spacegroups-data.js` using [Gemmi](https://github.com/project-gemmi/gemmi). `tools/build_all_faces.py` regenerates the all-group clipped Dirichlet face dataset using Gemmi-generated group JSON, NumPy, and SciPy. These Python packages are **offline development dependencies only**; no Python executes in the browser.

The application code, custom mathematical materials, and custom scripts are MIT licensed. Original Kenney mini-forest and pattern assets are CC0; see the `assets/LICENSE_*` files. The actual `.blend` files uploaded for texture research are **not** bundled or redistributed. The oak/walnut/strata fields remain independent procedural adaptations, not direct bakes of the Blender materials.
