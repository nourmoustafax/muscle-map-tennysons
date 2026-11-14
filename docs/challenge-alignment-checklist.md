# MuscleMap: challenge-alignment checklist

14 November 2026. **Implemented** means present in the current source/build and covered by the linked tests or inspection. **Partial** means a useful prototype capability exists but an external approval/validation boundary remains. **Unavailable** means not provided or not independently verified; it is not represented as working.

## Product sequence

| Requirement | Status | Evidence / boundary |
|---|---|---|
| Collect a measurement | Implemented | Guided **Add measurement** records the actual supplied examination date, region/right side, quantity, method/device, unit, protocol, notes and an optional scheduled-assessment link. It validates structure, dates, physical units and possible duplicates; it does not acquire a scan. |
| Understand measured change | Implemented | Latest available CSA/date/age, explicit pinned reference, independent baseline and previous comparison, actual spaced observations, missing markers and eligibility details. No size-based strength/readiness score or clinical severity color. |
| Complete an appropriate existing next step | Implemented | Saved next-action area; dated assessment reminders; pending follow-ups; user-declared team/educational source distinctions; existing plans; completed/partial/not-completed outcomes. No invented interval, treatment or exercise load. |
| Follow the next assessment | Implemented | A qualifying dated result can complete a linked assessment; a follow-up can retain earlier evidence and later outcomes after reload. Missing/wrong-context/wrong-type/wrong-method/wrong-protocol results cannot satisfy an assessment. |
| Persistent personal identity | Implemented | Three primary destinations: **My overview**, **My measurements**, **My follow-ups**. Data/profile controls are secondary. Returning from an example preserves the last active personal identity. |
| Honest empty state | Implemented | No supplied measurements means no history, baseline, mission, plan or healthy result is invented. Generic reference anatomy is not resized or portrayed as the user's scan. |
| Useful anatomical navigation | Implemented | Actual licensed source geometry, rotation, focus, zoom, grouped quadriceps selection and medial-gastrocnemius selection; keyboard region list. This is anatomical orientation only. |
| Substantive NASA data | Implemented | Visible **Explore NASA CFT70 data**; original participant values and source-row computations in the same monitoring surface, persistent ground-study label, participant controls confined to the example, original records read-only. |
| Separate personal/research/fictional collections | Implemented | Exact mode, participant and namespace boundaries; independent references, date/study-day timelines and task histories. Fictional `DEMO-01` scheduling does not fill NASA or personal gaps. |
| Scientific coherence | Implemented | Region/side/CSA/unit/method/protocol/site eligibility; MRI and panoramic ultrasound separated. Reference identity remains explicit; future/undated and invalid-denominator cases do not acquire fabricated values or comparisons. Metadata matching is not proof of clinical acquisition equivalence. |
| Source-backed explanations | Implemented | Verified NASA fitness-risk, Scott panoramic-ultrasound and teleguided research, exact source-file inventory and anatomical attribution. Findings are educational, not approved operational instructions. |
| Self-reported symptoms/difficulties | Implemented | Dated, region-linked notes, with correction and traceability; no emergency classification, diagnosis or prescription. Incident Support is not primary navigation in this iteration. |
| Readable practical export | Implemented | Markdown review and detailed JSON retain identity/context, selected observations, reference/calculations, notes, tasks/outcomes, missingness and attribution/provenance. Export downloads a file; it does not send a report to a medical team. |
| Local persistence/recovery | Implemented | Existing `musclemap-release-v2` observations retained; separate validated personal-workflow state; correction/deletion history, raw full backup, validated restore and rollback/error protections. Arbitrary unknown older storage formats are not claimed supported. |
| Offline/browser behavior | Implemented within tested scope | Production asset manifest, local atlas/source bundles and service worker; offline reload and data/task persistence tested. Online citations and hosting/platform analytics are outside the local-core network claim. |
| Small hackathon implementation | Implemented | Static TypeScript/Vite/Three.js app, existing deterministic science core, no new AI service, patient backend, authentication provider, NASA credentials or live device integration. |

## External boundaries

| Item | Status | Explanation |
|---|---|---|
| Exact current 2026 challenge tabs and full judging/submission rules | Unavailable | Fresh verification encountered time-out/interstitial responses. Current NASA announcements corroborate the broad theme, but do not replace the challenge-specific rules. The user's supplied current brief is the implementation basis; prior-year competition rules are not treated as current. |
| Clinical/operational validation | Unavailable | Software assertions, independent arithmetic and interface inspection are not clinical validation, medical-device approval, demonstrated usability with astronauts or operational flight authorization. |
| Authorized real astronaut medical/ISS/OnePortal data | Unavailable | No account, API, live crew record or medical-team transmission endpoint is connected. CFT70 is ground-analog research, not astronaut medical history. |
| Approved acquisition/equipment procedure | Partial | Research-backed equipment/method context and links are supplied. Research papers do not authorize operators or establish current flight procedures; no self-scanning instructions, training credential or clinical schedule is generated. |
| Individually supplied medical/exercise instructions | Partial | The app stores the user's declaration and source, and supports completion/outcomes. It cannot authenticate the provider, check an instruction's validity or choose it for the person. |
| Authentication/encrypted clinical storage | Unavailable | Profile labels separate records on a shared device, not protect them. Browser storage/backups are unencrypted prototype data; clinical deployment needs appropriate security, privacy and governance. |
| Closed-browser/email reminder delivery | Unavailable | Reminders are persisted in-app items. There is no external scheduling service or background notification promise. |
| Broad CFT70 redistribution permission | Partial / unresolved | Original file integrity and accessible source provenance are documented. Public accessibility alone is not every reuse permission; current archive-specific redistribution terms were not verified. Confirm before wider release. |
| Added companion datasets or cross-source joins | Unavailable by design | No unverified function/exercise data is joined to CFT70 just because codes resemble participant IDs. Additional datasets need explicit identity, timing, measurement and permission justification. |
| Updated public deployment | Not claimed by this checklist | Source/build/Preview/checkpoint are distinct from publication. The existing public URL is not assumed to serve this release until a separate publish succeeds. |

See `source-to-feature-mapping.md`, `verification-report.md`, the current README and machine-readable test evidence for the detailed implementation and executed checks. Remaining external boundaries are disclosed rather than replaced by mock integration, medical claims or old competition rules.
