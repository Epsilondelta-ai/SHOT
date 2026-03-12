import Elysia from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { session, room } from "../db/schema";
import {
  applyGameAction,
  createSnapshot,
  deleteGame,
  getGame,
  type GameAction,
} from "../lib/gameState";
import { maybeRunLlmTurn } from "../lib/llmPlayer";
import { recordFrame, recordGameEnd, recordSpectator } from "../lib/replayStore";


type WsUser = {
  userId: string;
  roomId: string;
  isSpectator: boolean;
};

// roomId → Set of ws ids
const gameSockets = new Map<string, Set<string>>();
// ws id → ws object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsById = new Map<string, any>();
// ws id → authenticated user data
const wsUserData = new Map<string, WsUser>();
// rooms already scheduled for cleanup
const scheduledCleanups = new Set<string>();
// userId → Set of ws ids (per-user connection limit)
const userConnections = new Map<string, Set<string>>();
const MAX_CONNECTIONS_PER_USER = 5;
// ws id → message timestamps for rate limiting
const wsMessageTimestamps = new Map<string, number[]>();
const WS_RATE_LIMIT = 30; // messages per minute

const GAME_END_DELAY_MS = 30_000;

function scheduleGameEnd(roomId: string): void {
  if (scheduledCleanups.has(roomId)) return;
  scheduledCleanups.add(roomId);

  setTimeout(async () => {
    // Broadcast redirect to all connected clients
    const ids = gameSockets.get(roomId);
    if (ids) {
      for (const id of ids) {
        wsById.get(id)?.send(JSON.stringify({ type: "redirect", url: `/room/${roomId}` }));
      }
    }
    // Reset room status and clean up in-memory state
    await db.update(room).set({ status: "waiting" }).where(eq(room.id, roomId));
    deleteGame(roomId);
    scheduledCleanups.delete(roomId);
  }, GAME_END_DELAY_MS);
}

// @MX:ANCHOR: broadcastGameState is called from gameWs, games.ts routes, llmPlayer
// @MX:REASON: [AUTO] fan_in >= 3 — single convergence point for all game state changes and replay recording
export async function broadcastGameState(roomId: string): Promise<void> {
  const state = getGame(roomId);

  // Record replay frame for every state change (human + LLM + HTTP paths)
  if (state && !state.winnerTeam) {
    recordFrame(roomId, null);
  }

  const ids = gameSockets.get(roomId);
  if (!ids) return;

  for (const id of ids) {
    const userData = wsUserData.get(id);
    if (!userData) continue;
    const ws = wsById.get(id);
    if (!ws) continue;

    try {
      const snapshot = createSnapshot(roomId, userData.userId, {
        allowSpectator: userData.isSpectator,
      });
      ws.send(JSON.stringify({ type: "game_state", snapshot }));
    } catch {
      // viewer may have left the game; skip
    }
  }

  if (state?.winnerTeam) {
    recordGameEnd(roomId, state.winnerTeam);
    scheduleGameEnd(roomId);
  }
}

export const gameWsPlugin = new Elysia().ws("/ws/game/:roomId", {
  async open(ws) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = ws.data as any;
    const roomId = ctx.params?.roomId as string;
    const rawCookie = (ctx.headers?.cookie ?? "") as string;
    const tokenMatch = rawCookie.match(/better-auth\.session_token=([^;]+)/);

    if (!tokenMatch) {
      ws.close();
      return;
    }

    const rawToken = decodeURIComponent(tokenMatch[1]);
    const decodedToken = rawToken.split(".")[0];
    const sess = await db.query.session.findFirst({
      where: eq(session.token, decodedToken),
      with: { user: true },
    });

    if (!sess || sess.expiresAt < new Date()) {
      ws.close();
      return;
    }

    const wsId = (ws as any).id as string;

    const userConns = userConnections.get(sess.userId) ?? new Set();
    if (userConns.size >= MAX_CONNECTIONS_PER_USER) {
      ws.close();
      return;
    }
    userConns.add(wsId);
    userConnections.set(sess.userId, userConns);

    if (!getGame(roomId)) {
      ws.send(JSON.stringify({ type: "error", message: "Game not found." }));
      ws.close();
      return;
    }

    const isSpectator = ctx.query?.spectator === "1";
    wsById.set(wsId, ws);
    wsUserData.set(wsId, { userId: sess.userId, roomId, isSpectator });

    if (!gameSockets.has(roomId)) gameSockets.set(roomId, new Set());
    gameSockets.get(roomId)!.add(wsId);

    if (isSpectator) {
      recordSpectator(roomId, sess.userId);
    }

    try {
      const snapshot = createSnapshot(roomId, sess.userId, { allowSpectator: isSpectator });
      ws.send(JSON.stringify({ type: "game_state", snapshot }));
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Unable to load game state." }));
    }
  },

  async message(ws, rawMessage) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsId = (ws as any).id as string;
    const userData = wsUserData.get(wsId);
    if (!userData) return;

    const now = Date.now();
    const timestamps = wsMessageTimestamps.get(wsId) ?? [];
    const recentTimestamps = timestamps.filter(t => now - t < 60_000);
    if (recentTimestamps.length >= WS_RATE_LIMIT) return;
    recentTimestamps.push(now);
    wsMessageTimestamps.set(wsId, recentTimestamps);

    const { roomId, userId, isSpectator } = userData;

    if (isSpectator) return;

    let action: GameAction;
    try {
      const text =
        typeof rawMessage === "string"
          ? rawMessage
          : JSON.stringify(rawMessage);
      action = JSON.parse(text) as GameAction;
    } catch {
      return;
    }

    try {
      applyGameAction(roomId, userId, action);
      await broadcastGameState(roomId);
      void maybeRunLlmTurn(roomId);
    } catch {
      const message = "Invalid action";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ws as any).send(JSON.stringify({ type: "error", message }));
    }
  },

  close(ws) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsId = (ws as any).id as string;
    const userData = wsUserData.get(wsId);
    const roomId = userData?.roomId;

    if (roomId) gameSockets.get(roomId)?.delete(wsId);
    wsById.delete(wsId);
    wsUserData.delete(wsId);
    if (roomId && gameSockets.get(roomId)?.size === 0)
      gameSockets.delete(roomId);

    if (userData) {
      const userConns = userConnections.get(userData.userId);
      if (userConns) {
        userConns.delete(wsId);
        if (userConns.size === 0) userConnections.delete(userData.userId);
      }
    }
    wsMessageTimestamps.delete(wsId);
  },
});
