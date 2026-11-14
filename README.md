# MuscleMap — personal monitoring prototype

Release 3.0.0, 14 November 2026. This is the existing MuscleMap project completed around **collect a result → understand the measured change → record the next relevant task → revisit the next assessment**. Original research data, source traceability and the working anatomical atlas are preserved. The prior interface README is archived at `docs/legacy-interface/README-v2.md`; it is not the current navigation guide.

## Use the application

The three primary destinations are **My overview**, **My measurements** and **My follow-ups**. A new personal profile starts empty. No mission, baseline, medical history, examination interval or exercise plan is invented.

1. Use **Profile & data** to create or select your local profile. Mission details are optional and shown only when supplied. A local profile label is not authentication or access control.
2. Use **Add measurement** to record a result actually obtained through an examination or device. Enter its date, right-sided supported region, quantity, method, unit and applicable protocol. The website and generic model do not take a scan or measure muscle size.
3. Explicitly choose the baseline observation. Its ID is retained until you change or correct it. The overview separately reports change from baseline and from the previous compatible result, with dates/age and a readable observation timeline.
4. In **My follow-ups**, add a dated assessment reminder, a pending review or an existing supplied plan. Record the reason, source and optional initial evidence link. Only a saved due date supports an overdue label.
5. **Record result** from a scheduled assessment preselects its context. A qualifying dated, numeric, valid result can complete it; a missing or incompatible result cannot. Link a later result and record completion, partial completion or a reason for non-completion. Relevant state survives reload.
6. **My measurements** retains size, performance and self-report separately. Correct/delete only local user records with confirmation. Correction/deletion history and source identity remain traceable.
7. **Export review** downloads a readable Markdown summary. Detailed JSON and full raw backups are secondary actions under **Profile & data**. Downloading does not transmit a report to a medical team.

The atlas selects the right quadriceps **group** (four source-defined members represented by one group measurement) or right medial gastrocnemius. Rotation, front/back, focus, zoom and a keyboard region list remain available. Blue communicates selection, not health status. Other anatomy is reference context, not measured, healthy or patient-specific anatomy; muscles are not resized from sparse data.

## NASA and fictional examples

**Explore NASA CFT70 data** is visible in secondary navigation. It opens original participant observations through the same monitoring interface, with the persistent label **“NASA CFT70 research example · Ground-based bed-rest study.”** Participant selection is confined to that experience. Study days are not renamed mission/calendar dates; original observations are read-only. The source files power actual values and computations—not a copied screenshot or generic placeholder.

Example: participant 7326, panoramic ultrasound, right quadriceps at BR69: **87.95 cm²**, reference **84.53 cm²** at BR−6, previous **88.3 cm²** at BR53. This is **+4.0%** from baseline but **−0.4%** from the previous result when rounded for display. It is not a diagnosis or a claim that bigger is healthier.

**Profile & data → Open fictional mission demonstration** opens the separate `DEMO-01` collection and an explicitly fictional scheduled assessment. It demonstrates entry and outcomes absent from the research files. No CFT70 participant measurements become this fictional person's history. Returning to personal records restores the last active personal profile.

Local demonstration shortcuts are `/?example=research&participant=7326` and `/?example=fictional`. They select public/fictional examples, not personal medical identities. Publication and Preview are distinct; the existing public site is not assumed to serve this release until a separate publish succeeds.

## Setup and run

Source development needs Node.js 22 or newer and **pnpm 11.25.0** (pinned in `package.json`). Dependency resolutions are pinned in `pnpm-lock.yaml`; workspace policy permits the required esbuild installation script. No NASA credentials, runtime API key, database or added AI service is required.

```bash
# From the extracted MuscleMap directory
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm run dev
```

The managed development server listens on `0.0.0.0:3000`, configured in Vite/project runtime. Do not silently switch ports. If Corepack is unavailable, install the pinned pnpm version through your normal Node tooling. Dependency installation requires internet unless packages are already cached.

```bash
pnpm test
pnpm run build
pnpm exec playwright install chromium   # once, if the test browser is absent
pnpm test:e2e
```

The build runs strict TypeScript, Vite and `scripts/prepare_offline.mjs`, producing `dist/` with an exact revision-specific local asset manifest. Playwright runs the actual built application via the included Python server on test port 3001, not a static mockup.

### Run the supplied built app offline

The release ZIP includes `dist/`; no Node installation or build is needed merely to run it. With Python 3:

```bash
python3 scripts/serve.py --port 3000
```

Open `http://127.0.0.1:3000` on that computer. Do not double-click `index.html` with a `file://` URL: browser modules, fetch and service workers need an HTTP origin. The Python launcher uses only the standard library. The local atlas, source JSON, code and styles are supplied. A previously loaded production build also supports a service-worker offline reload; online citation links still require internet. Installed dependencies and browser binaries are not bundled.

### Reproduce source preparation

```bash
python3 scripts/acquire_data.py
python3 scripts/prepare_data.py
python3 scripts/create_simulation.py
python3 scripts/prepare_anatomy.py
pnpm run build
python3 scripts/package_release.py
```

The acquisition script verifies included original hashes rather than changing source bytes. If originals are removed, current source access may require the NASA archive's approved request process; no credential bypass is provided. Anatomy regeneration uses the included byte-preserved selected OBJ subset with Python's standard library. The full unused anatomical archive and unverified companion clinical payloads are intentionally excluded.

## Data, references and eligibility

Four byte-preserved CFT70 CSV originals live under `data/raw/`; processed output is `public/data/research.json`. Each source has 351 rows and 27 de-identified subjects; the combined output has 1,404 observations and 10 preserved missing values. Exact filenames, headers, row references, SHA-256 digests, unit basis and transformations are documented in `docs/source-to-feature-mapping.md`, `docs/cft70-acquisition.md`, `docs/dataset-guide.md` and `docs/test-evidence/source-inventory.json`.

Comparisons check person/mode/namespace, right-sided region, CSA, units, method, site and relevant protocol. MRI and ultrasound are separate series. Percentage change is `(current − baseline) / baseline × 100`; invalid/missing denominators yield no percentage. Future observations are excluded at the selected review cut-off. Undated legacy records are retained, but do not gain invented dates or chronological eligibility. Date-only input stays day-precision; known original exact timestamps/sites remain during ordinary corrections when the examination date is unchanged.

Connecting lines are guides between actual observations, not continuous sensing. Missing/incompatible records break the line; they do not become zero or synthetic intermediate values. A previous result can decline while remaining above baseline. Source metadata matching is a software eligibility test, not proof that two real acquisitions are clinically equivalent.

Simplified personal CSV/JSON imports use the same guided-entry fields (`date`, `region`, `type`, `method`, `value`, `unit`, `protocol`, optional `note`, `confirmed`, `baseline`, `sourceId`, `sourceRow`). Replace template fields with actual supplied results; do not import examples as a person's history. A uniquely marked valid imported reference is retained only when no explicit choice already exists. Foreign identity/namespace, self-asserted NASA provenance, malformed rows and duplicated source measurements are rejected atomically. Safe declared source IDs/rows are retained; import filename/hash and correction history appear in traceable export.

Existing plan JSON is an array of user-supplied items containing `kind`, `title`, `reason`, an explicit `dueDate` for assessments, optional region/measurement/method/protocol/instructions, and a source `{kind:"user"|"team"|"education",name?,url?}`. Team instructions require a nonempty source name and remain user-declared. A plan without a due date is pending, not assigned an invented schedule.

## Persistence, backup and privacy

The existing `musclemap-release-v2` store is retained. `musclemap-personal-v1` stores profiles, explicit references, tasks/outcomes, correction/deletion history and view choices. Existing release-v2 records/drafts are migrated non-destructively; unsupported/malformed data are blocked from ordinary overwrites and remain available in a raw full backup. Validated explicit restore can replace malformed keys, with rollback/error protection. Browser quota failures do not report a successful save. Delete preserves trace history; **Remove local data** clears the app's local stores with confirmation.

Browser storage and backups are **unencrypted prototype data**, not protected clinical records. Source URLs and platform hosting/analytics can make online requests. The tested local production core fetches only same-origin supplied assets and has no medical-team transmission endpoint, but this is not a claim about all traffic on a separately hosted platform page. Saved reminders are in-app items: no closed-browser, email or push notification is promised.

## Current modules and evidence

- `src/main.ts`: current navigation, dialog/event integration, entry/import, task lifecycle, exports and recovery.
- `src/personal-types.ts`, `personal-state.ts`: profile identity, pinned references, validated two-store persistence, plan/outcome lifecycle and recovery.
- `src/measurement-input.ts`, `personal-review.ts`: date-based intake, duplicates/provenance, source isolation and descriptive comparison adapter.
- `src/personal-ui.ts`, `personal-forms.ts`: compact responsive overview, history, tasks and guided forms.
- Existing `domain.ts`, `engine.ts`, `ingestion.ts`, `store.ts`, `anatomy.ts`: preserved canonical science, validation, persistence and real atlas.
- Prior overview/incident helpers are retained as historical code, but Incident Support is not this iteration's primary navigation or symptom workflow.
- `tests/e2e/personal.spec.ts`: current complete production-browser workflows. Superseded navigation specifications are archived under `tests/legacy-ui/`, not counted as current passing journeys.
- `docs/verification-report.md`: executed results, initial failures/fixes and remaining limitations.
- `docs/source-to-feature-mapping.md`: exact source contributions, reproducible computations and permission boundaries.
- `docs/challenge-alignment-checklist.md`: implemented, partial and unavailable capabilities.

## Research, licensing and operational boundaries

Muscle CSA is a size measurement, not strength, endurance, overall health or mission readiness. NASA fitness-risk and Scott panoramic/teleguided research support interpretation and equipment context, not an approved flight procedure, self-scanning tutorial, training credential or clinical cutoff. The current official 2026 challenge tabs were inaccessible during fresh verification; the user-supplied brief is distinguished from independently verified rules.

No clinical diagnosis, treatment/exercise prescription, medical clearance, live ISS/OnePortal connection, real astronaut record access or NASA endorsement is claimed. Software/calculation/browser testing is not clinical validation or demonstrated astronaut usability.

Retain `THIRD_PARTY_NOTICES.md` and `anatomy-license.md`. Current BodyParts3D attribution is CC BY 4.0; historical source-header notices and modifications remain preserved. The cited papers expose CC BY-NC-ND 4.0 notices and are linked/paraphrased, not packaged as copied figures or procedures. Public CFT70 file access is not represented as blanket redistribution permission; confirm dataset-specific rights before broader release.

## Humanized interface and secondary Incident Support (3.1)

The personal interface uses warmer surfaces, readable navigation, plain-language Right thigh / Right calf labels with exact anatomical subtitles, and a single measurement form grouped around examination, result and comparison details. Calculation, source-isolation and explicit-baseline contracts are unchanged.

Open **Profile & data → Explore and learn → Incident Support**. This secondary modal preserves the monitoring view underneath it. Describe the report and optionally supply its onset date, then choose **Organize report**. The existing keyword-based helper organizes reported terms, links public context and reminds you to use established mission/local procedures and designated medical authority. It is **not validated emergency triage**, diagnosis, treatment, or an approved flight checklist; no-match is not a safety finding. Do not wait for this prototype if an emergency is suspected.

Choose **Save incident locally** or **Download incident note** for documentation. New saved notes are scoped to the exact active profile/participant/mode/namespace, and are available by reopening Incident Support after reload. Saving does not change CSA or assessment state, and does not contact a medical team. Unscoped legacy incident drafts remain in the full local backup without guessed ownership. An unknown onset date stays unknown; documentation time is stored separately. Use the full backup for sensitive notes responsibly.

## Direct Incident Support and concise interface (3.2)

**Incident Support is the first left-sidebar action**, visible on every page and in mobile navigation. It opens the context-preserving modal in one click. Describe the situation and optional known onset date, then choose **Show next steps**. The numbered sequence covers established onboard emergency response, designated medical authority, the applicable onboard checklist and incident handover. Saving/download is documentation only and does not transmit to a medical team or change muscle measurements/tasks. Public sources, original report details and saved notes are expandable; missing onset remains unknown.

The rendered NASA challenge Resources tab was verified after loading; it lists hazards, risks, ongoing HRP research and CSA science background, not an approved treatment checklist. Official NASA medical sources establish mission-specific requirements/medical authority, not a universal operational treatment checklist. No current mission-applicable approved treatment protocol was found for integration. Therefore **MuscleMap does not provide scenario-specific diagnosis, medication, dosing or treatment steps**. It explicitly displays that a mission medical checklist is unavailable. Do not delay an existing emergency response while using the app.

See `docs/incident-research/nasa-procedure-findings.md` for verified documents, versions, mission applicability and the approved-procedure blocker. `ochmo-tb-044-medical-operations.pdf` is a NASA reference-only brief, not a treatment checklist. This revision supersedes the earlier Profile & data access path.

Marketing filler, repeated help and duplicate Incident Support access have been removed. Measurement/source/method/identity/comparison protections and essential privacy/safety notices remain; detailed methods, raw rows, sources, privacy and backup information are accessible through disclosures.
