import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const example = JSON.parse(readFileSync("public/data/simulated.json", "utf8"));
async function open(page: any) {
  await page.goto("/");
  await expect(page.locator("#mode")).toBeVisible();
  await expect(page.getByText("Loading local evidence…")).toHaveCount(0);
}
test("research measurements, true phase timing, region panels and real WebGL atlas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await expect(page.locator("#participant")).toHaveValue("7326");
  await expect(page.locator(".metrics")).toContainText("87.95");
  await expect(page.locator(".metrics")).toContainText("84.53");
  await expect(page.locator(".metrics")).toContainText("+4.0%");
  await expect(page.locator("#anatomy-host canvas")).toBeVisible({
    timeout: 60000,
  });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Front", exact: true }).click();
  await page.getByRole("button", { name: "+ Zoom", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await page
    .locator('.region-list [data-region="RIGHT_MEDIAL_GASTROCNEMIUS"]')
    .click();
  await expect(page.locator(".region-heading")).toContainText(
    "Right medial gastrocnemius",
  );
  await expect(page.locator(".metrics")).toContainText("-12.5%");
  await page.locator("#modality").selectOption("MRI");
  await expect(page.locator(".metrics")).toContainText("-17.1%");
  expect(errors).toEqual([]);
});
test("missing recovery does not impute or replace the last valid measurement", async ({
  page,
}) => {
  await open(page);
  await page.locator("#participant").selectOption("7036");
  await expect(page.locator(".finding")).toContainText(
    "Latest measurement missing",
  );
  await expect(page.locator(".metrics")).toContainText("7 study days");
  await expect(page.locator(".metrics")).toContainText("BR+3");
  await expect(page.locator("svg.trend-svg")).toContainText("missing");
});
test("manual validation and normalized preview, event updates only its own stream", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "+ Record observation", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("[name=value]").fill("25");
  await dialog.locator("[name=protocol]").fill("Local protocol A");
  await dialog.locator("[name=baseline]").check();
  await dialog.locator("[name=confirmed]").check();
  await expect(dialog.locator("#entry-preview")).toContainText('"value": 25');
  await dialog.getByRole("button", { name: "Validate & save locally" }).click();
  await expect(page.locator("#mode")).toHaveValue("manual");
  await expect(page.locator(".metrics")).toContainText("25 cm²");
  await page
    .getByRole("button", { name: "+ Record observation", exact: true })
    .click();
  await page.locator("[name=stream]").selectOption("activity");
  await page.locator("[name=value]").fill("30");
  await page.locator("[name=protocol]").fill("Session log");
  await page.locator("[name=confirmed]").check();
  await page.getByRole("button", { name: "Validate & save locally" }).click();
  await expect(page.locator(".metrics")).toContainText("25 cm²");
  await expect(page.locator(".context-grid")).toContainText("30 min");
  await page.reload();
  await expect(page.locator("#mode")).toHaveValue("research");
  await page.locator("#mode").selectOption("manual");
  await expect(page.locator(".metrics")).toContainText("25 cm²");
});
test("JSON import preview, atomic rejection and duplicate protection", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Import records", exact: true })
    .click();
  const record = {
    ...example[0],
    id: "import-test-001",
    participant: "DEMO-IMPORTED",
    namespace: "fictional-imported",
  };
  await page.locator("#import-file").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([record])),
  });
  await expect(page.getByRole("dialog")).toContainText("1 validated records");
  await page.getByRole("button", { name: "Save validated records" }).click();
  await expect(page.locator("#participant")).toHaveValue("DEMO-IMPORTED");
  await page
    .getByRole("button", { name: "Import records", exact: true })
    .click();
  await page.locator("#import-file").setInputFiles({
    name: "duplicate.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([record])),
  });
  await expect(page.getByRole("dialog")).toContainText("already exists");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("follow-up draft is persisted and traceable export includes source rows and limits", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Document follow-up" }).click();
  await page
    .locator("[name=note]")
    .fill(
      "Verify the method and review comparable functional evidence before interpretation.",
    );
  await page.getByRole("button", { name: "Save local follow-up" }).click();
  await expect(page.locator(".followups")).toContainText(
    "1 local follow-up draft",
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export review summary" }).click();
  const file = await downloaded;
  const path = await file.path();
  const data = JSON.parse(readFileSync(path!, "utf8"));
  expect(data.selection.participant).toBe("7326");
  expect(data.sourceRows.length).toBeGreaterThan(0);
  expect(data.review.change).toBeCloseTo(4.045900863598722, 10);
  expect(data.followUps).toHaveLength(1);
  expect(data.limits.length).toBeGreaterThan(3);
});
test("secondary incident overlay stays on dashboard and cannot clear an emergency", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /Incident Support/ }).click();
  await page
    .locator("textarea[name=description]")
    .fill("Sudden calf pain, numbness and swelling.");
  await page.getByRole("button", { name: "Review reported incident" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Strong potential escalation notice",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "approved flight procedure",
  );
  await page.getByRole("button", { name: "Save incident locally" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Muscle Health" }),
  ).toBeVisible();
});
test("mobile layout, keyboard modal escape and source navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("nav")
    .getByRole("button", { name: "Sources & Methods" })
    .click();
  await expect(page.locator(".source-card").first()).toContainText("NASA NLSP");
  await page
    .getByRole("button", { name: "+ Record observation", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator("nav")
    .getByRole("button", { name: "Health Records" })
    .click();
  await expect(page.locator(".register")).toContainText("52 health records");
});
test("production service-worker caches core app and supports an offline reload", async ({
  page,
  context,
}) => {
  await open(page);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) return resolve();
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => resolve(),
        { once: true },
      );
    });
    return !!reg.active;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".metrics")).toContainText("87.95");
  await page.locator("#mode").selectOption("simulated");
  await expect(page.locator(".mode-banner")).toContainText("SIMULATED MISSION");
  await expect(page.locator(".metrics")).toContainText("50.8");
  await expect(page.locator("#anatomy-host canvas")).toBeVisible({
    timeout: 30000,
  });
  await context.setOffline(false);
});

test("actual canvas ray selection connects a calf mesh to its evidence panel", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator("#anatomy-host")).toHaveAttribute(
    "data-ready",
    "loaded",
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  const canvas = page.locator("#anatomy-host canvas");
  await expect(canvas).toHaveAttribute("data-hotspots", /.+/);
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await canvas.getAttribute("data-camera-position")) || "[0,0,9]",
        )[2],
    )
    .toBeLessThan(0);
  const point = await canvas.evaluate(
    (el) =>
      JSON.parse((el as HTMLElement).dataset.hotspots!)
        .RIGHT_MEDIAL_GASTROCNEMIUS,
  );
  await canvas.click({ position: point });
  await expect(page.locator(".region-heading")).toContainText(
    "Right medial gastrocnemius",
  );
});
test("unavailable sources show an empty state rather than substituted measurements", async ({
  page,
}) => {
  await page.route("**/data/research.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await open(page);
  await expect(page.locator(".error-banner")).toContainText(
    "No substitute measurements",
  );
  await expect(page.locator(".empty-state")).toContainText(
    "No measurements available for this review",
  );
  await page.locator("#mode").selectOption("simulated");
  await expect(page.locator(".metrics")).toContainText("50.8");
});
test("inaccessible local storage is caught and does not break evidence browsing", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked storage", "SecurityError");
      },
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await expect(page.locator(".error-banner").first()).toContainText(
    "storage is unavailable",
  );
  await expect(page.locator(".metrics")).toContainText("87.95");
  expect(errors).toEqual([]);
});
test("corrupt local storage is preserved in backup and not silently overwritten", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("musclemap-release-v2", "not valid JSON"),
  );
  await open(page);
  await expect(page.locator(".error-banner").first()).toBeVisible();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export local backup", exact: true })
    .first()
    .click();
  const file = await event;
  const saved = JSON.parse(readFileSync((await file.path())!, "utf8"));
  expect(saved.unparsedOriginal).toBe("not valid JSON");
  expect(
    await page.evaluate(() => localStorage.getItem("musclemap-release-v2")),
  ).toBe("not valid JSON");
});

test("imported research comparability acknowledgement cannot alter the immutable NASA namespace", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Import records", exact: true })
    .click();
  const base = {
    ...example[0],
    id: "source-review-base",
    participant: "7326",
    mode: "research",
    namespace: "nasa-cft70-anatomy",
    value: 50,
    day: 0,
    baseline: true,
  };
  const latest = {
    ...base,
    id: "source-review-latest",
    sourceRow: "different-source-row",
    value: 45,
    day: 69,
    baseline: false,
    timepoint: "IMPORTED69",
    phase: "test",
  };
  await page.locator("#import-file").setInputFiles({
    name: "external.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([base, latest])),
  });
  await page.getByRole("button", { name: "Save validated records" }).click();
  await expect(page.locator("#namespace")).toHaveValue(
    "imported-nasa-cft70-anatomy",
  );
  await expect(page.locator(".mode-banner")).toContainText("IMPORTED RESEARCH");
  await page
    .locator("nav")
    .getByRole("button", { name: "Health Records", exact: false })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Review measurement comparability" })
    .click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Muscle Health", exact: false })
    .click();
  await expect(page.locator(".metrics")).toContainText("45 cm²");
  await page.locator("#namespace").selectOption("nasa-cft70-anatomy");
  await page.locator("#cursor").evaluate((el) => {
    (el as HTMLInputElement).value = "69";
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator(".metrics")).toContainText("87.95");
});
