import { REGIONS, type Observation, type Region } from "./domain";
import type { Profile, PersonalState, MonitorTask } from "./personal-types";
import { measurementDate, todayDate } from "./personal-review";
import { profileRows } from "./personal-state";
import { esc } from "./ui";
import { btn, contextLabel, taskDetails, displayTime } from "./personal-ui";
export type PersonalModal =
  | "entry"
  | "profile"
  | "menu"
  | "task"
  | "new-task"
  | "import"
  | "import-plan"
  | "record"
  | "symptom"
  | "incident"
  | "restore"
  | null;
export const modalHeader = (title: string) =>
  `<div class="modal-header"><h2 id="dialog-title">${esc(title)}</h2><button class="close" data-action="close" aria-label="Close dialog">×</button></div>`;
export function entryForm(
  p: Profile,
  state: PersonalState,
  region: Region,
  method: string,
  editing?: Observation,
  linked?: MonitorTask,
): string {
  const own = state.tasks.filter(
    (t) =>
      t.profileId === p.id &&
      t.kind === "assessment" &&
      t.status !== "completed" &&
      t.status !== "cancelled",
  );
  const date = editing
    ? measurementDate(editing, p) || ""
    : linked?.dueDate || (p.mode === "simulated" ? "2028-05-10" : todayDate());
  return `${modalHeader(editing ? "Correct a measurement" : "Add measurement")}<p class="form-intro">${esc(p.name)} · ${esc(contextLabel(p))}. Record an examination or device result; MuscleMap stores it but does not take the measurement.</p><form id="measurement-form"><fieldset class="h-form-section"><legend>1 About the examination</legend><p class="h-form-help">Record where and how the result was obtained.</p><div class="form-grid"><label>Body region<select name="region">${Object.entries(
    REGIONS,
  )
    .map(
      ([id, r]) =>
        `<option value="${id}" ${id === (editing?.region || editing?.relatedRegion || linked?.region || region) ? "selected" : ""}>${esc(r.title)}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Side<select name="side"><option value="right">Right</option></select><small>Supported reference regions are on the right leg.</small></label><label>What was measured<select name="type"><option value="CSA" ${editing?.stream === "anatomy" ? "selected" : ""}>Muscle size · cross-sectional area</option><option value="function" ${editing?.stream === "function" ? "selected" : ""}>Related performance test</option></select><small>CSA is anatomical area; performance results remain separate.</small></label><label>Examination date<input name="date" type="date" value="${esc(date)}" required ${p.mode === "manual" ? `max="${todayDate()}"` : ""}/><small>Use the examination date.</small></label><label>How it was measured<input name="method" value="${esc(editing?.modality || linked?.method || method)}" placeholder="e.g. Panoramic ultrasound" required maxlength="200"/><small>Enter the supplied method exactly; MRI is not assumed onboard.</small></label><label>Equipment, if known<input name="device" placeholder="Optional equipment identifier" maxlength="200"/><small>Enter only supplied equipment names.</small></label></div></fieldset><fieldset class="h-form-section"><legend>2 The result</legend><p class="h-form-help">Enter the quantity and unit; record missing instead of zero.</p><div class="form-grid"><label>Result<input name="value" type="number" step="any" value="${editing?.value ?? ""}"/><small>Leave blank only when recording a missing result.</small></label><label>Unit<select name="unit"><option ${!editing || editing.unit === "cm²" ? "selected" : ""}>cm²</option><option ${editing?.unit === "N" ? "selected" : ""}>N</option><option ${editing?.unit === "Nm" ? "selected" : ""}>Nm</option><option ${editing?.unit === "W" ? "selected" : ""}>W</option><option ${editing?.unit === "s" ? "selected" : ""}>s</option></select><small>Size uses cm²; performance may use N, Nm, W or s.</small></label></div><label class="check"><input name="missing" type="checkbox" ${editing?.quality === "missing" ? "checked" : ""}/> This assessment has no measurement result (store missing, not zero)</label></fieldset><fieldset class="h-form-section"><legend>3 Comparison details</legend><p class="h-form-help">Keep details needed to assess comparability.</p><div class="form-grid"><label class="full">Protocol / acquisition details<input name="protocol" value="${esc(editing?.protocol || linked?.protocol || "")}" placeholder="Protocol identifier from the examination or supplied instruction" required maxlength="300"/><small>Comparable size results need the same site, side, method, unit and relevant protocol.</small></label><label class="full">Optional notes<textarea name="note" maxlength="2000" rows="2">${esc(editing?.note || "")}</textarea></label><label class="full">Link to a scheduled assessment<select name="taskId"><option value="">No assessment link</option>${own.map((t) => `<option value="${esc(t.id)}" ${t.id === linked?.id ? "selected" : ""}>${esc(t.title)}${t.dueDate ? " · " + esc(t.dueDate) : ""}</option>`).join("")}</select></label></div><label class="check"><input name="baseline" type="checkbox"/> Select this size result as my explicit baseline (existing choice is kept otherwise)</label><label class="check"><input name="confirmed" type="checkbox" ${editing?.quality === "valid" ? "checked" : ""}/> I checked the recorded side, site, units and protocol details</label><label class="check"><input name="duplicateConfirmed" type="checkbox"/> If flagged, I confirm this is a separate examination, not a duplicate entry</label></fieldset><div id="measurement-error" class="form-error" role="alert"></div><div class="modal-actions">${btn("close", "Cancel")}<button type="submit" class="primary">${editing ? "Save correction" : "Save measurement"}</button></div></form>`;
}
export function profileForm(): string {
  return `${modalHeader("Add a personal profile")}<p class="form-intro">Use a local label to keep records separate on this device. It is a label, not authentication or access control.</p><form id="profile-form"><label>Profile name<input name="name" required maxlength="80" placeholder="Your name or local profile label"/></label><label>Mission name, if supplied<input name="missionName" maxlength="150"/></label><label>Mission start date, if supplied<input name="missionStartDate" type="date"/></label><div class="form-error" role="alert" id="profile-error" ></div><div class="modal-actions">${btn("close", "Cancel")}<button type="submit" class="primary">Create profile</button></div></form>`;
}
export function newTaskForm(
  p: Profile,
  region: Region,
  method: string,
  exercise = false,
  records: Observation[] = [],
  selectedEvidence = "",
): string {
  return `${modalHeader(exercise ? "Enter an existing exercise plan" : "Add assessment reminder or follow-up")}<p class="form-intro">Add a chosen date or an instruction already supplied. MuscleMap does not create clinical intervals or exercise prescriptions.</p><form id="task-form"><div class="form-grid"><label>What are you adding?<select name="kind"><option value="assessment" ${exercise ? "" : "selected"}>Assessment reminder</option><option value="followup">Follow-up / review</option><option value="exercise" ${exercise ? "selected" : ""}>Existing exercise plan</option></select></label><label>Due date<input name="dueDate" type="date"/><small>Required for assessment reminders; otherwise leave blank.</small></label><label class="full">Title<input name="title" required maxlength="200"/></label><label class="full">Why is this on your list?<textarea name="reason" required minlength="3" maxlength="2000" rows="2"></textarea></label><label>Body region<select name="region"><option value="">Not region-specific</option>${Object.entries(
    REGIONS,
  )
    .map(
      ([id, r]) =>
        `<option value="${id}" ${id === region ? "selected" : ""}>${esc(r.title)}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Result to record<select name="measurement"><option value="CSA">Cross-sectional area</option><option value="function">Related performance</option><option value="">No numeric result required</option></select><small>CSA and performance results stay separate.</small></label><label>How it should be measured, if specified<input name="method" value="${exercise ? "" : esc(method)}" maxlength="200"/></label><label>Protocol, if specified<input name="protocol" maxlength="300"/></label><label>Where this came from<select name="sourceKind"><option value="user">My reminder / follow-up</option><option value="team">Instruction supplied by a medical/exercise team</option><option value="education">General educational information</option></select></label><label>Source name / person<input name="sourceName" maxlength="200"/><small>Required for an external instruction; it remains user-declared.</small></label><label class="full">Source link, if provided<input name="sourceUrl" type="url" placeholder="https://…"/></label><label class="full">Link an initial result<select name="evidenceId"><option value="">No result link</option>${records.map((row) => `<option value="${esc(row.id)}" ${row.id === selectedEvidence ? "selected" : ""}>${esc(displayTime(row, p))} · ${row.value ?? "Missing"} ${esc(row.unit)} · ${esc(row.measurement)}</option>`).join("")}</select></label><label class="full">Existing instruction / plan details<textarea name="instructions" rows="3" maxlength="3000" placeholder="Only enter the plan or instruction that was actually supplied."></textarea></label></div><div class="form-error" role="alert" id="task-error" ></div><div class="modal-actions">${btn("close", "Cancel")}<button type="submit" class="primary">Save item</button></div></form>`;
}
export function symptomForm(
  p: Profile,
  region: Region,
  editing?: Observation,
): string {
  return `${modalHeader("Log a symptom or difficulty")}<p class="form-intro">Record what you noticed, its date and region. This is a self-report; MuscleMap does not classify emergencies or diagnose.</p><form id="symptom-form"><label>Body region<select name="region">${Object.entries(
    REGIONS,
  )
    .map(
      ([id, r]) =>
        `<option value="${id}" ${id === region ? "selected" : ""}>${esc(r.title)}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Date noticed<input name="date" type="date" value="${editing ? measurementDate(editing, p) || "" : p.mode === "simulated" ? "2028-05-10" : todayDate()}" required/></label><label>What you noticed<textarea name="note" required minlength="3" maxlength="2000" rows="4">${esc(editing?.note || "")}</textarea><small>Use your own words; include timing or triggers.</small></label><div id="symptom-error" role="alert" class="form-error" ></div><div class="modal-actions">${btn("close", "Cancel")}<button class="primary" type="submit">Save self-report</button></div></form>`;
}
export function menuMarkup(p: Profile, state: PersonalState): string {
  return `${modalHeader("Profile & data")}<label>Active profile / example<select id="active-profile">${state.profiles.map((x) => `<option value="${esc(x.id)}" ${x.id === p.id ? "selected" : ""}>${esc(x.name)} · ${x.mode === "manual" ? "Personal" : x.mode === "research" ? "Research" : "Fictional"}</option>`).join("")}</select></label><div class="p-menu-actions"><div class="p-menu-group"><h3>Your profile</h3>${btn("profile", "Add personal profile")}</div><div class="p-menu-group"><h3>Import / export</h3>${btn("import", "Import personal measurements")}${btn("export-readable", "Export readable review")}${btn("export", "Export traceable JSON")}</div><div class="p-menu-group"><h3>Research & sources</h3>${btn("research", "Explore NASA CFT70 data")}${btn("demo", "Open fictional mission demonstration")}${btn("sources", "Sources & methods")}</div><details class="h-recovery" open><summary>Backup & recovery</summary><div>${btn("backup", "Export full local backup")}${btn("restore", "Restore a backup")}${btn("reset", "Remove local data")}</div></details></div><p>Stored in this browser; profiles are labels, not protected accounts. Back up sensitive notes securely.</p><details><summary>Privacy and network details</summary><p>Records and tasks stay in this browser without clinical encryption. Saved reminders do not send email or closed-browser notifications. Online source links and platform hosting/analytics may make network requests; the application has no medical-team transmission endpoint.</p></details>`;
}
export function recordDetails(row: Observation, p: Profile): string {
  return `${modalHeader("Measurement details")}<p><strong>${esc(displayTime(row, p))}</strong> · ${row.value === null ? "Missing" : row.value + " " + esc(row.unit)}</p><dl><dt>Quantity / method</dt><dd>${esc(row.measurement)} · ${esc(row.modality)}</dd><dt>Site / side</dt><dd>${esc(row.site)} · ${esc(row.side)}</dd><dt>Protocol</dt><dd>${esc(row.protocol)}</dd><dt>Source identifier / row</dt><dd>${esc(row.sourceId)} · ${esc(row.sourceRow)}</dd><dt>Source time point / phase</dt><dd>${esc(row.timepoint)} · ${esc(row.phase)}</dd><dt>Notes</dt><dd>${esc(row.note || "None supplied")}</dd></dl><details><summary>Canonical source record</summary><pre>${esc(JSON.stringify(row, null, 2))}</pre></details>`;
}
