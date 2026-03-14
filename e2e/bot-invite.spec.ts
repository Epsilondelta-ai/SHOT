import { test, expect } from "@playwright/test";
import { generateUser, signup } from "./helpers";

test.describe("Bot invite flow", () => {
  test("create bot and invite to room", async ({ page }) => {
    const user = generateUser();
    await signup(page, user);

    // Open create bot form
    await page.goto("/bots");
    await page.click('button:has-text("+ 봇 만들기")');
    // Fill bot name (no id/name attr, use placeholder)
    const botName = `TestBot${Date.now()}`;
    await page.fill('input[placeholder="봇 이름 입력"]', botName);
    // shot-llm is selected by default; submit
    await page.click('button[type="submit"]');
    // Bot should appear in list
    await page.waitForSelector(`text=${botName}`);
    await expect(page.locator(`text=${botName}`)).toBeVisible();

    // Create a room
    await page.goto("/lobby");
    await page.click('button:has-text("+ 방 만들기")');
    await page.fill('input[placeholder="방 이름을 입력하세요"]', `Bot Test ${Date.now()}`);
    await page.click('button:has-text("만들기")');
    await page.waitForURL("**/room/**");

    // Wait for room to fully load (client component with async auth fetch)
    await page.waitForLoadState("networkidle");
    // Invite bot: creator sees "봇 초대" button
    await page.waitForSelector('button:has-text("봇 초대")', { timeout: 15000 });
    await page.click('button:has-text("봇 초대")');

    // Bot should appear in the bot selection panel
    await page.waitForSelector(`text=${botName}`);
    // Click to invite the bot
    await page.click(`button:has-text("${botName}")`);

    // Bot should appear in participants list
    await page.waitForSelector(`text=${botName}`);
    await expect(page.locator(`text=${botName}`).first()).toBeVisible();
  });
});
