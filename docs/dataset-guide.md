# MuscleMap dataset guide

This guide is the reproducibility record for the research data used by MuscleMap. It describes the four actual NASA NLSP CFT70 CSVs, their source fields, hashes, preparation rules, canonical schema, missingness, unit basis, anatomical mapping, validation, scientific-result reproduction, and the companion datasets that were evaluated but not joined.

The core rule is simple: **raw source rows are authoritative for what was observed; preparation may add explicit provenance and a documented coordinate transformation, but it must not invent values, calendar dates, participant identities, units presented as a NASA codebook, or cross-dataset joins.**

## Scope and data status

The core research input is NASA’s public `BEDREST_IRATS_MRI_ULTRASOUND_CFT70` dataset from the NASA Life Sciences Data Archive / JSC LSDA. The exact dataset record is:

- [NASA NLSP CFT70 dataset record](https://nlsp.nasa.gov/api/v1/data/datasets/e621a7dd-7b6b-5a0a-8d9a-0670df11731b)

Four file endpoints were acquired and retained unchanged under `data/raw/`. Each file has 351 data rows, the same 27 de-identified subject labels, the same right-leg design, and the same phase/day schedule. The prepared layer therefore contains 1,404 observations and 10 null measurement values.

These are ground-analog bed-rest research records, not astronaut records. A `Subject` label is a source pseudonym, not an astronaut identity. The source `Group` field is preserved in the canonical note/provenance context but is not used as a participant identity or as a permission to infer a treatment effect.

The earlier compact fixture and its obsolete values are not part of the scientific dataset. In particular, no `53.1` value is used as a NASA result.

## Source files and integrity

`data/raw/download_manifest.json` and `data/raw/file_metadata_manifest.json` preserve response facts and source metadata. The acquisition report is [`docs/cft70-acquisition.md`](cft70-acquisition.md).

| Local file | NASA file UUID and download URL | Rows | SHA-256 |
|---|---|---:|---|
| `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_Ultrasound_Quadriceps.csv` | [`8e007f6e-2433-5ecd-b1b5-527876ee77e8`](https://nlsp.nasa.gov/api/v1/files/8e007f6e-2433-5ecd-b1b5-527876ee77e8/download) | 351 | `29159ef412d35f371681b6ec0efefb872f84c2ece521003215ab8f9dd7ec6b8d` |
| `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_Ultrasound_Medial_Gastrocnemius.csv` | [`1caa9f53-93d6-54fb-805a-3548624f8d2b`](https://nlsp.nasa.gov/api/v1/files/1caa9f53-93d6-54fb-805a-3548624f8d2b/download) | 351 | `8361ed7278dfebf5696ae570ee711a09d1707f16cc5f284c342ab304c4a3a0be` |
| `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_MRI_Quadriceps.csv` | [`d40188a7-ffc4-54b7-bbbe-49ecf6fb03e9`](https://nlsp.nasa.gov/api/v1/files/d40188a7-ffc4-54b7-bbbe-49ecf6fb03e9/download) | 351 | `b82bc0bd38d53826e76edbf67e283a0d9b8b7a3262aa1fe69db53751855c1c69` |
| `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_MRI_Medial_Gastrocnemius.csv` | [`7737cb2a-0da7-51af-84b2-7b43471dea2a`](https://nlsp.nasa.gov/api/v1/files/7737cb2a-0da7-51af-84b2-7b43471dea2a/download) | 351 | `949ac4b6e381429e6b6d81f6c5048c2a9e677cee530017b43b7a5e445fe58169` |

The originals are UTF-8 CSV files with a BOM and CRLF line endings. `scripts/acquire_data.py` verifies the expected SHA-256 digest both after download and whenever an existing file is reused. It fails closed if the endpoint returns an unexpected format or a changed digest.

### Raw schema

Each file contains the following source columns:

| Column | Observed meaning in the CSV | Preparation treatment |
|---|---|---|
| `ID` | Row identifier, unique 1–351 within each file | Preserved as `sourceRow`; included in canonical ID construction. |
| `Subject` | De-identified participant label | Preserved as canonical `participant`. |
| `Group` | `Control` or `Exercise` | Preserved in the source note; not used to fabricate causal claims. |
| `Test_Phase` | `PRE_TEST`, `IN_TEST`, or `POST_TEST` | Preserved as `phase` context and mapped to a signed day. |
| `BR_Day` | Relative bed-rest day | Parsed as an integer and transformed only according to the phase rules below. |
| `Quadriceps` or `Medial Gastrocnemius` | Numeric CSA-like measurement or literal `NA` | Parsed as a finite number or retained as null; never imputed. |

The four files contain:

- `Control`: 117 rows per file;
- `Exercise`: 234 rows per file;
- `PRE_TEST`: 27 rows per file;
- `IN_TEST`: 243 rows per file;
- `POST_TEST`: 81 rows per file; and
- raw `BR_Day` values `3, 6, 7, 10, 11, 15, 22, 29, 36, 53, 69`.

The two ultrasound files each have 349 numeric cells and 2 literal `NA` cells. The two MRI files each have 348 numeric cells and 3 literal `NA` cells. Across all four files this is 1,394 numeric values and 10 missing values.

The missing cells are retained in the raw files and canonical records. Across the files, subject `7036` has `POST_TEST` missing values at `BR_Day` 6 and 10; subject `6947` has an additional `POST_TEST` `BR_Day` 10 missing value in each MRI file. No missing value is converted to zero.

## Unit basis and what is not known

The raw CSV headers and NLSP file records do not state measurement units. The preparation layer uses `cm²` because the associated Scott et al. publication reports the relevant panoramic-ultrasound/MRI CSA method and its limits-of-agreement values in square centimetres:

- [Scott et al. — Reliability and validity of ultrasound cross-sectional area measurements](https://pmc.ncbi.nlm.nih.gov/articles/PMC5476852/)

This is a documented basis for the application’s canonical unit; it is **not** a claim that the CFT70 CSV itself contains a unit header, nor a substitute for an authoritative CFT70 codebook. The associated publication is not treated as the source of the CFT70 participant rows. No separate public CFT70 field-level codebook was exposed in the acquisition review.

The canonical validation layer therefore accepts anatomy CSA values only as `cm²`/`cm2` and normalizes them to `cm²`. A future authoritative data dictionary should be added to the manifest and reviewed before changing this documentation.

## Timepoint and day mapping

The raw phase/day fields are relative bed-rest coordinates. They are not calendar dates. The exact transformation in `scripts/prepare_data.py` is:

```text
PRE_TEST:  day = -BR_Day
IN_TEST:   day = BR_Day
POST_TEST: day = 70 + BR_Day
```

Canonical labels are:

```text
PRE_TEST + BR_Day=6  -> day -6, timepoint BR-6, phase baseline
IN_TEST  + BR_Day=3  -> day 3,  timepoint BR3,  phase bed rest
POST_TEST + BR_Day=3 -> day 73, timepoint BR+3, phase recovery
```

The baseline rule is therefore a source-phase rule: every `PRE_TEST` row is marked as an explicit baseline row in the canonical record, with the true signed day retained. The common `BR_Day=6` baseline becomes day `-6`; a `PRE_TEST` row at `BR_Day=3` becomes day `-3`. `IN_TEST` keeps the raw number. `POST_TEST` begins after the 70-day bed-rest interval, so it is offset by 70 rather than placed on the same day axis as `IN_TEST`.

No calendar acquisition date is supplied by the source, so `acquiredAt` is omitted. This prevents a visually convenient but unsupported calendar narrative.

## Canonical record model

Prepared research rows are written to `public/data/research.json` as the `Observation` type defined in `src/domain.ts`.

| Field | CFT70 preparation |
|---|---|
| `id` | Stable `nasa-{file-uuid}-{source ID}` identifier. |
| `participant` | Source `Subject` label. |
| `mode` | `research`. |
| `stream` | `anatomy`. |
| `region` | `RIGHT_QUADRICEPS_GROUP` or `RIGHT_MEDIAL_GASTROCNEMIUS`. |
| `side` | `right`; the source study is right-leg only for these target measurements. |
| `day` | Signed day from the phase mapping. |
| `timepoint` | `BR-{raw day}`, `BR{raw day}`, or `BR+{raw day}`. |
| `phase` | `baseline`, `bed rest`, or `recovery`. |
| `value` | Finite number or `null` for source `NA`. |
| `unit` | `cm²`, assigned from the associated published CSA basis and documented as not present in the raw header. |
| `measurement` | `CSA`. |
| `modality` | `Panoramic ultrasound` or `MRI`. |
| `protocol` | Source-defined CFT70 modality protocol label. |
| `site` | Right thigh / source-defined group or right posterior calf / medial head. |
| `quality` | `valid` for a numeric source value, `missing` for source `NA`. |
| `sourceId` | Stable CFT70 file label. |
| `sourceRow` | Original source `ID`. |
| `namespace` | `nasa-cft70-anatomy`. |
| `linkage` | `verified` for the within-file source mapping; it does not imply astronaut identity or cross-dataset linkage. |
| `baseline` | `true` for `PRE_TEST`, otherwise `false`/absent. |
| `note` | Original group, raw phase/day, and the unit/date caveats. |

The canonical ID includes the NASA file UUID so the same raw `ID` value in four different files remains distinct. Source row references are never treated as globally unique across files.

## Anatomical mapping

The preparation mapping is exact and intentionally does not generalize beyond the source labels:

| Raw file/column | Canonical region | Side | Interpretation |
|---|---|---|---|
| `Ultrasound_Quadriceps.csv` / `Quadriceps` | `RIGHT_QUADRICEPS_GROUP` | right | Source-defined right quadriceps group CSA. |
| `Ultrasound_Medial_Gastrocnemius.csv` / `Medial Gastrocnemius` | `RIGHT_MEDIAL_GASTROCNEMIUS` | right | Right medial head of gastrocnemius CSA. |
| `MRI_Quadriceps.csv` / `Quadriceps` | `RIGHT_QUADRICEPS_GROUP` | right | MRI source-defined right quadriceps group CSA. |
| `MRI_Medial_Gastrocnemius.csv` / `Medial Gastrocnemius` | `RIGHT_MEDIAL_GASTROCNEMIUS` | right | MRI right medial gastrocnemius CSA. |

The quadriceps display region is a group. The local atlas may show the four mapped right quadriceps muscles individually for orientation, but the data value remains group-level. The medial gastrocnemius display refers to the medial head, not the whole lower leg.

## Preparation algorithm

The preparation script is deliberately small and auditable:

1. Import the fixed four-file list and expected SHA-256 values from `scripts/acquire_data.py`.
2. Read each byte-preserved original as UTF-8 with BOM handling.
3. Assert 351 rows and 27 distinct `Subject` labels per file.
4. Select modality and canonical region from the filename.
5. Parse `BR_Day` as an integer and transform it using `PRE_TEST`, `IN_TEST`, and `POST_TEST` rules.
6. Parse the measurement field as `Decimal` before converting numeric values to JSON floats; convert literal `NA` to `null`.
7. Create a canonical anatomy observation with source file ID, source row ID, participant, group note, raw phase/day note, unit caveat, and no invented acquisition date.
8. Count missing values and build one source-manifest record per file.
9. Write `public/data/research.json`, `public/data/source-manifest.json`, and `data/expected-results.json`.
10. Print the prepared row count and eight Decimal-based reference calculations.

The script does not sort or merge away source rows. The review engine sorts selected observations by canonical day for analysis while retaining stable source IDs and exclusion reasons.

Run the pipeline with:

```bash
python3 scripts/acquire_data.py
python3 scripts/prepare_data.py
```

To regenerate the fictional mission fixture separately:

```bash
python3 scripts/create_simulation.py
```

## Deterministic review and scientific calculation

`src/engine.ts` receives all observations and a selection:

```text
mode, participant, namespace, region, modality, day
```

It then:

- filters to the selected anatomy stream;
- excludes future rows after the review cursor;
- accepts only finite nonnegative `cm²` anatomy values with `quality='valid'`;
- chooses the earliest explicit baseline row, not merely the first chronological row;
- requires matching normalized site, protocol, namespace, and compatible side;
- keeps missing, invalid, or incompatible rows in an exclusion list;
- identifies comparable observations only after an explicit reference exists; without a reference, retains the latest valid observation but does not create an anchored trend;
- reports the age of the latest observation at the cursor;
- computes percent change only for a nonzero baseline; and
- reports a named descriptive state and next review step.

The percentage calculation is:

```text
change_percent = (latest - baseline) / abs(baseline) * 100
```

A zero baseline produces no percentage rather than a division-by-zero result. A missing latest scheduled row does not become an inferred value; the previous valid value remains visible and is labeled stale/missing-current.

Function alignment is a separate operation. `alignFunction()` requires the same participant and mode, normalized namespace, verified linkage, related canonical region, compatible side, valid numeric value, and a default maximum separation of seven study days. It returns `aligned`, `insufficient`, or `incompatible` with reasons. A function value is never relabeled as CSA, and a cycling/activity value is never assigned to one muscle.

## Reproduction of recorded results

`data/expected-results.json` contains eight entries for participants `7326` and `7036`, two modalities, and two regions. Each entry includes source baseline/latest IDs, values, day 69, and the high-precision percentage change.

The most visible corrected examples are participant `7326` at the end of the in-test window:

| Modality | Region | Baseline source row/value | Latest source row/value | Calculation |
|---|---|---|---|---:|
| Panoramic ultrasound | Right quadriceps group | `53` / `84.53 cm²` | `62` / `87.95 cm²` | `+4.045900863598722%` |
| Panoramic ultrasound | Right medial gastrocnemius | `53` / `14.01 cm²` | `62` / `12.26 cm²` | `-12.491077801570308%` |

To reproduce:

```bash
python3 scripts/acquire_data.py
python3 scripts/prepare_data.py
pnpm test
```

The data test suite independently checks the raw SHA-256 digests, 1,404 rows, 27 participants, 10 null values, signed timepoints (`BR-6`, `BR3`, `BR+3`), absence of invented `acquiredAt` dates, all eight expected calculations, and the missing recovery-row behavior. The test suite is the executable check; this guide does not claim a final pass count until the release verification report records an actual run.

## Companion datasets: evaluated, not joined

A companion investigation downloaded/evaluated 158 files from public NASA NLSP catalogs, including:

- `MR079G_Campaign_11` isokinetic function summaries;
- `BEDREST_FTT_CFT70` functional task files;
- `BEDREST_IRATS_POWER_CYCLE_SUMMARY` power-cycle files;
- `NNX10AP86G_CFT70` anatomical/iDXA files; and
- CFT70 symptoms and issues files.

The evaluation metadata and observed-header dictionary may be retained in `data/companion/` for research traceability. They are not part of `public/data/research.json` and are not used by the core monitoring engine. Raw clinical symptom/issue rows are omitted from the final deliverable.

The reason is not that the files are inaccessible. They were publicly downloadable, but a safe individual inference join was not established for the intended use:

- units and field semantics were incomplete or inconsistent;
- `ID` and `Record` are row/record identifiers and must not be assumed to be participant keys;
- average tables often omit `Subject`;
- source columns vary (`BR_Day`, `BR Day`, `Date`, phase variants);
- anatomical iDXA does not provide a calendar date for a date-based join; and
- a participant/day intersection is not by itself proof of the same measurement protocol, anatomical site, or intended endpoint.

The companion source report documents a few verified subject/day overlaps for symptoms/issues and iDXA, but those overlaps are not promoted to a joined MuscleMap inference. A future integration needs an authoritative data dictionary, explicit participant crosswalk, endpoint semantics, unit/protocol mapping, privacy governance, and source-specific validation.

## Canonical import rules for additional data

The UI import layer in `src/ingestion.ts` accepts a canonical CSV or JSON shape. Required fields are:

```text
id, participant, mode, stream, day, timepoint, phase, value, unit,
measurement, modality, protocol, site, quality, sourceId, sourceRow,
namespace, linkage
```

Additional fields are `region`, `relatedRegion`, `side`, `acquiredAt`, `baseline`, `note`, and `importedAt`.

Validation rules include:

- IDs and namespaces must be nonempty and use the allowed identifier pattern;
- mode is one of `research`, `simulated`, or `manual`;
- stream is one of `anatomy`, `function`, `activity`, or `symptom`;
- anatomy requires CSA, a canonical right-side region, and `cm²`/`cm2`;
- function accepts `N`, `Nm`, `W`, or `s`;
- activity accepts `W`, `min`, or `W/min`;
- symptom rows have no numeric unit and no numeric value;
- non-missing numeric values must be finite and nonnegative;
- `quality='missing'` stores a null value and does not accept an empty string as a numeric value;
- timestamps, when supplied, must be ISO date-times with a timezone;
- research imports are conservatively marked `check_comparability`, and external namespaces are not treated as verified NASA provenance; and
- duplicate IDs within the batch or against existing local records reject the entire batch.

The import preview is local. No file is uploaded. Original source files should be retained separately for provenance.

## Research, simulation, and manual separation

| Mode | Data identity | Persistence/analysis rule |
|---|---|---|
| `research` | Bundled NASA CFT70 rows or explicitly imported research records | Never borrows a baseline from another mode; bundled rows use the prepared source namespace. |
| `simulated` | Fictional `DEMO-01` records from `create_simulation.py` | Demonstration only; cannot alter or supplement research. |
| `manual` | Local form/import records | Local-only evidence; cannot overwrite bundled research or simulation. |

The local store is schema version 2 under `musclemap-release-v2`. It stores user observations, follow-up drafts, incident drafts, and audit actions. It does not mutate raw source files.

## Distribution, licensing, and attribution caveats

The four NLSP file records expose public availability, provenance, metadata, and checksums, but no CFT70-specific `license`, `rights`, `copyright`, or `use restriction` field. Public download access establishes access, not a blanket redistribution grant. The project therefore:

- retains source URLs, dataset/file UUIDs, and hashes;
- credits NASA NLSP/JSC LSDA and the CFT70 dataset;
- does not claim CC0 or another stronger CFT70-specific license; and
- recommends confirming terms with NLSP/LSDA if redistribution as a separate product is legally material.

NASA Earthdata’s general data-use guidance is useful background, but it is not substituted for an explicit license on this NLSP CFT70 record. See the acquisition report for the detailed distinction.

The anatomy asset is separately governed. BodyParts3D Release 4.0 source files carry an older CC BY-SA 2.1 Japan notice in their OBJ comments while the current official license page states CC BY 4.0. The project preserves both notices and uses a conservative BY-SA derivative posture. See [`anatomy-license.md`](../anatomy-license.md) for exact BodyParts3D URLs, selected target meshes, hashes, orientation, and attribution.

## Known limitations and unresolved details

- No authoritative CFT70 unit/codebook file was found in the public acquisition responses; `cm²` remains an explicitly documented associated-paper basis.
- The data are right-leg, source-defined regions only; they are not whole-body muscle status.
- MRI and panoramic ultrasound values remain modality-specific and are not averaged or substituted.
- The data are processed tabular values, not raw images. No segmentation or measurement extraction is performed in MuscleMap.
- Participant labels cannot be mapped to astronaut identities.
- Companion functional, activity, anatomical, symptom, and issues rows are not joined into direct individual inference.
- Calendar dates are absent and deliberately not invented.
- The public access record does not resolve file-specific redistribution rights.
- No clinical, operational, causal, prognostic, or usability validation is asserted.
- The browser’s local persistence is not a secure clinical data system.
- Final browser/E2E results, archive integrity, and the completed atlas asset should be reported only after actual verification.

## References

- [CFT70 acquisition report](cft70-acquisition.md)
- [Functional and companion-source report](functional-sources.md)
- [NASA NLSP CFT70 dataset record](https://nlsp.nasa.gov/api/v1/data/datasets/e621a7dd-7b6b-5a0a-8d9a-0670df11731b)
- [NASA NLSP CFT70 ultrasound quadriceps file record](https://nlsp.nasa.gov/api/v1/data/lsdapub_ls_dataset_file/8e007f6e-2433-5ecd-b1b5-527876ee77e8)
- [NASA NLSP CFT70 ultrasound medial gastrocnemius file record](https://nlsp.nasa.gov/api/v1/data/lsdapub_ls_dataset_file/1caa9f53-93d6-54fb-805a-3548624f8d2b)
- [NASA NLSP CFT70 MRI quadriceps file record](https://nlsp.nasa.gov/api/v1/data/lsdapub_ls_dataset_file/d40188a7-ffc4-54b7-bbbe-49ecf6fb03e9)
- [NASA NLSP CFT70 MRI medial gastrocnemius file record](https://nlsp.nasa.gov/api/v1/data/lsdapub_ls_dataset_file/7737cb2a-0da7-51af-84b2-7b43471dea2a)
- [Scott et al. — Reliability and validity of ultrasound CSA measurements](https://pmc.ncbi.nlm.nih.gov/articles/PMC5476852/)
- [NASA Earthdata data-use and citation guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance)
- [BodyParts3D database description](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html)
- [BodyParts3D download page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)
- [BodyParts3D license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)
- [Anatomy asset license and source mapping](../anatomy-license.md)

## Release integrity refinements

A numeric value with `quality=missing` is rejected instead of silently erased. Duplicates are checked by observation ID and the complete source-row/participant/namespace/stream/region/measurement/modality identity. Imported research always gets an `imported-` namespace and unverified linkage; local comparability acknowledgement cannot authorize NASA provenance. `data/companion/manifest.json` contains only 158 sanitized file-metadata records. No companion measurement CSV or clinical note payload is included.
