import { describe, expect, it } from "vitest";
import type { Incident } from "../src/domain";
import {
  deriveIncidentIssueTypes,
  incidentSteps,
  retrieveIncidentReferences,
  screenIncident,
} from "../src/emergency";
import { renderIncidentResult } from "../src/incident-ui";

describe("incident refinement", () => {
  it("identifies literal regions and conservative positive synonyms", () => {
    const incident = screenIncident(
      "Acute pain in the right quadriceps with a swollen calf, pins and needles, and shortness of breath.",
      "2026-11-14T00:00:00.000Z",
    );

    expect(incident.region).toContain("quadriceps");
    expect(incident.region).toContain("calf");
    expect(incident.reportedSymptoms).toEqual([
      "sudden pain",
      "swelling",
      "numbness",
      "breathing difficulty",
    ]);
    expect(incident.escalationNotice).toBe(true);
    expect(deriveIncidentIssueTypes(incident)).toEqual([
      "Pain",
      "Swelling",
      "Numbness or tingling",
      "Breathing difficulty",
    ]);
  });

  it("handles literal negation without turning a no-match into safety", () => {
    const incident = screenIncident(
      "No chest pain, without swelling, and denies numbness. Not just sore: now has trouble breathing.",
    );

    expect(incident.reportedSymptoms).toEqual(["pain", "breathing difficulty"]);
    expect(incident.escalationNotice).toBe(true);
    expect(incident.noticeReasons.join(" ")).not.toContain("safe");

    const noMatch = screenIncident(
      "The report is unclear and no listed term is present.",
    );
    expect(noMatch.reportedSymptoms).toEqual([]);
    expect(noMatch.escalationNotice).toBe(false);
    expect(noMatch.noticeReasons.join(" ")).toContain(
      "NOT an assessment of safety",
    );
    expect(noMatch.noticeReasons.join(" ")).toContain(
      "does not rule out an emergency",
    );
  });

  it("keeps the original Incident shape and does not require issueTypes", () => {
    const incident: Incident = screenIncident("pain in the shoulder");
    expect(Object.keys(incident).sort()).toEqual([
      "createdAt",
      "description",
      "escalationNotice",
      "id",
      "nonOperational",
      "noticeReasons",
      "region",
      "reportedSymptoms",
    ]);
    expect("issueTypes" in incident).toBe(false);
    expect(incident.nonOperational).toBe(true);
  });

  it("uses the current curated governance date and safe public links", () => {
    const references = retrieveIncidentReferences(
      screenIncident("chest pressure"),
    );
    expect(references).toHaveLength(3);
    expect(
      references.every((reference) => reference.reviewed === "2026-11-14"),
    ).toBe(true);
    expect(references.some((reference) => reference.provider === "NASA")).toBe(
      true,
    );
    expect(
      references.every((reference) => /^https:\/\//.test(reference.url)),
    ).toBe(true);
    expect(
      references.every((reference) => !reference.url.startsWith("javascript:")),
    ).toBe(true);
    expect(
      references.find((reference) => reference.provider === "NASA")?.role,
    ).toContain("not an executable checklist");
  });

  it("renders both positive and no-match results with warnings, four steps, citations, and save action", () => {
    const positive = renderIncidentResult(
      screenIncident("<script>alert('x')</script> sudden pain in the ankle"),
    );
    const noMatch = renderIncidentResult(screenIncident("No listed term here"));

    for (const html of [positive, noMatch]) {
      expect(html).toContain("Mission medical checklist unavailable");
      expect(html).toContain(
        "does not provide diagnosis or treatment instructions",
      );
      expect(html).toContain("data-action='save-incident'");
      expect(html).toContain("Next steps");
      expect(
        (html.match(/<ol>[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) ?? []).length,
      ).toBe(4);
      expect(html).toContain("Open public source");
      expect(html).toContain("No approved mission procedure");
      expect(html).not.toContain("javascript:");
    }
    expect(positive).toContain(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;",
    );
    expect(positive).toContain("Notify medical authority");
    expect(positive).not.toContain("Strong potential escalation notice");
    expect(noMatch).toContain("No match cannot rule out an emergency");
    expect(noMatch).toContain("cannot rule out an emergency");
    expect(incidentSteps).toHaveLength(4);
  });
});

it("surfaces matched-term escalation without diagnosis or a medical severity score", () => {
  const incident = screenIncident("severe chest pain and trouble breathing");
  const html = renderIncidentResult(incident);
  expect(incident.escalationNotice).toBe(true);
  expect(html).toContain("Notify medical authority");
  expect(html).toContain("may warrant prompt attention");
  expect(html).toContain("not a medical assessment");
  expect(html).toContain(
    "No approved mission procedure is available in MuscleMap",
  );
  expect(html).not.toContain("Strong potential escalation notice");
});

it("uses verified NASA context only, not Earth emergency-service routing", () => {
  const refs = retrieveIncidentReferences(screenIncident("severe pain"));
  expect(
    refs.every(
      (r) =>
        r.provider === "NASA" && new URL(r.url).hostname === "www.nasa.gov",
    ),
  ).toBe(true);
  expect(refs.some((r) => r.url.includes("ochmo-tb-044"))).toBe(true);
});
