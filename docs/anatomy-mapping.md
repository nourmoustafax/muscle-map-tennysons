# Anatomical atlas mapping and reproducibility

The delivered `public/assets/muscular-atlas.glb` is a self-contained glTF 2.0 binary made from actual BodyParts3D / Anatomography Release 4.0 reduced anatomical meshes. It contains 38 source meshes, 328,803 vertices and 577,544 triangles; its size is 14,854,100 bytes. The five measured-region meshes are accompanied by contralateral thigh, forearm, trunk, upper-limb and calf context. The original full-body skin is rendered at 10% opacity solely to provide head, hands, feet and proportion context. It is neither a measurement nor an opaque cover.

The reference represents an adult male, not patient-specific or astronaut anatomy. Gray/warm-neutral context geometry carries no physiological status. Mint denotes selection, not health. Selecting the medial gastrocnemius opens the back view to locate that posterior structure. A source-group measurement is not broken into fabricated component measurements.

## Exact measured-region mapping

| Source OBJ / GLB node | Official label | FMA / representation | MuscleMap region |
|---|---|---|---|
| FJ1433 | Right rectus femoris | FMA38928 / BP5598 | RIGHT_QUADRICEPS_GROUP |
| FJ1443 | Right vastus medialis | FMA38932 / BP5600 | RIGHT_QUADRICEPS_GROUP |
| FJ1441 | Right vastus intermedius | FMA38934 / BP5604 | RIGHT_QUADRICEPS_GROUP |
| FJ1442 | Right vastus lateralis | FMA38930 / BP5602 | RIGHT_QUADRICEPS_GROUP |
| FJ1397 | Medial head of right gastrocnemius | FMA45957 / BP5539 | RIGHT_MEDIAL_GASTROCNEMIUS |

Every node carries source ID, label, concept, representation and region metadata. `public/assets/anatomy-manifest.json` includes the complete context inventory, source bounds, counts, hashes and attribution. Only the five target nodes invoke region selection; there is no unmeasured-muscle health classification.

## Provenance and license

Official source: [BodyParts3D description](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html), [download](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html), [license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). The complete official ZIP SHA-256 is `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`.

Attribution is retained in GLB metadata, the asset manifest, raw OBJ headers, and `anatomy-license.md`: “BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International”. The historical 2013 OBJ headers carry CC Attribution-Share Alike 2.1 Japan, while the current official site states CC BY 4.0. Both notices remain intact. The derived atlas is distributed under a conservative share-alike interpretation pending clarification; the application's original code license does not override source-asset terms.

The release includes `assets/anatomy-source/musclemap-source-subset.zip`: 38 **byte-preserved original OBJ entries**, 12,227,495 bytes, rather than the entire 142.9 MB database. `subset-manifest.json` verifies the ZIP and each original entry and identifies the original archive's hash. Official coordinate documentation and mapping tables are included. The unrelated Blender-only Z-Anatomy package and other unused atlas organs are deliberately omitted; their original retrieval investigation remains documented, not represented as included assets.

## Coordinate conversion

The official source is in millimetres: patient right x < 0; patient left x > 0; posterior y > 0; superior z increases. The transformation baked into the GLB is `Three x = source x * 0.001; Three y = source z * 0.001; Three z = -source y * 0.001`. This is an upright right-handed metre scene without mirroring or patient-specific deformation.

## Offline regeneration

Run `python3 scripts/prepare_anatomy.py` from the extracted project root. If the full official ZIP is absent, the script uses the bundled verified source subset. It checks the original-source provenance, subset archive hash and every retained OBJ entry, resolves representation IDs from the official English table, verifies face indices, calculates normals and writes the GLB and its manifest. The Python standard library is sufficient; no pip packages, Blender or remote service are needed. Regeneration from the subset was executed and produced a byte-identical GLB.

## Viewer behavior and limits

Three.js GLTFLoader caches CPU geometry for the page lifetime. Per-view materials are cloned, highlight is source-mapped, and WebGL resources and contexts are disposed on view replacement. Orbit controls render on demand rather than maintaining an idle animation loop. Lights make the actual anatomical surfaces readable; the initial camera target is explicitly initialized before rendering. Rotation, zoom, front/back/reset, actual raycast selection, resize and keyboard region alternatives are part of the interface. Loading/WebGL errors leave the accessible region controls available. The atlas remains a limited source-derived visualization, not complete muscle segmentation or a clinical anatomical validation.
