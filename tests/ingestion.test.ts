import { describe, expect, it } from "vitest";
import { parseImport, validateObservation } from "../src/ingestion";

const valid = (overrides: Record<string, unknown> = {}) => ({
  id: "obs-1",
  participant: "p1",
  mode: "manual",
  stream: "anatomy",
  region: "RIGHT_QUADRICEPS_GROUP",
  side: "right",
  day: 0,
  timepoint: "T0",
  phase: "baseline",
  value: 12,
  unit: "cm2",
  measurement: "CSA",
  modality: "MRI",
  protocol: "protocol-1",
  site: "right thigh",
  quality: "valid",
  sourceId: "source-1",
  sourceRow: "row-1",
  namespace: "local:demo",
  linkage: "verified",
  baseline: true,
  ...overrides,
});

const headers = [
  "id",
  "participant",
  "mode",
  "stream",
  "region",
  "relatedRegion",
  "side",
  "day",
  "timepoint",
  "phase",
  "acquiredAt",
  "value",
  "unit",
  "measurement",
  "modality",
  "protocol",
  "site",
  "quality",
  "sourceId",
  "sourceRow",
  "namespace",
  "linkage",
  "baseline",
  "note",
  "importedAt",
];

describe("validateObservation", () => {
  it("normalizes CSA units, preserves explicit missing nulls and rejects contradictory numeric missing rows", () => {
    expect(validateObservation(valid()).row?.unit).toBe("cm²");
    const result = validateObservation(
      valid({ id: "missing", quality: "missing", value: null }),
    );
    expect(result.row?.value).toBeNull();
    expect(
      validateObservation(valid({ quality: "missing", value: 17 })).error,
    ).toContain("cannot be silently discarded");
  });

  it("rejects invalid ids, negative values, empty numerics, unsupported units, and timezone-less dates", () => {
    expect(validateObservation(valid({ id: "bad id" })).error).toMatch(/id/);
    expect(validateObservation(valid({ value: -1 })).error).toMatch(/negative/);
    expect(validateObservation(valid({ value: "" })).error).toMatch(
      /empty|required/,
    );
    expect(validateObservation(valid({ unit: "kg" })).error).toMatch(/cm²/);
    expect(
      validateObservation(valid({ acquiredAt: "2026-01-01T12:00:00" })).error,
    ).toMatch(/timezone/);
  });
});

describe("parseImport", () => {
  it("parses quoted CSV fields and applies research provenance/comparability defaults", () => {
    const values = headers.map(
      (header) =>
        (
          ({
            id: "csv-1",
            participant: "p1",
            mode: "research",
            stream: "anatomy",
            region: "RIGHT_QUADRICEPS_GROUP",
            relatedRegion: "",
            side: "right",
            day: "0",
            timepoint: "T0",
            phase: "baseline",
            acquiredAt: "2026-01-01T12:00:00Z",
            value: "12",
            unit: "cm2",
            measurement: "CSA",
            modality: "MRI, research",
            protocol: "protocol-1",
            site: "right thigh, source-defined",
            quality: "valid",
            sourceId: "source-1",
            sourceRow: "row-1",
            namespace: "external:study",
            linkage: "verified",
            baseline: "true",
            note: "quoted, preserved",
            importedAt: "",
          }) as Record<string, string>
        )[header],
    );
    const csv = `${headers.join(",")}\n${values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")}\n`;
    const result = parseImport(csv, "csv", []);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      modality: "MRI, research",
      site: "right thigh, source-defined",
      quality: "check_comparability",
      linkage: "unverified",
      sourceRow: "row-1",
    });
    expect(result.rows[0].note).toMatch(/reported as valid/);
  });

  it("is atomic when a batch has an invalid row or duplicate existing id", () => {
    const good = JSON.stringify([
      valid({ id: "one" }),
      valid({
        id: "two",
        sourceRow: "row-2",
        day: 1,
        baseline: false,
        phase: "test",
        timepoint: "T1",
      }),
    ]);
    const bad = parseImport(
      JSON.stringify([
        valid({ id: "one" }),
        valid({ id: "bad", value: "not-number" }),
      ]),
      "json",
      [],
    );
    expect(bad.rows).toEqual([]);
    expect(bad.errors.length).toBeGreaterThan(0);
    const duplicate = parseImport(good, "json", [
      validateObservation(valid({ id: "one" })).row!,
    ]);
    expect(duplicate.rows).toEqual([]);
    expect(duplicate.errors.join(" ")).toMatch(/already exists/);
  });
});
