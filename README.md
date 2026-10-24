# Spacegroup Atlas v0.7 — fundamental-domain faces, solid detail, scaling and comfort repairs

WebGL2 / WebXR application for Quest 3 and desktop. Replaces v0.6 completely, including the HTML, JavaScript, and volume assets. No external CDNs, Blender add-ons, npm dependencies, or server-side code.

## Install on GitHub Pages

Unzip `Spacegroup_Atlas_Quest3_v0.7.zip`, upload the contents to the **root** of your GitHub Pages repository, and overwrite v0.6 files. Keep `assets/` beside `index.html`. **Upload `fundamental-faces.js` as well**—it is new and required. Hard-refresh the Quest Browser after deployment. You can also open `index.html` locally on desktop because its assets are embedded as an offline fallback.

## Changes since v0.6

### 2D Fill — full orbit of the fundamental-domain faces

- Instead of just the three axis-aligned lattice walls, the build precomputes Dirichlet/Voronoi faces for the orbit of a generic point under all eight group definitions and nearby lattice translations. This adds the **interior oblique surfaces** for relevant groups. Cubic `Pm-3m` has 123 clipped face polygons per translation cell, versus only three exterior square faces for P1.
- The three conventional translation-cell walls remain visible. Repeated copies are included over the selected crop radius, with proper native Kenney PNG colors and alpha. All planes remain passable.
- Independent UV resets per panel were removed. 2D colors are now derived from continuous fractional coordinates folded under the selected group, so group-equivalent positions evaluate to the same pattern, avoiding many artificial joins. This texture-field construction is mathematically periodic, including screw/point operations at the sampled positions. Exact visual continuity can still differ at quotient folds; this is a *symmetry seam*, not a missing polygon.
- Premultiplied PNG alpha and back-to-front transparent-cell sorting reduce black fringes, dark seams, and inconsistent layered composition.
- Added `tools/build_fundamental_faces.py` to reproduce the geometry. It requires SciPy and NumPy **only if regenerating the data**, not when running the app.

### Cell period

- Scaling is now isotropic around the **current tracked viewer position**, which is fixed in physical space. The viewer's fractional coordinates in the lattice remain constant, while the actual cell dimensions change. The player/headset transform is untouched.
- Because scaling **all** objects, distances, and the observer around the observer yields a mathematically identical perspective view, `Scale motif with cell` now defaults **OFF**: the model retains its physical size, and period changes become visually evident. Turning it on again intentionally restores similarity scaling. The floor grid (when enabled) also provides an absolute physical scale.

### 3D Fill

- Solid sources regenerated at **128³ RGBA8** (up from 64³, eight times as many voxels), with trilinear GPU interpolation. Oak, walnut, and stratified stone remain independently generated **adaptations**, not exact Blender-node bakes.
- The previous section/exterior contrast control has been removed. Section and exterior now both use the **50% contrast setting** (`1.15` gain in the original adjustment curve) without a slider.
- Volumes are compressed as `assets/volume_*.zlib` and decompressed with browser `DecompressionStream`, supported by contemporary Chromium/Quest Browser. Binary data is embedded as fallback for offline desktop use. The resulting GPU 3D textures are 8 MiB apiece; one is active at a time.
- Group-symmetrized voxel-center values are generated with a fast union of the group's generators rather than testing all group elements against every voxel, preserving exact generator invariance at voxel centers.

### Controls, fade and floor

- **Safe starting placement** selects a generic location well away from high-symmetry axes/planes, and caps motif size using the nearest orbit-copy separation. Switching it off starts at a symmetry intersection, where overlaps are deliberately allowed. With P1 there are no nontrivial point-group collisions to avoid.
- Fade cutoff now permits **1 period**. The default safe preset remains larger, but you can select custom radius 1 on desktop or Quest.
- When `Fade follows viewer` is switched OFF, its center freezes exactly where the viewer is at that moment. There is **no teleport** and no jump to a distant reference cell. If the viewer walks beyond this stationary window afterward, objects can naturally fade away.
- The tracked-floor comfort surface is now a clear, opaque horizontal plane, with a restrained real-world-scale gray grid and a distant soft edge. It remains anchored to floor reference height as you crouch or move vertically and follows the viewer only horizontally. It is **not** Quest's Guardian mesh.
- No animation in either fill mode. The contained 3D motif mode retains its optional generator illustration.

## Controls

Desktop: WASD move; mouse drag look; Q/E yaw; R/F vertical; C grab / V release; [ / ] change group; M motif; H opens menu. Quest: left joystick moves, right joystick turns/flies or navigates the menu, left trigger carries/release a motif, B toggles menu.

`Quest safe` remains the recommended performance preset, particularly for the full cubic group. The new internal faces introduce extra alpha overdraw. If Quest performance suffers, select radius 1–3 and reduce opacity; avoid 100% line opacity at radius 8 for `Pm-3m`.

## Verification

- `node --check main.js` and `node tests/mathematical_checks.js`: pass (eight closures, screw symmetry, volume voxel-center symmetry, geometry face count, safe seed, eye-fixed scale and radius 1).
- `python tools/test_shaders.py`: all five shader pairs compile/link in GLES3.
- `xvfb-run -a python tools/browser_smoke.py`: visible motif scale differences at 0.60 vs 1.80 m; different images for the 2D line vs opaque textures; oak, walnut, strata slices and exterior nonblack; zero WebGL errors. Smoke test uses a moderate crop to avoid excessive rendering time on software OpenGL.
- `xvfb-run -a python tools/regression_v07.py`: safe placement, scale anchor, fade locking, cutoff 1, interior face count, floor rendering, full 128³ cubic volume and zero WebGL errors.

**Not tested:** headset stereoscopy, real Quest 3 frame rate, prolonged movement / frame-time stability. Please evaluate these in Quest Browser; automated desktop tests cannot substitute for them.

## License

Application code, procedural source models, Dirichlet-face generator and original solid-math adaptations: MIT. Existing Kenney mini-forest and pattern images: CC0, see `assets/LICENSE_KENNEY_*.txt`. User-supplied proprietary or third-party `.blend` assets are not embedded or redistributed.
