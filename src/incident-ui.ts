import type { Incident } from "./domain";
import { incidentSteps, retrieveIncidentReferences } from "./emergency";
import { esc } from "./ui";

export function renderIncidentResult(incident: Incident): string {
  const references = retrieveIncidentReferences(incident);
  const hasTerms = incident.reportedSymptoms.length > 0;
  const attention = incident.escalationNotice || hasTerms;
  return `<section class="incident-result" aria-labelledby="incident-result-title">
    <div class="incident-status" role="status"><h3 id="incident-result-title">${attention ? "Notify medical authority" : "No recognized terms"}</h3><p>${hasTerms ? "Reported symptoms: " + incident.reportedSymptoms.map(esc).join(", ") + "." : "No match cannot rule out an emergency. Follow the same emergency response steps."}</p>${attention ? "<p>Reported terms may warrant prompt attention under your emergency plan. Keyword matching is not a medical assessment.</p>" : ""}</div>
    <section class="incident-workflow" aria-labelledby="incident-workflow-title"><h3 id="incident-workflow-title">Next steps</h3><ol>${incidentSteps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></section>
    <div class="incident-protocol-status" role="note"><strong>Mission medical checklist unavailable</strong><p>No approved mission procedure is available in MuscleMap. It does not provide diagnosis or treatment instructions.</p></div>
    <details class="incident-original"><summary>Report details</summary><p><strong>Reported region:</strong> ${esc(incident.region)}</p><blockquote>${esc(incident.description)}</blockquote><small>Documented ${esc(incident.createdAt)}${incident.onsetDate ? " · Onset supplied: " + esc(incident.onsetDate) : " · Onset not supplied"}</small></details>
    <details class="incident-references"><summary>Public sources · not medical procedures</summary><p>Online background only. No mission-specific treatment or flight approval.</p><div class="incident-reference-cards">${references.map((reference) => `<article class="incident-reference-card"><h4>${esc(reference.title)}</h4><p>${esc(reference.provider)} · source checked ${esc(reference.reviewed)}</p><p>${esc(reference.role)}</p><a href="${esc(reference.url)}" target="_blank" rel="noopener noreferrer">Open public source</a></article>`).join("")}</div></details>
    <button type="button" data-action='save-incident'>Save incident locally</button>
  </section>`;
}
