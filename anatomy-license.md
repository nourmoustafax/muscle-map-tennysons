# Anatomy asset license and source mapping

**Retrieval investigation and release scope.** The full official BodyParts3D archive and Z-Anatomy package were acquired for source evaluation; they are not repackaged wholesale. The final release includes a 38-entry byte-preserved BodyParts3D source subset, official metadata, and a derived local GLB. Source notices remain intact. The historical paths below describe the acquisition workspace; the actual release inventory and offline rebuild instructions are in `docs/anatomy-mapping.md`. No primitive/cartoon anatomy or patient-specific scan is claimed.

## Primary source: BodyParts3D/Anatomography Release 4.0

- Official database description: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html
- Official download page: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Direct official archive: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip
- Official license page: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- Official release README preserved locally: `assets/anatomy-source/metadata/README_e.html`
- Official coordinate image preserved locally: `assets/anatomy-source/metadata/coordinate_system.png`

The official README describes the archive as polygon mesh data in Wavefront OBJ format with a 99% polygon-reduction rate. The database description identifies an adult human male whole-body model. The downloaded archive is the official `isa_BP3D_4.0_obj_99.zip` (142903898 bytes; SHA-256 `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`). Its OBJ comments identify the build-up logic as `FMA 3.0 is_a` and carry the original BodyParts3D attribution notice.

### License and attribution

The current official BodyParts3D license page (last updated 2025-02-27) states CC BY 4.0 International and explicitly permits acquiring, redistributing, and creating/distributing derivatives, provided the database is attributed. Use this attribution exactly: **“BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International”.** The 2013 Release 4.0 OBJ comments themselves state CC Attribution-Share Alike 2.1 Japan. Preserve both notices in downstream attribution until the licensor confirms which current notice governs this historical archive; do not remove the embedded header or silently re-license the raw files.

### Asset mapping

All extracted files below are copied byte-for-byte from the official ZIP. Representation IDs and FMA concept IDs are cross-checked against `assets/anatomy-source/metadata/isa_parts_list_e.txt`; the OBJ header supplies the file ID, English name, bounds, and volume. Header volumes are in cm³; vertex coordinates and bounds are in mm.

| Local path | Anatomy label | FMA concept | Representation | Source file ID | Header volume (cm³) | Header bounds (mm) | Geometry | SHA-256 |
|---|---|---:|---:|---:|---:|---|---:|---|
| `assets/anatomy-source/bodyparts3d-4.0/extracted-obj/FJ1433.obj` (target muscle) | Right rectus femoris | FMA38928 | BP5598 | FJ1433 | 347.628400 | `(-154.449400,-152.665900,314.639800)-(-62.882800,-83.899800,871.104000)` | 3326 vertices / 5688 triangular faces; actual extents 91.5345, 68.5662, 556.3960 mm | `a5f75907d784dd2a44d7efa96cb31009aba2afe43465336b105561751b19f8ef` |
| `assets/anatomy-source/bodyparts3d-4.0/extracted-obj/FJ1443.obj` (target muscle) | Right vastus medialis | FMA38932 | BP5600 | FJ1443 | 279.080800 | `(-105.601200,-146.976800,340.547700)-(-34.827000,-89.132000,738.179100)` | 2773 vertices / 4552 triangular faces; actual extents 70.6618, 57.7690, 397.6310 mm | `5bdb79f52849241e20ff2280332f20efd38f1b4bda1fb1337e10a5c3e466002b` |
| `assets/anatomy-source/bodyparts3d-4.0/extracted-obj/FJ1441.obj` (target muscle) | Right vastus intermedius | FMA38934 | BP5604 | FJ1441 | 252.219200 | `(-133.213900,-135.232000,342.484900)-(-76.207100,-76.260800,769.743800)` | 2748 vertices / 4260 triangular faces; actual extents 56.8879, 58.8782, 427.2590 mm | `c609da3e64f0fc6c295b66b575503e61cacc8bfd9a5e5ec9b79e4eb476da5bab` |
| `assets/anatomy-source/bodyparts3d-4.0/extracted-obj/FJ1442.obj` (target muscle) | Right vastus lateralis | FMA38930 | BP5602 | FJ1442 | 502.851400 | `(-159.776700,-137.051400,317.932000)-(-84.056500,-57.367100,788.167100)` | 3975 vertices / 6688 triangular faces; actual extents 75.5755, 79.5478, 470.2350 mm | `f67be78d7d0ddc6e78c0683ce4bd5be7492e4137f8661bc54039cbf535a88880` |
| `assets/anatomy-source/bodyparts3d-4.0/extracted-obj/FJ1397.obj` (target muscle) | Medial head of right gastrocnemius | FMA45957 | BP5539 | FJ1397 | 308.777000 | `(-74.296400,-92.693400,122.833100)-(-21.508000,-13.590100,432.101700)` | 2263 vertices / 3842 triangular faces; actual extents 52.4760, 79.0320, 309.2690 mm | `d7f3aa44801171baade1a59c40a8f8bda72097bec07047f93f24ebaac4546cb4` |
| `assets/anatomy-source/bodyparts3d-4.0/extracted-obj/FJ2810.obj` (full-body context) | Skin | FMA7163 | BP9115 | FJ2810 | 3443.308100 | `(-334.119000,-246.783000,-78.111200)-(332.825000,45.247600,1641.360000)` | 102467 vertices / 203382 triangular faces; actual extents 666.9440, 292.0306, 1719.4712 mm | `682f402206f15592acdeaae8ffb6b34c3e5c3267fa4685e63d2e4920ef2a80e0` |

All six extracted OBJs are ordinary triangulated Wavefront meshes with no invalid face indices. Their vertex coordinates are already in millimetres, so an offline Three.js loader should apply a consistent scale (for example, `0.001` if the scene uses metres). The files have no generated textures or dependency on a remote service; the raw geometry can be loaded with Three.js `OBJLoader` after local hosting.

### Orientation

The preserved official coordinate-system image defines the BodyParts3D convention as: unit = mm; the body centerline is approximately the z-axis; patient left is x > 0 and patient right is x < 0; posterior is y > 0 and anterior is y < 0; larger z is superior. The five target muscles have negative x bounds, consistent with the requested right side. The official image says all body-part z values are positive, but the Release 4.0 skin header actually has a minimum z of -78.1112 mm; treat the explicit mesh/header values as authoritative for rendering and do not normalize or mirror the raw files.

### Whole-body context

`FJ2810.obj` is the official BodyParts3D `Skin` mesh (FMA7163/BP9115), retained as a full-body context. It is a 102,467-vertex / 203,382-triangle mesh with an approximately 666.944 × 292.031 × 1,719.471 mm actual bounding box. In Three.js, render it as a transparent or hidden context layer when highlighting muscles; it is not a replacement for the individually labeled muscle meshes.

## Secondary source investigated: Z-Anatomy

- Official repository: https://github.com/Z-Anatomy/Models-of-human-anatomy
- Official license text: https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/master/License.txt
- Official README: https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/master/Readme.md
- Raw package retrieved during investigation (omitted from release): `assets/anatomy-source/z-anatomy/Z-Anatomy.zip` (86,734,957 bytes; SHA-256 `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736`)

Z-Anatomy states CC BY-SA 4.0 International and permits access, redistribution, and derivatives with attribution and share-alike. Its official repository README identifies the package as a Blender application template; the raw ZIP contains `Startup.blend`, UI XML, Python, and a splash image, not standalone OBJ or glTF files. It is therefore not selected as the Three.js-ready geometry source here. Its attribution text also identifies BodyParts3D as an upstream model source, reinforcing BodyParts3D as the direct, labeled OBJ source for this release.

## Historical acquisition inventory — not the final ZIP inventory

- `assets/anatomy-source/bodyparts3d-4.0/isa_BP3D_4.0_obj_99.zip` — untouched official source archive.
- `assets/anatomy-source/bodyparts3d-4.0/extracted-obj/` — only the six selected raw OBJ originals listed above.
- `assets/anatomy-source/metadata/` — official release README, coordinate image, English/FMA ID tables, relationship tables, and release notes used for mapping.
- `assets/anatomy-source/z-anatomy/` — untouched official Z-Anatomy package plus its upstream README and license text.

## References

1. BodyParts3D database description: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html
2. BodyParts3D official download page: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
3. BodyParts3D official license: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
4. BodyParts3D/Anatomography original interface: https://lifesciencedb.jp/bp3d/?lng=en
5. Z-Anatomy model repository and README: https://github.com/Z-Anatomy/Models-of-human-anatomy
6. Z-Anatomy license text: https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/master/License.txt

## Final included inventory

The release contains `assets/anatomy-source/musclemap-source-subset.zip`, `subset-manifest.json`, official metadata, and `public/assets/muscular-atlas.glb` plus its manifest. The complete 142.9 MB BodyParts3D archive, original loose extraction copies, and unused 86.7 MB Z-Anatomy Blender package are omitted. The verified subset is sufficient to regenerate the final GLB with Python alone.
