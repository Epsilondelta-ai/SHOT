import { test, expect } from "@playwright/test";
import { generateUser, signup } from "./helpers";

test.describe("Human play flow", () => {
  test("create room and start game with 2 players", async ({ browser }) => {
    // Player 1: create room
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const user1 = generateUser();
    await signup(page1, user1);

    // Open create room form
    const roomName = `Test Room ${Date.now()}`;
    await page1.click('button:has-text("+ 방 만들기")');
    await page1.fill('input[placeholder="방 이름을 입력하세요"]', roomName);
    await page1.click('button:has-text("만들기")');
    await page1.waitForURL("**/room/**");
    const roomId = page1.url().split("/room/")[1];

    // Player 2: join room as player
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const user2 = generateUser();
    await signup(page2, user2);
    await page2.goto(`/room/${roomId}`);
    await page2.waitForSelector('button:has-text("플레이어로 참가")', { timeout: 15000 });
    await page2.click('button:has-text("플레이어로 참가")');
    // Wait for role indicator to confirm join
    await page2.waitForSelector('text=현재 역할', { timeout: 10000 });

    // Player 1: wait for polling to detect 2nd player (button becomes enabled)
    await page1.waitForSelector('button:has-text("게임 시작"):not([disabled])', { timeout: 15000 });
    await page1.click('button:has-text("게임 시작")');

    // Player 1 should navigate to game page
    await page1.waitForURL("**/game/**");
    await expect(page1).toHaveURL(/\/game\//);

    await context1.close();
    await context2.close();
  });
});
