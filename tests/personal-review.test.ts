import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Observation, Region } from "../src/domain";
import type { Profile } from "../src/personal-types";
import {
  dateDay,
  measurementDate,
  reviewForProfile,
  todayDate,
} from "../src/personal-review";

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "p-1",
  name: "Personal",
  mode: "manual",
  participant: "person-1",
  namespace: "personal:person-1",
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const row = (overrides: Partial<Observation> = {}): Observation => ({
  id: "obs-1",
  participant: "person-1",
  mode: "manual",
  stream: "anatomy",
  region: "RIGHT_QUADRICEPS_GROUP",
  side: "right",
  day: 1,
  timepoint: "2026-01-02",
  phase: "assessment",
  value: 100,
  unit: "cm²",
  measurement: "CSA",
  modality: "MRI",
  protocol: "p-1",
  site: "right thigh",
  quality: "valid",
  sourceId: "USER-ENTRY",
  sourceRow: "row-1",
  namespace: "personal:person-1",
  linkage: "verified",
  baseline: false,
  ...overrides,
});

describe("personal review", () => {
  it("reproduces actual NASA CFT70 participant 7326 at BR69 without inventing calendar dates", () => {
    const records = JSON.parse(
      readFileSync("public/data/research.json", "utf8"),
    ) as Observation[];
    const p = profile({
      mode: "research",
      participant: "7326",
      namespace: "nasa-cft70-anatomy",
    });
    const review = reviewForProfile(
      records,
      p,
      "RIGHT_QUADRICEPS_GROUP",
      "Panoramic ultrasound",
      undefined,
      { day: 69 },
    );
    expect(review.latest?.sourceRow).toBe("62");
    expect(review.latest?.value).toBe(87.95);
    expect(review.baseline?.sourceRow).toBe("53");
    expect(review.change).toBeCloseTo(((87.95 - 84.53) / 84.53) * 100, 10);
    expect(measurementDate(review.latest!, p)).toBeUndefined();
    expect(review.dateMissing).toEqual([]);
    expect(review.review.rows.length).toBeGreaterThan(0);
  });

  it("keeps a positive baseline change separate from a lower previous result", () => {
    const rows = [
      row({
        id: "base",
        timepoint: "2026-01-01",
        day: 0,
        value: 100,
        phase: "baseline",
        baseline: true,
        sourceRow: "base",
      }),
      row({
        id: "previous",
        timepoint: "2026-01-02",
        day: 1,
        value: 110,
        sourceRow: "previous",
      }),
      row({
        id: "latest",
        timepoint: "2026-01-03",
        day: 2,
        value: 105,
        sourceRow: "latest",
      }),
    ];
    const review = reviewForProfile(
      rows,
      profile(),
      "RIGHT_QUADRICEPS_GROUP",
      "MRI",
      "base",
      { date: "2026-01-03" },
    );
    expect(review.latest?.id).toBe("latest");
    expect(review.baseline?.id).toBe("base");
    expect(review.previous?.id).toBe("previous");
    expect(review.change).toBe(5);
    expect(review.previousChange).toBeCloseTo(((105 - 110) / 110) * 100, 10);
  });

  it("retains the future reference identity without displaying it as a historical assessment or calculating a comparison", () => {
    const rows = [
      row({ id: "current", timepoint: "2026-01-02", day: 1, value: 100 }),
      row({
        id: "future-base",
        timepoint: "2026-01-04",
        day: 3,
        value: 90,
        baseline: true,
        phase: "baseline",
      }),
    ];
    const review = reviewForProfile(
      rows,
      profile(),
      "RIGHT_QUADRICEPS_GROUP",
      "MRI",
      "future-base",
      { date: "2026-01-03" },
    );
    expect(review.latest?.id).toBe("current");
    expect(review.baseline).toBeUndefined();
    expect(review.visibleRows.some((row) => row.id === "future-base")).toBe(
      false,
    );
    expect(review.review.excluded.some((row) => row.id === "future-base")).toBe(
      true,
    );
    expect(rows.find((row) => row.id === "future-base")?.value).toBe(90);
    expect(review.change).toBeUndefined();
    expect(review.reasons.join(" ")).toMatch(/future/);
  });

  it("does not invent a date for manual legacy raw-day rows and validates UTC ordinals", () => {
    const legacy = row({
      timepoint: "RAW-DAY-3",
      acquiredAt: undefined,
      day: 3,
    });
    expect(measurementDate(legacy, profile())).toBeUndefined();
    expect(() => dateDay("2026-02-30")).toThrow();
    expect(dateDay("2026-01-01") + 31).toBe(dateDay("2026-02-01"));
    expect(todayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const review = reviewForProfile(
      [legacy],
      profile(),
      "RIGHT_QUADRICEPS_GROUP",
      "MRI",
      undefined,
      { date: "2026-01-10" },
    );
    expect(review.dateMissing.map((item) => item.id)).toEqual(["obs-1"]);
    expect(review.latest).toBeUndefined();
    expect(review.dateMissing[0].id).toBe("obs-1");
    expect(review.reasons.join(" ")).toMatch(/legacy rows/);
  });

  it("does not bridge units, protocol/site, missing values, or zero references", () => {
    const rows = [
      row({
        id: "base-zero",
        value: 0,
        baseline: true,
        phase: "baseline",
        timepoint: "2026-01-01",
      }),
      row({
        id: "missing",
        value: null,
        quality: "missing",
        timepoint: "2026-01-02",
      }),
      row({
        id: "incompatible",
        value: 80,
        timepoint: "2026-01-03",
        protocol: "other",
        sourceRow: "other",
      }),
      row({
        id: "latest",
        value: 90,
        timepoint: "2026-01-04",
        protocol: "p-1",
      }),
    ];
    const review = reviewForProfile(
      rows,
      profile(),
      "RIGHT_QUADRICEPS_GROUP",
      "MRI",
      "base-zero",
      { date: "2026-01-04" },
    );
    expect(review.latest?.id).toBe("latest");
    expect(review.change).toBeUndefined();
    expect(review.review.comparable.map((item) => item.id)).toEqual([
      "base-zero",
      "latest",
    ]);
    expect(
      review.review.rows.find((item) => item.id === "missing")?.value,
    ).toBeNull();
    expect(review.reasons.join(" ")).toMatch(/zero|not comparable|missing/);
  });

  it("keeps the latest valid incompatible record instead of substituting an older comparable one", () => {
    const rows = [
      row({
        id: "base",
        timepoint: "2026-01-01",
        value: 100,
        baseline: true,
        phase: "baseline",
      }),
      row({ id: "compatible", timepoint: "2026-01-02", value: 95 }),
      row({
        id: "latest-other-protocol",
        timepoint: "2026-01-03",
        value: 80,
        protocol: "different",
      }),
    ];
    const review = reviewForProfile(
      rows,
      profile(),
      "RIGHT_QUADRICEPS_GROUP",
      "MRI",
      "base",
      { date: "2026-01-03" },
    );
    expect(review.latest?.id).toBe("latest-other-protocol");
    expect(review.latest?.value).toBe(80);
    expect(review.latestIsComparable).toBe(false);
    expect(review.change).toBeUndefined();
  });

  it("uses a supplied mission start date for simulated calendar display but keeps research study days", () => {
    const simulated = profile({
      mode: "simulated",
      participant: "DEMO-01",
      namespace: "demo",
      missionStartDate: "2028-03-01",
    });
    expect(
      measurementDate(
        row({
          mode: "simulated",
          participant: "DEMO-01",
          namespace: "demo",
          day: 14,
          acquiredAt: undefined,
          timepoint: "MD14",
        }),
        simulated,
      ),
    ).toBe("2028-03-15");
    const research = profile({
      mode: "research",
      participant: "7326",
      namespace: "nasa-cft70-anatomy",
    });
    expect(
      measurementDate(
        row({
          mode: "research",
          participant: "7326",
          namespace: "nasa-cft70-anatomy",
          day: 69,
          timepoint: "BR69",
        }),
        research,
      ),
    ).toBeUndefined();
  });
});
