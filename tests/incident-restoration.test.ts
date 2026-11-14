import { it, expect, describe } from "vitest";
import { screenIncident } from "../src/emergency";
import {
  scopedIncidents,
  incidentSupportMarkup,
} from "../src/incident-support";
import { readStore, emptyStore } from "../src/store";
import type { Profile } from "../src/personal-types";
const p: Profile = {
  id: "person-a",
  participant: "LOCAL-A",
  name: "Local person",
  mode: "manual",
  namespace: "local-a",
  createdAt: "2026-11-14T08:00:00Z",
};
const note = () => ({
  ...screenIncident("Reported sudden calf pain", "2026-11-14T08:00:00Z"),
  owner: {
    profileId: p.id,
    participant: p.participant,
    mode: p.mode,
    namespace: p.namespace,
  },
  onsetDate: "2026-11-13",
});
describe("restored scoped incident documentation", () => {
  it("retains unscoped legacy drafts without assigning them to a profile", () => {
    const legacy = screenIncident("Legacy pain note");
    const store = { ...emptyStore(), incidents: [legacy, note()] };
    expect(
      readStore({ getItem: () => JSON.stringify(store) }).error,
    ).toBeUndefined();
    expect(scopedIncidents(store.incidents, p)).toHaveLength(1);
  });
  it("isolates profile, participant, mode and namespace before display", () => {
    for (const field of ["profileId", "participant", "mode", "namespace"]) {
      const n = note();
      Object.assign(n.owner, {
        [field]: field === "mode" ? "research" : "another",
      });
      expect(scopedIncidents([n], p)).toHaveLength(0);
    }
  });
  it("rejects malformed new ownership and onset dates without losing original stored input", () => {
    for (const bad of [{ profileId: p.id }, null]) {
      const state = { ...emptyStore(), incidents: [{ ...note(), owner: bad }] };
      expect(
        readStore({ getItem: () => JSON.stringify(state) }).error,
      ).toContain("incident");
    }
    const state = {
      ...emptyStore(),
      incidents: [{ ...note(), onsetDate: "2026-02-30" }],
    };
    expect(readStore({ getItem: () => JSON.stringify(state) }).error).toContain(
      "incident",
    );
  });
  it("uses existing non-operational reminders/citations and prevents repeated save of a saved note", () => {
    const n = note();
    const html = incidentSupportMarkup(p, [n], n);
    expect(html).toContain("Not validated triage");
    expect(html).toContain('data-action="save-incident" disabled');
    expect(html).toContain("Saved locally");
    expect(html).toContain("onsetDate");
    expect(html).toContain("No approved mission procedure");
    expect(html).toContain("nasa.gov");
    expect(html).not.toContain("diagnosis:");
  });
});

it("rejects timestamp-form onset and hides a same-profile draft with a different source", () => {
  const state = {
    ...emptyStore(),
    incidents: [{ ...note(), onsetDate: "2026-11-14T08:00:00Z" }],
  };
  expect(readStore({ getItem: () => JSON.stringify(state) }).error).toContain(
    "incident",
  );
  const draft = note();
  draft.owner.namespace = "another-source";
  expect(incidentSupportMarkup(p, [], draft)).not.toContain(
    'id="incident-analysis"',
  );
});
