import { describe, it, expect } from "vitest";
import {
  comparisonDescription,
  initials,
  regionName,
  icon,
} from "../src/human-ui";
import { entryForm, menuMarkup } from "../src/personal-forms";
import { readPersonalState } from "../src/personal-state";
import { emptyStore } from "../src/store";
describe("human-centered presentation", () => {
  it("pairs friendly anatomical locations with existing exact region identities", () => {
    expect(regionName("RIGHT_QUADRICEPS_GROUP")).toBe("Right thigh");
    expect(regionName("RIGHT_MEDIAL_GASTROCNEMIUS")).toBe("Right calf");
  });
  it("does not equate a direction of size change with health and handles zero honestly", () => {
    expect(comparisonDescription(0, "baseline")).toBe(
      "The recorded size is unchanged from baseline.",
    );
    expect(comparisonDescription(-4, "baseline")).toContain("4.0% lower");
    expect(comparisonDescription(undefined, "baseline")).toContain(
      "isn't available",
    );
    expect(comparisonDescription(3, "baseline")).not.toMatch(
      /healthy|strength|normal/i,
    );
  });
  it("uses only supplied initials, escaped, and decorative accessible icons", () => {
    expect(initials("Jane Example")).toBe("JE");
    expect(initials("<script>")).toBe("&lt;");
    expect(icon("overview")).toContain('aria-hidden="true"');
  });
  it("keeps a single form and all scientific fields across approachable sections", () => {
    const state = readPersonalState(
      { getItem: () => null },
      emptyStore(),
    ).state;
    const profile = state.profiles.find((p) => p.mode === "manual")!;
    const html = entryForm(
      profile,
      state,
      "RIGHT_QUADRICEPS_GROUP",
      "Ultrasound",
    );
    expect(html.match(/<form /g) || []).toHaveLength(1);
    expect(html.match(/<fieldset/g) || []).toHaveLength(3);
    for (const name of [
      "date",
      "region",
      "side",
      "type",
      "method",
      "device",
      "value",
      "unit",
      "protocol",
      "note",
      "taskId",
      "baseline",
      "missing",
      "confirmed",
      "duplicateConfirmed",
    ])
      expect(html).toContain(`name="${name}"`);
    expect(html).toContain('id="measurement-error"');
    expect(html).toContain("Save measurement");
  });
  it("keeps every backup/recovery action reachable without hiding it by default", () => {
    const state = readPersonalState(
      { getItem: () => null },
      emptyStore(),
    ).state;
    const html = menuMarkup(state.profiles[0], state);
    for (const action of [
      "backup",
      "restore",
      "reset",
      "profile",
      "import",
      "export-readable",
      "export",
      "research",
      "demo",
      "sources",
    ])
      expect(html).toContain(`data-action="${action}"`);
    expect(html).toContain('class="h-recovery" open');
  });
});
