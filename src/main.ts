import { screenIncident } from "./emergency";
import { incidentSupportMarkup, scopedIncidents } from "./incident-support";
import type { Incident } from "./domain";
import { icon, initials } from "./human-ui";
import "./styles.css";
import "./human.css";
import {
  REGIONS,
  type Observation,
  type Region,
  type SourceRecord,
  type LocalStore,
} from "./domain";
import { readStore, emptyStore, STORE_KEY } from "./store";
import { validateObservation } from "./ingestion";
import { mountAnatomy, type AnatomyViewer } from "./anatomy";
import { esc, download } from "./ui";
import type {
  Profile,
  PersonalState,
  MonitorTask,
  MeasurementInput,
} from "./personal-types";
import {
  PERSONAL_KEY,
  readPersonalState,
  commitStores,
  restoreStores,
  getProfile,
  profileRows,
  baselineKey,
  createProfile,
  researchProfile,
  completeAssessment,
  parsePlan,
  validatePersonalState,
} from "./personal-state";
import {
  reviewForProfile,
  measurementDate,
  todayDate,
  dateDay,
} from "./personal-review";
import {
  buildMeasurement,
  parsePersonalImport,
  personalImportTemplate,
} from "./measurement-input";
import {
  btn,
  contextLabel,
  displayTime,
  overviewMarkup,
  measurementsMarkup,
  tasksMarkup,
  taskDetails,
} from "./personal-ui";
import {
  type PersonalModal,
  modalHeader,
  entryForm,
  profileForm,
  newTaskForm,
  symptomForm,
  menuMarkup,
  recordDetails,
} from "./personal-forms";
const app = document.querySelector<HTMLDivElement>("#app")!;
const storage = (() => {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
})();
const initial = storage
  ? readStore(storage)
  : {
      store: emptyStore(),
      error: "Browser storage is unavailable. Local additions cannot be saved.",
    };
let store: LocalStore = initial.store;
const workflow = readPersonalState(storage || { getItem: () => null }, store);
let personal: PersonalState = workflow.state;
let blocked = Boolean(initial.error || workflow.error || !storage),
  storageError = initial.error || workflow.error;
let research: Observation[] = [],
  simulation: Observation[] = [],
  sources: SourceRecord[] = [];
let ready = false,
  loadError = "",
  page = "overview",
  modal: PersonalModal = null,
  toast = "",
  taskFilter = "all";
let viewer: AnatomyViewer | undefined,
  editing: Observation | undefined,
  selectedTask: string | undefined,
  selectedRecord: string | undefined,
  newExercise = false;
let imported: { rows: Observation[]; errors: string[] } | undefined,
  importName = "",
  importHash = "";
let planImported: { tasks: MonitorTask[]; errors: string[] } | undefined;
let lastFocus = "";
let incidentDraft: Incident | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let openerIndex = 0;
let openerSelector = "",
  taskEvidence = "";
function all() {
  return [...research, ...simulation, ...store.observations];
}
function profile() {
  return getProfile(personal);
}
function rows() {
  return profileRows(all(), profile());
}
function view() {
  const p = profile();
  if (personal.views[p.id]) return personal.views[p.id];
  const own = profileRows(all(), p).filter((r) => r.stream === "anatomy");
  const region =
    own.some((r) => r.region === "RIGHT_QUADRICEPS_GROUP") || !own.length
      ? "RIGHT_QUADRICEPS_GROUP"
      : "RIGHT_MEDIAL_GASTROCNEMIUS";
  const preferred =
    own.find(
      (r) => r.region === region && r.modality === "Panoramic ultrasound",
    ) || own.find((r) => r.region === region);
  return {
    region: region as Region,
    method: preferred?.modality || "Ultrasound",
  };
}
function stableReferences(state: PersonalState, p: Profile): PersonalState {
  const base = { ...state.baselines };
  const originals =
    p.mode === "research"
      ? research
      : p.mode === "simulated"
        ? simulation
        : workflow.created
          ? store.observations
          : [];
  for (const r of profileRows(originals, p)) {
    if (
      r.stream !== "anatomy" ||
      !r.region ||
      !r.baseline ||
      r.quality !== "valid" ||
      r.value === null ||
      r.value <= 0
    )
      continue;
    const key = baselineKey(p, r.region, r.modality);
    if (base[key] === undefined) base[key] = r.id;
  }
  return { ...state, baselines: base };
}
function model() {
  const p = profile(),
    v = view();
  return reviewForProfile(
    all(),
    p,
    v.region,
    v.method,
    personal.baselines[baselineKey(p, v.region, v.method)],
    { date: v.date, day: v.day },
  );
}
function rawBackups() {
  const result: Record<string, string | null> = {};
  for (const key of [STORE_KEY, PERSONAL_KEY]) {
    try {
      result[key] = storage?.getItem(key) ?? null;
    } catch {
      result[key] = "Unable to read this browser key";
    }
  }
  return result;
}
function commit(
  candidate: PersonalState,
  legacy: LocalStore = store,
  action = "Personal workflow updated",
  ids: string[] = [],
): boolean {
  if (!storage || blocked) {
    storageError =
      "Local storage is unavailable or unreadable. Export the full original backup before recovery; no replacement was saved.";
    return false;
  }
  const nextLegacy = {
    ...legacy,
    audit: [...legacy.audit, { at: new Date().toISOString(), action, ids }],
  };
  const saved = commitStores(nextLegacy, candidate, storage);
  if (!saved.ok) {
    storageError =
      saved.error || "Unable to save. Export a backup before closing.";
    return false;
  }
  store = nextLegacy;
  personal = candidate;
  storageError = undefined;
  return true;
}
function selection(candidate: PersonalState) {
  if (!storage || blocked) {
    personal = candidate;
    render();
    return;
  }
  if (!commit(candidate, store, "View/profile selection saved")) render();
  else render();
}
function message(text: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toast = text;
  render();
  toastTimer = setTimeout(() => {
    toast = "";
    document.querySelector("#toast")?.remove();
  }, 6500);
}
function setView(change: Partial<ReturnType<typeof view>>) {
  const p = profile();
  selection({
    ...personal,
    views: { ...personal.views, [p.id]: { ...view(), ...change } },
  });
}
function switchProfile(p: Profile) {
  const profiles = personal.profiles.some((x) => x.id === p.id)
    ? personal.profiles
    : [...personal.profiles, p];
  modal = null;
  page = "overview";
  selection(
    stableReferences(
      {
        ...personal,
        profiles,
        activeProfileId: p.id,
        lastPersonalProfileId:
          p.mode === "manual"
            ? p.id
            : profile().mode === "manual"
              ? profile().id
              : personal.lastPersonalProfileId,
      },
      p,
    ),
  );
}
function sourceMarkup() {
  return `<section class="p-sources"><h2>Sources & methods</h2><p>Muscle size is cross-sectional area, CSA (cm²). Repeat comparisons require the same person, site, side, method, unit and protocol. Size is not strength or a diagnosis.</p>
    <details><summary>How measurements enter MuscleMap</summary><p>Record the result from your examination or device. Ultrasound and MRI require suitable equipment and trained acquisition; this website does not measure muscle size. MRI is not assumed to be available onboard.</p><p>A short explanation does not qualify someone to acquire a scan. Equipment and trained acquisition are required.</p><p><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5476852/" target="_blank" rel="noreferrer">2017 CSA/method study</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8047175/" target="_blank" rel="noreferrer">Guided ultrasound research</a> · <a href="https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/" target="_blank" rel="noreferrer">NASA fitness-risk background</a></p><p>Performance tests and dated symptoms remain separate from size measurements. A completed exercise session does not prove a size effect.</p></details>
    <details><summary>NASA CFT70 research example</summary><p>Original right-quadriceps-group and medial-gastrocnemius measurements come from a ground-based bed-rest study, not a live astronaut mission. Ultrasound and MRI remain separate, with original participant IDs, study phases, source rows and actual assessment spacing.</p><p>Prepared records preserve missing results and source metadata. Study-day coordinates are not invented calendar dates. The explicit baseline and previous-comparable percentage changes use (current − reference) / reference × 100. No cohort clinical threshold or unverified cross-dataset join is used.</p>${btn("research", "Explore NASA CFT70 data")}</details>
    <details><summary>Reference anatomy & licensing</summary><p>BodyParts3D supplies reference anatomy, not a personal scan. The right quadriceps result maps to one four-member group; the calf result maps to the right medial gastrocnemius only. Selection color is not a health rating.</p><p>Current CC BY 4.0 attribution and the historical source notice are retained.</p><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">BodyParts3D license</a></details>
    <details><summary>NASA challenge & medical procedures</summary><p>The 2026 challenge resources link to NASA human-spaceflight hazards, risks and ongoing research, plus CSA science resources. They do not list an approved emergency-treatment checklist. No current mission-approved treatment checklist is integrated. NASA medical design requirements are not executable treatment instructions.</p><a href="https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=resources" target="_blank" rel="noreferrer">Challenge resources</a> · <a href="https://www.nasa.gov/reference/3-0-health-and-medical-care/" target="_blank" rel="noreferrer">NASA medical requirements</a></details>
    <details><summary>Research files, source rows & integrity</summary>${sources.map((s) => `<article><h3>${esc(s.title)}</h3><p>${esc(s.provider)} · ${esc(s.format)} · ${s.rows ?? "Unknown"} source rows</p><p>${esc(s.limits)}</p><p>${esc(s.license)}</p>${s.hash ? `<code class="source-hash">SHA-256 ${esc(s.hash)}</code>` : ""}<a href="${esc(s.url)}" target="_blank" rel="noreferrer">Open source catalog</a></article>`).join("")}</details>
  </section>`;
}
function render() {
  const oldHost =
    page === "overview" && ready
      ? app.querySelector<HTMLElement>("#anatomy-host")
      : null;
  if (!oldHost) {
    viewer?.dispose();
    viewer = undefined;
  }
  const p = profile(),
    v = view(),
    currentRows = rows(),
    review = model();
  const nav = [
    ["overview", "My overview"],
    ["measurements", "My measurements"],
    ["followups", "My follow-ups"],
  ];
  const currentDate = v.date || todayDate();
  const latest = currentRows
    .filter(
      (r) =>
        r.stream === "anatomy" &&
        (p.mode === "research"
          ? r.day <= (v.day ?? 69)
          : !!measurementDate(r, p) &&
            (p.mode === "simulated"
              ? !v.date || measurementDate(r, p)! <= v.date
              : measurementDate(r, p)! <= currentDate)),
    )
    .sort((a, b) =>
      p.mode === "research"
        ? a.day - b.day
        : (measurementDate(a, p) || "").localeCompare(
            measurementDate(b, p) || "",
          ),
    )
    .at(-1);
  app.innerHTML = `<div class="app-shell personal-shell"><aside class="sidebar"><a class="brand" href="#" data-action="overview"><span class="brand-mark">M</span><span>MuscleMap</span></a><nav aria-label="Main navigation"><button class="nav-item h-incident-nav ${modal === "incident" ? "active" : ""}" data-action="incident" aria-haspopup="dialog" aria-expanded="${modal === "incident"}">${icon("incident")}<span>Incident Support</span></button>${nav.map(([id, label]) => `<button class="nav-item ${page === id ? "active" : ""}" data-page="${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(id)}<span>${label}</span></button>`).join("")}</nav><div class="h-side-profile"><span class="h-initials">${initials(p.name)}</span><div><strong>${esc(p.name)}</strong><small>${p.mode === "research" ? "Research example" : p.mode === "simulated" ? "Fictional demonstration" : "Your personal record"}</small></div></div><div class="p-secondary-nav">${btn("research", "Explore NASA CFT70 data", "text-button")}${btn("menu", "Profile & data", "text-button")}${btn("sources", "Sources & methods", "text-button")}</div></aside><div class="content-shell"><header class="p-masthead"><div><span class="p-context-label">${esc(contextLabel(p))}</span><h1>${esc(p.name)}</h1><p>${p.missionName ? esc(p.missionName) + " · " : ""}${"Latest size assessment: " + esc(displayTime(latest, p))}</p></div><div>${btn("menu", icon("user") + "<span>Profile & data</span>", "secondary h-profile-menu", 'aria-label="Profile & data"')}${p.mode === "research" ? btn("return-personal", "Add personal measurement", "primary") : btn("entry", "Add measurement", "primary")}</div></header>${
    p.mode === "research" && p.namespace === "nasa-cft70-anatomy"
      ? `<div class="p-research-selection"><label>Research participant<select id="research-participant">${[
          ...new Set(research.map((r) => r.participant)),
        ]
          .sort()
          .map(
            (id) =>
              `<option ${id === p.participant ? "selected" : ""}>${esc(id)}</option>`,
          )
          .join(
            "",
          )}</select></label><span>Read-only original measurements · Study-day chronology</span>${btn("return-personal", "Return to personal profile", "text-button")}</div>`
      : ""
  }<main>${storageError ? `<div class="error-banner" role="alert">${esc(storageError)} ${btn("backup", "Export full local backup")}</div>` : ""}${loadError ? `<div class="error-banner">${esc(loadError)} ${btn("reload", "Retry source loading")}</div>` : ""}${!ready ? '<p role="status">Loading existing records and reference anatomy…</p>' : page === "overview" ? overviewMarkup(p, personal, all(), review, v.region, v.method) : page === "measurements" ? measurementsMarkup(p, currentRows, new Set(store.observations.map((r) => r.id))) : page === "followups" ? tasksMarkup(p, personal, taskFilter) : sourceMarkup()}<footer>Descriptive measurements, not diagnosis. No medical-team transmission.</footer></main></div>${modalMarkup()}${toast ? `<div id="toast" role="status" class="toast">${esc(toast)}</div>` : ""}</div>`;
  bind();
  if (page === "overview" && ready) {
    const host = app.querySelector<HTMLElement>("#anatomy-host");
    if (host) {
      if (oldHost && viewer) {
        host.replaceWith(oldHost);
        viewer.select(v.region);
      } else
        viewer = mountAnatomy(host, v.region, (region) => setView({ region }));
    }
  }
  const dialog = app.querySelector<HTMLDialogElement>("dialog");
  if (dialog) {
    dialog.showModal();
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      modal = null;
      render();
    });
  } else if (openerSelector) {
    (
      app.querySelectorAll<HTMLElement>(openerSelector)[openerIndex] ||
      app.querySelector<HTMLElement>(".p-masthead [data-action=menu]")
    )?.focus({ preventScroll: true });
    openerSelector = "";
  } else if (lastFocus) {
    app
      .querySelector<HTMLElement>(`[data-action="${lastFocus}"]`)
      ?.focus({ preventScroll: true });
    lastFocus = "";
  }
}
function modalMarkup() {
  if (!modal) return "";
  const p = profile(),
    v = view(),
    task = personal.tasks.find(
      (t) => t.id === selectedTask && t.profileId === p.id,
    );
  let body = "";
  if (modal === "entry")
    body = entryForm(p, personal, v.region, v.method, editing, task);
  if (modal === "incident")
    body =
      modalHeader("Incident Support") +
      incidentSupportMarkup(p, store.incidents, incidentDraft);
  if (modal === "profile") body = profileForm();
  if (modal === "menu") body = menuMarkup(p, personal);
  if (modal === "new-task")
    body = newTaskForm(
      p,
      v.region,
      v.method,
      newExercise,
      rows(),
      taskEvidence,
    );
  if (modal === "symptom") body = symptomForm(p, v.region, editing);
  if (modal === "task")
    body = task
      ? modalHeader(task.title) + taskDetails(task, rows(), p)
      : modalHeader("Item unavailable") +
        "<p>This item is not in the active profile.</p>";
  if (modal === "record") {
    const row = rows().find((r) => r.id === selectedRecord);
    body = row ? recordDetails(row, p) : modalHeader("Record unavailable");
  }
  if (modal === "import")
    body = `${modalHeader("Import personal measurements")}<p>Import into ${esc(p.name)}. All rows must validate before saving; other identities and NASA sources cannot be reassigned.</p>${btn("template", "Download personal import template")}<label>Select CSV or JSON<input id="import-file" type="file" accept=".csv,.json"/></label>${imported ? (imported.errors.length ? `<div class="form-error" role="alert">${imported.errors.map(esc).join("<br>")}</div>` : `<p>${imported.rows.length} validated records · ${esc(importName)}. Not saved yet.</p><details><summary>Preview values/source rows</summary><pre>${esc(JSON.stringify(imported.rows, null, 2))}</pre></details>`) : ""}<div class="modal-actions">${btn("close", "Cancel")}${btn("commit-import", "Save imported results", "primary", !imported || imported.errors.length || !imported.rows.length ? "disabled" : "")}</div>`;
  if (modal === "import-plan")
    body = `${modalHeader("Import an existing plan")}<p>Import a supplied plan—not a generated prescription.</p><details><summary>Required JSON format</summary><p>Array fields: kind, title, reason, dueDate; optional region, measurement, method, protocol; source {kind, name, url}.</p></details><label>Plan JSON<input id="plan-file" type="file" accept=".json"/></label>${planImported ? (planImported.errors.length ? `<p class="form-error" role="alert">${planImported.errors.map(esc).join("<br>")}</p>` : `<p>${planImported.tasks.length} validated plan item(s).</p>`) : ""}${btn("commit-plan", "Save supplied plan", "primary", !planImported || planImported.errors.length ? "disabled" : "")}`;
  if (modal === "restore")
    body = `${modalHeader("Restore a local backup")}<p>Export current data first. A validated, confirmed restore replaces local records and workflow state.</p><label>Backup JSON<input id="restore-file" type="file" accept=".json"/></label><p id="restore-error" role="alert" class="form-error" ></p>`;
  return `<dialog class="modal ${modal === "menu" ? "" : "wide"}" aria-labelledby="dialog-title">${body}</dialog>`;
}
function formInput(form: HTMLFormElement): MeasurementInput {
  const d = new FormData(form);
  return {
    date: String(d.get("date")),
    region: String(d.get("region")) as Region,
    type: String(d.get("type")) as MeasurementInput["type"],
    method: String(d.get("method")).trim(),
    device: String(d.get("device") || "").trim(),
    value: String(d.get("value") || ""),
    unit: String(d.get("unit")),
    protocol: String(d.get("protocol")).trim(),
    note: String(d.get("note") || "").trim(),
    missing: d.has("missing"),
    confirmed: d.has("confirmed"),
    baseline: d.has("baseline"),
    duplicateConfirmed: d.has("duplicateConfirmed"),
  };
}
function saveMeasurement(
  input: MeasurementInput,
  taskId?: string,
  errorId = "measurement-error",
) {
  const p = profile();
  const result = buildMeasurement(p, input, all(), editing);
  if (!result.row) {
    app.querySelector("#" + errorId)!.textContent =
      result.error || "Invalid result";
    return;
  }
  const row = result.row,
    at = new Date().toISOString();
  let candidate = {
    ...personal,
    history: [
      ...personal.history,
      {
        at,
        action: editing ? "corrected" : "added",
        recordId: row.id,
        before: editing,
        after: row,
      },
    ],
  };
  let completion = "";
  if (taskId) {
    const task = candidate.tasks.find(
      (t) => t.id === taskId && t.profileId === p.id,
    );
    if (task) {
      const done = completeAssessment(task, row, p);
      if (done.error) completion = ` Linked item not completed: ${done.error}`;
      else {
        candidate = {
          ...candidate,
          tasks: candidate.tasks.map((t) => (t.id === task.id ? done.task : t)),
        };
        completion = " Linked assessment completed.";
      }
    }
  }
  if (input.baseline && row.stream === "anatomy")
    candidate = {
      ...candidate,
      baselines: {
        ...candidate.baselines,
        [baselineKey(p, row.region!, row.modality)]: row.id,
      },
    };
  const normalizedDate = measurementDate(row, p);
  candidate = {
    ...candidate,
    views: {
      ...candidate.views,
      [p.id]: {
        region: row.region || row.relatedRegion || view().region,
        method: row.stream === "anatomy" ? row.modality : view().method,
        ...(p.mode === "research"
          ? {}
          : p.mode === "simulated"
            ? { day: row.day, date: normalizedDate }
            : { date: todayDate() }),
      },
    },
  };
  const updated = {
    ...store,
    observations: editing
      ? store.observations.map((r) => (r.id === editing!.id ? row : r))
      : [...store.observations, row],
  };
  if (
    !commit(
      candidate,
      updated,
      editing ? "User measurement corrected" : "Measurement recorded",
      [row.id],
    )
  ) {
    const error = app.querySelector<HTMLElement>("#" + errorId);
    if (error) {
      error.textContent =
        storageError || "Unable to save; no replacement was saved.";
      error.scrollIntoView({ block: "nearest" });
    }
    return;
  }
  editing = undefined;
  modal = null;
  page = "overview";
  message(`Measurement saved for ${p.name}.${completion}`);
}
function action(id: string, el?: HTMLElement) {
  if (["entry", "import", "symptom", "new-task", "new-exercise"].includes(id)) {
    if (toastTimer) clearTimeout(toastTimer);
    toast = "";
  }
  if (
    el &&
    !["close", "front", "back", "home", "zoom-in", "zoom-out"].includes(id)
  ) {
    openerSelector =
      '[data-action="' +
      id +
      '"]' +
      (el.dataset.record
        ? '[data-record="' + el.dataset.record + '"]'
        : el.dataset.task
          ? '[data-task="' + el.dataset.task + '"]'
          : "");
  }
  if (el && openerSelector)
    openerIndex = Array.from(app.querySelectorAll(openerSelector)).indexOf(el);
  if (["overview", "measurements", "followups", "sources"].includes(id)) {
    page = id;
    modal = null;
    render();
    return;
  }
  if (id === "close") {
    modal = null;
    editing = undefined;
    render();
    return;
  }
  if (id === "incident") {
    incidentDraft = undefined;
    modal = "incident";
    render();
    return;
  }
  if (id === "open-incident") {
    incidentDraft = scopedIncidents(store.incidents, profile()).find(
      (i) => i.id === el?.dataset.incident,
    );
    modal = "incident";
    render();
    return;
  }
  if (id === "save-incident" && incidentDraft) {
    const draft = incidentDraft;
    if (!scopedIncidents([draft], profile()).length) {
      const error = app.querySelector<HTMLElement>("#incident-error");
      if (error)
        error.textContent =
          "This draft does not belong to the active profile. Open Incident Support again for the current profile.";
      return;
    }
    if (store.incidents.some((i) => i.id === draft.id)) {
      const status = app.querySelector<HTMLElement>("#incident-error");
      if (status) {
        status.setAttribute("role", "status");
        status.textContent =
          "This incident note is already saved locally. No duplicate was created.";
      }
      return;
    }
    if (
      commit(
        personal,
        { ...store, incidents: [...store.incidents, draft] },
        "Incident documented locally",
        [draft.id],
      )
    ) {
      render();
      const status = app.querySelector<HTMLElement>("#incident-error");
      if (status) {
        status.setAttribute("role", "status");
        status.textContent =
          "Incident saved locally. No message was sent; your muscle measurements are unchanged.";
      }
    } else {
      const error = app.querySelector<HTMLElement>("#incident-error");
      if (error)
        error.textContent =
          storageError || "Unable to save; your report has not been replaced.";
    }
    return;
  }
  if (
    id === "export-incident" &&
    incidentDraft &&
    scopedIncidents([incidentDraft], profile()).length
  ) {
    download("musclemap-incident-note.json", {
      profile: profile(),
      incident: incidentDraft,
      exportedAt: new Date().toISOString(),
      limits:
        "Local documentation only. Not validated triage, diagnosis, treatment or an approved mission procedure. Downloading does not send this to a medical team.",
    });
    return;
  }
  if (id === "research") {
    switchProfile(researchProfile("7326"));
    return;
  }
  if (id === "demo") {
    const demo = personal.profiles.find((p) => p.id === "demo");
    if (demo) switchProfile(demo);
    return;
  }
  if (id === "return-personal") {
    const p =
      personal.profiles.find(
        (x) => x.id === personal.lastPersonalProfileId && x.mode === "manual",
      ) || personal.profiles.find((x) => x.mode === "manual");
    if (p) switchProfile(p);
    return;
  }
  if (id === "reload") {
    void load();
    return;
  }
  if (
    ["front", "back", "home", "zoom-in", "zoom-out", "focus-region"].includes(
      id,
    )
  ) {
    if (id === "front") viewer?.front();
    if (id === "back") viewer?.back();
    if (id === "home") viewer?.reset();
    if (id === "zoom-in") viewer?.zoom(0.8);
    if (id === "zoom-out") viewer?.zoom(1.25);
    if (id === "focus-region") viewer?.focus(view().region);
    return;
  }
  if (id === "new-exercise") {
    newExercise = true;
    modal = "new-task";
    render();
    return;
  }
  if (id === "new-task") {
    newExercise = false;
    taskEvidence = el?.closest(".p-review-actions")
      ? model().latest?.id || ""
      : "";
    modal = "new-task";
    render();
    return;
  }
  if (id === "open-task") {
    selectedTask = el?.dataset.task;
    modal = "task";
    render();
    return;
  }
  if (id === "inspect-record") {
    selectedRecord = el?.dataset.record;
    modal = "record";
    render();
    return;
  }
  if (id === "edit-record") {
    editing = store.observations.find(
      (r) =>
        r.id === el?.dataset.record && profileRows([r], profile()).length > 0,
    );
    if (!editing || profile().mode === "research") {
      message("Original research/example records cannot be corrected.");
      return;
    }
    if (
      !confirm(
        "Correct this user-entered/imported result? The original source identifiers and a copy of the previous record will be retained in history.",
      )
    )
      return;
    modal = editing.stream === "symptom" ? "symptom" : "entry";
    render();
    return;
  }
  if (id === "delete-record") {
    const row = store.observations.find(
      (r) =>
        r.id === el?.dataset.record && profileRows([r], profile()).length > 0,
    );
    if (!row || profile().mode === "research") return;
    if (
      !confirm(
        "Delete this local result? A copy remains in correction history; baseline/task references will not silently switch to another record.",
      )
    )
      return;
    const candidate = {
      ...personal,
      history: [
        ...personal.history,
        {
          at: new Date().toISOString(),
          action: "deleted",
          recordId: row.id,
          before: row,
        },
      ],
    };
    if (
      commit(
        candidate,
        {
          ...store,
          observations: store.observations.filter((r) => r.id !== row.id),
        },
        "User result deleted",
        [row.id],
      )
    )
      message(
        "Local result removed. Its original record remains in backup history.",
      );
    else render();
    return;
  }
  if (
    ["entry", "symptom", "import"].includes(id) &&
    profile().mode === "research"
  ) {
    message(
      "NASA research is read-only. Open a personal or clearly fictional profile to record new information.",
    );
    return;
  }
  if (
    [
      "entry",
      "menu",
      "profile",
      "symptom",
      "import",
      "import-plan",
      "restore",
    ].includes(id)
  ) {
    lastFocus = id;
    modal = id as PersonalModal;
    editing = undefined;
    selectedTask = el?.dataset.task;
    imported = undefined;
    planImported = undefined;
    render();
    return;
  }
  if (id === "template") {
    download(
      "musclemap-personal-import-template.json",
      personalImportTemplate(profile()),
    );
    return;
  }
  if (id === "backup") {
    download("musclemap-full-local-backup.json", {
      format: "musclemap-personal-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      legacy: store,
      personal,
      rawOriginal: rawBackups(),
      warning: "Local unencrypted prototype records; store securely.",
    });
    return;
  }
  if (id === "export" || id === "export-readable") {
    exportReview(id === "export-readable");
    return;
  }
  if (id === "commit-import") {
    if (!imported || imported.errors.length || !imported.rows.length) return;
    const p = profile(),
      first = imported.rows.find((r) => r.stream === "anatomy");
    const history = imported.rows.map((row) => ({
      at: new Date().toISOString(),
      action: `imported ${importName} SHA-256 ${importHash}`,
      recordId: row.id,
      after: row,
    }));
    const importedBaselines = { ...personal.baselines };
    const references = imported.rows.filter(
      (r) =>
        r.baseline &&
        r.region &&
        r.quality === "valid" &&
        r.value !== null &&
        r.value > 0,
    );
    for (const ref of references) {
      const key = baselineKey(p, ref.region!, ref.modality);
      if (importedBaselines[key] === undefined) {
        if (
          references.filter(
            (r) => baselineKey(p, r.region!, r.modality) === key,
          ).length !== 1
        ) {
          message(
            "More than one baseline was marked for a series. Select exactly one in the import or use the baseline selector. Nothing saved.",
          );
          return;
        }
        importedBaselines[key] = ref.id;
      }
    }
    const candidate = {
      ...personal,
      baselines: importedBaselines,
      history: [...personal.history, ...history],
      views: {
        ...personal.views,
        [p.id]: {
          ...view(),
          ...(first ? { region: first.region!, method: first.modality } : {}),
          ...(p.mode === "manual" ? { date: todayDate() } : {}),
        },
      },
    };
    if (
      commit(
        candidate,
        { ...store, observations: [...store.observations, ...imported.rows] },
        `File imported: ${importName}; SHA-256 ${importHash}`,
        imported.rows.map((r) => r.id),
      )
    ) {
      modal = null;
      page = "measurements";
      message(
        `${imported.rows.length} results saved to ${p.name}; original filename, source rows and file hash retained.`,
      );
    } else render();
    return;
  }
  if (id === "commit-plan") {
    if (!planImported || planImported.errors.length) return;
    if (
      commit(
        { ...personal, tasks: [...personal.tasks, ...planImported.tasks] },
        store,
        "Supplied plan imported",
        planImported.tasks.map((t) => t.id),
      )
    ) {
      modal = null;
      page = "followups";
      message(
        "Existing plan saved. No new exercise dose or clinical interval was generated.",
      );
    } else render();
    return;
  }
  if (id === "cancel-task") {
    const task = personal.tasks.find(
      (t) => t.id === el?.dataset.task && t.profileId === profile().id,
    );
    if (
      !task ||
      !confirm(
        "Cancel this reminder or follow-up? Its history and recorded outcomes are retained.",
      )
    )
      return;
    if (
      commit({
        ...personal,
        tasks: personal.tasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: "cancelled" as const,
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      })
    ) {
      modal = null;
      message("Item cancelled; history retained.");
    } else render();
    return;
  }
  if (id === "reset") {
    if (
      !confirm(
        "Remove all local observations, profiles, reminders and drafts? Export a full backup first. Bundled NASA and fictional source files are unchanged.",
      )
    )
      return;
    if (!storage) return;
    try {
      storage.removeItem(STORE_KEY);
      storage.removeItem(PERSONAL_KEY);
      location.reload();
    } catch (e) {
      storageError = String(e);
      render();
    }
    return;
  }
}
function exportReview(readable: boolean) {
  const p = profile(),
    v = view(),
    m = model(),
    scoped = rows();
  const related = personal.tasks.filter(
    (t) => t.profileId === p.id && (!t.region || t.region === v.region),
  );
  const payload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    profile: p,
    selection: v,
    baselineId:
      personal.baselines[baselineKey(p, v.region, v.method)] || m.baseline?.id,
    review: m,
    sourceRows: m.visibleRows,
    provenanceHistory: personal.history.filter(
      (h) =>
        profileRows(
          [...(h.before ? [h.before] : []), ...(h.after ? [h.after] : [])],
          p,
        ).length > 0,
    ),
    sources,
    tasks: related,
    symptoms: scoped.filter(
      (r) =>
        r.stream === "symptom" &&
        (r.relatedRegion === v.region || r.region === v.region),
    ),
    calculation:
      "(current - reference) / reference * 100; baseline and previous-reference calculations are separate",
    limits: [
      "Descriptive size review, not strength/diagnosis/prescription/medical clearance",
      "Calendar coordinates use supplied dates; source originals retained",
      "Export does not transmit to a medical team",
    ],
  };
  if (!readable) {
    download("musclemap-traceable-review.json", payload);
    return;
  }
  const fmt = (r: Observation | undefined) =>
    r
      ? `${displayTime(r, p)} — ${r.value === null ? "Missing" : r.value + " " + r.unit} — ${r.modality} — ${r.protocol} — ${r.sourceId} / row ${r.sourceRow}`
      : "Not available";
  const percent = (n: number | undefined) =>
    n === undefined ? "Not calculable" : n.toFixed(6) + "%";
  const text = `# MuscleMap review\n\n${p.name} · ${contextLabel(p)}\n\nExported ${payload.exportedAt}. This file has not been transmitted to a medical team.\n\n## Selected size measurements\n\nSelected reference ID: ${payload.baselineId || "No selected baseline"}\n\n${REGIONS[v.region].title} · right side · CSA · ${v.method}\n\nLatest: ${fmt(m.latest)}\n\nBaseline: ${fmt(m.baseline)}\n\nBaseline change: ${percent(m.change)}\n\nPrevious comparable: ${fmt(m.previous)}\n\nPrevious-assessment change: ${percent(m.previousChange)}\n\nFormula: (current − reference) / reference × 100. Missing or zero references do not produce a percentage.\n\n## Measurement history\n\n${m.visibleRows.map((r) => fmt(r) + (r.note ? "\nNote: " + r.note : "")).join("\n\n")}\n\n## Notes and self-reported symptoms\n\n${
    scoped
      .filter(
        (r) =>
          r.note && (r.region === v.region || r.relatedRegion === v.region),
      )
      .map((r) => `${displayTime(r, p)} · ${r.measurement}: ${r.note}`)
      .join("\n\n") || "None supplied."
  }\n\n## Linked assessments and follow-ups\n\n${related.map((t) => `${t.title} — ${t.status}; due ${t.dueDate || "not supplied"}\nReason: ${t.reason}\nSource: ${t.source.kind} / ${t.source.name || "User created"} ${t.source.url || ""}\n${t.outcomes.map((o) => `${o.at} ${o.result}: ${o.note}`).join("\n")}`).join("\n\n") || "None recorded."}\n\n## Missing information and limits\n\n${m.reasons.join("\n")}\n${m.dateMissing.length} undated result(s) excluded from the date timeline. Size is not strength, endurance or mission readiness. No treatment, plan change or diagnosis is generated.\n\n## Local import and correction provenance\n\n${payload.provenanceHistory.map((h) => `${h.at} — ${h.action} — ${h.recordId}`).join("\n") || "No local imports/corrections."}\n\n## Attribution\n\n${sources.map((s) => `${s.title} — ${s.provider} — ${s.url}\nContribution/limits: ${s.limits}\nTerms: ${s.license}`).join("\n\n")}\n\nOriginal NASA files are read-only; user entries and the fictional demonstration remain separate.\n`;
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "musclemap-readable-review.md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function bind() {
  app.querySelectorAll<HTMLElement>("[data-action]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      action(el.dataset.action!, el);
    }),
  );
  app.querySelectorAll<HTMLElement>("[data-page]").forEach((el) =>
    el.addEventListener("click", () => {
      page = el.dataset.page!;
      render();
    }),
  );
  app
    .querySelectorAll<HTMLElement>("[data-region]")
    .forEach((el) =>
      el.addEventListener("click", () =>
        setView({ region: el.dataset.region as Region }),
      ),
    );
  app
    .querySelector<HTMLSelectElement>("#active-profile")
    ?.addEventListener("change", (e) => {
      const p = personal.profiles.find(
        (x) => x.id === (e.target as HTMLSelectElement).value,
      );
      if (p) switchProfile(p);
    });
  app
    .querySelector<HTMLSelectElement>("#research-participant")
    ?.addEventListener("change", (e) =>
      switchProfile(researchProfile((e.target as HTMLSelectElement).value)),
    );
  app
    .querySelector<HTMLSelectElement>("#modality")
    ?.addEventListener("change", (e) =>
      setView({ method: (e.target as HTMLSelectElement).value }),
    );
  app
    .querySelector<HTMLInputElement>("#cursor")
    ?.addEventListener("change", (e) =>
      setView({ day: Number((e.target as HTMLInputElement).value) }),
    );
  app
    .querySelector<HTMLInputElement>("#review-date")
    ?.addEventListener("change", (e) =>
      (() => {
        const date = (e.target as HTMLInputElement).value || todayDate();
        try {
          dateDay(date);
          if (profile().mode === "manual" && date > todayDate())
            throw new Error("Personal review date cannot be in the future.");
          setView({ date });
        } catch (error) {
          message(String(error));
        }
      })(),
    );
  app
    .querySelector<HTMLSelectElement>("#baseline-select")
    ?.addEventListener("change", (e) => {
      const p = profile(),
        v = view(),
        id = (e.target as HTMLSelectElement).value;
      selection({
        ...personal,
        baselines: {
          ...personal.baselines,
          [baselineKey(p, v.region, v.method)]: id,
        },
      });
    });
  app.querySelectorAll<HTMLElement>("[data-task-filter]").forEach((el) =>
    el.addEventListener("click", () => {
      taskFilter = el.dataset.taskFilter!;
      render();
    }),
  );
  app
    .querySelector<HTMLFormElement>("#incident-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.currentTarget as HTMLFormElement,
        d = new FormData(f),
        p = profile();
      const description = String(d.get("description") || "").trim(),
        onsetDate = String(d.get("onsetDate") || "");
      try {
        if (description.length < 5 || description.length > 5000)
          throw new Error("Describe the report using 5 to 5,000 characters.");
        if (onsetDate) {
          dateDay(onsetDate);
          if (p.mode === "manual" && onsetDate > todayDate())
            throw new Error("The supplied onset date cannot be in the future.");
        }
        incidentDraft = {
          ...screenIncident(description),
          owner: {
            profileId: p.id,
            participant: p.participant,
            mode: p.mode,
            namespace: p.namespace,
          },
          ...(onsetDate ? { onsetDate } : {}),
        };
        render();
        app
          .querySelector<HTMLElement>("#incident-analysis")
          ?.scrollIntoView({ block: "start" });
      } catch (error) {
        f.querySelector("#incident-error")!.textContent = String(error);
      }
    });
  const measurement = app.querySelector<HTMLFormElement>("#measurement-form");
  measurement?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveMeasurement(
      formInput(measurement),
      String(new FormData(measurement).get("taskId") || ""),
    );
  });
  measurement?.querySelector("[name=type]")?.addEventListener("change", () => {
    (measurement.elements.namedItem("unit") as HTMLSelectElement).value =
      String(new FormData(measurement).get("type")) === "CSA" ? "cm²" : "N";
  });
  app
    .querySelector<HTMLFormElement>("#profile-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.currentTarget as HTMLFormElement,
        d = new FormData(f);
      try {
        const p = createProfile(
          String(d.get("name")),
          String(d.get("missionName") || ""),
          String(d.get("missionStartDate") || ""),
        );
        if (
          commit(
            {
              ...personal,
              profiles: [...personal.profiles, p],
              activeProfileId: p.id,
            },
            store,
            "Personal profile created",
            [p.id],
          )
        ) {
          modal = null;
          page = "overview";
          message(
            "Personal profile created with an empty measurement history.",
          );
        } else
          f.querySelector("#profile-error")!.textContent =
            storageError || "Unable to save profile.";
      } catch (error) {
        f.querySelector("#profile-error")!.textContent = String(error);
      }
    });
  app
    .querySelector<HTMLFormElement>("#task-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.currentTarget as HTMLFormElement,
        d = new FormData(f),
        p = profile(),
        latest = model().latest;
      const raw = {
        kind: d.get("kind"),
        title: d.get("title"),
        reason: d.get("reason"),
        dueDate: String(d.get("dueDate") || "") || undefined,
        region: String(d.get("region") || "") || undefined,
        measurement: String(d.get("measurement") || "") || undefined,
        method: String(d.get("method") || "") || undefined,
        protocol: String(d.get("protocol") || "") || undefined,
        source: {
          kind: d.get("sourceKind"),
          name: String(d.get("sourceName") || "") || undefined,
          url: String(d.get("sourceUrl") || "") || undefined,
        },
        instructions: String(d.get("instructions") || "") || undefined,
      };
      const checked = parsePlan(JSON.stringify([raw]), p);
      if (checked.errors.length) {
        f.querySelector("#task-error")!.textContent = checked.errors.join(" ");
        return;
      }
      const evidence = rows().find((row) => row.id === d.get("evidenceId"));
      if (d.get("evidenceId") && !evidence) {
        f.querySelector("#task-error")!.textContent =
          "Result does not belong to the active profile.";
        return;
      }
      if (
        evidence &&
        raw.region &&
        (evidence.region || evidence.relatedRegion) !== raw.region
      ) {
        f.querySelector("#task-error")!.textContent =
          "Linked result does not match the selected region.";
        return;
      }
      const tasks = checked.tasks.map((t) => ({
        ...t,
        evidenceIds: String(d.get("evidenceId") || "")
          ? [String(d.get("evidenceId"))]
          : [],
      }));
      if (
        commit(
          { ...personal, tasks: [...personal.tasks, ...tasks] },
          store,
          "Reminder/follow-up saved",
          tasks.map((t) => t.id),
        )
      ) {
        modal = null;
        page = "followups";
        message("Item saved with your supplied date, reason and source.");
      } else
        f.querySelector("#task-error")!.textContent =
          storageError || "Unable to save item.";
    });
  app
    .querySelector<HTMLFormElement>("#outcome-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.currentTarget as HTMLFormElement,
        d = new FormData(f),
        p = profile(),
        t = personal.tasks.find(
          (t) => t.id === d.get("taskId") && t.profileId === p.id,
        );
      if (!t) return;
      const date = String(d.get("date")),
        record = rows().find((r) => r.id === d.get("recordId"));
      try {
        dateDay(date);
        if (p.mode === "manual" && date > todayDate())
          throw new Error("Outcome date cannot be in the future.");
        if (!String(d.get("note")).trim())
          throw new Error("An outcome note is required.");
        if (t.status === "cancelled")
          throw new Error(
            "Cancelled items cannot be completed; create a new item if needed.",
          );
        if (record?.value === null)
          throw new Error("A missing result cannot satisfy an assessment.");
        if (
          String(d.get("result")) === "completed" &&
          t.kind === "assessment"
        ) {
          if (!record)
            throw new Error(
              "Choose a qualifying result or use Record result to complete this assessment.",
            );
          const check = completeAssessment(
            { ...t, status: "pending" },
            record,
            p,
          );
          if (check.error) throw new Error(check.error);
        }
        if (
          record &&
          t.region &&
          (record.region || record.relatedRegion) !== t.region
        )
          throw new Error("Result does not match this item region.");
        if (
          record &&
          measurementDate(record, p) &&
          p.mode === "manual" &&
          measurementDate(record, p)! > date
        )
          throw new Error(
            "An outcome cannot link a result measured after its outcome date.",
          );
        if (record && t.kind === "followup") {
          const oldRows = t.evidenceIds
            .map((id) => rows().find((r) => r.id === id))
            .filter((r): r is Observation => !!r);
          if (
            oldRows.some(
              (old) =>
                measurementDate(old, p) &&
                measurementDate(record, p) &&
                measurementDate(record, p)! < measurementDate(old, p)!,
            )
          )
            throw new Error(
              "The linked result predates the originating follow-up evidence.",
            );
        }
        const result = String(d.get("result")) as
          | "completed"
          | "partial"
          | "not_completed";
        const updated = {
          ...t,
          status:
            result === "completed"
              ? ("completed" as const)
              : ("pending" as const),
          updatedAt: new Date().toISOString(),
          evidenceIds: [
            ...new Set([...t.evidenceIds, ...(record ? [record.id] : [])]),
          ],
          outcomes: [
            ...t.outcomes,
            {
              at: date,
              result,
              note: String(d.get("note")).trim(),
              observationIds: record ? [record.id] : [],
            },
          ],
        };
        if (
          commit(
            {
              ...personal,
              tasks: personal.tasks.map((x) => (x.id === t.id ? updated : x)),
            },
            store,
            "Task outcome recorded",
            [t.id],
          )
        ) {
          modal = null;
          message(
            "Outcome saved. Earlier result links and outcomes are retained.",
          );
        } else
          f.querySelector("#outcome-error")!.textContent =
            storageError || "Unable to save outcome.";
      } catch (error) {
        f.querySelector("#outcome-error")!.textContent = String(error);
      }
    });
  app
    .querySelector<HTMLFormElement>("#symptom-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(e.currentTarget as HTMLFormElement);
      saveMeasurement(
        {
          date: String(d.get("date")),
          region: String(d.get("region")) as Region,
          type: "symptom",
          method: "Self-report",
          value: "",
          unit: "",
          protocol: "Dated self-report",
          note: String(d.get("note")),
          confirmed: true,
        },
        undefined,
        "symptom-error",
      );
    });
  app
    .querySelector<HTMLInputElement>("#import-file")
    ?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        if (file.size > 5 * 1024 * 1024)
          throw new Error("Maximum file size is 5 MiB.");
        const text = await file.text();
        importName = file.name;
        importHash = [
          ...new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(text),
            ),
          ),
        ]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
        imported = parsePersonalImport(
          text,
          file.name.toLowerCase().endsWith(".csv") ? "csv" : "json",
          profile(),
          all(),
          file.name,
        );
      } catch (error) {
        imported = { rows: [], errors: [String(error)] };
      }
      render();
    });
  app
    .querySelector<HTMLInputElement>("#plan-file")
    ?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error("Maximum 5 MiB.");
        planImported = parsePlan(await file.text(), profile());
      } catch (error) {
        planImported = { tasks: [], errors: [String(error)] };
      }
      render();
    });
  app
    .querySelector<HTMLInputElement>("#restore-file")
    ?.addEventListener("change", async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !storage) return;
      try {
        if (file.size > 5 * 1024 * 1024)
          throw new Error("Backup too large for this browser restore.");
        const parsed = JSON.parse(await file.text());
        const legacy = readStore({
          getItem: () => JSON.stringify(parsed.legacy),
        });
        if (legacy.error) throw new Error(legacy.error);
        const candidate = validatePersonalState(parsed.personal);
        if (!candidate.state)
          throw new Error(
            candidate.error || "Invalid personal workflow backup.",
          );
        if (
          !confirm(
            "Replace current local records and workflow with this validated backup? Export your current backup first.",
          )
        )
          return;
        const result = restoreStores(legacy.store, candidate.state, storage);
        if (!result.ok) throw new Error(result.error);
        location.reload();
      } catch (error) {
        app.querySelector("#restore-error")!.textContent = String(error);
      }
    });
}
async function load() {
  ready = false;
  render();
  const errors: string[] = [];
  async function read<T>(path: string, fallback: T): Promise<T> {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("Malformed source bundle");
      if (path.includes("research.json") || path.includes("simulated.json")) {
        const expected = path.includes("research.json")
          ? "research"
          : "simulated";
        for (const raw of payload) {
          const result = validateObservation(raw);
          if (!result.row || result.row.mode !== expected)
            throw new Error("Invalid original observation");
        }
      }
      return payload as T;
    } catch (error) {
      errors.push(path + ": " + String(error));
      return fallback;
    }
  }
  [research, simulation, sources] = await Promise.all([
    read<Observation[]>("/data/research.json", []),
    read<Observation[]>("/data/simulated.json", []),
    read<SourceRecord[]>("/data/source-manifest.json", []),
  ]);
  loadError = errors.length
    ? "Some original source bundles are unavailable. No substitute measurements were generated. " +
      errors.join(" · ")
    : "";
  ready = true;
  const query = new URLSearchParams(location.search);
  if (profile().mode === "manual")
    personal = { ...personal, lastPersonalProfileId: profile().id };
  if (query.get("example") === "research") {
    const id = query.get("participant") || "7326";
    const p = researchProfile(
      research.some((r) => r.participant === id) ? id : "7326",
    );
    personal = {
      ...personal,
      profiles: personal.profiles.some((x) => x.id === p.id)
        ? personal.profiles
        : [...personal.profiles, p],
      activeProfileId: p.id,
    };
  }
  if (query.get("example") === "fictional")
    personal = { ...personal, activeProfileId: "demo" };
  let referenced = personal;
  for (const p of personal.profiles)
    referenced = stableReferences(referenced, p);
  if (
    JSON.stringify(referenced.baselines) !== JSON.stringify(personal.baselines)
  ) {
    if (blocked) personal = referenced;
    else
      commit(
        referenced,
        store,
        "Explicit source/legacy baseline references retained",
      );
  }
  render();
}
if (workflow.created && !blocked)
  commit(
    personal,
    store,
    "Personal workflow initialized without changing original observations",
  );
void load();
if (import.meta.env.PROD && "serviceWorker" in navigator)
  void navigator.serviceWorker.register("/sw.js").catch(() => {});

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener("resize", () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (page === "overview" && !modal) render();
  }, 150);
});
