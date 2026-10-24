# Spacegroup Atlas v0.5 — Solid-section texture studies

Static, offline-capable WebGL2/WebXR symmetry lab intended for Meta Quest 3. Derived from the working v0.4 architecture. The update retains contained Kenney motifs, the many-cell translucent/opaque Kenney 2D walls, and the independent single-section 3D Fill mode.

## Install on existing GitHub Pages

Extract `Spacegroup_Atlas_Quest3_v0.5.zip`. Copy **all files and directories** at its top level to the **root of your current GitHub Pages repository**, replacing old files (particularly `index.html`, `main.js`, and adding `volume-inline.js` and `assets/volume_*.rgba`). Hard-refresh Quest Browser. Do not upload the ZIP itself or nest the files in another folder. The application uses no CDN, add-on, Blender installation or local server. Opening the extracted `index.html` directly on a desktop should also work because all assets have inline fallback copies.

## 3D Fill — selectable solid color volumes

New selector on the desktop panel: **3D solid material · adapted**. On Quest, open the in-world menu with B and select its **3D motif / solid material** row; when in 3D Fill, that row cycles the materials.

| Choice | Structural concept | Based on uploaded material source |
|---|---|---|
| Oak · bent growth rings | Eccentric toroidal growth rings, longitudinal grain, depth-varying warps and a knot | `ProceduralOakWood.blend` |
| Walnut · dark burl / knots | Whorled and cathedral-like banding, two knots, intense dark/light streaks | `Meta-Androcto-wood.blend` (many wood materials; walnut/grain aspects) |
| Strata · intersecting stone layers | Oblique, wavy sedimentary laminae crossed by mineral veins and granular texture | `Procedural Strata Marble.blend` |

**IMPORTANT PROVENANCE LIMITATION:** These are *new mathematical, procedural adaptations inspired by the structure of the supplied assets*, **not faithful exports or exact evaluations of the original Blender node graphs**. Blender's evaluator was not available in the build environment. The uploaded `.blend` files are not included and are not loaded at runtime. The generated textures are authored by `tools/build_solid_textures.py` (reproducible source included); the downloaded CGTOON 800-material collection is **not** included, since it was not among the supplied files. The preview is `solid_texture_sections.png` (YZ, XZ and XY central slices of each mathematical field). Each source varies in all three coordinates; it is not a UV-mapped skin or a 2D plane extruded unchanged along the third axis.

Every volume is a **64³ RGBA8 grid** (~1 MiB per material), with color stored throughout and alpha as auxiliary morphology. The CPU creates an exactly space-group-symmetrized **voxel-center** field for the selected group's finite coset operations, and the texture repeats by primitive lattice translation. P4₁ 1/4-period shifts are aligned to the grid (64 divisible by four). Interpolation between grid sites is approximate; resolution and sampling can soften fine bands, particularly on Quest.

**Section mode:** ONE opaque headset-positioned plane, with adjustable depth for seated exploration and a freeze toggle. The texture is solid: all colors display without alpha-thresholding. The section remains in a stationary lattice-anchored field. The contrast slider works on colors, not the fraction of the volume that exists.

**Exterior mode:** The `Show solid block exterior (one cell)` switch replaces the slice with the **six textured external faces of one full solid cell**. This is a conventional view of the whole *exterior*, not a ray-marched translucent cloud, full-volume transparent rendering, or cutaway. To inspect the interior, switch back to the single cross-section. The exterior is bounded to avoid rendering a huge volume.

**No animation** occurs in either 2D Fill or 3D Fill. Contained motifs retain the previous optional generator correspondence demonstration.

## Other modes, controls and behavior

- **Contained 3D motif orbit:** Preserves Kenney target, tree and archer orbit under exact space group operations, body-locked selection using left trigger, floor toggle, opaque near-field fade, viewer-relative rescaling, and controlled crop radius.
- **2D Fill:** Kenney opaque and alpha-preserving line patterns appear on lattice-cell walls in all three directions, extending several cell radii, with partial transparency and overlap. This representation is separate from the solid volumes.
- **Desktop:** WASD travel, mouse drag look, Q/E turn, R/F fly, C grab/release, [ and ] group, M motif, H VR-style menu.
- **Quest:** Left joystick moves; right joystick turns/flys; left trigger carries/releases a contained motif, B opens the menu, right stick navigates/changes values, A selects. Physically move to explore sections.
- **Supported groups:** P1 (#1), P-1 (#2), Pm (#6), P4 (#75), P4₁ (#76), P4mm (#99), Pmmm (#47), Pm-3m (#221). These are unchanged.
- **Quest performance:** Use the `Quest safe` preset, especially for Pm-3m. Increasing finite crop radii or using high-symmetry groups is expensive. Switching group remaps a 64³ texture on CPU and can temporarily delay rendering; once generated, a texture switch retains its small GPU footprint. Transparent wall blending is still approximate.

## Validation / limitations

- `node --check main.js` and `node --check volume-inline.js` passed.
- `node tests/mathematical_checks.js` passed, including group closure, screw symmetry, 2D walls, 3D voxel-grid invariance, mode switching, and all three volume source loading paths.
- All five shader pairs compiled **and linked** using OpenGL ES 3.0 (ANGLE via surfaceless EGL).
- Orthogonal texture-section preview was generated and visually inspected.
- Browser testing was blocked by browser administration policy in this workspace; there has been **no full on-device Quest 3 frame-rate/UX test**. There is no claim of an exact Blender bake.

## Licenses

App source MIT (`LICENSE`). Existing Kenney meshes/textures CC0 (`assets/LICENSE_KENNEY_*.txt`). The new Python generator and resulting independently implemented mathematical textures may be reused under the app's MIT license. The supplied `.blend` files are not redistributed.
