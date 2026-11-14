import { describe, expect, it } from "vitest";
import type { Observation } from "../src/domain";
import type { MeasurementInput, Profile } from "../src/personal-types";
import { buildMeasurement, parsePersonalImport, personalImportTemplate } from "../src/measurement-input";
import { todayDate } from "../src/personal-review";

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "p-1",
  name: "Personal",
  mode: "manual",
  participant: "person-1",
  namespace: "personal:person-1",
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const input = (overrides: Partial<MeasurementInput> = {}): MeasurementInput => ({
  date: todayDate(),
  region: "RIGHT_QUADRICEPS_GROUP",
  type: "CSA",
  method: "MRI",
  value: "100",
  unit: "cm²",
  protocol: "protocol-1",
  note: "Recorded result",
  confirmed: true,
  ...overrides,
});

describe("personal measurement input", () => {
  it("builds a canonical personal CSA row with profile context and day precision", () => {
    const result = buildMeasurement(profile(), input(), []);
    expect(result.error).toBeUndefined();
    expect(result.duplicateIds).toEqual([]);
    expect(result.row).toMatchObject({
      participant: "person-1",
      mode: "manual",
      namespace: "personal:person-1",
      stream: "anatomy",
      measurement: "CSA",
      unit: "cm²",
      value: 100,
      quality: "valid",
      sourceId: "USER-ENTRY",
      timepoint: todayDate(),
    });
    expect(result.row?.acquiredAt).toBeUndefined();
  });

  it("accepts function units and keeps unconfirmed measurements pending comparison", () => {
    const result = buildMeasurement(profile(), input({ type: "function", method: "Dynamometer", value: "42", unit: "N", confirmed: false }), []);
    expect(result.error).toBeUndefined();
    expect(result.row).toMatchObject({ stream: "function", relatedRegion: "RIGHT_QUADRICEPS_GROUP", unit: "N", quality: "check_comparability" });
    expect(result.row?.measurement).toMatch(/Functional result/);
  });

  it("stores symptoms as regional self-report nulls and never as numeric triage evidence", () => {
    const result = buildMeasurement(profile(), input({ type: "symptom", method: "self report", value: "", unit: "", note: "Reported soreness after assessment" }), []);
    expect(result.error).toBeUndefined();
    expect(result.row).toMatchObject({ stream: "symptom", relatedRegion: "RIGHT_QUADRICEPS_GROUP", value: null, unit: "", quality: "valid" });
    expect(result.row?.note).toBe("Reported soreness after assessment");
  });

  it("rejects research profiles, unsupported regions, future personal dates, NASA source IDs, and numeric missingness", () => {
    expect(buildMeasurement(profile({ mode: "research" }), input(), [])).toMatchObject({ error: expect.stringMatching(/research/) });
    expect(buildMeasurement(profile(), input({ region: "LEFT_CALF" as never }), [])).toMatchObject({ error: expect.stringMatching(/supported/) });
    const tomorrowOrdinal = new Date(`${todayDate()}T00:00:00Z`).getTime() / 86400000 + 1;
    const tomorrow = new Date(tomorrowOrdinal * 86400000).toISOString().slice(0, 10);
    expect(buildMeasurement(profile(), input({ date: tomorrow }), [])).toMatchObject({ error: expect.stringMatching(/future/) });
    expect(buildMeasurement(profile(), input({ sourceId: "NASA-CFT70" }), [])).toMatchObject({ error: expect.stringMatching(/NASA/) });
    expect(buildMeasurement(profile(), input({ missing: true, value: "0" }), [])).toMatchObject({ error: expect.stringMatching(/missing/) });
  });

  it("detects exact potential duplicates across different generated source IDs", () => {
    const first = buildMeasurement(profile(), input({ sourceId: "USER-ENTRY", sourceRow: "first" }), []);
    expect(first.row).toBeDefined();
    const second = buildMeasurement(profile(), input({ sourceId: "OTHER-ENTRY", sourceRow: "second" }), [first.row!]);
    expect(second.row).toBeUndefined();
    expect(second.duplicateIds).toEqual([first.row!.id]);
    const confirmed = buildMeasurement(profile(), input({ sourceId: "OTHER-ENTRY", sourceRow: "third", duplicateConfirmed: true }), [first.row!]);
    expect(confirmed.error).toBeUndefined();
    expect(confirmed.row?.sourceRow).toBe("third");
  });

  it("does not match exact duplicates from another profile context and preserves supplied import provenance", () => {
    const first = buildMeasurement(profile(), input({ sourceRow: "source-1" }), []).row!;
    const otherContext = { ...first, id: "other-context", namespace: "other-namespace" };
    const result = buildMeasurement(profile(), input(), [otherContext]);
    expect(result.error).toBeUndefined();
    expect(result.duplicateIds).toEqual([]);

    const imported = parsePersonalImport(
      JSON.stringify([
        {
          date: todayDate(),
          region: "RIGHT_QUADRICEPS_GROUP",
          type: "CSA",
          method: "MRI",
          device: "scanner-7",
          value: 12,
          unit: "cm2",
          protocol: "protocol-1",
          note: "Imported result",
          confirmed: true,
          sourceId: "vendor-file-sha256",
          sourceRow: "row-77",
        },
      ]),
      "json",
      profile(),
      [],
      "measurements.json",
    );
    expect(imported.errors).toEqual([]);
    expect(imported.rows[0]).toMatchObject({
      sourceId: "vendor-file-sha256",
      sourceRow: "row-77",
      note: "Equipment identifier: scanner-7\nImported result",
    });
  });

  it("rejects duplicate source rows atomically in simplified imports", () => {
    const result = parsePersonalImport(
      JSON.stringify([
        { ...input(), sourceRow: "same-row" },
        { ...input({ value: "101" }), sourceRow: "same-row" },
      ]),
      "json",
      profile(),
      [],
      "measurements.json",
    );
    expect(result.rows).toEqual([]);
    expect(result.errors.join(" ")).toMatch(/duplicate source-row/i);
  });

  it("preserves immutable identity and imported provenance on edit", () => {
    const original = buildMeasurement(profile(), input({ sourceId: "IMPORT-device", sourceRow: "original" }), []).row!;
    const stored: Observation = { ...original, importedAt: "2026-01-02T03:04:05.000Z", note: "Original note" };
    const edited = buildMeasurement(profile(), input({ value: "101", note: "Corrected note", sourceId: "OTHER", sourceRow: "new-row" }), [stored], stored);
    expect(edited.error).toBeUndefined();
    expect(edited.row).toMatchObject({ id: stored.id, sourceId: stored.sourceId, sourceRow: stored.sourceRow, importedAt: stored.importedAt, value: 101, note: "Corrected note" });
    expect(edited.row?.participant).toBe(stored.participant);
    expect(buildMeasurement(profile({ participant: "other" }), input(), [], stored).error).toMatch(/context/);
  });

  it("imports simplified JSON atomically, preserves filename/source rows, and rejects declared foreign context before mapping", () => {
    const p = profile();
    const json = JSON.stringify({ personalMeasurementInput: [
      { date: todayDate(), region: "RIGHT_QUADRICEPS_GROUP", type: "CSA", method: "MRI", value: 0, unit: "cm2", protocol: "protocol-1", note: "Zero is a real numeric value", confirmed: true, participant: "person-1" },
      { date: todayDate(), region: "RIGHT_MEDIAL_GASTROCNEMIUS", type: "CSA", method: "MRI", value: 12, unit: "cm2", protocol: "protocol-1", note: "Second row", confirmed: true, participant: "other-person" },
    ] });
    const rejected = parsePersonalImport(json, "json", p, [], "personal-results.json");
    expect(rejected.rows).toEqual([]);
    expect(rejected.errors.join(" ")).toMatch(/participant/);

    const accepted = parsePersonalImport(JSON.stringify([{ date: todayDate(), region: "RIGHT_QUADRICEPS_GROUP", type: "CSA", method: "MRI", value: 0, unit: "cm2", protocol: "protocol-1", note: "Zero is a real numeric value", confirmed: true }]), "json", p, [], "personal-results.json");
    expect(accepted.errors).toEqual([]);
    expect(accepted.rows).toHaveLength(1);
    expect(accepted.rows[0]).toMatchObject({ sourceId: "IMPORT-personal-results", sourceRow: "1", value: 0 });
  });

  it("imports CSV with original row numbering and exposes an empty non-seeded template", () => {
    const csv = [
      "date,region,type,method,value,unit,protocol,note",
      `${todayDate()},RIGHT_QUADRICEPS_GROUP,CSA,MRI,12,cm2,protocol-1,CSV result`,
    ].join("\n");
    const result = parsePersonalImport(csv, "csv", profile(), [], "measurements.csv");
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ sourceId: "IMPORT-measurements", sourceRow: "1", value: 12 });
    const template = personalImportTemplate(profile()) as { personalMeasurementInput: unknown[]; placeholderExample: { placeholder: boolean; value: string } };
    expect(template.personalMeasurementInput).toEqual([]);
    expect(template.placeholderExample.placeholder).toBe(true);
    expect(template.placeholderExample.value).toMatch(/placeholder/);
  });
});
