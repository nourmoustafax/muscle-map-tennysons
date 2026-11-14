import { describe, it, expect } from "vitest";
import { screenIncident, incidentSteps } from "../src/emergency";
import { chart, esc } from "../src/ui";
import { reviewObservations } from "../src/engine";
import { readFileSync } from "node:fs";
import type { Observation } from "../src/domain";
const demo = JSON.parse(
  readFileSync("public/data/simulated.json", "utf8"),
) as Observation[];
describe("readable data presentation and secondary safety boundaries", () => {
  it("escapes untrusted notes and labels", () => {
    expect(esc("<script>")).toBe("&lt;script&gt;");
  });
  it("does not connect valid points across a missing assessment", () => {
    const r = reviewObservations(demo, {
      mode: "simulated",
      participant: "DEMO-01",
      region: "RIGHT_QUADRICEPS_GROUP",
      modality: "Panoramic ultrasound",
      day: 69,
    });
    const svg = chart(r);
    expect(svg).toContain("missing");
    expect((svg.match(/class="trend-line"/g) || []).length).toBe(2);
  });
  it("preserves reported facts without diagnosing and handles simple negation", () => {
    const positive = screenIncident(
      "sudden pain in calf, swelling and numbness",
    );
    expect(positive.escalationNotice).toBe(true);
    expect(positive.region).toBe("calf");
    expect(positive.nonOperational).toBe(true);
    const negative = screenIncident("no chest pain, no swelling");
    expect(negative.escalationNotice).toBe(false);
    expect(negative.noticeReasons.join(" ")).toContain("NOT");
    expect(
      screenIncident("Not sure what happened").noticeReasons.join(" "),
    ).toContain("does not rule out");
  });
  it("contains no treatment dosing or disease classifier", () => {
    expect(incidentSteps.join(" ")).toContain("no approved flight procedure");
    expect(screenIncident("chest pain").reportedSymptoms).toEqual([
      "chest pain",
    ]);
  });
});
