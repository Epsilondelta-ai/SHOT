import { test, expect } from "@playwright/test";
import { generateUser, signup } from "./helpers";

test.describe("Spectate flow", () => {
  test("spectator can join a room as spectator", async ({ browser }) => {
    // Player 1: create room
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const user1 = generateUser();
    await signup(page1, user1);

    await page1.click('button:has-text("+ 방 만들기")');
    await page1.fill('input[placeholder="방 이름을 입력하세요"]', `Spectate Test ${Date.now()}`);
    await page1.click('button:has-text("만들기")');
    await page1.waitForURL("**/room/**");
    const roomId = page1.url().split("/room/")[1];

    // Spectator joins
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    const user2 = generateUser();
    await signup(page2, user2);
    await page2.goto(`/room/${roomId}`);

    // Look for spectator join button
    await page2.waitForSelector('button:has-text("관전자로 참가")');
    await page2.click('button:has-text("관전자로 참가")');

    // Should show spectator role indicator
    await page2.waitForSelector('text=관전자');
    await expect(page2.locator('text=관전자').first()).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });
});
