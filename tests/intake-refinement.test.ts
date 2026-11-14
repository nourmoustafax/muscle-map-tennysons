import { describe, expect, it } from "vitest";
import type { Observation } from "../src/domain";
import { describeIntake } from "../src/intake";

const anatomy = (overrides: Partial<Observation> = {}): Observation => ({
  id: "a-1",
  participant: "p1",
  mode: "manual",
  stream: "anatomy",
  region: "RIGHT_QUADRICEPS_GROUP",
  side: "right",
  day: 0,
  timepoint: "T0",
  phase: "baseline",
  value: 10,
  unit: "cm²",
  measurement: "CSA",
  modality: "MRI",
  protocol: "local-protocol",
  site: "right thigh",
  quality: "valid",
  sourceId: "local-source",
  sourceRow: "1",
  namespace: "crew-local",
  linkage: "unverified",
  baseline: true,
  ...overrides,
});

const fn = (overrides: Partial<Observation> = {}): Observation => ({
  id: "f-1",
  participant: "p1",
  mode: "manual",
  stream: "function",
  relatedRegion: "RIGHT_QUADRICEPS_GROUP",
  side: "right",
  day: 4,
  timepoint: "T4",
  phase: "test",
  value: 100,
  unit: "N",
  measurement: "strength",
  modality: "functional test",
  protocol: "local-function",
  site: "knee extensors",
  quality: "valid",
  sourceId: "local-function-source",
  sourceRow: "2",
  namespace: "crew-local",
  linkage: "unverified",
  ...overrides,
});

describe("describeIntake", () => {
  it("reports canonical validation and scopes changes by participant, mode, source, region, and modality", () => {
    const incoming = anatomy({
      id: "new-thigh",
      day: 5,
      baseline: false,
      phase: "test",
      value: 12,
    });
    const unrelatedBefore = anatomy({
      id: "other-region",
      region: "RIGHT_MEDIAL_GASTROCNEMIUS",
      modality: "ultrasound",
    });
    const sameBefore = anatomy({ id: "old-thigh", day: 0 });
    const after = [sameBefore, unrelatedBefore, incoming];
    const result = describeIntake(
      [incoming],
      [sameBefore, unrelatedBefore],
      after,
    );
    const change = result.changes[0];

    expect(result.anatomyChanged).toBe(true);
    expect(result.followUpSuggested).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(change.key).toMatchObject({
      participant: "p1",
      mode: "manual",
      namespace: "crew-local",
      region: "RIGHT_QUADRICEPS_GROUP",
      modality: "MRI",
    });
    expect(change.beforeCount).toBe(1);
    expect(change.afterCount).toBe(2);
    expect(change.status).toBe("updated");
    expect(
      result.steps.find((step) => step.label === "Validate records")?.status,
    ).toBe("complete");
    expect(
      result.steps.find((step) => step.label === "Recommended follow-up")
        ?.detail,
    ).toMatch(/no follow-up was created automatically/i);
  });

  it("reports missing and pending quality honestly from canonical incoming records", () => {
    const missing = anatomy({
      id: "missing",
      value: null,
      quality: "missing",
      baseline: false,
      phase: "test",
    });
    const pending = anatomy({
      id: "pending",
      value: 11,
      quality: "check_comparability",
      baseline: false,
      phase: "test",
      modality: "ultrasound",
    });
    const result = describeIntake(
      [missing, pending],
      [anatomy()],
      [missing, pending],
    );
    const validation = result.steps.find(
      (step) => step.label === "Validate records",
    );
    expect(validation?.status).toBe("attention");
    expect(validation?.detail).toMatch(/1 missing value/);
    expect(validation?.detail).toMatch(/1 pending quality check/);
    expect(validation?.detail).toMatch(
      /verification provenance is not asserted/i,
    );
    expect(
      result.changes.every((change) => change.status === "attention"),
    ).toBe(true);
    expect(result.changes.map((change) => change.comparison)).toContain(
      "missing",
    );
    expect(result.changes.map((change) => change.comparison)).toContain(
      "check_comparability",
    );
    expect(result.followUpSuggested).toBe(true);
  });

  it("keeps function/activity-only intake contextual and leaves CSA unchanged", () => {
    const functionRow = fn({ id: "function-event" });
    const activity: Observation = {
      ...functionRow,
      id: "activity-event",
      stream: "activity",
      region: undefined,
      relatedRegion: "RIGHT_QUADRICEPS_GROUP",
      value: 45,
      unit: "W",
      measurement: "cycling power",
      modality: "exercise log",
      protocol: "local-activity",
      site: "cycle ergometer",
    };
    const result = describeIntake(
      [functionRow, activity],
      [],
      [functionRow, activity],
    );
    expect(result.anatomyChanged).toBe(false);
    expect(result.followUpSuggested).toBe(false);
    expect(result.title).toBe("Context evidence received");
    expect(result.summary).toMatch(/CSA remains unchanged/i);
    expect(result.summary).toMatch(/does not borrow a baseline/i);
    expect(
      result.changes.every((change) => change.comparison === "not_applicable"),
    ).toBe(true);
    expect(result.changes.map((change) => change.detail).join(" ")).toMatch(
      /CSA remains unchanged/i,
    );
  });

  it("does not let an existing record outside the exact destination affect the incoming change", () => {
    const incoming = anatomy({
      id: "incoming",
      namespace: "crew-local",
      modality: "MRI",
    });
    const differentParticipant = anatomy({
      id: "other-person",
      participant: "p2",
    });
    const differentMode = anatomy({ id: "other-mode", mode: "research" });
    const differentNamespace = anatomy({
      id: "other-source",
      namespace: "other-source",
    });
    const differentModality = anatomy({
      id: "other-modality",
      modality: "ultrasound",
    });
    const result = describeIntake(
      [incoming],
      [
        differentParticipant,
        differentMode,
        differentNamespace,
        differentModality,
      ],
      [incoming],
    );
    expect(result.changes[0].beforeCount).toBe(0);
    expect(result.changes[0].status).toBe("added");
  });
});

it("intake readiness rejects protocol-mismatched and zero-reference comparisons", () => {
  const baseline = anatomy({ id: "baseline" });
  const changed = anatomy({
    id: "changed",
    day: 5,
    phase: "test",
    baseline: false,
    protocol: "different protocol",
    value: 9,
  });
  expect(
    describeIntake([changed], [baseline], [baseline, changed]).changes[0]
      .comparison,
  ).toBe("check_comparability");
  const zero = anatomy({ id: "zero", value: 0 });
  const current = anatomy({
    id: "current",
    day: 5,
    phase: "test",
    baseline: false,
    value: 9,
  });
  expect(
    describeIntake([current], [zero], [zero, current]).changes[0].comparison,
  ).toBe("check_comparability");
});

it("intake readiness requires the actual personal reference, not a valid unmarked record", () => {
  const current = anatomy({
    id: "current-no-baseline",
    day: 5,
    baseline: false,
    phase: "test",
  });
  const result = describeIntake([current], [], [current]);
  expect(result.changes[0].comparison).toBe("missing");
  expect(
    result.steps.find((step) => step.label === "Check comparison readiness")
      ?.status,
  ).toBe("attention");
  expect(
    result.steps.find((step) => step.label === "Check comparison readiness")
      ?.detail,
  ).toContain("baseline");
});
