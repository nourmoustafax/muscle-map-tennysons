import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const today = new Date().toISOString().slice(0, 10);
const offset = (n: number) =>
  new Date(Date.parse(today + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
const click = async (p: Page, a: string) =>
  p.locator(`[data-action="${a}"]`).first().click();
async function open(p: Page, path = "/") {
  await p.goto(path);
  await expect(p.locator(".p-masthead")).toBeVisible();
  await expect(p.locator(".p-next, .p-history")).toBeVisible();
}
async function measure(
  p: Page,
  opts: {
    value?: string;
    date?: string;
    baseline?: boolean;
    method?: string;
    protocol?: string;
    missing?: boolean;
    task?: boolean;
  } = {},
) {
  await click(p, "entry");
  const f = p.locator("#measurement-form");
  await expect(f).toBeVisible();
  await f.locator("[name=date]").fill(opts.date || today);
  await f.locator("[name=value]").fill(opts.value ?? "50");
  await f.locator("[name=method]").fill(opts.method || "Ultrasound");
  await f.locator("[name=protocol]").fill(opts.protocol || "Test protocol A");
  await f.locator("[name=confirmed]").check();
  if (opts.baseline) await f.locator("[name=baseline]").check();
  if (opts.missing) {
    await f.locator("[name=value]").fill("");
    await f.locator("[name=missing]").check();
  }
  await f
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(p.locator("dialog")).not.toBeVisible();
  await expect(p.locator("#toast")).toContainText("saved");
}
async function createProfile(p: Page, name: string) {
  await click(p, "menu");
  await p.locator("dialog [data-action=profile]").click();
  await p.locator("#profile-form [name=name]").fill(name);
  await p.getByRole("button", { name: "Create profile", exact: true }).click();
  await expect(p.locator(".p-masthead h1")).toHaveText(name);
}
async function task(
  p: Page,
  title: string,
  kind = "assessment",
  linked = false,
) {
  await click(p, "new-task");
  const f = p.locator("#task-form");
  await f.locator("[name=kind]").selectOption(kind);
  if (kind === "assessment") await f.locator("[name=dueDate]").fill(today);
  await f.locator("[name=title]").fill(title);
  await f
    .locator("[name=reason]")
    .fill("User-entered software test reminder, not a clinical interval");
  await f.locator("[name=method]").fill("Ultrasound");
  await f.locator("[name=protocol]").fill("Test protocol A");
  if (!linked) await f.locator("[name=evidenceId]").selectOption("");
  await f.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(p.locator("dialog")).not.toBeVisible();
}
test("new personal identity is empty, three destinations are primary, first result and reference persist", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator("nav")).toHaveText(
    /My overview.*My measurements.*My follow-ups/,
  );
  await expect(page.locator(".p-next")).toContainText(
    "No muscle measurements yet",
  );
  await expect(page.locator(".p-result")).toContainText("Not available");
  await expect(page.locator("#mode,#namespace,#participant")).toHaveCount(0);
  await createProfile(page, "Personal software-test profile");
  await measure(page, { date: offset(-2), baseline: true });
  await expect(page.locator(".p-result")).toContainText("50 cm²");
  const ref = await page.locator("#baseline-select").inputValue();
  await page.reload();
  await expect(page.locator(".p-masthead h1")).toHaveText(
    "Personal software-test profile",
  );
  await expect(page.locator("#baseline-select")).toHaveValue(ref);
  await expect(page.locator(".p-result")).toContainText(offset(-2));
  await expect(page.locator(".p-anatomy")).toContainText(
    "No size measurements recorded",
  );
});
test("compatible series updates chart with independent baseline and previous comparisons and preserves reference", async ({
  page,
}) => {
  await open(page);
  await measure(page, { value: "50", date: offset(-2), baseline: true });
  const baseline = await page.locator("#baseline-select").inputValue();
  await measure(page, { value: "60", date: offset(-1) });
  await measure(page, { value: "55", date: today });
  await expect(page.locator(".p-comparisons")).toContainText("+10.0%");
  await expect(page.locator(".p-comparisons")).toContainText("-8.3%");
  await expect(page.locator(".p-chart circle")).toHaveCount(3);
  await expect(page.locator("#baseline-select")).toHaveValue(baseline);
  await page.locator("#review-date").fill(offset(-1));
  await expect(page.locator(".p-result")).toContainText("60 cm²");
  await expect(page.locator(".p-result")).not.toContainText("55 cm²");
  await expect(page.locator(".p-chart circle")).toHaveCount(2);
});
test("method/protocol incompatibility is not combined and latest observed value remains visible", async ({
  page,
}) => {
  await open(page);
  await measure(page, { value: "50", date: offset(-2), baseline: true });
  await measure(page, {
    value: "44",
    date: offset(-1),
    protocol: "Different documented protocol",
  });
  await expect(page.locator(".p-result")).toContainText("44 cm²");
  await expect(page.locator(".p-comparisons")).toContainText("Not calculable");
  await page.locator(".p-observation summary").click();
  await expect(page.locator(".p-observation")).toContainText("protocol");
  await measure(page, { value: "90", method: "MRI" });
  await expect(page.locator("#modality")).toHaveValue("MRI");
  await expect(page.locator(".p-result")).toContainText("90 cm²");
  await page.locator("#modality").selectOption("Ultrasound");
  await expect(page.locator(".p-result")).toContainText("44 cm²");
});
test("missing result stays null and does not complete a reminder or become zero", async ({
  page,
}) => {
  await open(page);
  await measure(page, { value: "50", date: offset(-1), baseline: true });
  await task(page, "Missing-result assessment");
  await page.locator("[data-page=overview]").click();
  await page.locator(".p-next [data-action=entry]").click();
  const f = page.locator("#measurement-form");
  await f.locator("[name=protocol]").fill("Test protocol A");
  await f.locator("[name=missing]").check();
  await f
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.locator("#toast")).toContainText("not completed");
  await expect(page.locator(".p-result")).toContainText("50 cm²");
  await expect(page.locator(".p-observation")).toContainText(
    "most recent assessment has no size result",
  );
  await expect(page.locator(".p-chart .missing-mark")).toHaveCount(1);
  const raw = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("musclemap-release-v2")!),
  );
  expect(raw.observations.at(-1).value).toBeNull();
});
test("scheduled assessment -> valid result -> linked follow-up -> later result -> retained updated outcome", async ({
  page,
}) => {
  await open(page);
  await measure(page, { value: "50", date: offset(-1), baseline: true });
  await task(page, "My next size assessment");
  await page.locator("[data-page=overview]").click();
  await expect(page.locator(".p-next")).toContainText(today);
  await page.locator(".p-next [data-action=entry]").click();
  let f = page.locator("#measurement-form");
  await f.locator("[name=value]").fill("48");
  await f.locator("[name=confirmed]").check();
  await f
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.locator("#toast")).toContainText(
    "Linked assessment completed",
  );
  await expect(page.locator(".p-result")).toContainText("48 cm²");
  await expect(page.locator(".p-comparisons")).toContainText("-4.0%");
  await task(page, "Review my size record", "followup", true);
  await page.locator("[data-page=overview]").click();
  await expect(page.locator(".p-next")).toContainText("Review my size record");
  await expect(page.locator(".p-next")).toContainText("Open follow-up");
  await measure(page, { value: "49" });
  await page.locator("[data-page=followups]").click();
  const row = page
    .locator(".p-task-row")
    .filter({ hasText: "Review my size record" });
  await row
    .getByRole("button", { name: "Open follow-up", exact: true })
    .click();
  f = page.locator("#outcome-form");
  const options = await f.locator("[name=recordId] option").allTextContents();
  const i = options.findIndex((t) => t.includes("49"));
  expect(i).toBeGreaterThan(0);
  await f.locator("[name=recordId]").selectOption({ index: i });
  await f
    .locator("[name=note]")
    .fill(
      "Later recorded result reviewed against the earlier record. No treatment inferred.",
    );
  await f.getByRole("button", { name: "Save outcome", exact: true }).click();
  await expect(page.locator("dialog")).not.toBeVisible();
  await page.reload();
  await page.locator("[data-page=followups]").click();
  await expect(
    page.locator(".p-task-row").filter({ hasText: "Review my size record" }),
  ).toContainText("Completed");
});
test("profile switching keeps source/reference/task histories separate across reload", async ({
  page,
}) => {
  await open(page);
  await createProfile(page, "Profile Alpha (test)");
  await measure(page, { value: "50", date: offset(-1), baseline: true });
  await task(page, "Alpha reminder");
  await createProfile(page, "Profile Beta (test)");
  await expect(page.locator(".p-next")).toContainText(
    "No muscle measurements yet",
  );
  await expect(page.locator(".p-result")).not.toContainText("50 cm²");
  await measure(page, { value: "25", baseline: true });
  await click(page, "menu");
  const alpha = await page
    .locator("#active-profile option")
    .filter({ hasText: "Profile Alpha" })
    .getAttribute("value");
  await page.locator("#active-profile").selectOption(alpha!);
  await expect(page.locator(".p-result")).toContainText("50 cm²");
  await expect(page.locator(".p-next")).toContainText("Alpha reminder");
  await page.reload();
  await expect(page.locator(".p-masthead")).toContainText("Profile Alpha");
});
test("correction/deletion retain import/source history and symptom correction stays self-report", async ({
  page,
}) => {
  await open(page);
  await measure(page, { value: "50", baseline: true });
  await page.locator("[data-page=measurements]").click();
  page.once("dialog", (d) => d.accept());
  await page.locator(".p-history [data-action=edit-record]").first().click();
  await page.locator("#measurement-form [name=value]").fill("51");
  await page
    .getByRole("button", { name: "Save correction", exact: true })
    .click();
  await expect(page.locator(".p-result")).toContainText("51 cm²");
  await click(page, "symptom");
  await page
    .locator("#symptom-form [name=note]")
    .fill("Test note: difficulty during a recorded activity");
  await page
    .getByRole("button", { name: "Save self-report", exact: true })
    .click();
  await page.locator("[data-page=measurements]").click();
  const symptom = page.locator("tbody tr").filter({ hasText: "difficulty" });
  page.once("dialog", (d) => d.accept());
  await symptom.locator("[data-action=edit-record]").click();
  await expect(page.locator("#symptom-form")).toBeVisible();
  await page
    .locator("#symptom-form [name=note]")
    .fill("Corrected self-reported difficulty (test)");
  await page
    .getByRole("button", { name: "Save self-report", exact: true })
    .click();
  await page.locator("[data-page=measurements]").click();
  page.once("dialog", (d) => d.accept());
  await page
    .locator("tbody tr")
    .filter({ hasText: "51 cm²" })
    .locator("[data-action=delete-record]")
    .click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("musclemap-personal-v1")!),
  );
  expect(state.history.some((h: any) => h.action === "corrected")).toBeTruthy();
  expect(state.history.some((h: any) => h.action === "deleted")).toBeTruthy();
  const legacy = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("musclemap-release-v2")!),
  );
  expect(legacy.observations).toHaveLength(1);
  expect(legacy.observations[0].stream).toBe("symptom");
});
test("duplicate and invalid unit results are rejected rather than silently added", async ({
  page,
}) => {
  await open(page);
  await measure(page, { value: "50", date: today });
  await click(page, "entry");
  const f = page.locator("#measurement-form");
  await f.locator("[name=value]").fill("50");
  await f.locator("[name=protocol]").fill("Test protocol A");
  await f.locator("[name=confirmed]").check();
  await f
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.locator("#measurement-error")).toContainText("duplicate");
  await f.locator("[name=unit]").selectOption("N");
  await f
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.locator("#measurement-error")).toContainText("cm²");
  const count = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("musclemap-release-v2")!).observations
        .length,
  );
  expect(count).toBe(1);
});
test("existing exercise instruction retains declared source and partial/non-completion outcomes", async ({
  page,
}) => {
  await open(page);
  await page.locator("[data-page=followups]").click();
  await click(page, "new-exercise");
  const f = page.locator("#task-form");
  await f
    .locator("[name=title]")
    .fill("Existing team-supplied activity (test)");
  await f
    .locator("[name=reason]")
    .fill("Record an instruction actually supplied in this software test");
  await f.locator("[name=sourceKind]").selectOption("team");
  await f.locator("[name=sourceName]").fill("Test instruction provider");
  await f
    .locator("[name=instructions]")
    .fill("Existing documented test plan, unchanged by MuscleMap");
  await f.getByRole("button", { name: "Save item", exact: true }).click();
  await page
    .locator(".p-task-row")
    .getByRole("button", { name: "Open follow-up", exact: true })
    .click();
  await expect(page.locator(".p-supplied")).toContainText("unchanged");
  await page.locator("#outcome-form [name=result]").selectOption("partial");
  await page
    .locator("#outcome-form [name=note]")
    .fill("Partially completed; equipment access limited (software test).");
  await page.getByRole("button", { name: "Save outcome", exact: true }).click();
  await page.reload();
  await page.locator("[data-page=followups]").click();
  await page
    .locator(".p-task-row")
    .getByRole("button", { name: "Open follow-up", exact: true })
    .click();
  await expect(page.locator(".p-task-detail")).toContainText("partial");
});
test("NASA example powers correct original values, independent baseline and previous change, method and historical exclusions", async ({
  page,
}) => {
  await open(page, "/?example=research&participant=7326");
  await expect(page.locator(".p-context-label")).toHaveText(
    "NASA CFT70 research example · Ground-based bed-rest study",
  );
  await expect(page.locator(".p-result")).toContainText("87.95 cm²");
  await expect(page.locator(".p-result")).toContainText("BR69");
  await expect(page.locator(".p-comparisons")).toContainText("+4.0%");
  await expect(page.locator(".p-comparisons")).toContainText("-0.4%");
  await page.locator("#cursor").fill("35");
  await page.locator("#cursor").press("Tab");
  await expect(page.locator(".p-result")).not.toContainText("87.95 cm²");
  await expect(page.locator(".p-chart")).toContainText("BR-6");
  await page.locator("#modality").selectOption("MRI");
  await expect(page.locator("#modality")).toHaveValue("MRI");
  await page.locator("[data-page=measurements]").click();
  await expect(page.locator(".p-history")).toContainText("Read-only source");
  await expect(page.locator("[data-action=delete-record]")).toHaveCount(0);
  const nasa = JSON.parse(readFileSync("public/data/research.json", "utf8"));
  const baseline = nasa.find(
    (r: any) =>
      r.participant === "7326" &&
      r.modality === "Panoramic ultrasound" &&
      r.region === "RIGHT_QUADRICEPS_GROUP" &&
      r.baseline,
  );
  const last = nasa.find(
    (r: any) =>
      r.participant === "7326" &&
      r.modality === "Panoramic ultrasound" &&
      r.region === "RIGHT_QUADRICEPS_GROUP" &&
      r.day === 69,
  );
  expect(((last.value - baseline.value) / baseline.value) * 100).toBeCloseTo(
    4.0459008635987,
    10,
  );
});
test("fictional scheduling and new result do not change original NASA research or personal records", async ({
  page,
}) => {
  await open(page, "/?example=fictional");
  await expect(page.locator(".p-context-label")).toContainText(
    "Fictional mission demonstration",
  );
  await expect(page.locator(".p-next")).toContainText("2028-05-10");
  await page.locator(".p-next [data-action=entry]").click();
  const f = page.locator("#measurement-form");
  await f.locator("[name=value]").fill("51");
  await f.locator("[name=confirmed]").check();
  await f
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.locator("#toast")).toContainText("completed");
  await expect(page.locator(".p-result")).toContainText("51 cm²");
  await click(page, "research");
  await expect(page.locator(".p-result")).toContainText("87.95 cm²");
  await click(page, "return-personal");
  await expect(page.locator(".p-next")).toContainText(
    "No muscle measurements yet",
  );
  const store = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("musclemap-release-v2")!),
  );
  expect(store.observations[0].mode).toBe("simulated");
});
test("readable export accurately names context, values, calculations, symptoms and linked task without transmission", async ({
  page,
}) => {
  await open(page);
  await createProfile(page, "Export profile (test)");
  await measure(page, { value: "50", date: offset(-1), baseline: true });
  await measure(page, { value: "45" });
  await task(page, "Export follow-up", "followup", true);
  await page.locator("[data-page=overview]").click();
  const downloadEvent = page.waitForEvent("download");
  await click(page, "export-readable");
  const d = await downloadEvent;
  const text = readFileSync((await d.path())!, "utf8");
  expect(text).toContain("Export profile (test)");
  expect(text).toContain("45 cm²");
  expect(text).toContain("-10.000000%");
  expect(text).toContain("Export follow-up");
  expect(text).toContain("not been transmitted");
  expect(text).toContain("Selected reference ID:");
});
test("personal import preserves explicit baseline/source, rejects foreign identity, and export includes filename/hash", async ({
  page,
}) => {
  await open(page);
  await page.locator("[data-page=measurements]").click();
  await click(page, "import");
  const data = [
    {
      date: offset(-1),
      region: "RIGHT_QUADRICEPS_GROUP",
      type: "CSA",
      method: "Ultrasound",
      value: "50",
      unit: "cm²",
      protocol: "Imported test protocol",
      confirmed: true,
      baseline: true,
      sourceId: "test-lab",
      sourceRow: "original-1",
    },
    {
      date: today,
      region: "RIGHT_QUADRICEPS_GROUP",
      type: "CSA",
      method: "Ultrasound",
      value: "55",
      unit: "cm²",
      protocol: "Imported test protocol",
      confirmed: true,
      sourceId: "test-lab",
      sourceRow: "original-2",
    },
  ];
  await page.locator("#import-file").setInputFiles({
    name: "personal-test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.locator("dialog")).toContainText("2 validated");
  await click(page, "commit-import");
  await page.locator("[data-page=overview]").click();
  await expect(page.locator(".p-comparisons")).toContainText("+10.0%");
  await click(page, "menu");
  const ev = page.waitForEvent("download");
  await page.locator("dialog [data-action=export]").click();
  const json = JSON.parse(readFileSync((await (await ev).path())!, "utf8"));
  expect(json.sourceRows[0].sourceId).toBe("test-lab");
  expect(json.provenanceHistory[0].action).toContain("personal-test.json");
  expect(json.provenanceHistory[0].action).toMatch(/SHA-256 [a-f0-9]{64}/);
});
test("real 3D canvas picking and keyboard region controls connect to the selected data", async ({
  page,
}) => {
  await open(page, "/?example=research");
  await expect(page.locator("#anatomy-host")).toHaveAttribute(
    "data-ready",
    "loaded",
    { timeout: 60000 },
  );
  await click(page, "back");
  const canvas = page.locator("#anatomy-host canvas");
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
  await expect(page.locator("#region-review-title")).toContainText(
    "gastrocnemius",
  );
  const target = page.locator(
    ".region-list [data-region=RIGHT_QUADRICEPS_GROUP]",
  );
  await target.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#region-review-title")).toContainText(
    "quadriceps",
  );
});
test("mobile layout has no page/chart overflow and keyboard dialog focus returns to exact opener", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const widths = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(widths.doc).toBeLessThanOrEqual(widths.viewport + 1);
  await page.locator(".p-result [data-action=entry]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
  await expect(page.locator("[data-action=entry]").first()).not.toBeFocused();
  await expect(page.locator(".p-result [data-action=entry]")).toBeFocused();
});
test("core app network is same-origin GET and offline reload keeps personal result, tasks and actual atlas", async ({
  page,
  context,
}) => {
  const requests: { url: string; method: string }[] = [];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method() }),
  );
  await open(page);
  await measure(page, { value: "50", baseline: true });
  await task(page, "Offline reminder");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) return resolve();
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => resolve(),
        { once: true },
      );
    });
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".p-result")).toContainText("50 cm²");
  await expect(page.locator(".p-next")).toContainText("Offline reminder");
  await expect(page.locator("#anatomy-host")).toHaveAttribute(
    "data-ready",
    "loaded",
    { timeout: 60000 },
  );
  expect(
    requests.every(
      (r) =>
        r.url.startsWith("http://127.0.0.1:3001/") || r.url.startsWith("blob:"),
    ),
  ).toBeTruthy();
  expect(requests.some((r) => r.method === "POST")).toBeFalsy();
  await context.setOffline(false);
});
test("missing originals show truthful unavailable data without a replacement fixture", async ({
  page,
}) => {
  await page.route("**/data/research.json", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await open(page, "/?example=research");
  await expect(page.locator(".error-banner")).toContainText("unavailable");
  await expect(page.locator(".p-result")).toContainText("Not available");
  await expect(page.locator(".p-result")).not.toContainText("87.95");
});
test("source education names indicator, equipment, limits and verified publication URLs", async ({
  page,
}) => {
  await open(page);
  await click(page, "sources");
  await expect(page.locator(".p-sources")).toContainText(
    "NASA CFT70 research example",
  );
  await expect(page.locator(".p-sources")).toContainText("CSA (cm²)");
  await page
    .locator(".p-sources summary")
    .filter({ hasText: "How measurements" })
    .click();
  await expect(
    page.locator(
      '.p-sources a[href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5476852/"]',
    ),
  ).toBeVisible();
  await expect(page.locator(".p-sources")).toContainText("not qualify");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Incident Support", exact: true }),
  ).toBeVisible();
});

test("validated full backup restores malformed storage while unreadable original bytes remain exportable", async ({
  page,
}) => {
  await open(page);
  await measure(page, { value: "52", baseline: true });
  await click(page, "menu");
  const ev = page.waitForEvent("download");
  await page.locator("dialog [data-action=backup]").click();
  const backup = readFileSync((await (await ev).path())!, "utf8");
  await click(page, "close");
  await page.evaluate(() =>
    localStorage.setItem("musclemap-personal-v1", "{broken-original"),
  );
  await page.reload();
  await expect(page.locator(".error-banner")).toContainText(
    /malformed|unreadable/,
  );
  await click(page, "menu");
  const raw = page.waitForEvent("download");
  await page.locator("dialog [data-action=backup]").click();
  expect(readFileSync((await (await raw).path())!, "utf8")).toContain(
    "{broken-original",
  );
  await page.locator("dialog [data-action=restore]").click();
  page.once("dialog", (d) => d.accept());
  await page.locator("#restore-file").setInputFiles({
    name: "validated-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(page.locator(".p-result")).toContainText("52 cm²");
  await expect(page.locator(".error-banner")).toHaveCount(0);
});
test("quota failure cannot silently report success or overwrite existing observations", async ({
  page,
}) => {
  await open(page);
  await measure(page, { value: "50", baseline: true });
  const old = await page.evaluate(() =>
    localStorage.getItem("musclemap-release-v2"),
  );
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "musclemap-personal-v1")
        throw new DOMException("test quota", "QuotaExceededError");
      return original.call(this, k, v);
    };
  });
  await click(page, "entry");
  await page.locator("#measurement-form [name=value]").fill("49");
  await page
    .locator("#measurement-form [name=protocol]")
    .fill("Test protocol A");
  await page.locator("#measurement-form [name=confirmed]").check();
  await page
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.locator("#measurement-error")).toContainText(
    /failed|quota|Quota/i,
  );
  expect(
    await page.evaluate(() => localStorage.getItem("musclemap-release-v2")),
  ).toBe(old);
});
test("cancelled item remains cancelled and unnamed team instruction is rejected", async ({
  page,
}) => {
  await open(page);
  await task(page, "Cancelled test item", "followup");
  await page.locator("[data-page=followups]").click();
  await page
    .locator(".p-task-row")
    .getByRole("button", { name: "Open follow-up", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await click(page, "cancel-task");
  await expect(page.locator(".p-task-row")).toContainText("Cancelled");
  await page
    .locator(".p-task-row")
    .getByRole("button", { name: "Open follow-up", exact: true })
    .click();
  await page
    .locator("#outcome-form [name=note]")
    .fill("Trying to change a cancelled item");
  await page.getByRole("button", { name: "Save outcome", exact: true }).click();
  await expect(page.locator("#outcome-error")).toContainText("Cancelled");
  await click(page, "close");
  await click(page, "new-task");
  const f = page.locator("#task-form");
  await f.locator("[name=kind]").selectOption("followup");
  await f.locator("[name=title]").fill("Unattributed external instruction");
  await f.locator("[name=reason]").fill("Source-name validation test");
  await f.locator("[name=sourceKind]").selectOption("team");
  await f.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(page.locator("#task-error")).toContainText("name");
});
test("a supplied plan can be imported and non-completion reason survives reload without inventing another plan", async ({
  page,
}) => {
  await open(page);
  await page.locator("[data-page=followups]").click();
  await click(page, "import-plan");
  const plan = [
    {
      kind: "exercise",
      title: "Imported existing plan (test)",
      reason: "Plan supplied for this software test",
      source: { kind: "team", name: "Test provider" },
      instructions:
        "The existing test instruction, not a MuscleMap prescription",
    },
  ];
  await page.locator("#plan-file").setInputFiles({
    name: "plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(plan)),
  });
  await expect(page.locator("dialog")).toContainText("validated");
  await click(page, "commit-plan");
  await page
    .locator(".p-task-row")
    .getByRole("button", { name: "Open follow-up", exact: true })
    .click();
  await page
    .locator("#outcome-form [name=result]")
    .selectOption("not_completed");
  await page
    .locator("#outcome-form [name=note]")
    .fill("Not completed: supplied test equipment unavailable");
  await page.getByRole("button", { name: "Save outcome", exact: true }).click();
  await page.reload();
  await page.locator("[data-page=followups]").click();
  await expect(page.locator(".p-task-row")).toHaveCount(1);
  await page
    .locator(".p-task-row")
    .getByRole("button", { name: "Open follow-up", exact: true })
    .click();
  await expect(page.locator(".p-task-detail")).toContainText(
    "equipment unavailable",
  );
});
test("exploring NASA then returning preserves the last active personal identity and its reference", async ({
  page,
}) => {
  await open(page);
  await createProfile(page, "Return-to-this-person (test)");
  await measure(page, { value: "63", baseline: true });
  await click(page, "research");
  await expect(page.locator(".p-result")).toContainText("87.95 cm²");
  await page.reload();
  await click(page, "return-personal");
  await expect(page.locator(".p-masthead h1")).toHaveText(
    "Return-to-this-person (test)",
  );
  await expect(page.locator(".p-result")).toContainText("63 cm²");
});
