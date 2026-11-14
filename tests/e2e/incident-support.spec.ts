import { test, expect, type Page } from "@playwright/test";
async function incident(p: Page) {
  await p
    .getByRole("button", { name: "Incident Support", exact: true })
    .click();
  await expect(p.getByRole("dialog")).toContainText("Not validated triage");
}
test("secondary incident documentation preserves monitoring, saves once and restores only for its profile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".p-next")).toBeVisible();
  await page
    .locator("#anatomy-host")
    .evaluate((el) => (el.dataset.preservationMarker = "same atlas"));
  const before = await page.locator(".p-result").innerText();
  await incident(page);
  await expect(page.locator("nav")).toContainText("Incident Support");
  await page
    .locator("#incident-description")
    .fill("Reported sudden calf pain and swelling after an incident.");
  await page
    .getByRole("button", { name: "Show next steps", exact: true })
    .click();
  await expect(page.locator("#incident-analysis")).toContainText(
    "does not provide diagnosis or treatment instructions",
  );
  await expect(page.locator("#incident-analysis")).toContainText(
    "No approved mission procedure",
  );
  await expect(page.locator("#incident-analysis a")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Save incident locally", exact: true })
    .click();
  await expect(page.locator("#incident-error")).toContainText(
    "No message was sent",
  );
  await expect(
    page.getByRole("button", { name: "Saved locally", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).not.toBeVisible();
  expect(await page.locator(".p-result").innerText()).toBe(before);
  expect(
    await page
      .locator("#anatomy-host")
      .getAttribute("data-preservation-marker"),
  ).toBe("same atlas");
  await page.reload();
  await incident(page);
  await expect(page.locator(".h-incident-history")).toContainText(
    "Reported sudden calf pain",
  );
  await page.locator(".h-incident-history summary").click();
  await page.getByRole("button", { name: "Open note", exact: true }).click();
  await expect(page.locator("#incident-analysis")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".p-masthead [data-action=menu]").click();
  await page
    .getByRole("button", { name: "Add personal profile", exact: true })
    .click();
  await page.locator("[name=name]").fill("Another local person");
  await page
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await incident(page);
  await expect(page.locator(".h-incident-history")).toContainText(
    "No incident notes saved",
  );
  await expect(page.locator(".h-incident-history")).not.toContainText(
    "Reported sudden calf pain",
  );
});
test("no-match explicitly is not safe and cannot change muscle results", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".p-next")).toBeVisible();
  await incident(page);
  await page
    .locator("#incident-description")
    .fill("A report without a listed keyword.");
  await page
    .getByRole("button", { name: "Show next steps", exact: true })
    .click();
  await expect(page.locator("#incident-analysis")).toContainText(
    "No match cannot rule out an emergency",
  );
  await expect(page.locator("#incident-analysis")).toContainText(
    "cannot rule out an emergency",
  );
  await expect(page.locator("#incident-analysis")).toContainText("Do not wait");
});
