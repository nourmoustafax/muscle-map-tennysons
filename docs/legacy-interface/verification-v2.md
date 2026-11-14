# MuscleMap — Refined Release Verification

**Release:** 2.1.0 · **Verified:** 14 November 2026, UTC+02:00

## Result

The production build and strict TypeScript checks passed. **65 unit/data tests passed across 11 files; all 21 Chromium browser journeys passed, with zero failures, skips or flaky results in the final full run.** The built application—not a mockup—was used for browser verification. Machine-readable results are included in `docs/test-evidence/unit-results.json` and `browser-results.json`.

The implemented prototype has been checked against the refinement request. This does not establish medical efficacy, operational approval, a usability improvement, comprehensive accessibility compliance or defect-free software. No new publication was requested or performed during this refinement; the updated project is available in Preview and the source-complete offline package.

## Product changes verified

The entry screen now leads with a two-region review: baseline-relative observations, last valid measurement time, evidence gaps and a region-specific next review. NASA case 7326 at study day 69 distinguishes increased quadriceps area from decreased medial-gastrocnemius area. It does not assign an overall health score or equate an increased measurement with normal function.

The primary flow is **overview → anatomical region → direct measurement → Muscle Changes Over Time → related performance → mission activity → interpretation and uncertainty → Recommended Follow-up → expandable source traceability**. Navigation is Muscle Health, Health Records, Mission Context and Sources & Methods; the data selector is Data Source. Canonical identifiers and engineering state names are retained in records and technical details rather than primary navigation.

The ivory/ink/ocean-blue interface replaces the dark-green console. Desktop, tablet and mobile paths were checked, including viewport width, dialogs, keyboard Escape/focus restoration, source navigation and follow-up access. Actual desktop and mobile renders are in `docs/screenshots/desktop.png` and `mobile.png`. Selected anatomy is blue reference highlighting, not a health-severity color.

The licensed atlas still uses the exact source-defined quadriceps group (four source meshes) and right medial gastrocnemius (one source mesh). Rotation, zoom, front/back, reset, actual mesh-ray selection and Focus region work. Opening and closing Incident Support preserves the same WebGL canvas and camera. The atlas is a reference adult-male body, not a personal scan; neutral context meshes have no measurement-derived status.

## Linked mission demonstration and event workflow

The separate fictional `DEMO-01` mission has **17 explicit simulation records**. Anatomy, knee-extension force, multi-muscle ankle plantar-flexion torque and CEVIS session duration demonstrate the complete review story without being joined to NASA participants. Mission Context exposes review days 0, 52 and 69: personal references, a missing assessment and the latest connected picture.

At mission day 69, quadriceps-related force is 402 N against a compatible 420 N test baseline (−4.3% displayed); calf-related plantar-flexion torque is 119 Nm against 126 Nm (−5.6% displayed). These movement tests are context, not direct individual-muscle size or strength measurements. The session is a fictional existing routine, not an exercise recommendation.

New manual/imported information is validated before a local atomic save. Visible feedback reports record type, affected region/collection, saved record counts, comparison readiness and suggestion-only follow-up. Method/site/source/quality and explicit-reference requirements are checked with the same engine used for the review. Function/activity-only events leave muscle size unchanged; no follow-up is created automatically. New drafts are associated with participant, source, region, day and evidence IDs and remain local.

Incident Support organizes literal reported region/issue terms, retrieves curated public-reference metadata locally, displays the citation provider/date/relevance, presents four established-authority/documentation reminders and supports a local draft. Citations require connectivity and are **not approved mission procedures**. No-match is explicitly not safety, clearance or exclusion of an emergency. No diagnosis, medication, generated treatment, medical transmission or operational triage is supplied.

## Scientific integrity and calculation checks

The original four NASA CFT70 CSVs and their hashes were reverified. Preparation regenerated **1,404 records, 27 deidentified ground-analog participants and 10 null source cells**. All eight independent Decimal reference calculations were reproduced. Existing NASA research JSON, source identity, units, phases, namespace boundaries, and anatomical geometry were not replaced by illustrative fixtures.

| Source series, participant 7326, day 69 | Explicit baseline | Latest measurement | Source-row change |
|---|---:|---:|---:|
| Ultrasound, right quadriceps group | 84.53 cm² | 87.95 cm² | +4.045900863598722% |
| Ultrasound, right medial gastrocnemius | 14.01 cm² | 12.26 cm² | −12.491077801570308% |
| MRI, right quadriceps group | 96.63 cm² | 101.56 cm² | +5.101935216806375% |
| MRI, right medial gastrocnemius | 13.50 cm² | 11.19 cm² | −17.11111111111111% |

Source headers omit units; the cm² basis remains documented from the associated Scott et al. publication rather than guessed from magnitude. MRI and ultrasound are not averaged or substituted. Actual irregular days and the negative day −6 baseline remain selectable; missing/incompatible points break the chart line and future rows are excluded. Historical calendar dates are not invented. No clinical threshold, causal exercise effect or medical readiness is inferred from these changes.

## Executed verification and corrected findings

| Layer | Final execution |
|---|---|
| Build | `pnpm run build`: TypeScript, Vite and exact revision-isolated offline manifest passed |
| Unit/data | 65 passed, 0 failed; explicit baselines, source/site/side/protocol/unit gates, null handling, duplicates, namespace isolation and prepared-data hashes |
| Browser | 21 passed, 0 failed/skipped/flaky; all 13 original journeys retained with semantic wording updates and eight new refinement journeys |
| Monitoring | NASA values, overview drill-down, region/method changes, simulation performance references, missing assessment and negative baseline day |
| Intake/review | Manual entry, local preview, atomic import and rejection, duplicate protection, stream-only effects, draft persistence and downloaded source-traceable exports |
| Anatomy | Five actual target IDs, four-member group selection, real pointer raycast, view controls, Focus region and preserved canvas/camera across dialogs |
| Incident | Report extraction, local citations, four reminders, safety boundaries and local documentation |
| Reliability | Unavailable sources without substitution; inaccessible/corrupt storage and unchanged recovery backup text |
| Responsive/offline | Desktop renders; tablet/mobile width and follow-up access; keyboard Escape/focus restoration; installed production service-worker offline reload with NASA data, simulation and GLB |

A read-only audit found two real performance-context defects: the new presentation helper had bypassed the seven-day window, and a separate namespace could influence its missing/incompatible label. Both were corrected by sharing the strict, source-scoped engine path between overview, performance display and export. Further regressions reject pending-quality functional baselines and protocol-mismatched/zero-reference intake comparisons. Follow-up display is now region-specific. Negative baseline-day selection was explicitly verified rather than changing its already-correct minimum calculation.

Early browser failures caused by a renamed export button and a source-ID attribute format assumption were corrected without removing the assertions. The affected checks then passed, followed by the full 21-journey run. The observed unstyled duplicate in-canvas controls were corrected; keyboard alternatives remain discoverable on focus without displacing the model.

## Measured contrast and performance limits

Sampled final contrast ratios are **11.52:1 main text**, **6.00:1 body**, **4.72:1 muted text**, **4.64:1 strengthened small labels**, **6.92:1 primary button**, **9.82:1 navigation**, **5.94:1 incident notice**, and **9.04:1 model status**. Results and adjusted colors are in `docs/test-evidence/refined-contrast.json`. These samples do not certify every state or the whole application against WCAG. Broad screen-reader, user and assistive-device studies remain deferred.

The existing atlas has 38 meshes and 577,544 triangles (14,854,100-byte GLB). Rendering is event-driven, source CPU geometry is cached, and per-view GPU/listener resources are disposed. Broad device/FPS benchmarking has not been performed. Vite reports a non-blocking approximately 718 kB main JavaScript chunk before gzip; code splitting and lower-end device profiling remain useful future work.

## Operational, rights and privacy limits

No live NASA/ISS/OnePortal/device adapter, clinical authentication/encryption/retention deployment, image-to-CSA segmentation, diagnostic score, prescription, emergency RAG authority, copied flight checklist or automated medical communication is claimed. Browser-local notes are not encrypted clinical storage. No verified real-data function/activity join was forced to make the research view look complete.

NASA data represents ground analogs, not astronauts. The existing file-specific redistribution/codebook caveats remain documented. BodyParts3D's current CC BY 4.0 notice and historical BY-SA 2.1 Japan header remain intact under the existing conservative derivative policy. Research access, legal suitability, clinical validation, operational authorization and broad accessibility/usability qualification are separate requirements.

## Package and offline launch

The archive contains source/configuration/lockfile, built `dist/`, original NASA CSVs and preparation manifests, canonical research and fictional mission data, licensed GLB/source subset and attribution, acquisition/preparation/offline/package scripts, tests, source documents, README, screenshots and executed evidence. It excludes secrets, `.git`, `node_modules`, browser binaries, temporary failure traces, unused full anatomy archives and raw companion clinical CSVs.

Extract the archive, enter its `MuscleMap` folder, and run:

```bash
python3 scripts/serve.py
```

Open **http://127.0.0.1:3000**. The included build requires neither Node nor an internet connection; do not open its `index.html` as `file://`. Source build/testing commands are documented in README. `RELEASE_MANIFEST.json` enumerates every included file and its SHA-256; the packager checks archive CRCs and each digest and emits the external archive checksum. Package-specific final checks are recorded in `docs/test-evidence/package-check.json`.
