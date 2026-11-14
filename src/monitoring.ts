import {
  REGIONS,
  type DataMode,
  type FollowUp,
  type Observation,
  type Region,
} from "./domain";
import { reviewObservations } from "./engine";
import { buildOverview, functionContext } from "./overview";
import type { describeIntake } from "./intake";
import { esc, signed, value, table, chart, time, source } from "./ui";
import {
  findingTitle,
  findingSummary,
  recommendedFollowUp,
} from "./product-copy";

export interface MonitoringProps {
  observations: Observation[];
  rows: Observation[];
  mode: DataMode;
  participant: string;
  namespace: string;
  region: Region;
  modality: string;
  day: number;
  followUps: FollowUp[];
  intake?: ReturnType<typeof describeIntake>;
}
const action = (id: string, label: string, cls = "secondary") =>
  `<button class="${cls}" data-action="${id}">${label}</button>`;
const age = (days: number | undefined, mode: DataMode) =>
  days === undefined
    ? "Measurement time unavailable"
    : days === 0
      ? "Measured on this review day"
      : `${days} ${mode === "simulated" ? "mission" : "study"} day${days === 1 ? "" : "s"} old`;
const shortTime = (row: Observation | undefined) =>
  row
    ? `${esc(row.timepoint)}${row.acquiredAt ? ` · ${esc(row.acquiredAt.slice(0, 10))}` : ""}`
    : "No measurement available";

function feedbackCopy(text: string): string {
  return text
    .replaceAll("CSA", "muscle size")
    .replaceAll("canonical records", "validated records")
    .replaceAll("canonical record", "validated record")
    .replaceAll("scoped destination", "own record collection")
    .replaceAll("post-intake records", "saved health records")
    .replaceAll("incoming observations", "new observations")
    .replaceAll("incoming record", "new record")
    .replaceAll("destination", "record collection")
    .replaceAll(
      "Source verification provenance is not asserted by this summary.",
      "Validation does not establish measurement accuracy.",
    );
}
export function intakeFeedback(
  result: ReturnType<typeof describeIntake>,
): string {
  return `<section class="intake-feedback panel" aria-label="New record review" role="status">
    <div class="panel-heading"><div><span class="eyebrow">NEW INFORMATION → UPDATED REVIEW</span><h3>${esc(result.title)}</h3></div>${action("dismiss-intake", "Dismiss", "text-button")}</div>
    <p>${esc(feedbackCopy(result.summary))}</p>
    <ol class="intake-steps">${result.steps.map((step, index) => `<li class="${esc(step.status)}"><span class="step-number">${index + 1}</span><div><strong>${esc(({ "Map to a review destination": "Region & record type", "Update Health Records": "Records saved", "Check comparison readiness": "Ready to compare?" } as Record<string, string>)[step.label] || step.label)}</strong><p>${esc(feedbackCopy(step.detail))}</p></div></li>`).join("")}</ol>
    <div class="intake-effects"><strong>Affected reviews</strong>${result.changes.map((change) => `<p><span>${esc(change.key.participant)} · ${esc(change.key.region ? REGIONS[change.key.region].title : change.stream === "activity" ? "Activity context" : "Reported context")}</span><span>${change.beforeCount} → ${change.afterCount} records · ${esc({ ready: "Baseline supports comparison", missing: "Baseline or expected measurement missing", check_comparability: "Measurement comparison check needed", not_applicable: "Context only — muscle size unchanged" }[change.comparison])}</span></p>`).join("")}</div>
    <div class="intake-footnote"><span>${result.followUpSuggested ? "Consider documenting the comparison or missing evidence." : "The next assessment remains part of the existing routine."} No follow-up was created automatically.</span>${action("observations", "View saved health records", "text-button")}</div>
  </section>`;
}

export function renderMonitoring(props: MonitoringProps): string {
  const {
    observations,
    rows,
    mode,
    participant,
    namespace,
    region,
    modality,
    day,
  } = props;
  const selection = { mode, participant, namespace, modality, day };
  const overview = buildOverview(observations, selection);
  const review = reviewObservations(observations, { ...selection, region });
  const selected = REGIONS[region];
  const context = functionContext(observations, review.latest, day);
  const alignment = context.alignment;
  const activityRows = rows
    .filter((row) => row.stream === "activity" && row.day <= day)
    .sort((a, b) => a.day - b.day);
  const latestActivity = activityRows.at(-1);
  const activity = activityRows
    .filter((row) => row.quality === "valid" && row.value !== null)
    .at(-1);
  const next = recommendedFollowUp(review);
  const minDay = Math.min(0, ...rows.map((row) => row.day));
  const maxDay = Math.max(69, ...rows.map((row) => row.day));
  const modalities = [
    ...new Set(
      rows.filter((row) => row.stream === "anatomy").map((row) => row.modality),
    ),
  ];
  const research = mode === "research";
  const noRecords = !review.rows.length;
  const missingPerformance = overview.regions
    .filter((item) => item.alignment.status !== "aligned")
    .map((item) => REGIONS[item.region].short.toLowerCase());
  const missingLatest = overview.regions
    .filter((item) => item.review.state === "MEASUREMENT_MISSING")
    .map((item) => REGIONS[item.region].short.toLowerCase());
  const gaps = [
    missingLatest.length
      ? `Latest measurement missing for ${missingLatest.join(" and ")}.`
      : "",
    missingPerformance.length
      ? `No comparable performance test for ${missingPerformance.join(" or ")}.`
      : "",
    !activity ? "Exercise history is not connected to this collection." : "",
  ]
    .filter(Boolean)
    .join(" ");
  const focus = overview.regions.find(
    (item) => item.region === overview.focusRegion,
  );
  const overviewNext = focus
    ? `Review the ${focus.region === "RIGHT_MEDIAL_GASTROCNEMIUS" ? "calf" : "thigh"}: ${recommendedFollowUp(focus.review).detail}`
    : overview.nextStep;
  const snapshotTitle =
    mode === "simulated"
      ? "Your simulated mission review"
      : "Your current muscle review";
  const functionMarkup = alignment.row
    ? `
    <div class="context-value"><strong>${value(alignment.row)}</strong><span>${alignment.deltaDays === 0 ? "Same assessment day" : `${alignment.deltaDays} days apart from the size measurement`}</span></div>
    <p>${esc(context.summary)}</p>
    ${context.baseline ? `<div class="context-baseline"><span>Personal test baseline</span><strong>${value(context.baseline)}</strong><span>${signed(context.change)}</span></div>` : ""}
    <p class="context-limit">This is a related movement test—not a direct size measurement of this muscle.</p>
    <details class="context-details"><summary>Test timing, relationship & source</summary><p>${alignment.reasons.map(esc).join(" ")}</p><p>${context.limits.map(esc).join(" ")}</p><small>${time(alignment.row)}</small><small class="mono">${source(alignment.row)}</small><p>The seven-day comparison window is a demonstration policy, not a validated medical threshold.</p></details>`
    : `
    <div class="empty-context"><span class="context-status">${alignment.status === "incompatible" ? "Not comparable" : "Not connected"}</span><h4>No matching performance assessment</h4><p>${research ? "These research measurements do not include a verified performance test for this region and assessment period." : "A verified related test is not available for this region at the selected review day."}</p></div>
    <details class="context-details"><summary>Why performance cannot be compared</summary><p>${alignment.reasons.map(esc).join(" ")}</p><p>A test needs a verified subject, method, region and time relationship. Missing performance data is not evidence of normal function.</p></details>
    ${mode !== "simulated" ? action("simulation", "See the linked mission demo", "text-button") : ""}`;
  const activityMarkup = activity
    ? `
    <div class="context-value"><strong>${value(activity)}</strong><span>${esc(activity.measurement)} · ${shortTime(activity)}</span></div>
    <p>${latestActivity?.quality !== "valid" ? "The latest activity entry needs review; this is the last valid recorded session." : "The latest recorded session provides context alongside the measurements."}</p>
    <p class="context-limit">A completed session does not update muscle size or prove that an exercise plan is effective.</p>
    <details class="context-details"><summary>Session timing & source</summary><small>${time(activity)} · ${day - activity.day} days before this review</small><small class="mono">${source(activity)}</small></details>
    ${action("mission", "View mission activity", "text-button")}`
    : `
    <div class="empty-context"><span class="context-status">Not connected</span><h4>No verified exercise history here</h4><p>${research ? "The available research file has no verified crew session records. Campaign interventions are not an astronaut exercise plan." : "Import a compatible completed-session record to show activity context."}</p></div>
    <p class="context-limit">MuscleMap complements existing routines; it does not prescribe or change an exercise plan.</p>
    ${mode !== "simulated" ? action("simulation", "Explore the mission workflow", "text-button") : action("mission", "View mission context", "text-button")}`;

  return `<section class="review-overview panel" aria-labelledby="review-overview-title">
    <div class="overview-header"><div><span class="eyebrow">${snapshotTitle}</span><h2 id="review-overview-title">${esc(overview.headline)}</h2><p>${esc(overview.summary.replaceAll("explicit baseline", "personal baseline"))}</p></div><div class="review-stamp"><span>${mode === "simulated" ? "MISSION" : "STUDY"} DAY</span><strong>${day}</strong><small>${esc(participant || "No case selected")}</small></div></div>
    <div class="overview-regions">${overview.regions.map((item) => `<button data-region="${item.region}" class="overview-region ${region === item.region ? "is-selected" : ""} ${item.comparison === "lower" ? "has-change" : ""}" aria-controls="region-review" aria-pressed="${region === item.region}"><span class="overview-region-head"><span>${esc(REGIONS[item.region].short)}</span><span class="comparison-label">${esc(item.label.replace("explicit baseline", "personal baseline"))}</span></span><span class="overview-change">${signed(item.review.change)}<small>${value(item.review.latest)}</small></span><span class="overview-evidence">${shortTime(item.review.latest)} · ${age(item.review.age, mode)}</span><span class="overview-region-foot">${esc(item.headline.replace("explicit baseline", "personal baseline"))}<span aria-hidden="true">↗</span></span></button>`).join("")}</div>
    ${gaps ? `<div class="overview-gaps"><strong>Evidence gaps</strong>${esc(gaps)}</div>` : ""}
    <div class="overview-next"><span class="small-label">WHAT TO REVIEW NEXT</span><p>${esc(overviewNext)}</p>${overview.focusRegion ? `<button class="text-button" data-region="${overview.focusRegion}">Inspect ${esc(REGIONS[overview.focusRegion].short.toLowerCase())} <span aria-hidden="true">→</span></button>` : ""}</div>
    <div class="overview-limit"><span>Only the measured regions are summarized—not overall health or medical readiness.</span>${mode !== "simulated" ? action("simulation", "Try the full mission demo", "text-button") : '<span class="simulation-key">Fictional anatomy, performance and activity · never NASA records</span>'}</div>
  </section>
  ${props.intake ? intakeFeedback(props.intake) : ""}
  <section class="workspace">
    <aside class="anatomy-panel panel" aria-label="Measured region navigation">
      <div class="panel-heading"><div><span class="eyebrow">01 / CHOOSE A REGION</span><h2>Measured muscle regions</h2></div><span class="tag">3D</span></div>
      <div class="anatomy-selected"><i aria-hidden="true"></i><span>${region === "RIGHT_QUADRICEPS_GROUP" ? "Quadriceps group · four muscles" : "Gastrocnemius · medial head"}</span></div>
      <div id="anatomy-host" class="anatomy-host" aria-label="Interactive muscular atlas"></div>
      <div class="model-controls">${action("front", "Front")}${action("back", "Back")}${action("focus-region", "Focus region")}${action("home", "Reset view")}${action("zoom-in", "+ Zoom")}${action("zoom-out", "− Zoom")}</div>
      <div class="model-hint">Drag to rotate · scroll to zoom. Select a region below by keyboard.</div>
      <div class="region-list">${overview.regions.map((item) => `<button data-region="${item.region}" class="region-select ${region === item.region ? "selected" : ""}" aria-pressed="${region === item.region}"><span class="region-line"></span><span><strong>${esc(REGIONS[item.region].title)}</strong><small>${item.review.latest ? `${value(item.review.latest)} · ${esc(item.label.replace("explicit baseline", "personal baseline"))}` : "No measurement in this data source"}</small></span><span aria-hidden="true">→</span></button>`).join("")}</div>
      <div class="anatomy-legend"><span><i class="selected-dot"></i>Selected measured region</span><span><i class="context-dot"></i>Reference anatomy only</span></div>
      <details class="anatomy-limit"><summary>What the highlight represents</summary><p>${region === "RIGHT_QUADRICEPS_GROUP" ? "All four quadriceps members are highlighted as one source-defined measurement group. There is no separate size finding for each member." : "Only the right medial head is mapped to this measurement; other calf muscles are not given its finding."}</p><p>This licensed reference atlas is not a personal scan. Neutral anatomy has no measurement-derived health status.</p></details>
    </aside>
    <section class="evidence-column" id="region-review" aria-labelledby="region-review-title">
      <div class="region-heading"><div><span class="eyebrow">02 / DIRECT MEASUREMENT</span><h2 id="region-review-title">${esc(selected.title)}</h2><p>${region === "RIGHT_QUADRICEPS_GROUP" ? "Right thigh · source-defined muscle group" : "Right posterior calf · medial head"}</p></div><label class="modality-control">Measurement method<select id="modality">${(modalities.length ? modalities : [modality]).map((method) => `<option ${method === modality ? "selected" : ""}>${esc(method)}</option>`).join("")}</select></label></div>
      ${
        noRecords
          ? `<section class="empty-state"><h3>No measurements available for this review</h3><p>No compatible observations exist for this source and region. An empty region is not a healthy result. No substitute measurements are generated.</p>${action("import", "Import health records")}${action("simulation", "Explore the mission simulation", "primary")}</section>`
          : `
      <div class="metrics"><article><span class="small-label">Latest size measurement</span><strong>${value(review.latest)}</strong><small>${shortTime(review.latest)} · ${age(review.age, mode)}</small></article><article><span class="small-label">Personal baseline</span><strong>${value(review.baseline)}</strong><small>${shortTime(review.baseline)}</small></article><article><span class="small-label">Change from baseline</span><strong class="${(review.change ?? 0) < 0 ? "attention-text" : ""}">${signed(review.change)}</strong><small>Cross-sectional area · not strength</small></article></div>
      <article class="chart-panel panel"><div class="panel-heading"><div><span class="eyebrow">03 / FOLLOW THE MEASUREMENTS</span><h3>Muscle Changes Over Time</h3></div><span class="chart-key">○ comparable &nbsp; ◇ needs review</span></div>${chart(review)}<div class="chart-note">Only observed values are plotted. Missing or non-comparable records leave a gap.</div>
      <section class="timeline"><div><span class="small-label">Review day</span><strong>${mode === "simulated" ? "Mission" : "Study"} day ${day}</strong></div><label><span class="sr-only">Visible study day</span><input id="cursor" type="range" min="${minDay}" max="${maxDay}" value="${day}" step="1"/><span class="timeline-ends"><span>Day ${minDay}</span><span>Move to review an earlier assessment</span><span>Day ${maxDay}</span></span></label></section></article>`
      }
      <div class="context-grid"><article class="context-panel panel"><span class="eyebrow">04 / RELATED PERFORMANCE</span><h3>${alignment.row ? esc(alignment.row.measurement) : "What can performance tell us?"}</h3>${functionMarkup}</article><article class="context-panel panel"><span class="eyebrow">05 / MISSION ACTIVITY</span><h3>Exercise in context</h3>${activityMarkup}</article></div>
      <article class="finding panel ${review.state === "NO_DECREASE_FLAG" ? "" : "attention-border"}"><span class="eyebrow">06 / UNDERSTAND THE FINDING</span><h3>${esc(findingTitle(review))}</h3><p>${esc(findingSummary(review, mode))}</p><div class="uncertainty-note"><strong>What remains uncertain</strong><p>${alignment.row ? "The available timing supports reviewing these observations together—not a cause-and-effect conclusion." : "A comparable functional assessment is unavailable, so a size change cannot be read as a change in physical performance."} Measurement variation and the acquisition method still need consideration.</p></div><small>Describes the available evidence only. Not a diagnosis, severity score, treatment recommendation or medical clearance.</small></article>
      <section class="recommended-followup panel"><span class="eyebrow">07 / RECOMMENDED FOLLOW-UP</span><h3>${esc(next.title)}</h3><p>${esc(next.detail)}</p><div class="followup-actions">${action("followup", "Document follow-up", "primary")}${action("export", "Export review summary")}</div><small>A review note stays local. No medical team is contacted and no exercise plan is changed.</small></section>
      <details class="source-details panel"><summary><span>08 / MEASUREMENTS & SOURCES</span><strong>See the evidence behind this review</strong></summary><div class="source-detail-body"><p><strong>Measured region:</strong> ${esc(selected.members)}.</p><p>${esc(selected.function)}</p><p>${review.futureCount} later records are outside this review day. Calendar dates are shown only when the source supplies them.</p>${table(review.rows)}${review.excluded.length ? `<details><summary>Records not used in the comparison</summary><ul>${review.excluded.map((item) => `<li><code>${esc(item.id)}</code> — ${esc(item.reason)}</li>`).join("")}</ul></details>` : ""}${action("sources", "Open sources & methods", "text-button")}</div></details>
    </section>
  </section>`;
}
