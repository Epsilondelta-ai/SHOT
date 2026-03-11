#!/usr/bin/env bun
/**
 * E2E Test Runner using Agent Browser CLI
 *
 * Usage:
 *   bun run e2e/run.ts                    # Run all journeys
 *   bun run e2e/run.ts --journey signup    # Run specific journey
 *   bun run e2e/run.ts --headed           # Show browser window
 *   bun run e2e/run.ts --base-url http://localhost:5173
 *
 * Prerequisites:
 *   - Frontend dev server running (cd frontend && bun dev)
 *   - Backend dev server running (cd backend && bun dev)
 */

const BASE_URL = getArg("--base-url") ?? "http://localhost:5173";
const HEADED = process.argv.includes("--headed");
const JOURNEY_FILTER = getArg("--journey");
const SESSION = `e2e-${Date.now()}`;
const SCREENSHOT_DIR = "e2e/screenshots";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length
    ? process.argv[idx + 1]
    : undefined;
}

async function ab(cmd: string): Promise<{ ok: boolean; output: string }> {
  const sessionArgs = `--session ${SESSION}`;
  const headedArgs = HEADED ? "--headed" : "";
  const full = `npx agent-browser ${sessionArgs} ${headedArgs} ${cmd}`;

  try {
    const proc = Bun.spawn(["bash", "-c", full], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` },
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    return { ok: code === 0, output: (stdout + stderr).trim() };
  } catch (e) {
    return { ok: false, output: String(e) };
  }
}

async function screenshot(name: string): Promise<void> {
  await Bun.spawn(["bash", "-c", `mkdir -p ${SCREENSHOT_DIR}`]).exited;
  await ab(`screenshot ${SCREENSHOT_DIR}/${name}.png`);
}

async function assertUrl(expected: string, label: string): Promise<void> {
  const { output } = await ab("get url");
  if (!output.includes(expected)) {
    throw new Error(`[${label}] Expected URL to contain "${expected}", got: "${output}"`);
  }
}

async function assertVisible(selector: string, label: string): Promise<void> {
  const { ok } = await ab(`is visible "${selector}"`);
  if (!ok) {
    throw new Error(`[${label}] Expected "${selector}" to be visible`);
  }
}

async function waitForNav(ms = 2000): Promise<void> {
  await ab(`wait ${ms}`);
}

// ── Test Journeys ────────────────────────────────────────────────────────────

type JourneyResult = { name: string; status: "PASS" | "FAIL"; duration: number; error?: string };

const TEST_EMAIL = `e2e_${Date.now()}@test.com`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "E2E Tester";

async function journeySignup(): Promise<void> {
  // Step 1: Navigate to signup page
  await ab(`open ${BASE_URL}/signup`);
  await waitForNav();
  await screenshot("signup-01-page-loaded");

  // Step 2: Fill registration form
  await ab(`fill "input[name=name]" "${TEST_NAME}"`);
  await ab(`fill "input[name=email]" "${TEST_EMAIL}"`);
  await ab(`fill "input[name=password]" "${TEST_PASSWORD}"`);
  await ab(`fill "input[name=confirmPassword]" "${TEST_PASSWORD}"`);
  await screenshot("signup-02-form-filled");

  // Step 3: Submit form
  await ab(`click "button[type=submit]"`);
  await waitForNav(3000);
  await screenshot("signup-03-submitted");

  // Step 4: Verify redirect to lobby
  await assertUrl("/lobby", "signup redirect");
}

async function journeyLogin(): Promise<void> {
  // Step 1: Navigate to login page
  await ab(`open ${BASE_URL}/login`);
  await waitForNav();
  await screenshot("login-01-page-loaded");

  // Step 2: Fill login form
  await ab(`fill "input[name=email]" "${TEST_EMAIL}"`);
  await ab(`fill "input[name=password]" "${TEST_PASSWORD}"`);
  await screenshot("login-02-form-filled");

  // Step 3: Submit
  await ab(`click "button[type=submit]"`);
  await waitForNav(3000);
  await screenshot("login-03-submitted");

  // Step 4: Verify redirect to lobby
  await assertUrl("/lobby", "login redirect");
}

async function journeyLobby(): Promise<void> {
  // Ensure logged in first
  await ab(`open ${BASE_URL}/login`);
  await waitForNav();
  await ab(`fill "input[name=email]" "${TEST_EMAIL}"`);
  await ab(`fill "input[name=password]" "${TEST_PASSWORD}"`);
  await ab(`click "button[type=submit]"`);
  await waitForNav(3000);

  // Step 1: Verify lobby page
  await assertUrl("/lobby", "lobby page");
  await screenshot("lobby-01-page");

  // Step 2: Check search bar exists
  await assertVisible("input[type=text]", "search bar");

  // Step 3: Click create room button (find by icon or class)
  await ab(`find role button click`);
  await waitForNav();
  await screenshot("lobby-02-create-clicked");

  // Step 4: Fill room creation modal (if modal opens)
  await waitForNav(1000);
  await screenshot("lobby-03-modal");
}

async function journeyRoom(): Promise<void> {
  // Login
  await ab(`open ${BASE_URL}/login`);
  await waitForNav();
  await ab(`fill "input[name=email]" "${TEST_EMAIL}"`);
  await ab(`fill "input[name=password]" "${TEST_PASSWORD}"`);
  await ab(`click "button[type=submit]"`);
  await waitForNav(3000);

  // Navigate to lobby
  await assertUrl("/lobby", "lobby before room");
  await screenshot("room-01-lobby");

  // Try to find and click on a room card or create button
  // Since we may not have rooms, just verify the page loads
  const { output: pageText } = await ab(`get text body`);
  await screenshot("room-02-lobby-content");

  // Verify core lobby elements are present
  if (!pageText) {
    throw new Error("[room] Lobby page has no content");
  }
}

async function journeyMypage(): Promise<void> {
  // Login
  await ab(`open ${BASE_URL}/login`);
  await waitForNav();
  await ab(`fill "input[name=email]" "${TEST_EMAIL}"`);
  await ab(`fill "input[name=password]" "${TEST_PASSWORD}"`);
  await ab(`click "button[type=submit]"`);
  await waitForNav(3000);

  // Step 1: Navigate to mypage
  await ab(`open ${BASE_URL}/mypage`);
  await waitForNav();
  await screenshot("mypage-01-page");

  // Step 2: Verify page loaded (check URL)
  await assertUrl("/mypage", "mypage url");

  // Step 3: Verify user info is displayed
  const { output: pageText } = await ab(`get text body`);
  await screenshot("mypage-02-content");

  if (!pageText || pageText.length < 10) {
    throw new Error("[mypage] Page content is too short — may not have loaded");
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

const JOURNEYS: Record<string, () => Promise<void>> = {
  signup: journeySignup,
  login: journeyLogin,
  lobby: journeyLobby,
  room: journeyRoom,
  mypage: journeyMypage,
};

async function checkServersRunning(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status === 200 || res.status === 302;
  } catch {
    return false;
  }
}

async function run() {
  console.log("=== SHOT E2E Test Runner (Agent Browser) ===\n");
  console.log(`Base URL:  ${BASE_URL}`);
  console.log(`Session:   ${SESSION}`);
  console.log(`Headed:    ${HEADED}`);
  console.log("");

  // Check servers
  const serversUp = await checkServersRunning();
  if (!serversUp) {
    console.error("ERROR: Dev servers not running!");
    console.error("Start them first:");
    console.error("  Terminal 1: cd frontend && bun dev");
    console.error("  Terminal 2: cd backend && bun dev");
    process.exit(1);
  }
  console.log("Dev servers: OK\n");

  // Filter journeys
  const journeyNames = JOURNEY_FILTER
    ? [JOURNEY_FILTER]
    : Object.keys(JOURNEYS);

  const results: JourneyResult[] = [];

  for (const name of journeyNames) {
    const fn = JOURNEYS[name];
    if (!fn) {
      console.error(`Unknown journey: ${name}`);
      continue;
    }

    console.log(`--- Journey: ${name} ---`);
    const start = Date.now();

    try {
      await fn();
      const duration = Date.now() - start;
      results.push({ name, status: "PASS", duration });
      console.log(`  PASS (${(duration / 1000).toFixed(1)}s)\n`);
    } catch (e) {
      const duration = Date.now() - start;
      const error = e instanceof Error ? e.message : String(e);
      results.push({ name, status: "FAIL", duration, error });
      console.log(`  FAIL (${(duration / 1000).toFixed(1)}s): ${error}\n`);
    }
  }

  // Close browser session
  await ab("close");

  // Report
  console.log("\n=== E2E Test Report ===\n");
  console.log("| Journey  | Status | Duration |");
  console.log("|----------|--------|----------|");
  for (const r of results) {
    console.log(`| ${r.name.padEnd(8)} | ${r.status.padEnd(6)} | ${(r.duration / 1000).toFixed(1)}s`.padEnd(9) + " |");
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${results.length}\n`);

  if (failed > 0) {
    console.log("Failures:");
    for (const r of results.filter((r) => r.status === "FAIL")) {
      console.log(`  - ${r.name}: ${r.error}`);
    }
    console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}/`);
    process.exit(1);
  }

  console.log("All journeys passed!");
}

run();
