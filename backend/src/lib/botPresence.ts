import { eq } from "drizzle-orm";
import { db } from "../db";
import { bot } from "../db/schema";
import type { GameAction, GameSnapshot } from "./gameState";

export type BotTurnRequestPayload = {
  botId: string;
  roomId: string;
  playerId: string;
  userId: string;
  language: string | null;
  snapshot: GameSnapshot;
  validActions: GameAction[];
  timeoutMs: number;
};

type PendingBotTurn = {
  botId: string;
  payload: BotTurnRequestPayload;
  resolve: (action: GameAction | null) => void;
  timer: ReturnType<typeof setTimeout>;
};

const OFFLINE_GRACE_MS = 30_000;
const EXPIRY_SWEEP_MS = 5_000;

const pendingTurns = new Map<string, PendingBotTurn>();
const botPendingTurnIndex = new Map<string, string>(); // botId → requestId
const botLastSeenAt = new Map<string, number>();       // botId → timestamp
const presenceListeners = new Set<(botId: string) => void | Promise<void>>();

async function persistBotStatus(
  botId: string,
  fields: Partial<{
    presenceStatus: "online" | "offline";
    lastSeenAt: Date;
    lastError: string | null;
  }>,
) {
  await db
    .update(bot)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(bot.id, botId));
}

async function notifyBotPresenceChanged(botId: string) {
  for (const listener of presenceListeners) {
    await listener(botId);
  }
}

function clearPendingTurns(botId: string) {
  for (const [requestId, pending] of pendingTurns.entries()) {
    if (pending.botId !== botId) continue;
    clearTimeout(pending.timer);
    pending.resolve(null);
    pendingTurns.delete(requestId);
  }
  botPendingTurnIndex.delete(botId);
}

const expirySweep = setInterval(() => {
  const now = Date.now();
  for (const [botId, lastSeen] of botLastSeenAt.entries()) {
    if (now - lastSeen < OFFLINE_GRACE_MS) continue;
    botLastSeenAt.delete(botId);
    clearPendingTurns(botId);
    void persistBotStatus(botId, { presenceStatus: "offline", lastError: "Heartbeat expired" });
    void notifyBotPresenceChanged(botId);
  }
}, EXPIRY_SWEEP_MS);

expirySweep.unref?.();

export function onBotPresenceChanged(listener: (botId: string) => void | Promise<void>) {
  presenceListeners.add(listener);
  return () => presenceListeners.delete(listener);
}

export function isBotOnline(botId: string): boolean {
  const lastSeen = botLastSeenAt.get(botId);
  if (!lastSeen) return false;
  return Date.now() - lastSeen < OFFLINE_GRACE_MS;
}

export async function registerBotClientHeartbeat(botId: string): Promise<void> {
  botLastSeenAt.set(botId, Date.now());
  await persistBotStatus(botId, {
    presenceStatus: "online",
    lastSeenAt: new Date(),
    lastError: null,
  });
}

export async function requestBotActionPolling(options: {
  botId: string;
  payload: BotTurnRequestPayload;
}): Promise<GameAction | null> {
  const requestId = crypto.randomUUID();
  const timeoutMs = options.payload.timeoutMs;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingTurns.delete(requestId);
      botPendingTurnIndex.delete(options.botId);
      resolve(null);
    }, timeoutMs);

    pendingTurns.set(requestId, {
      botId: options.botId,
      payload: options.payload,
      resolve,
      timer,
    });
    botPendingTurnIndex.set(options.botId, requestId);
  });
}

export function getPollingTurnForBot(botId: string): {
  requestId: string;
  payload: BotTurnRequestPayload;
} | null {
  const requestId = botPendingTurnIndex.get(botId);
  if (!requestId) return null;
  const pending = pendingTurns.get(requestId);
  if (!pending) return null;
  return { requestId, payload: pending.payload };
}

export function resolveBotAction(
  requestId: string,
  action: GameAction | null,
  callingBotId?: string,
): boolean {
  const pending = pendingTurns.get(requestId);
  if (!pending) return false;
  if (callingBotId !== undefined && pending.botId !== callingBotId) return false;
  clearTimeout(pending.timer);
  pendingTurns.delete(requestId);
  botPendingTurnIndex.delete(pending.botId);
  pending.resolve(action);
  return true;
}
