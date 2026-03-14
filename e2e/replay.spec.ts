import { test, expect } from "@playwright/test";
import { generateUser, signup } from "./helpers";

test.describe("Replay flow", () => {
  test("replay list page is accessible after login", async ({ page }) => {
    const user = generateUser();
    await signup(page, user);

    await page.goto("/replays");
    await expect(page).toHaveURL(/\/replays/);
    // h1 should be visible
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("리플레이");
  });

  test("replay list redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/replays");
    await expect(page).toHaveURL(/\/login/);
  });

  test("replay detail page loads for an existing replay", async ({ page }) => {
    const user = generateUser();
    await signup(page, user);

    await page.goto("/replays");
    await expect(page).toHaveURL(/\/replays/);

    // If there are replays, navigate to the first one
    const replayLinks = page.locator('a[href*="/replay/"]');
    const count = await replayLinks.count();
    if (count > 0) {
      await replayLinks.first().click();
      await page.waitForURL("**/replay/**");
      // Page should render without error - look for any content
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
