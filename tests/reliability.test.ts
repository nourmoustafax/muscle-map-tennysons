import { describe, it, expect } from "vitest";
import { reviewObservations, alignFunction } from "../src/engine";
import { parseImport, validateObservation } from "../src/ingestion";
import { readFileSync } from "node:fs";
import type { Observation } from "../src/domain";
const rows = JSON.parse(
  readFileSync("public/data/simulated.json", "utf8"),
) as Observation[];
const seed = rows[0];
describe("release integrity and isolation regressions", () => {
  it("explicit namespace prevents another imported source changing a NASA review", () => {
    const a = {
      ...seed,
      id: "a",
      mode: "research" as const,
      participant: "P1",
      namespace: "nasa-original",
      baseline: true,
      value: 10,
    };
    const b = {
      ...a,
      id: "b",
      day: 3,
      baseline: false,
      phase: "test",
      value: 9,
    };
    const poisoned = {
      ...b,
      id: "unrelated",
      namespace: "import-other",
      day: 100,
      value: null,
      quality: "missing" as const,
    };
    const r = reviewObservations([a, b, poisoned], {
      mode: "research",
      participant: "P1",
      namespace: "nasa-original",
      region: "RIGHT_QUADRICEPS_GROUP",
      modality: seed.modality,
      day: 100,
    });
    expect(r.latest?.id).toBe("b");
    expect(r.state).toBe("BELOW_BASELINE");
    expect(r.change).toBe(-10);
  });
  it("does not retain an old repeated decrease after the latest observed increase", () => {
    const points = [10, 9, 8, 11].map((value, day) => ({
      ...seed,
      id: `p-${day}`,
      day,
      value,
      baseline: day === 0,
      phase: day === 0 ? "baseline" : "test",
    }));
    const r = reviewObservations(points, {
      mode: "simulated",
      participant: seed.participant,
      region: "RIGHT_QUADRICEPS_GROUP",
      modality: seed.modality,
      day: 3,
    });
    expect(r.state).toBe("NO_DECREASE_FLAG");
  });
  it("rejects incorrect anatomical laterality and unsupported direct measurement names", () => {
    expect(validateObservation({ ...seed, side: "left" }).error).toContain(
      "right",
    );
    expect(
      validateObservation({ ...seed, measurement: "Cycling power" }).error,
    ).toContain("CSA only");
  });
  it("unrelated simulated functional records do not create a NASA incompatibility state", () => {
    const nasa = {
      ...seed,
      mode: "research" as const,
      participant: "7326",
      namespace: "nasa-original",
    };
    expect(alignFunction(rows, nasa, 69).status).toBe("insufficient");
  });
  it("research import cannot self-authorize NASA provenance or modify its namespace", () => {
    const result = parseImport(
      JSON.stringify([
        { ...seed, mode: "research", namespace: "nasa-cft70-anatomy" },
      ]),
      "json",
      [],
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0].namespace).toBe("imported-nasa-cft70-anatomy");
    expect(result.rows[0].linkage).toBe("unverified");
    expect(result.rows[0].quality).toBe("check_comparability");
  });
  it("preserves a symptom as reported text rather than zero-valued numeric evidence", () => {
    const symptom = {
      ...seed,
      stream: "symptom",
      region: undefined,
      side: "bilateral",
      measurement: "Reported symptom",
      value: null,
      unit: "",
      note: "Reported calf discomfort.",
    };
    const r = validateObservation(symptom);
    expect(r.error).toBeUndefined();
    expect(r.row?.value).toBeNull();
    expect(validateObservation({ ...symptom, value: 0 }).error).toContain(
      "reported text",
    );
  });
  it("rejects malformed CSV quotes atomically", () => {
    expect(
      parseImport('id,participant\n"broken,value', "csv", []).errors.length,
    ).toBeGreaterThan(0);
  });
});

it("all seventeen simulated records obey the same source schema", () => {
  expect(rows).toHaveLength(17);
  for (const row of rows)
    expect(validateObservation(row).error).toBeUndefined();
});

it("without an explicit baseline retains latest evidence but never anchors a comparable trend", () => {
  const records = [
    { ...seed, id: "nobase-1", baseline: false, phase: "test", value: 50 },
    {
      ...seed,
      id: "nobase-2",
      sourceRow: "other",
      day: 5,
      baseline: false,
      phase: "test",
      value: 45,
    },
  ];
  const r = reviewObservations(records, {
    mode: seed.mode,
    participant: seed.participant,
    region: "RIGHT_QUADRICEPS_GROUP",
    modality: seed.modality,
    day: 5,
  });
  expect(r.baseline).toBeUndefined();
  expect(r.comparable).toHaveLength(0);
  expect(r.latest?.value).toBe(45);
  expect(r.change).toBeUndefined();
  expect(r.state).toBe("BASELINE_MISSING");
});
it("a changed observation id cannot duplicate an already stored source-row measurement", () => {
  const copy = { ...seed, id: "new-id-same-source" };
  expect(
    parseImport(JSON.stringify([copy]), "json", [seed]).errors.join(" "),
  ).toContain("duplicate source-row");
  expect(
    parseImport(JSON.stringify([seed, copy]), "json", []).errors.join(" "),
  ).toContain("duplicate source-row");
});
it("contradictory missing numeric values are never silently discarded", () => {
  expect(
    validateObservation({ ...seed, quality: "missing", value: 12 }).error,
  ).toContain("cannot be silently discarded");
});
