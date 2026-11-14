import { describe, expect, it } from "vitest";
import type { Observation } from "../src/domain";
import { alignFunction, reviewObservations } from "../src/engine";

const anatomy = (overrides: Partial<Observation> = {}): Observation => ({
  id: "a-1",
  participant: "p1",
  mode: "research",
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
  protocol: "p",
  site: "right thigh",
  quality: "valid",
  sourceId: "src",
  sourceRow: "1",
  namespace: "nasa:cft70",
  linkage: "verified",
  baseline: true,
  ...overrides,
});
const fn = (overrides: Partial<Observation> = {}): Observation => ({
  id: "f-1",
  participant: "p1",
  mode: "research",
  stream: "function",
  relatedRegion: "RIGHT_QUADRICEPS_GROUP",
  side: "right",
  day: 4,
  timepoint: "T4",
  phase: "test",
  value: 100,
  unit: "N",
  measurement: "strength",
  modality: "test",
  protocol: "fp",
  site: "knee extensors",
  quality: "valid",
  sourceId: "src",
  sourceRow: "1",
  namespace: "nasa:cft70",
  linkage: "verified",
  ...overrides,
});

describe("reviewObservations", () => {
  it("uses explicit baseline, true day ordering, isolates mode, and keeps stale latest visible", () => {
    const rows = [
      anatomy({
        id: "missing",
        day: 5,
        phase: "test",
        timepoint: "T5",
        value: null,
        quality: "missing",
      }),
      anatomy({
        id: "d-10",
        day: -10,
        phase: "test",
        timepoint: "T-10",
        value: 99,
        baseline: false,
      }),
      anatomy({ id: "d0", day: 0, value: 100, baseline: true }),
      anatomy({
        id: "d2",
        day: 2,
        phase: "test",
        timepoint: "T2",
        value: 98,
        baseline: false,
      }),
      anatomy({
        id: "d3",
        day: 3,
        phase: "test",
        timepoint: "T3",
        value: 97,
        baseline: false,
      }),
      anatomy({
        id: "future",
        day: 8,
        phase: "test",
        timepoint: "T8",
        value: 50,
        baseline: false,
      }),
      anatomy({
        id: "sim",
        mode: "simulated",
        day: 5,
        phase: "test",
        timepoint: "T5",
        value: 1,
        baseline: false,
      }),
    ];
    const review = reviewObservations(rows, {
      mode: "research",
      participant: "p1",
      region: "RIGHT_QUADRICEPS_GROUP",
      modality: "MRI",
      day: 5,
    });
    expect(review.baseline?.id).toBe("d0");
    expect(review.latest?.id).toBe("d3");
    expect(review.state).toBe("MEASUREMENT_MISSING");
    expect(review.futureCount).toBe(1);
    expect(review.excluded.some((row) => row.id === "future")).toBe(true);
    expect(review.rows.some((row) => row.id === "sim")).toBe(false);
  });

  it("does not use the first point as baseline, excludes incompatible streams, and guards zero baseline", () => {
    const rows = [
      anatomy({
        id: "first",
        day: -2,
        phase: "pre",
        timepoint: "T-2",
        value: 8,
        baseline: false,
      }),
      anatomy({ id: "zero", day: 0, value: 0, baseline: true }),
      anatomy({
        id: "bad-site",
        day: 1,
        phase: "test",
        timepoint: "T1",
        value: 7,
        site: "left thigh",
        baseline: false,
      }),
    ];
    const review = reviewObservations(rows, {
      mode: "research",
      participant: "p1",
      region: "RIGHT_QUADRICEPS_GROUP",
      modality: "MRI",
      day: 1,
    });
    expect(review.baseline?.id).toBe("zero");
    expect(review.change).toBeUndefined();
    expect(
      review.excluded.find((row) => row.id === "bad-site")?.reason,
    ).toMatch(/compatible/);
  });
});

describe("alignFunction", () => {
  it("aligns only verified same-namespace participant/mode related function within seven days", () => {
    const latest = anatomy({
      id: "latest",
      day: 10,
      baseline: false,
      phase: "test",
      timepoint: "T10",
    });
    expect(alignFunction([fn({ day: 12 })], latest, 14)).toMatchObject({
      status: "aligned",
      deltaDays: 2,
    });
    expect(
      alignFunction([fn({ id: "wrong", participant: "p2" })], latest, 14)
        .status,
    ).toBe("insufficient");
    expect(
      alignFunction(
        [fn({ id: "unverified", linkage: "unverified" })],
        latest,
        14,
      ).status,
    ).toBe("incompatible");
    expect(
      alignFunction([fn({ id: "late", day: 20 })], latest, 20).status,
    ).toBe("insufficient");
  });
});
