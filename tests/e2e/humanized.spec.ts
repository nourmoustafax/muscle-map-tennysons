import { test, expect } from "@playwright/test";
test("humanized mobile navigation remains visibly labeled and grouped entry preserves validation and values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".p-next")).toBeVisible();
  for (const text of ["My overview", "My measurements", "My follow-ups"]) {
    const nav = page.getByRole("button", { name: text, exact: true });
    await expect(nav.locator("span")).toBeVisible();
    expect(
      await nav.locator("span").evaluate((el) => getComputedStyle(el).display),
    ).not.toBe("none");
  }
  await page.locator(".p-masthead [data-action=entry]").click();
  await expect(page.locator("fieldset")).toHaveCount(3);
  await expect(page.locator("fieldset legend").nth(0)).toContainText(
    "examination",
  );
  await page.locator("[name=value]").fill("-1");
  await page.locator("[name=protocol]").fill("Supplied protocol test");
  await page.locator("[name=confirmed]").check();
  await page
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.locator("#measurement-error")).not.toBeEmpty();
  await expect(page.locator("[name=value]")).toHaveValue("-1");
  await page.locator("[name=value]").fill("50");
  await page
    .getByRole("button", { name: "Save measurement", exact: true })
    .click();
  await expect(page.locator("#toast")).toContainText("saved");
  await expect(page.locator(".p-result")).toContainText("50 cm²");
  await expect(page.locator("#region-review-title")).toContainText(
    "Right thigh",
  );
  await expect(page.locator("#region-review-title")).toContainText(
    "quadriceps",
  );
  const width = await page.evaluate(() => ({
    screen: innerWidth,
    doc: document.documentElement.scrollWidth,
  }));
  expect(width.doc).toBeLessThanOrEqual(width.screen + 1);
  await page
    .getByRole("button", { name: "My follow-ups", exact: true })
    .click();
  await expect(page.locator(".p-tasks")).toBeVisible();
});
