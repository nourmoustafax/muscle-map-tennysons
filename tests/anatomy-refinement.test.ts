import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { measuredRegionSourceIDs } from "../src/anatomy";

const anatomySource = readFileSync("src/anatomy.ts", "utf8");

describe("anatomy viewer refinement contract", () => {
  it("keeps the explicit source-ID set for each measured region", () => {
    expect(measuredRegionSourceIDs.RIGHT_QUADRICEPS_GROUP).toEqual([
      "FJ1433",
      "FJ1443",
      "FJ1441",
      "FJ1442",
    ]);
    expect(measuredRegionSourceIDs.RIGHT_MEDIAL_GASTROCNEMIUS).toEqual([
      "FJ1397",
    ]);
    expect(new Set(Object.values(measuredRegionSourceIDs).flat())).toEqual(
      new Set(["FJ1433", "FJ1443", "FJ1441", "FJ1442", "FJ1397"]),
    );
  });

  it("does not invent target geometry or an unmeasured target status", () => {
    expect(anatomySource).not.toMatch(
      /(SphereGeometry|BoxGeometry|CylinderGeometry)/,
    );
    expect(anatomySource).not.toContain("healthColor");
    expect(anatomySource).not.toContain("unmeasuredStatus");
  });

  it("exposes selection and focus without replacing the existing camera hooks", () => {
    expect(anatomySource).toContain("select(region: Region): void");
    expect(anatomySource).toContain("focus(region: Region): void");
    expect(anatomySource).toContain("dataset.selectedRegion");
    expect(anatomySource).toContain("dataset.selectedSourceIds");
    expect(anatomySource).toContain("dataset.hotspots");
    expect(anatomySource).toContain("dataset.cameraPosition");
    expect(anatomySource).toContain("updateMatrixWorld(true)");
  });

  it("uses a restrained blue selection and explicit neutral context materials", () => {
    expect(anatomySource).toContain("const SELECTED_COLOR = 0x5aaec9");
    expect(anatomySource).toContain("const CONTEXT_COLOR = 0x9a8177");
    expect(anatomySource).toContain("physical.emissive.set(0x000000)");
    expect(anatomySource).toContain("physical.emissiveIntensity = 0");
  });
});
