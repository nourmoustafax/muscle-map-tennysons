import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { reviewObservations } from "../src/engine";
import { validateObservation } from "../src/ingestion";
import type { Observation, Region } from "../src/domain";
const records = JSON.parse(
  readFileSync("public/data/research.json", "utf8"),
) as Observation[];
const manifest = JSON.parse(
  readFileSync("public/data/source-manifest.json", "utf8"),
);
const examples = JSON.parse(readFileSync("data/expected-results.json", "utf8"));
describe("actual CFT70 preparation and scientific reproduction", () => {
  it("preserves 1404 rows, 27 subjects and all ten original NA values", () => {
    expect(records).toHaveLength(1404);
    expect(new Set(records.map((r) => r.participant)).size).toBe(27);
    expect(records.filter((r) => r.value === null)).toHaveLength(10);
    expect(new Set(records.map((r) => r.id)).size).toBe(1404);
    for (const r of records)
      expect(validateObservation(r).error).toBeUndefined();
  });
  it("verifies all original download SHA-256 digests", () => {
    const labels = [
      "Ultrasound_Quadriceps",
      "Ultrasound_Medial_Gastrocnemius",
      "MRI_Quadriceps",
      "MRI_Medial_Gastrocnemius",
    ];
    labels.forEach((label, i) => {
      const bytes = readFileSync(
        `data/raw/BEDREST_IRATS_MRI_ULTRASOUND_CFT70_${label}.csv`,
      );
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        manifest[i].hash,
      );
    });
  });
  it("uses negative baseline and distinct post-bed-rest day, never fake calendar dates", () => {
    expect(records.find((r) => r.timepoint === "BR-6")?.day).toBe(-6);
    expect(records.find((r) => r.timepoint === "BR3")?.day).toBe(3);
    expect(records.find((r) => r.timepoint === "BR+3")?.day).toBe(73);
    expect(records.every((r) => r.acquiredAt === undefined)).toBe(true);
  });
  for (const e of examples)
    it(`reproduces original source-row result for ${e.participant} ${e.modality} ${e.region}`, () => {
      const r = reviewObservations(records, {
        mode: "research",
        participant: e.participant,
        region: e.region as Region,
        modality: e.modality,
        day: 69,
      });
      expect(r.baseline?.value).toBe(e.baseline);
      expect(r.latest?.value).toBe(e.latest);
      expect(r.baseline?.sourceRow).toBe(e.baselineId);
      expect(r.latest?.sourceRow).toBe(e.latestId);
      expect(r.change).toBeCloseTo(e.percentChange, 10);
    });
  it("retains missing recovery rows while aging last valid measurement", () => {
    const r = reviewObservations(records, {
      mode: "research",
      participant: "7036",
      region: "RIGHT_QUADRICEPS_GROUP",
      modality: "Panoramic ultrasound",
      day: 80,
    });
    expect(r.state).toBe("MEASUREMENT_MISSING");
    expect(r.latest?.timepoint).toBe("BR+3");
    expect(r.age).toBe(7);
  });
});
