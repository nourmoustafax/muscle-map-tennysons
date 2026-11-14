import { personalChart } from "../src/personal-ui";
import { describe, it, expect, vi } from "vitest";
import type { Observation } from "../src/domain";
import type { Profile, MeasurementInput } from "../src/personal-types";
import { buildMeasurement } from "../src/measurement-input";
import { reviewForProfile } from "../src/personal-review";
import {
  readPersonalState,
  validatePersonalState,
} from "../src/personal-state";
import { emptyStore } from "../src/store";
const p: Profile = {
  id: "p",
  name: "Software test profile",
  mode: "manual",
  participant: "test-person",
  namespace: "personal:test",
  createdAt: "2026-01-01T00:00:00Z",
};
const obs = (extra: Partial<Observation> = {}): Observation => ({
  id: "r",
  participant: p.participant,
  namespace: p.namespace,
  mode: "manual",
  stream: "anatomy",
  region: "RIGHT_QUADRICEPS_GROUP",
  side: "right",
  day: 3,
  timepoint: "2026-01-03",
  phase: "baseline",
  value: 50,
  unit: "cm²",
  measurement: "CSA",
  modality: "Ultrasound",
  protocol: "provided-protocol",
  site: "provider-defined site",
  quality: "valid",
  sourceId: "test-provider",
  sourceRow: "original-1",
  linkage: "verified",
  baseline: true,
  ...extra,
});
const input: MeasurementInput = {
  date: "2026-01-03",
  region: "RIGHT_QUADRICEPS_GROUP",
  type: "CSA",
  method: "Ultrasound",
  value: "51",
  unit: "cm²",
  protocol: "provided-protocol",
  note: "",
  confirmed: true,
};
describe("personal provenance and state reliability", () => {
  it("preserves a supplied exact acquisition time, site, original phase, row and reference marker during value correction", () => {
    const old = obs({
      acquiredAt: "2026-01-03T13:24:00Z",
      timepoint: "Original report label",
      phase: "original-phase",
    });
    const result = buildMeasurement(p, input, [old], old);
    expect(result.error).toBeUndefined();
    expect(result.row?.acquiredAt).toBe(old.acquiredAt);
    expect(result.row?.site).toBe(old.site);
    expect(result.row?.phase).toBe(old.phase);
    expect(result.row?.timepoint).toBe(old.timepoint);
    expect(result.row?.sourceRow).toBe(old.sourceRow);
    expect(result.row?.baseline).toBe(true);
    expect(old.value).toBe(50);
  });
  it("does not invent an exact acquisition time when the user corrects only the examination date", () => {
    const old = obs({ acquiredAt: "2026-01-03T13:24:00Z" });
    const result = buildMeasurement(
      p,
      { ...input, date: "2026-01-04" },
      [old],
      old,
    );
    expect(result.error).toBeUndefined();
    expect(result.row?.acquiredAt).toBeUndefined();
    expect(result.row?.timepoint).toBe("2026-01-04");
    expect(old.acquiredAt).toBe("2026-01-03T13:24:00Z");
  });
  it("keeps an undated reference but does not infer its chronological eligibility or a baseline percentage", () => {
    const base = obs({ id: "undated", timepoint: "RAW-DAY-3" });
    const current = obs({
      id: "current",
      timepoint: "2026-01-04",
      value: 55,
      sourceRow: "original-2",
      baseline: false,
    });
    const result = reviewForProfile(
      [base, current],
      p,
      "RIGHT_QUADRICEPS_GROUP",
      "Ultrasound",
      "undated",
      { date: "2026-01-04" },
    );
    expect(result.latest?.id).toBe("current");
    expect(result.change).toBeUndefined();
    expect(result.baseline).toBeUndefined();
    expect(result.dateMissing[0].id).toBe("undated");
    expect(result.review.rows).toHaveLength(1);
    expect(result.reasons.join(" ")).toContain("baseline date is not supplied");
  });
  it("retains a later missing event and ages the last numeric observation instead of creating zero", () => {
    const base = obs();
    const missing = obs({
      id: "missing",
      timepoint: "2026-01-04",
      value: null,
      quality: "missing",
      sourceRow: "original-2",
      baseline: false,
    });
    const result = reviewForProfile(
      [base, missing],
      p,
      "RIGHT_QUADRICEPS_GROUP",
      "Ultrasound",
      "r",
      { date: "2026-01-04" },
    );
    expect(result.latest?.id).toBe("r");
    expect(result.ageDays).toBe(1);
    expect(result.review.state).toBe("MEASUREMENT_MISSING");
    expect(
      result.review.rows.find((r) => r.id === "missing")?.value,
    ).toBeNull();
  });
  it("serializes the last personal context and rejects a non-personal last-person pointer", () => {
    const state = readPersonalState(
      { getItem: () => null },
      emptyStore(),
    ).state;
    const manual = state.profiles.find((p) => p.mode === "manual")!;
    const valid = validatePersonalState({
      ...state,
      lastPersonalProfileId: manual.id,
    });
    expect(valid.state?.lastPersonalProfileId).toBe(manual.id);
    const demo = state.profiles.find((p) => p.mode === "simulated")!;
    expect(
      validatePersonalState({ ...state, lastPersonalProfileId: demo.id }).error,
    ).toBeTruthy();
  });
});

it("renders mobile plot labels at native viewport width without dropping observed points", () => {
  vi.stubGlobal("window", { innerWidth: 390 });
  try {
    const a = obs({ id: "a" }),
      b = obs({
        id: "b",
        timepoint: "2026-01-04",
        value: 52,
        sourceRow: "2",
        baseline: false,
      });
    const review = reviewForProfile(
      [a, b],
      p,
      "RIGHT_QUADRICEPS_GROUP",
      "Ultrasound",
      "a",
      { date: "2026-01-04" },
    );
    const svg = personalChart(review, p, "Ultrasound");
    expect(svg).toContain(`viewBox="0 0 ${390 - 32} 218"`);
    expect((svg.match(/<circle /g) || []).length).toBe(2);
  } finally {
    vi.unstubAllGlobals();
  }
});
