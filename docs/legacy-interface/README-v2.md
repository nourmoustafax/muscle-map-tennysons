# MuscleMap

MuscleMap is a local-first musculoskeletal monitoring and review prototype. A two-region overview explains what changed, what is missing and what to inspect next, followed by region-specific size measurements, related performance, mission activity and a documented follow-up. It makes the chain from source row to review visible: what was measured, where and when it was measured, which source and protocol support it, what is comparable, what is missing, and what review step is justified next.

MuscleMap is **not** a medical device, clinical decision-support system, diagnostic tool, treatment planner, exercise prescription engine, emergency triage system, or NASA-approved operational product. It does not connect to NASA, ISS, OnePortal, a spacecraft, a flight surgeon, a crew medical officer, or a live device feed. The bundled NASA material is public ground-analog research data; it is not astronaut medical data.

## Using the refined product

The main navigation is **Muscle Health**, **Health Records**, **Mission Context** and **Sources & Methods**. The initial research case is participant 7326 at study day 69. The overview shows quadriceps +4.0% and medial gastrocnemius −12.5% relative to their own comparable baselines, identifies missing performance/activity context and links directly to the calf review. These are regional size observations, not an overall health score, diagnosis or exercise-effect conclusion.

Choose a region through a summary card, the atlas or the keyboard-accessible region list. The quadriceps selection highlights all four source-defined members as one measurement group; calf selection identifies only the right medial gastrocnemius. **Focus region** frames actual source geometry; opening a dialog preserves the camera and WebGL view. The detailed workflow runs through direct measurement, Muscle Changes Over Time, related performance, exercise context, interpretation/uncertainty, Recommended Follow-up and expandable source traceability.

**Try the full mission demo** opens the separate, clearly fictional `DEMO-01` collection: 17 records connect anatomy, knee-extension force, multi-muscle plantar-flexion torque and CEVIS activity. Function references are matched by identity, source, side, region, task, method, units and protocol before a percentage change is displayed. In Mission Context, review days 0, 52 and 69 demonstrate the reference, a missing assessment and the latest connected picture. No simulation is joined to NASA research.

New manual records and file imports are validated before an atomic local save. Feedback explains the affected record collection, mapped stream, comparison readiness and whether a follow-up was suggested; a function or session event does not update muscle size. Follow-up drafts and exports remain local. Incident Support is a secondary modal that organizes literal reported terms, retrieves curated public-reference metadata locally, shows authority/documentation reminders and preserves no-match-not-safe wording. Online citations are not approved flight instructions.

The redesign uses ivory surfaces, deep ink and restrained ocean blue. The familiar source identifiers remain in downloadable records and expandable technical details, not primary navigation. Local storage remains unencrypted prototype storage; the interface and test suite do not establish clinical, usability or accessibility certification.

## Why this project exists

NASA identifies reduced musculoskeletal and cardiorespiratory fitness as human-spaceflight risks. Microgravity, constrained schedules, vehicle resources, communications delay, and the need to preserve crew capability make longitudinal evidence organization a meaningful research and operational-design problem. The challenge is not simply to draw a trend line. A credible review must preserve modality, side, anatomical site, protocol, study phase, units, missingness, participant identity, source row, and provenance, while refusing to turn a strength test or exercise session into a direct muscle-size measurement.

MuscleMap addresses that problem with a deliberately narrow, inspectable workflow:

1. acquire the four public NASA NLSP CFT70 MRI/ultrasound CSVs without changing their bytes;
2. retain originals, source IDs, row references, hashes, source phase labels, missing values, and access caveats;
3. prepare canonical records with an explicit study-day transformation and a documented unit basis;
4. review a participant, region, modality, and true study-day cursor through a deterministic pure TypeScript engine;
5. link related performance only when identity, namespace, anatomical relation, side, provenance, and time window are all compatible;
6. show mission or exercise records as context, never as proof that CSA changed or that exercise caused a result;
7. allow validated local imports, local follow-up drafts, traceable exports, and a secondary conservative incident-support overlay; and
8. keep research, fictional simulation, and user-entered manual records in separate namespaces.

This is a research software demonstration of evidence discipline, not a claim of clinical efficacy, usability improvement, injury prevention, or operational approval.

## NASA challenge and proposed solution

Official challenge: [Create Health Monitoring Software for Astronauts on Space Missions — details](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=details), [resources](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources).

The project responds to the NASA human-spaceflight challenge of making musculoskeletal evidence useful under real constraints: sparse assessments, modality differences, missing or delayed observations, limited crew time, privacy requirements, and no justified public API to astronaut records. NASA’s public research and operations references support the motivation and system constraints. They do not provide a universal threshold, participant-level astronaut dataset, approved public medical procedure, or authorization to infer individual health status.

The proposed solution is a **source-aware longitudinal review surface** rather than a single health score. The user can select a data mode, participant, anatomy region, modality, and review day. The application presents the latest valid comparable CSA, the explicit baseline, the calculated change, source-row details, excluded rows, missingness, freshness, related function when alignment is verified, and the next justified review action. A 3D anatomical atlas locates the source-defined region but does not pretend to be a patient-specific scan.

The workflow is intentionally useful to a researcher or authorized future operator without pretending that a browser prototype can replace controlled flight medicine, imaging analysis, or mission procedures.

### What NASA data is integral to the workflow

The core research view uses the actual four CFT70 files acquired from NASA’s Life Sciences Data Archive / NASA Laboratory for Space and Physical Life Sciences (NLSP/JSC LSDA):

- CFT70 panoramic ultrasound, right quadriceps group;
- CFT70 panoramic ultrasound, right medial gastrocnemius;
- CFT70 MRI, right quadriceps group; and
- CFT70 MRI, right medial gastrocnemius.

Each file contains 351 rows for the same 27 de-identified ground-analog participants, giving 1,404 prepared records. The four files share the right-leg study design and timepoint schedule. Ten literal `NA` cells remain missing in the prepared research set. Dead fixture code was removed; only the actual acquired source records enter the release.

## Product boundaries at a glance

| MuscleMap can do | MuscleMap does not claim to do |
|---|---|
| Preserve source identity, source rows, hashes, phase labels, units, missingness, and method metadata | Access astronaut records, ISS data, OnePortal, or a NASA account/API |
| Compare same-participant, same-mode, same-region, same-modality observations under explicit compatibility rules | Diagnose, clear, risk-score, prescribe, or estimate clinical severity |
| Show a transparent percentage change from an explicit comparable baseline | Treat a group CSA as an individual-muscle measurement or infer causation |
| Keep function and exercise as separate evidence streams | Assign cycling power or strength directly to one muscle’s CSA |
| Store local manual records, follow-up drafts, and incident drafts | Transmit follow-ups, incidents, or health information to a medical team |
| Import canonical CSV/JSON after preview and atomic validation | Silently repair, impute, overwrite, or merge incompatible rows |
| Demonstrate a fictional mission workflow using `DEMO-01` | Present fictional rows as NASA data or an operational mission record |
| Provide conservative emergency reminders and public links | Provide triage, treatment, medication/dosing, evacuation instructions, or a copied flight checklist |

## Architecture

MuscleMap is a static Vite application. There is no backend, runtime secret, NASA credential, database service, or required cloud connection.

```text
NASA NLSP CSV originals
        |
        v
scripts/acquire_data.py  -- download + SHA-256 verification, byte preservation
        |
        v
data/raw/             -- immutable source files and manifests
        |
        v
scripts/prepare_data.py -- canonicalization, timepoint mapping, missingness
scripts/create_simulation.py -- explicitly fictional DEMO-01 rows
        |
        v
public/data/research.json, simulated.json, source-manifest.json
        |
        v
Vite static app
  src/domain.ts      canonical types, modes, streams, regions, source records
  src/ingestion.ts   JSON/CSV parsing and validation
  src/engine.ts      deterministic review and function alignment
  src/store.ts       versioned localStorage and storage error handling
  src/anatomy.ts     local Three.js atlas viewer and resource disposal
  src/overview.ts    two-region summary and strict functional reference comparisons
  src/intake.ts      stream-specific intake and engine-based comparison feedback
  src/monitoring.ts  understanding → evidence → follow-up → source layers
  src/product-copy.ts human-facing interpretation and review suggestions
  src/incident-ui.ts structured incident and locally retrieved public-reference UI
  src/emergency.ts   conservative incident text rules
  src/main.ts        UI integration, pages, forms, exports, mode isolation
  src/ui.ts          escaping, tables, charts, status presentation
        |
        v
Browser-local review, localStorage v2, downloadable traceable exports
```

### Repository layout

| Path | Responsibility |
|---|---|
| `src/domain.ts` | Canonical `Observation`, `Review`, `Alignment`, `FollowUp`, `Incident`, `SourceRecord`, and region mappings. |
| `src/engine.ts` | Pure review logic: selection, true-day cursor, explicit baseline, comparability, missingness, percentage change, repeated-decrease flag, and verified function alignment. |
| `src/ingestion.ts` | Canonical JSON/CSV validation, supported units, ISO timestamps, identifier checks, duplicate detection, and atomic import preparation. |
| `src/store.ts` | Version-2 local browser storage, schema validation, duplicate protection, and surfaced read/write errors. |
| `src/anatomy.ts` | Three.js atlas loading, rotation/zoom/view controls, muscle highlighting, keyboard fallback, and disposal. |
| `src/emergency.ts` | Rule-based reported-term extraction and conservative escalation language. It is explicitly non-operational. |
| `src/overview.ts`, `src/monitoring.ts`, `src/product-copy.ts` | Human-facing two-region overview, layered region review, exact function-baseline comparison and recommended follow-up language. |
| `src/intake.ts` | Per-source intake destinations, actual comparison readiness and context-only/no-CSA-update feedback. |
| `src/incident-ui.ts` | Structured reported-issue facts, established-authority steps and local curated public-reference retrieval. |
| `src/main.ts` | Research/simulation/manual mode selection, pages, forms, import flow, follow-up and incident drafts, source display, and export. |
| `public/data/` | Prepared research records, fictional simulation records, and the source manifest served by the static app. |
| `data/raw/` | The four byte-preserved NASA CSV originals plus download and file metadata manifests. |
| `data/expected-results.json` | Eight source-row calculations used to reproduce key baseline-to-day-69 values. |
| `scripts/` | Acquisition, preparation, fictional simulation generation, offline serving, and optional anatomy preparation. |
| `assets/anatomy-source/` | Attribution-preserved BodyParts3D source archive/material and selected source geometry when included in the release archive. |
| `public/assets/` | Browser-ready local atlas asset, expected at `public/assets/muscular-atlas.glb`, plus its manifest. |
| `tests/` | Unit and data tests for domain logic, deterministic analysis, ingestion, storage, and safety copy. Browser journeys are maintained separately by the release test setup. |
| `docs/` | Acquisition, challenge, source, mission-integration, emergency, dataset, and verification documentation. |

## Technology stack

- **TypeScript + Vite** for the static application and development server.
- **Three.js 0.180.0** for local anatomy rendering.
- **Vitest 3.2.4** for unit, ingestion, storage, safety, and data-reproduction tests.
- **Playwright 1.56.1** for browser journeys for the included browser journeys.
- **Python 3 standard library** for acquisition, CSV preparation, simulation generation, and the offline static server.
- **No pip packages or Blender needed**: the anatomy preparation pipeline also uses the Python standard library and the bundled byte-preserved source subset.
- **pnpm 11.25.0** with the pinned lockfile for source development.

The application is local-first. External source and reference links require connectivity and are labeled as online-only in the UI and documents.

## Research dataset

### Exact NASA source links

The dataset catalog is [`BEDREST_IRATS_MRI_ULTRASOUND_CFT70`](https://nlsp.nasa.gov/api/v1/data/datasets/e621a7dd-7b6b-5a0a-8d9a-0670df11731b). The four file download endpoints are:

- [Ultrasound quadriceps CSV](https://nlsp.nasa.gov/api/v1/files/8e007f6e-2433-5ecd-b1b5-527876ee77e8/download)
- [Ultrasound medial gastrocnemius CSV](https://nlsp.nasa.gov/api/v1/files/1caa9f53-93d6-54fb-805a-3548624f8d2b/download)
- [MRI quadriceps CSV](https://nlsp.nasa.gov/api/v1/files/d40188a7-ffc4-54b7-bbbe-49ecf6fb03e9/download)
- [MRI medial gastrocnemius CSV](https://nlsp.nasa.gov/api/v1/files/7737cb2a-0da7-51af-84b2-7b43471dea2a/download)

The detailed acquisition record is [`docs/cft70-acquisition.md`](docs/cft70-acquisition.md). It contains the file-record links, byte counts, hashes, row structure, participant labels, missing cells, and redistribution caveat.

### What is actually in each source file

Every CSV has 351 data rows, unique source `ID` values 1–351, the same 27 subject labels, the same `Group` distribution (117 Control and 234 Exercise), and the same phase distribution (27 `PRE_TEST`, 243 `IN_TEST`, 81 `POST_TEST`). The raw study-day values are `3, 6, 7, 10, 11, 15, 22, 29, 36, 53, 69`.

The raw headers are `ID`, `Subject`, `Group`, `Test_Phase`, `BR_Day`, and either `Quadriceps` or `Medial Gastrocnemius`. The CSV headers do **not** declare units. The prepared layer uses `cm²` because the associated Scott et al. paper reports the relevant CSA method and limits-of-agreement values in square centimetres; this is an explicit documentation basis, not a claim that the NASA CSV itself contains a codebook or unit header. See [Scott et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC5476852/) and [`docs/dataset-guide.md`](docs/dataset-guide.md).

The four source files contain 10 literal `NA` cells in total. Missing values remain `null` in canonical JSON and are never changed into zero or carried forward as a new measurement.

### Timepoint transformation

`BR_Day` is a relative bed-rest day, not a calendar date. The preparation script preserves the source phase and creates a comparable signed study-day axis:

| Raw `Test_Phase` | Canonical day | Canonical label | Meaning |
|---|---:|---|---|
| `PRE_TEST` | `-BR_Day` | `BR-{BR_Day}` | Baseline before bed rest; for example `PRE_TEST` + `BR_Day=6` becomes day `-6`. |
| `IN_TEST` | `BR_Day` | `BR{BR_Day}` | During bed rest; raw day is retained. |
| `POST_TEST` | `70 + BR_Day` | `BR+{BR_Day}` | Recovery after the 70-day bed-rest interval; `POST_TEST` + 3 becomes day 73. |

No calendar acquisition dates are invented. `acquiredAt` is absent for these historical research rows. A source row’s original `Test_Phase`, `BR_Day`, `Group`, `ID`, and measurement value remain in its note/source reference.

### Regions and anatomical semantics

The source-defined right-leg mappings are intentionally narrow:

- `RIGHT_QUADRICEPS_GROUP` → right thigh / source-defined quadriceps group. The atlas target meshes are right rectus femoris, right vastus medialis, right vastus intermedius, and right vastus lateralis. A group CSA is not relabeled as an individual-muscle CSA.
- `RIGHT_MEDIAL_GASTROCNEMIUS` → right posterior calf / medial head of the right gastrocnemius.

The app states that knee extension and ankle plantar-flexion involve multiple muscles. Cycling power, strength, and other function values are related context; they are not direct CSA measurements for either region.

## Acquisition and preparation

From a clean checkout with network access, run:

```bash
python3 scripts/acquire_data.py
python3 scripts/prepare_data.py
python3 scripts/create_simulation.py
```

`acquire_data.py` downloads only when a raw file is absent, checks the expected CSV prefix, and verifies the expected SHA-256 digest. If an existing file’s digest differs, it stops instead of silently accepting a changed source. The raw files are written under `data/raw/` with their original bytes.

`prepare_data.py` reads the four originals, checks each for 351 rows and 27 participants, maps the source fields into canonical `Observation` records, preserves `NA`, writes `public/data/research.json`, writes `public/data/source-manifest.json`, and writes the eight reference calculations to `data/expected-results.json`. The script does not merge companion datasets and does not fabricate units, dates, participants, or values.

A companion-data investigation downloaded and evaluated 158 files across functional, exercise, anatomical, symptoms, and issues catalogs. Those files were not joined into the core research view because units, participant crosswalks, and anatomical semantics were incomplete for individual inference. The final deliverable retains evaluation metadata/manifest where applicable but omits raw clinical symptom/issue rows from the core deliverable. In particular, do not join across datasets on `ID` or `Record`; an independently verified participant/time/protocol crosswalk is required.

## Deterministic monitoring logic

The core engine in `src/engine.ts` is pure and deterministic. A review selection contains `mode`, `participant`, `namespace`, `region`, `modality`, and a study-day cursor.

1. Select only anatomy rows matching the chosen mode, participant, namespace, region, and modality.
2. Keep rows at or before the cursor; mark later rows as future and exclude them from the review.
3. Require a finite nonnegative value, `quality='valid'`, and normalized anatomy unit `cm²`.
4. Choose the first explicit baseline (`baseline=true` or phase `baseline`) as the reference. The engine does not silently treat an arbitrary first observation as a personal baseline.
5. Require the comparison key to match the baseline: normalized site, identical right laterality, normalized protocol, and normalized namespace.
6. Keep missing rows visible as exclusions and preserve the last valid measurement as stale when the latest scheduled point is missing. No daily values are interpolated or imputed.
7. Calculate percentage change only when both values are finite and the baseline is nonzero:

   ```text
   (latest comparable CSA - explicit baseline CSA)
   / abs(explicit baseline CSA) * 100
   ```

8. Return a descriptive state: `BASELINE_MISSING`, `MEASUREMENT_MISSING`, `CHECK_COMPARABILITY`, `REPEATED_DECREASE`, `BELOW_BASELINE`, or `NO_DECREASE_FLAG`.
9. A repeated-decrease flag requires the latest three ordered comparable values to contain two successive strict decreases; a later increase clears that repeated-sequence flag. It is a descriptive review cue, not a severity threshold or diagnosis.
10. Related function aligns only when participant, mode, namespace, verified linkage, related region, side, numeric validity, and a default ±7-day window are compatible. The window is a transparent demonstration policy, not a validated medical criterion.

Research imports are intentionally conservative: external research rows are assigned an `imported-` namespace, unverified linkage and `check_comparability` quality. A file cannot self-authorize the original NASA namespace. The Observation register offers an explicit local comparability acknowledgement, which allows within-source calculations but does not verify NASA provenance or approve clinical use. Bundled NASA rows remain immutable and separately selectable.

## Import, local storage, and export

The import dialog accepts a canonical CSV or JSON array/object with a `rows` array. Required fields include:

```text
id, participant, mode, stream, day, timepoint, phase, value, unit,
measurement, modality, protocol, site, quality, sourceId, sourceRow,
namespace, linkage
```

Optional fields include `region`, `relatedRegion`, `side`, `acquiredAt`, `baseline`, `note`, and `importedAt`. Validation rejects unsupported headers, duplicate IDs, missing required provenance, invalid identifiers, non-finite or negative numbers, timezone-less timestamps, incompatible units, malformed CSV, invalid enums, and anatomy/function rows without the required region/side. `NA`/missing observations must use `quality='missing'` and a null value; zero is a real numeric value and is not a missingness marker.

A whole import batch is previewed and committed atomically. If any row fails, no row from that batch is saved. Existing observation IDs are never overwritten. Research, simulated, and manual rows do not share baselines or silently join.

Validated local records are stored in browser `localStorage` under versioned schema key `musclemap-release-v2`. The app surfaces malformed schema, unknown version, quota, and write errors and provides a local JSON backup/export path. Unreadable existing data blocks overwrite until an explicit reset; backup preserves its unparsed original text. Backups are exports, not an automatic restore/synchronization service. Browser localStorage is not encryption, clinical access control, secure synchronization, an audit-grade record, or a retention policy. Treat exported files and notes as potentially sensitive.

A traceable review export includes the selection, review result, exclusions, aligned function result, source rows, source manifest, local follow-ups, calculation formula, timestamps, and policy limits. Follow-up drafts are local and explicitly marked not transmitted.

## Fictional mission simulation

`python3 scripts/create_simulation.py` creates 17 explicitly fictional records for participant `DEMO-01` under `public/data/simulated.json`:

- ten anatomy rows across the two regions;
- two fictional knee-extension function rows;
- three fictional CEVIS session-duration context rows; and
- a labeled missing quadriceps point.

The simulation exists to demonstrate cursoring, missingness, function alignment, mission context, and safe UI states when no NASA research result is available. It is not a NASA measurement, astronaut record, clinical case, exercise prescription, or expected scientific result. The UI labels it `FICTIONAL MISSION / DEMO-01`, and the store keeps it separate from research and manual namespaces.

Manual entry is separate again. User-entered observations are stored as `mode='manual'`, with local namespace and provenance fields, and cannot modify bundled NASA research or fictional simulation data.

## Anatomy atlas and licensing

The release uses local BodyParts3D/Anatomography geometry rather than generated primitives. The source is an adult human male whole-body reference model, not a patient-specific scan and not a representation of astronaut anatomy. The exact target mapping is:

- right rectus femoris — FMA38928 / representation BP5598 / `FJ1433`;
- right vastus medialis — FMA38932 / BP5600 / `FJ1443`;
- right vastus intermedius — FMA38934 / BP5604 / `FJ1441`;
- right vastus lateralis — FMA38930 / BP5602 / `FJ1442`; and
- medial head of right gastrocnemius — FMA45957 / BP5539 / `FJ1397`.

The delivered `public/assets/muscular-atlas.glb` contains 38 actual source meshes, including five targets and translucent skin orientation context, at 14,854,100 bytes. `scripts/prepare_anatomy.py` regenerates it offline from the bundled 38-entry, byte-preserved source subset. The complete original database and unused Z-Anatomy package are omitted; source links and licenses are retained. See `docs/anatomy-mapping.md`.

The current official BodyParts3D page states CC BY 4.0 and gives the attribution: **“BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International”.** The preserved Release 4.0 OBJ comments state CC Attribution-Share Alike 2.1 Japan. Because those notices conflict for this historical archive, MuscleMap conservatively preserves the older BY-SA notice and attribution in downstream derivatives rather than silently re-licensing the geometry. See [`anatomy-license.md`](anatomy-license.md) for source URLs, hashes, orientation, extracted-mesh details, and the Z-Anatomy investigation.

## Emergency Support boundary

The secondary incident overlay is a rule-based local documentation aid. It accepts the user’s text, preserves reported terms, performs limited keyword matching, shows a conservative notice when listed high-risk terms are reported, and reminds the user to follow established mission procedures or local emergency services. It is **not** medical triage, diagnosis, treatment, a RAG system, an approved procedural library, or a substitute for a crew medical officer, flight surgeon, emergency dispatcher, or licensed clinician.

The overlay does not provide medication or dosing, airway or resuscitation instructions, wound-treatment steps, evacuation timing, improvised spaceflight actions, or copied mission guidance. When no verified mission-specific procedure is configured, it says so and directs the user to the responsible authority. It does not transmit follow-ups or incidents. Saved incident drafts remain local.

Public NASA standards, training, MedlinePlus, American Heart Association, and NHS pages are references only and remain online-only. No copyrighted guide is republished wholesale. A public article is never presented as an approved flight procedure.

## Install, run, and use

### Source development

Requirements for source development: Node.js 20.19+ or 22+, pnpm 11.25.0, and Python 3.10+. The included built application needs Python only. Activate the pinned package manager with `corepack enable` if necessary. From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Vite serves the development app on port 3000. Open the printed local URL, select **NASA research**, **Mission simulation**, or **Local manual records**, then:

1. choose a participant and modality;
2. select **Right quadriceps group** or **Right medial gastrocnemius** in the anatomy explorer or region list;
3. move the study-day cursor to inspect the actual sparse schedule;
4. inspect latest valid CSA, explicit baseline, change, freshness, missingness, and excluded rows;
5. read the related function panel as aligned, insufficient, or incompatible rather than treating it as direct CSA;
6. use **Observations** for source-row details and **Sources & methods** for manifests and limits;
7. use **Mission context** for existing/simulated activity records only;
8. create local follow-up drafts or export a traceable review; and
9. use **Incident support** only as a secondary non-operational reminder/documentation overlay.

### Build and offline serving

```bash
pnpm run build
python3 scripts/serve.py
```

The build creates a content-versioned `offline-manifest.json` and service worker covering every local essential asset. Offline reload is available after successful initial caching. The Python server serves the included `dist/` build on `http://127.0.0.1:3000` and does not require Node at runtime. The built application loads local prepared JSON/assets; source links and public references still require internet access. If an E2E runner does not launch a production server automatically, use:

```bash
python3 scripts/serve.py --port 3001
```

and point the runner at that URL.

## Tests and verification

Run the release checks with:

```bash
pnpm test
pnpm run build
pnpm exec playwright install chromium  # only if no system Chromium is available
pnpm test:e2e
```

The unit/data suite covers deterministic selection and day ordering, explicit baselines, percent change, zero-baseline guarding, future-row exclusion, stale/missing observations, comparability, function alignment, canonical unit normalization, atomic import behavior, local-storage schema errors, and emergency-copy boundaries. The data tests also verify the four raw-file SHA-256 digests, 1,404 prepared rows, 27 participants, 10 null values, signed day mapping, and all eight entries in `data/expected-results.json`.

The included browser suite exercises the research empty/loading/error states, simulation entry, mode isolation, import preview and atomic rejection, observation/source/mission pages, follow-up/export paths, incident support, keyboard paths, responsive layout, local/offline serving, and the anatomy fallback. Do not treat this README as a test report: do not infer pass counts, usability gains, or accessibility certification here. The final verification report records only checks actually executed in the release environment. Playwright automatically launches the Python production server on port 3001. A system `/usr/bin/chromium` is used when available; otherwise install Playwright Chromium or set `PLAYWRIGHT_CHROMIUM_PATH`.

## Reproduce the key scientific results

After acquiring and preparing the data:

```bash
python3 scripts/acquire_data.py
python3 scripts/prepare_data.py
pnpm test
```

`data/expected-results.json` records the source row IDs, baseline, day-69 value, and high-precision percentage change for two participants, two modalities, and two regions. For example, participant `7326` has the following source-row results:

| Modality | Region | Baseline row/value | Day-69 row/value | Percent change |
|---|---|---:|---:|---:|
| Panoramic ultrasound | Right quadriceps group | row `53`, 84.53 cm² | row `62`, 87.95 cm² | `+4.045900863598722%` |
| Panoramic ultrasound | Right medial gastrocnemius | row `53`, 14.01 cm² | row `62`, 12.26 cm² | `-12.491077801570308%` |

These are descriptive calculations from two source rows for one de-identified ground-analog participant. They are not population estimates, clinical thresholds, treatment effects, or evidence that exercise caused the change. The calculation is:

```text
(day-69 value - explicit baseline value) / abs(explicit baseline value) * 100
```

Use the source row IDs and the raw files to independently recompute the values; do not substitute the old compact fixture or invented calendar dates.

## Real, simulated, and manual data

| Mode | Identity | Origin | Can affect bundled research baseline? | Intended use |
|---|---|---|---|---|
| `research` | NASA CFT70 subject labels | Four acquired NLSP CSVs and prepared canonical records | No cross-mode joining; only the original source namespace supplies its baseline | Ground-analog longitudinal evidence review |
| `simulated` | `DEMO-01` | `scripts/create_simulation.py` | No | Demonstrate a fictional mission workflow and UI states |
| `manual` | Local user-selected ID, usually `LOCAL-01` | Browser form or validated local import | No | Local notes/observations awaiting the user’s own governance |

Research participant identifiers are de-identified source labels, not astronaut identities. A matching string across another dataset is not enough to establish a participant crosswalk.

## Limitations

1. **Ground analog only.** The CFT70 files contain 27 de-identified bed-rest participants, not astronauts or in-flight ISS data.
2. **Narrow anatomy.** Only right quadriceps group and right medial gastrocnemius are prepared. Other atlas geometry is orientation context, not measured health status.
3. **Group-level measurement.** The quadriceps value is source-defined group CSA; it is not a value for one quadriceps muscle.
4. **Units are not in the CSV header.** `cm²` is assigned from the associated published study basis and documented as such; no public CFT70 codebook was found in the acquisition review.
5. **Modality limits.** MRI and ultrasound are kept separate. Association or correlation does not make their absolute values interchangeable.
6. **No image analysis.** MuscleMap does not segment uploaded MRI/ultrasound images or convert an image into a validated CSA.
7. **Sparse schedule and missingness.** The UI preserves irregular sampling and missing cells; it does not estimate daily values.
8. **No causal inference.** Exercise, function, symptoms, and CSA are separate streams. A related event does not prove effect.
9. **No clinical validation.** Descriptive flags are not severity, clearance, injury prediction, or treatment advice.
10. **No live integration.** There is no NASA/ISS/OnePortal/device API, account, telemetry adapter, secure sync, or downlink protocol.
11. **Local privacy limits.** Browser localStorage is not encrypted at rest, access-controlled, securely synchronized, retention-governed, or suitable by itself for clinical records.
12. **Emergency limits.** Keyword matching can miss or misunderstand reports; a no-match result does not mean safe. Established authorities and local emergency services take precedence.
13. **Reference anatomy.** The BodyParts3D model is an adult male reference mesh and is not patient-specific.
14. **Distribution terms.** The CFT70 file records expose public access and provenance but no file-specific license field. Public access is not treated as a blanket redistribution grant. Confirm terms with NLSP/LSDA where redistribution is legally material.
15. **Public references are online-only.** NASA standards and public medical references do not become executable procedures merely because they are linked.

## Future work

Potential next steps require authorization and validation, not just UI changes:

- obtain a confirmed CFT70 data dictionary and explicit redistribution terms;
- add an auditable, governed adapter for authorized exports rather than scraping internal systems;
- separate raw image acquisition records from analyst-reviewed CSA observations and preserve segmentation/analysis provenance;
- expand anatomy only with source, license, side, and semantic mapping evidence;
- add encrypted, access-controlled, retention-governed deployment for an authorized environment;
- validate modality-specific measurement pipelines, uncertainty reporting, and operational timing with domain experts;
- design idempotent, checksummed, permissioned transfer packages for an approved offline/downlink workflow;
- integrate mission-specific procedures only when supplied, versioned, authorized, and maintained by the responsible medical authority; and
- run documented usability, accessibility, performance, and operational validation studies rather than claiming benefit from a prototype demo.

## References

### NASA and challenge context

- [NASA Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/)
- [NASA Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness](https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/)
- [NASA 2026 Judging & Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/)
- [NASA 2026 Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)
- [NASA Space Apps Terms and Conditions](https://www.spaceappschallenge.org/legal/)
- [NASA JSC Exercise Countermeasures](https://www.nasa.gov/reference/jsc-exercise-countermeasures/)
- [NASA Astronaut Exercise](https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/)
- [A Researcher’s Guide to Human Research: International Space Station](https://www.nasa.gov/wp-content/uploads/2020/09/researchers_guide_human_research_tagged.pdf)
- [NASA Medical Operations and Clinical Care](https://www.nasa.gov/reference/medical-operations-and-clinical-care/)

### Measurement and data sources

- [NASA NLSP CFT70 dataset record](https://nlsp.nasa.gov/api/v1/data/datasets/e621a7dd-7b6b-5a0a-8d9a-0670df11731b)
- [Scott et al., Reliability and validity of ultrasound CSA measurements](https://pmc.ncbi.nlm.nih.gov/articles/PMC5476852/)
- [NASA NTRS: Reliability and Validity of Ultrasound Cross Sectional Area Measurements for Long-Duration Spaceflight](https://ntrs.nasa.gov/citations/20100036574)
- [NASA Evidence Report: Aerobic and Muscle](https://ntrs.nasa.gov/api/citations/20220019338/downloads/Evidence%20report%20aerobic%20and%20muscle_FINAL%209-21-22%20Pubpress%20accepted_v2.pdf)
- [Functional and companion-source report](docs/functional-sources.md)
- [CFT70 acquisition report](docs/cft70-acquisition.md)
- [Dataset guide](docs/dataset-guide.md)

### Anatomy and safety references

- [BodyParts3D database description](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/desc.html)
- [BodyParts3D download page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)
- [BodyParts3D license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)
- [BodyParts3D source and mapping notes](anatomy-license.md)
- [NASA-STD-3001 Volume 1, Revision C](https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf)
- [NASA-STD-3001 Section 3.0: Health and Medical Care](https://www.nasa.gov/reference/3-0-health-and-medical-care/)
- [NASA-STD-3001 Section 6.0: Medical Operations](https://www.nasa.gov/reference/6-0-medical-operations/)
- [MedlinePlus: When to use the emergency room](https://medlineplus.gov/ency/patientinstructions/000593.htm)
- [American Heart Association: When to call 911](https://www.heart.org/en/health-topics/house-calls/when-to-call-911)
- [NHS: When to call 999](https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/)
- [Emergency-support boundaries](docs/emergency-safety.md)
- [Mission-integration report](docs/mission-integration.md)

## Status and documentation ownership

This README describes the intended reproducible release and records known evidence boundaries. It deliberately does not assert final test counts, usability gains, browser coverage, accessibility certification, or archive integrity. Executed counts, browser coverage and archive checks are in `docs/verification-report.md`. Known unresolved items include confirmation of CFT70 file-specific redistribution terms, a formal data dictionary/codebook, validated cross-dataset joins, governed operational deployment.
