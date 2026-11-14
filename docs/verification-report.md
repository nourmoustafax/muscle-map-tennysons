# MuscleMap personal-monitoring verification

**Release 3.0.0 · 14 November 2026.** This describes the current existing-project source/build, not an assumed version of the public website.

## Implemented workflow

Persistent personal identity now spans **My overview**, **My measurements** and **My follow-ups**. Profile/data switching, NASA exploration and methods are secondary. Guided actual-date entry updates the selected region, explicit reference/previous comparisons and qualifying linked assessments. Reminders, sourced existing plans, dated symptoms, earlier/later evidence links and completed/partial/not-completed/cancelled outcomes survive reload. No mission, plan, clinical interval, healthy status or exercise load is invented.

Original CFT70 files and the working source-mesh atlas are preserved. Personal/research/fictional identities, methods, references and timelines remain isolated. Original NASA records are read-only. Correction/deletion history and import provenance remain traceable; known original timestamps/sites are preserved during ordinary corrections when the examination date is unchanged.

## Executed results

| Check | Disposition / evidence |
|---|---|
| Strict TypeScript and production build | Passed: `pnpm exec tsc --noEmit`, `tsc -b`, Vite and exact offline asset-manifest generation. New reliability fixture also explicitly type-checked. Host-managed TypeScript diagnostics remain registered. |
| Unit/data/reliability tests | **99 passed, 0 failed**. `docs/test-evidence/unit-results.json`. Original science, ingestion, storage and atlas tests retained, plus profile/date/reference/task/import/restore/provenance checks. |
| Complete production-browser suite | Initial run: **21 passed, 2 failed, 0 skipped** across 23 workflows. Original result retained in `browser-complete-run.log`. |
| Recovery/quota recheck after fixes | **2 passed, 0 failed**, `browser-recovery-rerun.json`. Both initially failing complete scenarios were rerun. |
| Responsive/keyboard/NASA recheck | **3 passed, 0 failed**, `browser-responsive-rerun.json`, after the observed chart-text correction. |
| Current browser disposition | No unresolved failures in the exercised scenarios. All 23 workflows passed either in the complete run or their corrected recheck. A second all-23 run was **not** performed or claimed. `browser-results.json` records that distinction. |
| Original four CSV hashes | Passed unchanged, `scripts/acquire_data.py`, `source-inventory.json` and original acquisition manifest. |
| Independent source-row arithmetic | Passed using Python `Decimal` directly on original CSV rows, not the app formula. `independent-comparison.json`. |
| Route/serving | HTTP 200 and source-consistent JSON at `/manus-routes.json`. |
| Actual rendering | Inspected desktop 1440×900 and mobile 390 px captures in `docs/screenshots/`. Root may reopen a saved research context; that is persistent-context behavior, not an assumed new-user screenshot. |
| Offline/network | Production browser scenario installs the service worker, checks local-origin core asset requests, reloads offline and retains records/tasks. Online citations remain online-only. |
| Archive/extraction | Per-file SHA-256 and ZIP CRC checked by the packager. The final `package-check.json` records package-specific extracted-build/source checks. |

### Initial failures and their resolution

**Recovery wording:** the app correctly reported “malformed” personal state, but the test demanded “unreadable.” The assertion now recognizes either appropriate error. The full recheck verified unchanged corrupt bytes remain exportable and a validated backup restores the saved result.

**Quota feedback:** persistence correctly left old observations unchanged, but the UI re-rendered the form, discarding input and leaving the inline error empty. Failure is now displayed inline without losing entered values; the recheck confirms no successful replacement is reported. Related profile/task/outcome failure paths preserve form contents similarly.

**Mobile chart readability:** the inspected fixed desktop SVG shrank text too far on a phone. It now uses native responsive dimensions, spaced labels and every original observation. Debounced overview resizing leaves open forms untouched. The focused mobile/keyboard/NASA paths and updated actual render were checked.

## Acceptance coverage

The current browser scenarios cover all requested workflow themes: honest empty/new profile; first result/reload; compatible second result; method/protocol incompatibility; pinned reference; historical future exclusion; missing-not-zero; assessment completion; earlier-to-later follow-up; profile/namespace isolation; separate fictional/research records; read-only original NASA observations; correct value/unit/timepoint; source-reproduced comparison; unmeasured-region empty state; profile-specific readable/traceable exports; mobile/keyboard/real ray selection; appropriate explanation links.

Additional scenarios exercise duplicate/source/filename/hash handling, foreign-identity rejection, correction/deletion history, symptoms, existing-plan import and non-completion, cancelled-item protection, named team-source requirements, malformed-state protection/restore, quota failure, return to the last personal identity and offline reload. Superseded navigation specifications are retained under `tests/legacy-ui/`, not counted as current passing journeys.

## Reproduced NASA example

Participant **7326**, right quadriceps, panoramic ultrasound: source row **53**, `PRE_TEST` raw day 6 → **BR−6**, **84.53 cm²**; row **61**, `IN_TEST` day 53 → **BR53**, **88.30 cm²**; row **62**, `IN_TEST` day 69 → **BR69**, **87.95 cm²**.

Baseline change: **+4.045900863598722…%**. Previous-result change: **−0.396375990939977…%**. Display rounds to +4.0% and −0.4%. This proves arithmetic and provenance, not clinical health or readiness. Unit attribution comes from the associated publication, not a nonexistent CSV unit column.

## Remaining limits / unperformed checks

- Current official 2026 challenge tabs returned time-out/interstitial responses. Exact judging/device/submission requirements were not read; prior-year rules are not substituted. The user-supplied current brief is distinguished from verified sources.
- No clinical validation, real astronaut usability study, operational flight approval, medical clearance or NASA endorsement. Metadata equality is software eligibility, not proof of acquisition equivalence; no scanning tutorial, training credential or prescription is generated.
- No live ISS/OnePortal/device/crew-medical integration, medical-team transmission, authentication, provider verification or encrypted clinical database. Declared instructions remain user-supplied. In-app reminders do not promise closed-browser/email/push delivery.
- Browser storage/backups are unencrypted prototype data. Two-store rollback is best-effort when storage refuses writes; concurrent multi-tab editing/merging is not certified. Use one active editing tab and keep backups. Arbitrary unknown older deployed storage formats are not claimed supported.
- The local build's core requests were tested, but hosted-platform analytics are still configured on and online citations require connectivity. This is **not** a claim that all traffic on a separately hosted page stays local. Export is a download, not a transmission.
- Firefox/Safari, screen-reader user studies, real acquisition devices and low-power flight-computer performance were not tested. WebGL may be unavailable; keyboard/data navigation remains the alternative. Vite's large JavaScript chunk warning is non-blocking but future splitting/profiling is useful.
- Current archive-specific CFT70 redistribution terms remain unverified. Public access is not blanket permission. Anatomical current/historical notices are retained; papers are linked/paraphrased rather than copied as figures or procedures.
- This source/build is saved separately from publication. No new public deployment is claimed.

See the README, `source-to-feature-mapping.md`, `challenge-alignment-checklist.md`, fresh source reports and machine-readable evidence for setup, permission boundaries and implemented/partial/unavailable items. Software/calculation checks are not clinical validation or comprehensive accessibility certification.

## Human-centered UI polish — 14 November 2026

The current source/build now uses a warm off-white workspace, light navigation, calmer model backdrop, readable personal hierarchy and grouped form sections. Plain-language **Right thigh** and **Right calf** labels retain exact right quadriceps-group and medial-gastrocnemius subtitles; no anatomical identity or measured quantity changed. Friendly empty/help/success language remains factual, with no praise or severity classification attached to a size change. The baseline and previous comparison are separate; zero change is described as unchanged, not an awkward percentage-direction phrase. Existing data/store/science contracts and all entry IDs/actions are preserved.

**Executed:** strict production build passed; **104 unit/data/presentation tests passed** (`humanized-unit-results.json`). Seven affected existing production-browser workflows passed, and the new final mobile navigation/grouped-entry/value-preservation workflow passed. Desktop/mobile rendering was inspected to investigate the addressed readability changes; an inherited console-span rule that hid mobile navigation text was found, corrected and explicitly regression-tested. The read-only audit confirmed reachable form/menu controls and exact region mapping, and found missing error announcements and visual-only task filters. Those now use alert roles and `aria-pressed` state. No new all-workflows, clinical-validation, user-usability or comprehensive screen-reader-certification claim is made.

Presentation-only changes introduced no new remote asset/font dependency, backend, data migration or source-file modification. Existing offline and medical/privacy/redistribution limitations above remain. Incident Support remains removed from current navigation under the previous iteration's instruction; its non-operational source module is retained. A question about restoring it as a secondary item is separate from this design polish, not assumed approval. No new publication was requested or performed.

## Approved secondary Incident Support restoration — 3.1

The user explicitly requested restoration after the previous primary-navigation simplification. **Profile & data → Explore and learn → Incident Support** now opens the preserved non-operational helper without leaving monitoring or destroying the atlas. It organizes a user-supplied report, optional onset date, reported region/terms/categories, public context citations and established-authority reminders. The UI calls this documentation support, not validated triage; no-match cannot rule out an emergency. New notes are isolated by exact profile/participant/mode/namespace and saved through the existing audited local transaction. Save/reopen/download are available, duplicate save is visible, unknown onset stays unknown, and no CSA/task update or medical transmission occurs. Old unscoped incident drafts remain in the full backup without automatic ownership assignment.

**Executed final results:** strict build passed and **109 unit/data/presentation/incident tests passed** (`incident-final-unit-results.json`). Both final restored-support Chromium journeys passed: secondary access, model DOM preservation, save-once, reload/reopen, other-profile isolation, public reference links and explicit no-match safety boundaries. The grouped-entry/mobile navigation workflow passed in the immediately preceding combined run; seven pre-restoration affected personal workflows also passed. The first incident browser tests failed only because an unscoped `[name=description]` selector also matched the HTML meta description. The selector was corrected to the actual report textarea and those workflows passed. The read-only restoration audit identified full draft-scope, visible duplicate status and strict date-only restore checks; all were fixed with regressions. This is software verification, not clinical triage validation, medical authorization or broad screen-reader/device/usability certification.

Current source CSV hashes remain unchanged and were reverified. The new build still uses only bundled essential assets. Hosted analytics/online-reference, prototype privacy, single-active-tab and non-operational limitations above remain. This approved restoration supersedes the earlier note that Incident Support was left removed. Publication remains separate; no new public deployment has been performed.

## Direct incident access and NASA-source check — 3.2

Incident Support is now the first sidebar action on every page and in mobile navigation. One click opens a context-preserving report → numbered next steps → save/download flow. The header directs use of the existing emergency plan without waiting for MuscleMap. Matched symptoms explicitly prompt medical-authority attention without a severity score or diagnosis; no-match cannot rule out an emergency. The numbered steps cover established response, crew medical authority, current onboard checklists and handover. The app explicitly says that **no approved mission procedure is available in MuscleMap**, not that NASA has no medical procedures.

The specified 2026 challenge resource URL returned only a third-party warning during verification. Official NASA sources and candidate handbooks were checked for date/version, purpose and mission applicability; see `incident-research/nasa-procedure-findings.md`. NASA-STD-3001 requirements, OCHMO-TB-044's reference-only 2025 medical-operations brief and in-flight-care references do not supply a universal approved treatment checklist. Historical/research/facility handbooks were not misrepresented as current astronaut treatment. Incident references now use verified NASA context only; Earth 911/999-service links were removed from the astronaut flow. **Scenario-specific medical treatment, diagnosis, medication/dose instructions and mission approval remain unavailable.** A current applicable mission procedure and medical governance must precede operational integration.

Site-wide active-screen cleanup removed marketing filler, repeated form help and duplicate Incident Support access. Report/source/history/privacy detail is expandable; critical context, precise anatomy, missing/eligibility notices, source/correction history, privacy/backup protection and existing workflows remain. The browser sweep caught missing scientific publication links after source-page shortening and hidden mobile Profile & data access inherited from the prior design. The references/acquisition-competence boundary were restored in disclosures, and a compact labeled mobile profile control now reaches sources/imports/backups. The screenshot confirms both that control and the four navigation items fit at 390px.

**Executed:** strict production build passed; **111 unit/data/safety/presentation tests passed**. The full **28-case Chromium sweep initially passed 26 and failed 2**. After the confirmed source-reference/mobile-control fixes, all **5 affected rechecks passed**. The final NASA-only-reference build then passed **5 incident/mobile browser journeys**. No second complete 28-case pass is claimed. The four original NASA CSV hashes were independently reverified unchanged. Tests cover desktop/mobile one-click access from every page, keyboard open/Escape/focus, ordered steps, no-match/attention/unavailable-procedure boundaries, real citations, report download/save-once/reload/profile isolation and the existing scientific/store/task/offline/recovery workflows.

Read-only audit findings about explicit matched-term escalation and app-versus-NASA procedure availability were corrected with regressions. This verification is not a guarantee of zero defects, clinical validation or authorization for emergency care. Existing no-authentication, local unencrypted storage, hosted analytics/online-link, single-active-tab and broad accessibility/device-testing limits remain. Current source/build is saved separately from publication.

### Rendered resource-page correction

The text-only check's third-party-warning result was not the final availability finding. The stateful browser subsequently loaded the actual 2026 Resources tab and confirmed NASA's hazards, risks and ongoing-HRP-research links, plus two CSA background links. All three NASA resources were opened. None is a treatment checklist; current mission-approved treatment integration remains blocked. The active Sources screen, README and current source-to-feature/procedure findings now reflect the verified page rather than claiming the resource list unavailable. Earlier dated inability-to-fetch notes are superseded by this check.

After the rendered-resource factual correction, the source-education and desktop/mobile direct-access browser rechecks all passed (3 cases). No scientific/store/clinical logic changed in that correction.
