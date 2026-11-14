import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Observation } from "../src/domain";
import { buildOverview, functionContext } from "../src/overview";

const research = JSON.parse(
  readFileSync(
    new URL("../public/data/research.json", import.meta.url),
    "utf8",
  ),
) as Observation[];

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
  protocol: "anatomy-protocol",
  site: "right thigh",
  quality: "valid",
  sourceId: "anatomy-source",
  sourceRow: "1",
  namespace: "local-research",
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
  day: 5,
  timepoint: "T5",
  phase: "test",
  value: 125,
  unit: "N",
  measurement: "strength",
  modality: "isometric test",
  protocol: "function-protocol",
  site: "knee extensors",
  quality: "valid",
  sourceId: "function-source",
  sourceRow: "2",
  namespace: "local-research",
  linkage: "verified",
  ...overrides,
});

describe("buildOverview", () => {
  it("shows the exact NASA D69 responses and focuses the calf without changing selection", () => {
    const overview = buildOverview(research, {
      mode: "research",
      participant: "7326",
      namespace: "nasa-cft70-anatomy",
      modality: "Panoramic ultrasound",
      day: 69,
    });
    const thigh = overview.regions.find(
      (item) => item.region === "RIGHT_QUADRICEPS_GROUP",
    );
    const calf = overview.regions.find(
      (item) => item.region === "RIGHT_MEDIAL_GASTROCNEMIUS",
    );
    expect(thigh?.review.change).toBeCloseTo(4.0459008636, 8);
    expect(calf?.review.change).toBeCloseTo(-12.4910778016, 8);
    expect(thigh?.comparison).toBe("higher");
    expect(calf?.comparison).toBe("lower");
    expect(overview.focusRegion).toBe("RIGHT_MEDIAL_GASTROCNEMIUS");
    expect(overview.regions).toHaveLength(2);
    expect(overview.summary).toMatch(/quadriceps/i);
    expect(overview.summary).toMatch(/calf/i);
    expect(overview.regions.map((item) => item.label).join(" ")).not.toMatch(
      /no decrease flag|review cursor|source namespace/i,
    );
  });

  it("keeps source mode and namespace isolated and does not invent a baseline", () => {
    const rows = [
      anatomy({ id: "nasa", namespace: "nasa", value: 12 }),
      anatomy({
        id: "manual-current",
        mode: "manual",
        namespace: "crew-notes",
        baseline: false,
        phase: "test",
        day: 5,
        value: 14,
      }),
    ];
    const overview = buildOverview(rows, {
      mode: "manual",
      participant: "p1",
      namespace: "crew-notes",
      modality: "MRI",
      day: 5,
    });
    const thigh = overview.regions.find(
      (item) => item.region === "RIGHT_QUADRICEPS_GROUP",
    );
    expect(thigh?.comparison).toBe("unknown");
    expect(thigh?.review.baseline).toBeUndefined();
    expect(thigh?.summary).not.toMatch(/%/);
    expect(thigh?.missing.join(" ")).toMatch(/baseline/i);
  });

  it("lets missing latest and incompatible positive rows override a reassuring change", () => {
    const missing = buildOverview(
      [
        anatomy({ id: "b", value: 10 }),
        anatomy({
          id: "missing",
          day: 5,
          phase: "test",
          baseline: false,
          value: null,
          quality: "missing",
        }),
      ],
      {
        mode: "research",
        participant: "p1",
        namespace: "local-research",
        modality: "MRI",
        day: 5,
      },
    ).regions.find((item) => item.region === "RIGHT_QUADRICEPS_GROUP");
    expect(missing?.review.change).toBe(0);
    expect(missing?.review.state).toBe("MEASUREMENT_MISSING");
    expect(missing?.comparison).toBe("unknown");
    expect(missing?.missing.join(" ")).toMatch(/latest.*missing/i);

    const incompatible = buildOverview(
      [
        anatomy({ id: "b", value: 10 }),
        anatomy({
          id: "positive-but-wrong-site",
          day: 5,
          phase: "test",
          baseline: false,
          value: 12,
          site: "different site",
        }),
      ],
      {
        mode: "research",
        participant: "p1",
        namespace: "local-research",
        modality: "MRI",
        day: 5,
      },
    ).regions.find((item) => item.region === "RIGHT_QUADRICEPS_GROUP");
    expect(incompatible?.review.state).toBe("CHECK_COMPARABILITY");
    expect(incompatible?.comparison).toBe("unknown");
    expect(incompatible?.summary).not.toMatch(/12\.0%/);
  });

  it("does not calculate a percentage from a zero baseline", () => {
    const overview = buildOverview(
      [
        anatomy({ value: 0 }),
        anatomy({
          id: "current",
          day: 5,
          baseline: false,
          phase: "test",
          value: 2,
        }),
      ],
      {
        mode: "research",
        participant: "p1",
        namespace: "local-research",
        modality: "MRI",
        day: 5,
      },
    );
    const thigh = overview.regions.find(
      (item) => item.region === "RIGHT_QUADRICEPS_GROUP",
    );
    expect(thigh?.comparison).toBe("unknown");
    expect(thigh?.review.change).toBeUndefined();
    expect(thigh?.summary).not.toMatch(/%/);
  });
});

describe("functionContext", () => {
  it("requires an explicit matching verified function baseline", () => {
    const latestAnatomy = anatomy({
      id: "latest-anatomy",
      day: 5,
      baseline: false,
      phase: "test",
    });
    const result = functionContext(
      [
        latestAnatomy,
        fn({
          id: "function-baseline",
          day: 0,
          value: 100,
          baseline: true,
          phase: "baseline",
        }),
        fn({ id: "function-latest", day: 5, value: 125, baseline: false }),
      ],
      latestAnatomy,
      5,
    );
    expect(result.alignment.status).toBe("aligned");
    expect(result.baseline?.id).toBe("function-baseline");
    expect(result.change).toBe(25);
    expect(result.summary).toMatch(/contextual evidence/i);
  });

  it("rejects unverified, cross-source, mismatched-unit/site, and zero-baseline function comparisons", () => {
    const latestAnatomy = anatomy({
      id: "latest-anatomy",
      day: 5,
      baseline: false,
      phase: "test",
    });
    const unverified = functionContext(
      [latestAnatomy, fn({ linkage: "unverified" })],
      latestAnatomy,
      5,
    );
    expect(unverified.alignment.status).toBe("incompatible");
    expect(unverified.change).toBeUndefined();
    expect(unverified.limits.join(" ")).toMatch(/unverified/i);

    const mismatch = functionContext(
      [
        latestAnatomy,
        fn({ id: "base", day: 0, value: 0, baseline: true, phase: "baseline" }),
        fn({
          id: "latest",
          day: 5,
          site: "different site",
          value: 10,
          baseline: false,
        }),
      ],
      latestAnatomy,
      5,
    );
    expect(mismatch.alignment.status).toBe("aligned");
    expect(mismatch.baseline).toBeUndefined();
    expect(mismatch.change).toBeUndefined();
    expect(mismatch.limits.join(" ")).toMatch(/site|source|compared/i);

    const zero = functionContext(
      [
        latestAnatomy,
        fn({
          id: "zero-base",
          day: 0,
          value: 0,
          baseline: true,
          phase: "baseline",
        }),
        fn({ id: "zero-latest", day: 5, value: 5, baseline: false }),
      ],
      latestAnatomy,
      5,
    );
    expect(zero.baseline?.id).toBe("zero-base");
    expect(zero.change).toBeUndefined();
    expect(zero.limits.join(" ")).toMatch(/zero/i);
  });
});

it("performance outside the seven-day anatomy window stays unavailable", () => {
  const latest = anatomy({ day: 35, baseline: false, phase: "test" });
  const stale = fn({ day: 0, baseline: true, phase: "baseline" });
  const result = functionContext([stale], latest, 52);
  expect(result.alignment.status).toBe("insufficient");
  expect(result.alignment.row).toBeUndefined();
  expect(result.change).toBeUndefined();
});

it("an unverified function record in another namespace cannot change selected-source context state", () => {
  const latest = anatomy({ day: 5 });
  const foreign = fn({ namespace: "separate-import", linkage: "unverified" });
  const result = functionContext([foreign], latest, 5);
  expect(result.alignment.status).toBe("insufficient");
  expect(result.alignment.row).toBeUndefined();
  expect(result.baseline).toBeUndefined();
});

it("a pending-quality function baseline cannot supply a percentage reference", () => {
  const latest = anatomy({ day: 5 });
  const baseline = fn({
    id: "pending-function-reference",
    day: 0,
    quality: "check_comparability",
    baseline: true,
    phase: "baseline",
    value: 100,
  });
  const current = fn({ id: "valid-current-function" });
  const result = functionContext([baseline, current], latest, 5);
  expect(result.alignment.status).toBe("aligned");
  expect(result.baseline).toBeUndefined();
  expect(result.change).toBeUndefined();
});
