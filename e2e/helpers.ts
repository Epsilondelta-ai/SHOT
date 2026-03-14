import { Page } from "@playwright/test";

let userCounter = 0;

export function generateUser() {
  const id = ++userCounter + Date.now();
  return {
    username: `testuser${id}`,
    email: `test${id}@shot.test`,
    password: "TestPass123!",
  };
}

export async function signup(page: Page, user: ReturnType<typeof generateUser>) {
  await page.goto("/signup");
  await page.fill("#username", user.username);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/lobby");
}

export async function login(page: Page, user: ReturnType<typeof generateUser>) {
  await page.goto("/login");
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/lobby");
}

export async function createRoom(page: Page, roomName: string): Promise<string> {
  await page.goto("/lobby");
  // Open the create room form
  await page.click('button:has-text("+ 방 만들기")');
  // Fill room name input (no name/id attr, use placeholder)
  await page.fill('input[placeholder="방 이름을 입력하세요"]', roomName);
  await page.click('button:has-text("만들기")');
  await page.waitForURL("**/room/**");
  const url = page.url();
  return url.split("/room/")[1];
}
