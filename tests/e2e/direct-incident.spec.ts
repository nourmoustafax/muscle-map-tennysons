import { test, expect } from "@playwright/test";
for (const width of [390, 1280]) {
  test(`incident support is one-click from all pages at ${width}px, accessible and explicit about absent treatment`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".p-next")).toBeVisible();
    const navigation = page.getByRole("navigation");
    const incident = navigation.getByRole("button", {
      name: "Incident Support",
      exact: true,
    });
    await expect(incident).toBeVisible();
    const rect = await incident.boundingBox();
    expect(rect!.width).toBeGreaterThan(40);
    expect(rect!.height).toBeGreaterThan(40);
    for (const name of ["My overview", "My measurements", "My follow-ups"]) {
      await navigation.getByRole("button", { name, exact: true }).click();
      await incident.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator(".h-incident-intro")).toContainText(
        "Do not wait",
      );
      await expect(page.getByRole("dialog")).toContainText(
        "Treatment guidance is unavailable",
      );
      await page.keyboard.press("Escape");
      await expect(incident).toBeFocused();
    }
    await incident.focus();
    await page.keyboard.press("Enter");
    await page
      .locator("#incident-description")
      .fill("Sudden pain in the right calf with numbness.");
    await page
      .getByRole("button", { name: "Show next steps", exact: true })
      .click();
    await expect(page.locator(".incident-workflow li")).toHaveCount(4);
    await expect(page.locator(".incident-workflow li").first()).toContainText(
      "Activate",
    );
    await expect(page.locator(".incident-workflow li").nth(1)).toContainText(
      "crew medical officer",
    );
    await expect(page.locator(".incident-protocol-status")).toContainText(
      "No approved mission procedure",
    );
    await expect(page.locator(".incident-result")).not.toContainText(
      "Strong potential",
    );
    await page.locator(".incident-references summary").click();
    await expect(page.locator(".incident-references a")).toHaveCount(3);
    await expect(page.locator(".incident-references")).toContainText(
      "not medical procedures",
    );
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download incident note", exact: true })
      .click();
    expect((await download).suggestedFilename()).toBe(
      "musclemap-incident-note.json",
    );
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    await page.locator(".p-masthead [data-action=menu]").click();
    await page.locator("dialog [data-action=sources]").click();
    await expect(page.locator(".p-sources summary")).toHaveCount(5);
    await page
      .locator(".p-sources summary")
      .filter({ hasText: "NASA challenge" })
      .click();
    await expect(page.locator(".p-sources")).toContainText(
      "not executable treatment instructions",
    );
  });
}
