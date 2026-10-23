# Spacegroup Atlas v0.3.1 — Shader Startup Fix

Experimental room-scale crystallography viewer for Meta Quest 3 Browser and desktop WebGL2. The software is a self-contained static website and does not require a JS framework or external CDN. This release repairs v0.2's visibility budget and separates **contained motifs**, **full-cell patterned sheets**, and **sections through a three-dimensional space-group-invariant field**.

**Validation disclosure:** JavaScript syntax, group mathematics, asset integrity, and OpenGL ES 3 shader compilation AND linking have passed. Visual appearance, input handling, and framerate on a physical Quest 3 remain unverified. The browser available in the development environment could not provide a WebGL2 context.

## Installing / updating your existing GitHub Pages project

1. Unzip `Spacegroup_Atlas_Quest3_v0.3.1_Fixed.zip` on Windows.
2. In your **existing** GitHub repository, upload the **contents of the extracted folder** to the **repository root**, replacing the existing `index.html`, `main.js`, `style.css`, `assets-inline.js`, and `README.md`. Keep the `assets/` directory structure unchanged. You can leave the older asset files because their names are unchanged.
3. Commit the changes. Your Pages settings (Deploy from branch -> main -> /(root)) and URL can stay the same.
4. Refresh the Pages address in your Quest Browser; a hard reload may be needed if it cached the previous JavaScript.

### Local PC test (no local server required)

Extract the ZIP and double-click `index.html`. This repair includes `assets-inline.js`, which embeds the 3D meshes and textures so browsers do not need `fetch()` from `file:///` paths. You can also use the existing GitHub Pages address over HTTPS. No `.bat` launcher or PowerShell server is included.

### Corrected startup errors in v0.3.1

- Added missing `highp sampler3D` precision to both 3D-texture fragment shaders. This previously caused shader compilation failure before the group dropdown could populate.
- Explicitly matched integer uniform precision (`highp int`) between the vertex and fragment stages. This previously caused the primary rendering program to fail at link time even after the first shader error was fixed.
- The group dropdown is now populated before shader compilation, and uncaught initialization failures are displayed onscreen.
- Asset loading works from both `file:///` and GitHub Pages. Cache-busting version parameters on script links help with stale GitHub Pages files.

## New in v0.3

- **Exact space-group operations:** P1 (#1), P-1 (#2), Pm (#6, a-unique setting), P4 (#75), P4₁ (#76), P4mm (#99), Pmmm (#47), and Pm-3m (#221). Affine group operations and screw motions have mathematical tests.
- **No silent radius reduction.** Requested radius is 2–8 lattice periods (default 6), with fully visible inner radius independently adjustable (default 4). No geometric copy cap automatically changes the radius when a higher-order group is chosen. The user can reduce radius if performance becomes problematic.
- **Opaque contrast fade (default).** Texture surfaces stay fully opaque and are mixed toward the background color as the distance increases. This avoids the back-facing polygon bleed of v0.2's alpha-blend setting and the pixel holes of v0.2's Bayer screen-door setting. However, faded opaque objects still write depth and may hide farther objects! All five fade modes can be compared: contrast, no fade within crop, screen-door (experimental), alpha blend (experimental), and hard cutoff.
- **Actual copy location controls the fade**, rather than the integer cell center. Viewer-relative fading uses continuous fractional lattice coordinates. Specimen-relative fading is the default. Viewer-following mode uses a one-cell preload halo.
- **Neutral gray guide lattice**, distinct from the colored Quest Guardian boundary.
- **Representation selector:**
  - `Contained 3D motif orbit`: actual Kenney Mini Forest archer, target, or tree, with textured rigid orbit copies. Same click-to-carry/click-to-release controller behavior as v0.2; you may cross fundamental-domain boundaries, creating informative overlaps.
  - `2D cell-filling sheets`: full square cell tiles whose copies form the complete orbit of a planar sheet under the 3D space group. Source is Kenney Pattern Pack or Pattern Pack Lines. Symmetry-equivalent coincident sheets are deduplicated to prevent z-fighting. A group-invariant volumetric texture colors the sheets, and surface-coverage threshold defaults to ~30% to preserve sightlines. These are **sheets spanning entire lattice tiles**, not miniature contained image panels. They are not solid three-dimensional fundamental-domain skins.
  - `3D fill field · viewer-following cross-section`: a movable full-plane section through a *separate three-dimensional periodic pattern* generated from the selected Kenney image and the entire group. It does **not** silently change the selected space group or the selected archer/tree/target. The section follows headset orientation and position by default while sampling a field fixed in specimen coordinates. Turning off “Slice follows headset” freezes the section frame at the current viewpoint. “Slice distance” controls the plane's offset ahead of the headset.
- **Symmetry-generator demonstration** is separate from the imported forest mesh's own skeleton animation (which is not implemented). A temporary highlighted copy moves along a proper quarter-turn or screw transformation while the original orbit remains stationary. Reflection-only and inversion-only groups have no continuous proper-rotation demonstration yet; the control does not switch groups.
- **Toggle physical play-area floor:** uses the actual `bounded-floor` WebXR boundary polygon when the browser exposes it. Otherwise uses the tracked `local-floor` reference and a plain fallback floor. It is independent of the mathematical specimen; toggling does not teleport the viewer, align a lattice cell, or disable joystick flight. The headset's own Guardian boundary remains the safety system; this application floor is visual only.
- **In-world menu (B)** is still world-anchored instead of attached to the face; larger with additional representation, fade, scale, floor, and section controls.

## Quest Touch controls

| Action | Controls |
|---|---|
| Walk / strafe | Left thumbstick |
| Snap-turn | Right thumbstick left/right |
| Fly vertically | Right thumbstick up/down (independent of floor toggle) |
| Pick up / release orbit copy | Left trigger, **contained 3D motif mode only** |
| Menu open / close | Right B |
| Menu row navigation | Right thumbstick up/down |
| Menu modify highlighted setting | Right thumbstick left/right or A |
| Change group (outside menu) | Right A / left Y |
| Change 3D motif (outside menu) | Left X |

Menu and joystick bindings were inherited from v0.2 and need headset validation. The body-locked motif is positioned relative to the tracked headset's upright heading, not a tracked torso; looking up/down does not pitch it.

Desktop: WASD move, Q/E turn, mouse drag look, R/F move vertically, C select/carry, V release, brackets cycle groups, M cycle forest motif.

## Symmetry and limits

The infinite source pattern is described by the exact operations `x -> R x + t`. Its full orbit stays invariant if a seed is carried, even if copies overlap. Initial contained-motif size is conservatively bounded by a sphere fitting inside an orbit Dirichlet domain. This is not a complete mesh-vs-polyhedron collision check; crossing cell/domain boundaries is intentional and unrestrained.

The three-dimensional fill pattern is baked to a **48 x 48 x 48 RGBA8 voxel texture** by identifying source coordinates through all the group's operations. At the voxel grid positions, the pattern is exactly equivariant for the signed-permutation rotations and quarter-cell screw displacement used in this release (verified for the cubic and screw groups). Sampling is an approximation between those grid points. The plane views (and the source 2D textures) do not individually have to be invariant under every three-dimensional group operation, but the set of symmetry-orbit planes and the sampled 3D field are group invariant.

**Finite cropping and distance fading break the global translational symmetry of the displayed image**, even though the mathematical source remains symmetric. The matte physical floor, highlights, viewer, and WebXR menu are reference elements outside the mathematical specimen. Opaque contrast fading does not make far geometry transparent; it only reduces its contrast while it continues to occlude. Standard alpha blending and screen-door rendering remain explicitly experimental.

## Performance expectations

GPU-instanced static meshes are reused for all orbit copies. There is no geometry regeneration per frame during head motion (except when the viewer-centered *cell pool* moves to a new index); only instance transforms and shader uniforms change. At radius 6, the full cubic group can draw approximately 18,096 archer copies with specimen-centered fading, substantially more than the old v0.2 budget. The model is low-poly, but this could still cause Quest GPU overload, particularly in stereoscopic rendering. **If you see judder, start by lowering the crop radius to 3–4 periods**, or use tree/target. Increasing the radius beyond 6 on Pm-3m is an intentional stress test, not a performance guarantee.

## Licensing and sources

The supplied Kenney Mini Forest, Pattern Pack, and Pattern Pack Lines assets are CC0, and their license statements are preserved in `assets/`. The forest mesh is the original model and texture converted to a compact static WebGL format; no artist rig animation is currently supported. App source is MIT licensed (see `LICENSE`).

## Developer checks

From a machine with Node.js:

```
node --check main.js
node tests/mathematical_checks.js
```

These tests exercise group closure, orthogonality, screw operation, crop coverage, sheet deduplication, mesh loading, and discrete field equivariance. They use a fake WebGL API and **do not** verify actual graphics-driver shader compilation, frame rates, Quest WebXR controllers, or real Guardian boundary availability.
