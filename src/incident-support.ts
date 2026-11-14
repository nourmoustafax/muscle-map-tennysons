import type { Incident } from "./domain";
import type { Profile } from "./personal-types";
import { renderIncidentResult } from "./incident-ui";
import { esc } from "./ui";

export function scopedIncidents(items: Incident[], p: Profile): Incident[] {
  return items.filter(
    (i) =>
      i.owner?.profileId === p.id &&
      i.owner.participant === p.participant &&
      i.owner.mode === p.mode &&
      i.owner.namespace === p.namespace,
  );
}

export function incidentSupportMarkup(
  p: Profile,
  records: Incident[],
  draft?: Incident,
): string {
  const saved = scopedIncidents(records, p);
  const active = draft ? scopedIncidents([draft], p)[0] : undefined;
  const alreadySaved = active && saved.some((i) => i.id === active.id);
  const result = active
    ? renderIncidentResult(active).replace(
        "<button type=\"button\" data-action='save-incident'>Save incident locally</button>",
        `<div class="p-review-actions"><button type="button" class="primary" data-action="save-incident" ${alreadySaved ? "disabled" : ""}>${alreadySaved ? "Saved locally" : "Save incident locally"}</button><button type="button" class="secondary" data-action="export-incident">Download incident note</button><small>Local documentation only. No message is sent.</small></div>`,
      )
    : "";
  return `<div class="h-incident-intro" role="note"><strong>Use your mission emergency plan and medical authority now. Do not wait for this app.</strong><span class="tag">Not validated triage</span></div>
    <p class="incident-profile">${esc(p.name)}${p.mode === "research" ? " · Local note, not NASA study data" : p.mode === "simulated" ? " · Fictional demonstration" : ""}</p>
    <form id="incident-form"><label>What happened?<textarea name="description" id="incident-description" rows="3" required minlength="5" maxlength="5000" placeholder="Describe what happened and the symptoms you observed.">${esc(active?.description || "")}</textarea></label><label>Onset date, if known<input type="date" name="onsetDate" value="${esc(active?.onsetDate || "")}" ${p.mode === "manual" ? `max="${new Date().toISOString().slice(0, 10)}"` : ""}/><small>Leave blank if unknown.</small></label><div id="incident-error" class="form-error" role="alert"></div><div class="modal-actions"><button type="submit" class="primary">Show next steps</button></div></form>
    ${result ? `<div id="incident-analysis">${result}</div>` : '<p class="h-incident-help">No mission-approved medical checklist is installed. Treatment guidance is unavailable.</p>'}
    <details class="h-incident-history"><summary>Saved incident notes (${saved.length})</summary>${
      saved.length
        ? saved
            .slice()
            .reverse()
            .map(
              (i) =>
                `<article><div><strong>${esc(i.region)}</strong><small>${esc(i.createdAt)}</small><p>${esc(i.description)}</p></div><button class="text-button" data-action="open-incident" data-incident="${esc(i.id)}">Open note</button></article>`,
            )
            .join("")
        : "<p>No incident notes saved for this profile.</p>"
    }<small>Unscoped older notes remain in the full backup.</small></details>`;
}
