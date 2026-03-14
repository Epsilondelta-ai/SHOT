#!/usr/bin/env bun
/**
 * SHOT! Bot Connector
 *
 * 사용법:
 *   SHOT_BOT_API_KEY=<API키> bun shot-bot.ts
 *
 * 실행하면 모드를 선택하라는 프롬프트가 표시됩니다:
 *   1) autonomous   — 빈 방을 자동으로 찾아 참가
 *   2) follow-owner — 봇 소유자가 방에 들어가면 자동으로 따라 참가
 *
 * 환경 변수:
 *   SHOT_BOT_API_KEY - 봇 API 키 (필수)
 *   SHOT_API_URL     - SHOT 서버 URL (기본값: http://localhost:3001)
 */

import { createInterface } from "node:readline";

const BASE_URL = (process.env.SHOT_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const API_KEY = process.env.SHOT_BOT_API_KEY ?? "";
const POLL_MS = 3_000;
const HEARTBEAT_MS = 25_000;

if (!API_KEY) {
  console.error("오류: SHOT_BOT_API_KEY 환경 변수가 필요합니다.");
  process.exit(1);
}

const authHeaders = {
  Authorization: `Bot ${API_KEY}`,
  "Content-Type": "application/json",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type BotInfo = {
  id: string;
  name: string;
  presenceStatus: "online" | "offline";
  active: boolean;
};

type Room = {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
};

type GameSnapshot = {
  roomId: string;
  phase: "chatting" | "acting" | "finished";
  myPlayerId: string | null;
  myTeam: "agents" | "spies" | "draw" | null;
  mustUseAttack: boolean;
  canReveal: boolean;
  winnerTeam: string | null;
  players: Array<{
    id: string;
    name: string;
    hp: number;
    alive: boolean;
    isJailed: boolean;
    role: "normal" | "spy" | "leader" | "revealed";
    attacks: number;
    verified: boolean;
  }>;
};

type BotTurnPayload = {
  snapshot: GameSnapshot;
  validActions: GameAction[];
};

type TurnResult =
  | { hasTurn: false }
  | { hasTurn: true; requestId: string; payload: BotTurnPayload };

type GameAction =
  | { type: "chat"; text: string }
  | { type: "skip-chat" }
  | { type: "reveal" }
  | { type: "play-card"; card: "attack" | "heal" | "jail" | "verify"; targetId?: string }
  | { type: "end-turn" };

// ── API helpers ───────────────────────────────────────────────────────────────

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`${method} ${path} → ${res.status}: ${err.error ?? JSON.stringify(err)}`);
  }
  return res.json() as Promise<T>;
}

const getMe = () => api<BotInfo>("GET", "/api/bot-client/me");
const heartbeat = () => api<{ ok: boolean }>("POST", "/api/bot-client/heartbeat");
const joinRoom = (roomId: string) =>
  api<{ success: boolean }>("POST", `/api/bot-client/rooms/${roomId}/join`);
const leaveRoom = (roomId: string) =>
  api("DELETE", `/api/bot-client/rooms/${roomId}/leave`).catch(() => {});
const checkTurn = (roomId: string) =>
  api<TurnResult>("GET", `/api/bot-client/games/${roomId}/turn`);
const submitAction = (roomId: string, requestId: string, action: GameAction) =>
  api("POST", `/api/bot-client/games/${roomId}/actions`, { requestId, action });

// ── Mode Selection ────────────────────────────────────────────────────────────

async function promptMode(): Promise<"autonomous" | "follow-owner"> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(
      "\n모드를 선택하세요:\n  1) autonomous   — 빈 방 자동 탐색\n  2) follow-owner — 내 방에 자동 참가\n선택 (1/2): ",
      (answer) => {
        rl.close();
        const a = answer.trim();
        if (a === "1" || a === "autonomous") {
          resolve("autonomous");
        } else if (a === "2" || a === "follow-owner") {
          resolve("follow-owner");
        } else {
          console.error(`\n잘못된 입력: "${a}". 1 또는 2를 입력하세요.`);
          process.exit(1);
        }
      },
    );
  });
}

// ── Room Discovery ────────────────────────────────────────────────────────────

async function findRoom(mode: "autonomous" | "follow-owner"): Promise<Room | null> {
  if (mode === "follow-owner") {
    const { room } = await api<{ room: Room | null }>("GET", "/api/bot-client/rooms/follow");
    return room;
  }
  const rooms = await api<Room[]>("GET", "/api/bot-client/rooms?exclude_joined=1");
  return rooms[0] ?? null;
}

// ── Game strategy ─────────────────────────────────────────────────────────────

function decideAction(snapshot: GameSnapshot): GameAction {
  if (snapshot.phase === "chatting") {
    return { type: "skip-chat" };
  }

  if (snapshot.phase !== "acting") {
    return { type: "end-turn" };
  }

  const me = snapshot.players.find((p) => p.id === snapshot.myPlayerId);
  if (!me?.alive) return { type: "end-turn" };

  const others = snapshot.players.filter((p) => p.alive && p.id !== snapshot.myPlayerId);
  const isSpy = snapshot.myTeam === "spies";

  if (snapshot.mustUseAttack) {
    let target: (typeof others)[0] | undefined;

    if (isSpy) {
      // 스파이: 리더(캡틴)를 우선 공격, 그 다음 일반 에이전트
      target =
        others.find((p) => p.role === "leader") ??
        others.find((p) => p.role !== "spy" && p.role !== "revealed") ??
        others[0];
    } else {
      // 에이전트: 밝혀진 스파이를 우선 공격
      target =
        others.find((p) => p.role === "revealed") ??
        others.find((p) => !p.verified && p.role === "normal") ??
        others[0];
    }

    if (target) {
      return { type: "play-card", card: "attack", targetId: target.id };
    }
  }

  return { type: "end-turn" };
}

// ── Game loop ─────────────────────────────────────────────────────────────────

async function playGame(roomId: string): Promise<void> {
  console.log(`[game] 게임 시작 — 방 ${roomId}`);
  let errors = 0;

  while (true) {
    try {
      const turn = await checkTurn(roomId);

      if (!turn.hasTurn) {
        await Bun.sleep(POLL_MS);
        errors = 0;
        continue;
      }

      const { requestId, payload } = turn;
      const snapshot = payload.snapshot;

      if (snapshot.winnerTeam) {
        console.log(`[game] 게임 종료 — 승리팀: ${snapshot.winnerTeam}`);
        return;
      }

      const action = decideAction(snapshot);
      await submitAction(roomId, requestId, action);
      console.log(`[game] 액션 제출: ${JSON.stringify(action)}`);
      errors = 0;
    } catch (err) {
      errors++;
      console.error(`[game] 오류 (${errors}):`, err);
      if (errors >= 5) {
        console.error("[game] 오류가 너무 많아 방을 나갑니다.");
        return;
      }
      await Bun.sleep(POLL_MS * errors);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 봇 연결 확인
  let botInfo: BotInfo;
  try {
    botInfo = await getMe();
    console.log(`[bot] 연결됨: ${botInfo.name}`);
  } catch (err) {
    console.error("[bot] 연결 실패:", err);
    process.exit(1);
  }

  if (!botInfo.active) {
    console.error("[bot] 봇이 비활성화되어 있습니다. 설정 페이지에서 활성화하세요.");
    process.exit(1);
  }

  // 모드 선택 (항상 사용자에게 묻기)
  const mode = await promptMode();
  console.log(`[bot] 모드: ${mode}`);

  // 하트비트 루프 시작
  const hbTimer = setInterval(() => {
    heartbeat().catch(() => {});
  }, HEARTBEAT_MS);
  await heartbeat().catch(() => {});
  console.log("[bot] 하트비트 시작");

  let currentRoomId: string | null = null;

  // 메인 루프
  while (true) {
    try {
      const isActive = await getMe().then((b) => b.active).catch(() => false);
      if (!isActive) {
        console.log("[bot] 봇이 비활성화되었습니다. 종료합니다.");
        break;
      }

      const room = await findRoom(mode);

      if (!room) {
        await Bun.sleep(POLL_MS);
        continue;
      }

      if (currentRoomId !== room.id) {
        console.log(`[bot] 방 참가: ${room.name} (${room.id})`);
        await joinRoom(room.id);
        currentRoomId = room.id;
        console.log("[bot] 방 참가 완료");
      }

      await playGame(currentRoomId);

      await leaveRoom(currentRoomId);
      currentRoomId = null;

      await Bun.sleep(POLL_MS);
    } catch (err) {
      console.error("[bot] 메인 루프 오류:", err);
      if (currentRoomId) {
        await leaveRoom(currentRoomId);
        currentRoomId = null;
      }
      await Bun.sleep(POLL_MS * 2);
    }
  }

  clearInterval(hbTimer);
  console.log("[bot] 종료됨.");
}

main();
