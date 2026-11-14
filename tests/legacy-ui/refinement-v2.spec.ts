import { test, expect } from "@playwright/test";

async function open(page: any) {
  await page.goto("/");
  await expect(page.locator(".review-overview")).toBeVisible();
}

test("overview explains region differences and missing context before drilling into a region", async ({
  page,
}) => {
  await open(page);
  const overview = page.locator(".review-overview");
  await expect(overview).toContainText("+4.0%");
  await expect(overview).toContainText("-12.5%");
  await expect(overview).toContainText("Evidence gaps");
  await expect(overview).toContainText("No comparable performance test");
  await overview
    .locator('[data-region="RIGHT_MEDIAL_GASTROCNEMIUS"]')
    .first()
    .click();
  await expect(page.locator(".region-heading")).toContainText(
    "Right medial gastrocnemius",
  );
  await expect(page.locator(".metrics")).toContainText("-12.5%");
  await expect(page.locator(".recommended-followup")).toContainText(
    "Document follow-up",
  );
  await expect(page.locator(".source-details")).not.toHaveAttribute("open");
  await page.locator(".source-details>summary").click();
  await expect(page.locator(".source-details table")).toBeVisible();
  await expect(page.locator("#namespace")).toHaveValue("nasa-cft70-anatomy");
});

test("full mission simulation connects size, explicit function baseline and activity for each measured region", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Try the full mission demo" }).click();
  await expect(page.locator(".mode-banner")).toContainText("SIMULATED MISSION");
  await expect(page.locator(".context-grid")).toContainText("402 N");
  await expect(page.locator(".context-grid")).toContainText("420 N");
  await expect(page.locator(".context-grid")).toContainText("-4.3%");
  await expect(page.locator(".context-grid")).toContainText("30 min");
  await page
    .locator('.region-list [data-region="RIGHT_MEDIAL_GASTROCNEMIUS"]')
    .click();
  await expect(page.locator(".context-grid")).toContainText("119 Nm");
  await expect(page.locator(".context-grid")).toContainText("126 Nm");
  await expect(page.locator(".context-grid")).toContainText("-5.6%");
  await expect(page.locator(".context-grid")).toContainText(
    "not a direct size measurement",
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Mission Context" })
    .click();
  await page.locator('[data-review-day="52"]').click();
  await page
    .locator('.region-list [data-region="RIGHT_QUADRICEPS_GROUP"]')
    .click();
  await expect(page.locator(".finding")).toContainText(
    "Latest measurement missing",
  );
  await expect(page.locator(".metrics")).toContainText("51.9 cm²");
  await expect(page.locator(".metrics")).toContainText("17 mission days old");
  await expect(page.locator(".context-grid")).not.toContainText("420 N");
  await expect(page.locator(".context-grid")).not.toContainText("402 N");
  await page.locator("#mode").selectOption("research");
  await page.locator("#participant").selectOption("7326");
  await page.locator("#cursor").evaluate((el) => {
    (el as HTMLInputElement).value = "69";
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator(".metrics")).toContainText("87.95");
  await expect(page.locator(".context-grid")).not.toContainText("402 N");
});

test("record intake gives a mapped post-save review and activity leaves muscle size unchanged", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "+ Record observation", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.locator("[name=value]").fill("25");
  await dialog.locator("[name=protocol]").fill("Personal protocol A");
  await dialog.locator("[name=baseline]").check();
  await dialog.locator("[name=confirmed]").check();
  await dialog.getByRole("button", { name: "Validate & save locally" }).click();
  await expect(page.locator(".intake-feedback")).toContainText("comparison");
  await expect(page.locator(".intake-feedback")).toContainText(
    "No follow-up was created automatically",
  );
  await expect(page.locator(".metrics")).toContainText("25 cm²");
  await page
    .getByRole("button", { name: "+ Record observation", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.locator("[name=stream]").selectOption("activity");
  await dialog.locator("[name=value]").fill("30");
  await dialog.locator("[name=protocol]").fill("Session record A");
  await dialog.locator("[name=confirmed]").check();
  await dialog.getByRole("button", { name: "Validate & save locally" }).click();
  await expect(page.locator(".intake-feedback")).toContainText("unchanged");
  await expect(page.locator(".metrics")).toContainText("25 cm²");
  await expect(page.locator(".context-grid")).toContainText("30 min");
});

test("anatomy highlights four source group members and preserves the same WebGL view across incident dialogs", async ({
  page,
}) => {
  await open(page);
  const host = page.locator("#anatomy-host");
  await expect(host).toHaveAttribute("data-ready", "loaded", {
    timeout: 60000,
  });
  await expect(host).toHaveAttribute("data-selected-source-ids", /FJ1433/);
  const ids = (await host.getAttribute("data-selected-source-ids"))!.split(",");
  expect(ids.sort()).toEqual(["FJ1433", "FJ1443", "FJ1441", "FJ1442"].sort());
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await host.locator("canvas").getAttribute("data-camera-position")) ||
            "[0,0,9]",
        )[2],
    )
    .toBeLessThan(0);
  await page.evaluate(() => {
    (window as any).__atlasCanvas = document.querySelector(
      "#anatomy-host canvas",
    );
  });
  await page.getByRole("button", { name: /Incident Support/ }).click();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () =>
        document.querySelector("#anatomy-host canvas") ===
        (window as any).__atlasCanvas,
    ),
  ).toBe(true);
  await expect
    .poll(
      async () =>
        JSON.parse(
          (await host.locator("canvas").getAttribute("data-camera-position")) ||
            "[0,0,9]",
        )[2],
    )
    .toBeLessThan(0);
  await page
    .locator('.region-list [data-region="RIGHT_MEDIAL_GASTROCNEMIUS"]')
    .click();
  await expect(host).toHaveAttribute("data-selected-source-ids", "FJ1397");
  await page.getByRole("button", { name: "Focus region", exact: true }).click();
  await expect(host.locator("canvas")).toBeVisible();
});

test("incident support retrieves relevant local public references and presents sequential authority reminders", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /Incident Support/ }).click();
  await page
    .locator("textarea[name=description]")
    .fill("Sudden calf pain with swelling and numbness after a session.");
  await page.getByRole("button", { name: "Review reported incident" }).click();
  await expect(page.locator(".incident-facts")).toContainText("calf");
  await expect(page.locator(".incident-facts")).toContainText("swelling");
  await expect(page.locator(".incident-workflow li")).toHaveCount(4);
  await expect(page.locator(".incident-reference-card")).toHaveCount(3);
  const links = await page
    .locator(".incident-reference-card a")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(links.every((link) => link?.startsWith("https://"))).toBe(true);
  await expect(page.locator(".incident-references")).toContainText(
    "No approved NASA checklist",
  );
  await page.getByRole("button", { name: "Save incident locally" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".review-overview")).toBeVisible();
});

test("responsive product surfaces remain within the viewport on tablet and mobile", async ({
  page,
}) => {
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".recommended-followup").scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "Document follow-up", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Document follow-up", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Document follow-up", exact: true }),
    ).toBeFocused();
  }
});

test("negative source baseline day is selectable without inventing a newer observation", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator("#cursor")).toHaveAttribute("min", "-6");
  await page.locator("#cursor").evaluate((el) => {
    (el as HTMLInputElement).value = "-6";
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator(".metrics")).toContainText("84.53 cm²");
  await expect(page.locator(".metrics")).not.toContainText("87.95");
  await expect(page.locator(".timeline")).toContainText("Study day -6");
});

test("saved follow-up is shown only for its selected muscle region and data source", async ({
  page,
}) => {
  await open(page);
  await page
    .locator('.region-list [data-region="RIGHT_MEDIAL_GASTROCNEMIUS"]')
    .click();
  await page
    .getByRole("button", { name: "Document follow-up", exact: true })
    .click();
  await page
    .locator("[name=note]")
    .fill("Review the right calf sequence and confirm the measurement method.");
  await page.getByRole("button", { name: "Save local follow-up" }).click();
  await expect(page.locator(".followups")).toContainText(
    "1 local follow-up draft",
  );
  await page
    .locator('.region-list [data-region="RIGHT_QUADRICEPS_GROUP"]')
    .click();
  await expect(page.locator(".followups")).toHaveCount(0);
  await page
    .locator('.region-list [data-region="RIGHT_MEDIAL_GASTROCNEMIUS"]')
    .click();
  await expect(page.locator(".followups")).toContainText(
    "1 local follow-up draft",
  );
});
