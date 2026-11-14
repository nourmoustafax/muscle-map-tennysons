import { icon, regionName, comparisonDescription } from "./human-ui";
import { REGIONS, type Observation, type Region } from "./domain";
import type {
  Profile,
  PersonalState,
  PersonalReview,
  MonitorTask,
} from "./personal-types";
import { measurementDate, todayDate } from "./personal-review";
import { baselineKey, nextTask, profileRows } from "./personal-state";
import { esc, signed, value } from "./ui";
export const btn = (
  action: string,
  label: string,
  kind = "secondary",
  extra = "",
) =>
  `<button class="${kind}" data-action="${action}" ${extra}>${label}</button>`;
export function contextLabel(p: Profile): string {
  return p.mode === "research"
    ? p.namespace === "nasa-cft70-anatomy"
      ? "NASA CFT70 research example · Ground-based bed-rest study"
      : "Imported research example · Source not independently verified"
    : p.mode === "simulated"
      ? "Fictional mission demonstration · Not NASA research"
      : "Personal records · Local profile";
}
export function displayTime(row: Observation | undefined, p: Profile): string {
  return !row
    ? "Not recorded"
    : p.mode === "research"
      ? `${row.timepoint} · Study day ${row.day}`
      : measurementDate(row, p) || "Date not supplied";
}
export function taskStatus(t: MonitorTask): string {
  return t.status === "scheduled" && !!t.dueDate && t.dueDate < todayDate()
    ? "Overdue · saved due date"
    : t.status.replace(/^./, (s) => s.toUpperCase());
}
function sourceLabel(t: MonitorTask): string {
  return t.source.kind === "team"
    ? `Supplied team instruction · ${t.source.name || "Source not named"}`
    : t.source.kind === "education"
      ? "General educational information"
      : "User-created reminder / follow-up";
}
export function anatomyPanel(rows: Observation[], region: Region): string {
  return `<aside class="p-anatomy"><div class="p-section-title"><h2>Select a region</h2><span class="muted">Reference anatomy</span></div><div id="anatomy-host" class="anatomy-host" aria-label="Interactive reference muscular atlas"></div><div class="model-controls">${btn("front", "Front")}${btn("back", "Back")}${btn("focus-region", "Focus")}${btn("home", "Reset")}${btn("zoom-in", "+ Zoom")}${btn("zoom-out", "− Zoom")}</div><div class="region-list">${Object.entries(
    REGIONS,
  )
    .map(([id, r]) => {
      const count = rows.filter(
        (x) => x.stream === "anatomy" && x.region === id && x.value !== null,
      ).length;
      return `<button class="region-select ${region === id ? "selected" : ""}" data-region="${id}" aria-pressed="${region === id}"><span><strong>${esc(regionName(id as Region))}</strong><span class="h-anatomical-name">${esc(r.title)}</span><small>${count ? `${count} recorded size result${count === 1 ? "" : "s"}` : "No size measurements recorded"}</small></span>${icon("arrow")}</button>`;
    })
    .join(
      "",
    )}</div><p class="p-model-note">Blue marks your selection, not a health rating. ${region === "RIGHT_QUADRICEPS_GROUP" ? "The four quadriceps members represent one measured group." : "Only the medial head is mapped to the calf result."} Reference anatomy only; not your scan.</p></aside>`;
}
export function personalChart(
  model: PersonalReview,
  p: Profile,
  method: string,
): string {
  const rows = model.review.rows.filter((r) => Number.isFinite(r.day));
  const values = rows.filter(
    (r) => r.value !== null && Number.isFinite(r.value),
  );
  if (!values.length)
    return '<div class="p-chart-empty">No numeric size results to plot. Missing results are not replaced with zero.</div>';
  const viewport =
    typeof window === "undefined" ? undefined : window.innerWidth;
  const available =
    viewport === undefined
      ? 760
      : viewport <= 620
        ? viewport - 32
        : viewport <= 800
          ? viewport - 300
          : viewport <= 1100
            ? ((viewport - 232) * 1.5) / 2.3
            : viewport - 652;
  const W = Math.max(300, Math.min(900, available)),
    H = 218,
    L = 54,
    R = 30,
    T = 28,
    B = 48;
  const lo = Math.min(...values.map((r) => r.value!)),
    hi = Math.max(...values.map((r) => r.value!)),
    pad = Math.max((hi - lo) * 0.2, 1);
  const first = Math.min(...rows.map((r) => r.day)),
    last = Math.max(...rows.map((r) => r.day), first + 1);
  const x = (d: number) => L + ((d - first) / (last - first)) * (W - L - R),
    y = (v: number) => T + ((hi + pad - v) / (hi - lo + 2 * pad)) * (H - T - B);
  const eligible = new Set(model.review.comparable.map((r) => r.id));
  const axes = [lo - pad, (lo + hi) / 2, hi + pad]
    .map(
      (v) =>
        `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="chart-label">${v.toFixed(1)}</text>`,
    )
    .join("");
  const guides = rows
    .slice(1)
    .map((r, i) => {
      const previous = rows[i];
      return eligible.has(r.id) &&
        eligible.has(previous.id) &&
        r.value !== null &&
        previous.value !== null
        ? `<path d="M${x(previous.day)},${y(previous.value)} L${x(r.day)},${y(r.value)}" class="trend-line"/>`
        : "";
    })
    .join("");
  let previousLabel = -1000;
  const dots = rows
    .map((r, i) => {
      const show =
        i === 0 || i === rows.length - 1 || x(r.day) - previousLabel > 94;
      if (show) previousLabel = x(r.day);
      const date = measurementDate(r, p);
      const label =
        p.mode === "research"
          ? r.timepoint
          : date
            ? new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : r.timepoint;
      return `<g><title>${esc(displayTime(r, p))} · ${r.value === null ? "Missing" : `${r.value} ${r.unit}`} · ${esc(method)} · source row ${esc(r.sourceRow)}</title>${r.value === null ? `<path d="M${x(r.day) - 4},${H - B - 12}l8,8m-8,0l8,-8" class="missing-mark"/>` : `<circle cx="${x(r.day)}" cy="${y(r.value)}" r="${model.baseline?.id === r.id ? 7 : 4.5}" class="${eligible.has(r.id) ? "data-point" : "excluded-point"}"/>${show ? `<text x="${x(r.day)}" y="${y(r.value) - 12}" text-anchor="middle" class="point-label">${r.value.toFixed(1)}${model.baseline?.id === r.id ? " · baseline" : ""}</text>` : ""}`}${show ? `<text x="${x(r.day)}" y="${H - 13 - (i % 2) * 13}" text-anchor="middle" class="chart-label">${esc(label)}</text>` : ""}</g>`;
    })
    .join("");
  const baseline = model.review.baseline?.value;
  return `<svg class="p-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Recorded cross-sectional area with actual ${p.mode === "research" ? "study-day" : "date"} spacing, baseline, and missing gaps">${axes}${baseline !== undefined && baseline !== null ? `<line x1="${L}" x2="${W - R}" y1="${y(baseline)}" y2="${y(baseline)}" class="baseline-line"/>` : ""}${guides}${dots}<text x="${L}" y="14" class="chart-label">CSA · cm² · ${esc(method)}</text></svg><p class="p-chart-caption">Dots are recorded results; lines connect comparable results. Missing gaps remain visible.</p>`;
}
export function overviewMarkup(
  p: Profile,
  state: PersonalState,
  all: Observation[],
  model: PersonalReview,
  region: Region,
  method: string,
): string {
  const rows = profileRows(all, p);
  const task = nextTask(state, p, todayDate());
  const r = REGIONS[region];
  const next = task
    ? `<div><span class="small-label">${esc(taskStatus(task))}${task.dueDate ? " · " + esc(task.dueDate) : ""}</span><h2>${esc(task.title)}</h2><p>${esc(task.reason)}</p></div>${task.kind === "assessment" ? btn("entry", "Record result", "primary", `data-task="${esc(task.id)}"`) : btn("open-task", "Open follow-up", "primary", `data-task="${esc(task.id)}"`)}`
    : !rows.some((x) => x.stream === "anatomy")
      ? `<div><h2>No muscle measurements yet</h2></div>${btn("entry", "Add first measurement", "primary")}`
      : `<div><span class="small-label">NEXT STEP</span><h2>No assessment scheduled</h2><p>Add a supplied assessment date to keep it visible.</p></div>${btn("new-task", "Add reminder", "primary")}`;
  const methods = [
    ...new Set(
      rows
        .filter((x) => x.stream === "anatomy" && x.region === region)
        .map((x) => x.modality),
    ),
  ];
  if (!methods.includes(method)) methods.push(method);
  const baselineCandidates = rows.filter(
    (x) =>
      x.stream === "anatomy" &&
      x.region === region &&
      x.modality === method &&
      x.side === "right" &&
      x.quality === "valid" &&
      x.value !== null,
  );
  const baselineId =
    state.baselines[baselineKey(p, region, method)] ?? model.baseline?.id ?? "";
  const localNotes = rows.filter(
    (x) => (x.region === region || x.relatedRegion === region) && x.note,
  );
  const linked = state.tasks.filter(
    (t) => t.profileId === p.id && t.region === region,
  );
  const direction = comparisonDescription(
    model.change,
    "the selected baseline",
  );
  return `<section class="p-next" aria-label="Next monitoring action"><span class="h-next-icon">${icon(task ? "followups" : "plus")}</span>${next}</section><section class="p-review-grid">${anatomyPanel(rows, region)}<section class="p-region" id="region-review"><div class="p-section-title"><div><span class="small-label">MUSCLE SIZE · RIGHT SIDE</span><h2 id="region-review-title">${esc(regionName(region))}<small class="h-anatomical-name">${esc(r.title)}</small></h2></div><label class="modality-control">Method<select id="modality">${methods.map((m) => `<option ${m === method ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label></div>
 <div class="p-result"><div><span class="small-label">Latest size measurement</span><strong>${value(model.latest)}</strong><span>${esc(displayTime(model.latest, p))}${model.ageDays === undefined ? "" : ` · ${Math.floor(model.ageDays)} ${p.mode === "research" ? "study days before this review" : p.mode === "simulated" ? "days before this fictional review" : "days ago"}`}</span></div>${p.mode === "research" ? btn("measurements", "Inspect history") : btn("entry", "Add measurement", "primary")}</div>
 <div class="p-comparisons"><div><span>Compared with baseline</span><strong>${value(model.baseline)}</strong><small>${esc(displayTime(model.baseline, p))}</small><b>${signed(model.change)}</b></div><div><span>Since the previous result</span><strong>${value(model.previous)}</strong><small>${esc(displayTime(model.previous, p))}</small><b>${signed(model.previousChange)}</b></div></div>
 <label class="p-baseline">Your comparison baseline<select id="baseline-select"><option value="">No selected baseline</option>${baselineId && !baselineCandidates.some((r) => r.id === baselineId) ? `<option value="${esc(baselineId)}" selected>Selected reference unavailable · retained ID ${esc(baselineId)}</option>` : ""}${baselineCandidates.map((x) => `<option value="${esc(x.id)}" ${x.id === baselineId ? "selected" : ""}>${esc(displayTime(x, p))} · ${x.value} ${esc(x.unit)}</option>`).join("")}</select><small>You choose the starting point. It stays the same until you change it.</small></label>
 <div class="p-observation">${model.review.rows.at(-1)?.value === null ? `<p>The most recent assessment has no size result; the last valid value, if available, is shown with its original date.</p>` : ""}<p>${model.latest ? esc(direction) : "No dated size measurement here yet. Add a result when you have one; without it, we can’t describe this region’s size or change."}</p>${model.previousChange === undefined ? "" : `<p>${esc(comparisonDescription(model.previousChange, "the previous comparable result"))}</p>`}${model.reasons.length ? `<details ${model.latest && !model.latestIsComparable ? "open" : ""}><summary>Why a comparison may not be available</summary>${model.reasons.map((t) => `<p>${esc(t)}</p>`).join("")}</details>` : ""}${model.dateMissing.length ? `<p>${model.dateMissing.length} undated result(s) retained. Supply the examination date before including them in the timeline.</p>` : ""}</div>
 <section class="p-timeline"><div class="p-section-title"><h3>Size measurements over time</h3>${p.mode === "research" ? `<label>Study day<input id="cursor" type="number" value="${model.review.latest ? (state.views[p.id]?.day ?? 69) : (state.views[p.id]?.day ?? 69)}"/></label>` : `<label>Review through date<input id="review-date" type="date" ${p.mode === "manual" ? `max="${todayDate()}"` : ""} value="${state.views[p.id]?.date || (p.mode === "simulated" ? (model.latest ? measurementDate(model.latest, p) : rows[0] ? measurementDate(rows[0], p) : undefined) || todayDate() : todayDate())}"/></label>`}</div>${personalChart(model, p, method)}</section>
 <div class="p-context-line">${rows.some((x) => x.stream === "function" && x.relatedRegion === region) ? "Related performance tests are available in measurement history; their task, method and timing need separate review." : "Strength has not been measured in this record."} Size is not strength, endurance or mission readiness.</div>
 <div class="p-review-actions">${btn("new-task", "Add linked follow-up", "secondary")}${btn("symptom", "Log a symptom or difficulty")}${btn("export-readable", "Export review", "text-button")}</div>
 ${linked.length ? `<details class="p-linked"><summary>${linked.length} linked assessment / follow-up item(s)</summary>${linked.map((t) => `<p>${esc(t.title)} · ${esc(taskStatus(t))} ${btn("open-task", "Open item", "text-button", `data-task="${esc(t.id)}"`)}</p>`).join("")}</details>` : ""}
 ${localNotes.length ? `<details class="p-linked"><summary>Notes and self-reported symptoms</summary>${localNotes.map((x) => `<p><strong>${esc(displayTime(x, p))}</strong> · ${esc(x.measurement)}: ${esc(x.note)}</p>`).join("")}</details>` : ""}
 <details class="p-education"><summary>What this size measurement tells you</summary><p>Cross-sectional area measures the size of an anatomical section. Ultrasound imaging and MRI use different equipment and acquisition methods; their results are kept separate. A matching side, anatomical site, protocol, method and unit are needed for repeat comparisons.</p><p>Only a result obtained through a suitable examination belongs here. A research demonstration or short explanation does not qualify someone to acquire a scan.</p><p>A change may include measurement variation. It does not establish strength, a diagnosis or an exercise effect.</p>${btn("sources", "Sources, equipment and methods", "text-button")}</details>
 </section></section>`;
}
export function measurementsMarkup(
  p: Profile,
  rows: Observation[],
  localIds: Set<string>,
): string {
  return `<section class="p-history"><div class="p-section-title"><div><h2>Your measurement history</h2><p>${rows.length} recorded ${rows.length === 1 ? "result" : "results"} · Size, performance and your notes are kept separate.</p></div>${p.mode === "research" ? "" : btn("entry", "Add measurement", "primary")}</div><div class="table-wrap"><table><thead><tr><th>Date / time point</th><th>Region & quantity</th><th>Result</th><th>Method</th><th>Notes / status</th><th>Actions</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(displayTime(r, p))}</td><td>${esc(r.region ? REGIONS[r.region].title : r.relatedRegion ? REGIONS[r.relatedRegion].title : r.site)}<small>${esc(r.measurement)}</small></td><td>${value(r)}</td><td>${esc(r.modality)}</td><td>${esc(r.note || "")}<small>${esc(r.quality.replaceAll("_", " "))}</small></td><td>${btn("inspect-record", "Details", "text-button", `data-record="${esc(r.id)}"`)}${localIds.has(r.id) && p.mode !== "research" ? btn("edit-record", "Correct", "text-button", `data-record="${esc(r.id)}"`) + btn("delete-record", "Delete", "text-button", `data-record="${esc(r.id)}"`) : "<small>Read-only source</small>"}</td></tr>`).join("") || '<tr><td colspan="6">Your history starts with the first result you add. Until then, there is nothing to compare.</td></tr>'}</tbody></table></div><div class="p-review-actions">${btn("import", "Import results")}${btn("export-readable", "Export readable review")}${btn("export", "Export traceable JSON")}</div></section>`;
}
export function tasksMarkup(
  p: Profile,
  state: PersonalState,
  filter: string,
): string {
  const tasks = state.tasks.filter(
    (t) => t.profileId === p.id && (filter === "all" || t.status === filter),
  );
  return `<section class="p-tasks"><div class="p-section-title"><div><h2>Assessments and follow-ups</h2><p>Track supplied instructions, chosen dates and outcomes.</p></div>${btn("new-task", "Add reminder / follow-up", "primary")}</div><div class="p-task-filters" role="group" aria-label="Task status">${["all", "scheduled", "pending", "completed", "cancelled"].map((s) => `<button data-task-filter="${s}" aria-pressed="${filter === s}" class="${filter === s ? "selected" : ""}">${s.replace(/^./, (c) => c.toUpperCase())}</button>`).join("")}</div>${tasks.length ? tasks.map((t) => `<article class="p-task-row"><div><div class="small-label">${esc(sourceLabel(t))}</div><h3>${esc(t.title)}</h3><p>${esc(t.reason)}</p><small>${t.dueDate ? "Due " + esc(t.dueDate) : "No due date supplied"}${t.region ? " · " + esc(REGIONS[t.region].title) : ""} · ${t.evidenceIds.length} linked ${t.evidenceIds.length === 1 ? "result" : "results"}</small></div><div><span class="tag">${esc(taskStatus(t))}</span>${btn("open-task", "Open follow-up", "secondary", `data-task="${esc(t.id)}"`)}</div></article>`).join("") : '<div class="p-task-empty">No items yet. Add a planned assessment reminder or supplied instruction.</div>'}<div class="p-plan-import">${btn("new-exercise", "Enter an existing exercise plan")}${btn("import-plan", "Import assessment / exercise plan")}<p>Record completion, partial completion or non-completion of an existing plan. A session does not prove it caused a size change.</p></div></section>`;
}
export function taskDetails(
  t: MonitorTask,
  rows: Observation[],
  p: Profile,
): string {
  return `<div class="p-task-detail"><span class="tag">${esc(taskStatus(t))}</span><p>${esc(sourceLabel(t))}</p><p>${esc(t.reason)}</p><dl><dt>Due date</dt><dd>${esc(t.dueDate || "Not supplied")}</dd><dt>Region</dt><dd>${esc(t.region ? REGIONS[t.region].title : "Not specified")}</dd><dt>Required result</dt><dd>${esc(t.measurement || "Not specified")} · ${esc(t.method || "Method not specified")}</dd><dt>Source</dt><dd>${esc(t.source.name || "User-created")}${t.source.url ? ` <a href="${esc(t.source.url)}" target="_blank" rel="noreferrer">Open supplied source ↗</a>` : ""}</dd></dl>${t.instructions ? `<h3>Supplied instruction / plan</h3><p class="p-supplied">${esc(t.instructions)}</p>` : ""}<details><summary>Linked results (${t.evidenceIds.length})</summary>${t.evidenceIds
    .map((id) => {
      const r = rows.find((x) => x.id === id);
      return `<p>${r ? esc(displayTime(r, p)) + " · " + value(r) + " · " + esc(r.modality) : "Record " + esc(id) + " is unavailable or was removed; history remains."}</p>`;
    })
    .join(
      "",
    )}</details><h3>Recorded outcomes</h3>${t.outcomes.map((o) => `<p><strong>${esc(o.result.replace("_", " "))}</strong> · ${esc(o.at)}<br>${esc(o.note)}</p>`).join("") || "<p>When you have an update, record it below.</p>"}${t.kind === "assessment" && t.status !== "completed" && t.status !== "cancelled" ? btn("entry", "Record result", "primary", `data-task="${esc(t.id)}"`) : ""}<form id="outcome-form"><input type="hidden" name="taskId" value="${esc(t.id)}"/><label>Outcome<select name="result"><option value="completed">Completed</option><option value="partial">Partially completed</option><option value="not_completed">Not completed</option></select></label><label>Date<input name="date" type="date" value="${todayDate()}" required/></label><label>What happened / reason<textarea name="note" required minlength="3" maxlength="3000"></textarea></label><label>Link a later result<select name="recordId"><option value="">No result link</option>${rows
    .filter(
      (r) => !t.region || r.region === t.region || r.relatedRegion === t.region,
    )
    .map(
      (r) =>
        `<option value="${esc(r.id)}">${esc(displayTime(r, p))} · ${value(r)}</option>`,
    )
    .join(
      "",
    )}</select></label><div class="form-error" role="alert" id="outcome-error" ></div><div class="modal-actions">${t.status !== "cancelled" ? btn("cancel-task", "Cancel item", "secondary", `data-task="${esc(t.id)}"`) : ""}<button type="submit" class="primary">Save outcome</button></div></form></div>`;
}
