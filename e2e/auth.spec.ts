import { test, expect } from "@playwright/test";
import { generateUser, signup, login } from "./helpers";

test.describe("Auth flow", () => {
  test("signup redirects to lobby", async ({ page }) => {
    const user = generateUser();
    await page.goto("/signup");
    await page.fill("#username", user.username);
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/lobby");
    await expect(page).toHaveURL(/\/lobby/);
  });

  test("login with valid credentials redirects to lobby", async ({ page }) => {
    const user = generateUser();
    await signup(page, user);
    // logout
    await page.click('button:has-text("로그아웃")');
    await page.waitForURL("**/login");
    // login again
    await login(page, user);
    await expect(page).toHaveURL(/\/lobby/);
  });

  test("logout clears session and protected routes redirect to login", async ({ page }) => {
    const user = generateUser();
    await signup(page, user);
    await page.click('button:has-text("로그아웃")');
    await page.waitForURL("**/login");
    // Verify protected route redirects to login
    await page.goto("/lobby");
    await expect(page).toHaveURL(/\/login/);
  });
});
