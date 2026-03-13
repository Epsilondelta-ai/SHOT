import { eq } from "drizzle-orm";
import { db } from "../db";
import { bot } from "../db/schema";
import type { GameAction } from "./gameState";
import type { BotTurnRequestPayload } from "./botProtocol";

type WsLike = {
  send: (payload: string) => void;
  close?: () => void;
};

type BotConnection = {
  botId: string;
  ws: WsLike;
  connectorId: string | null;
  connectorName: string | null;
  connectorVersion: string | null;
  deviceId: string | null;
  lastSeenAt: number;
};

type PendingBotTurn = {
  botId: string;
  resolve: (action: GameAction | null) => void;
  timer: ReturnType<typeof setTimeout>;
};

const OFFLINE_GRACE_MS = 30_000;
const EXPIRY_SWEEP_MS = 5_000;

const botConnections = new Map<string, BotConnection>();
const pendingTurns = new Map<string, PendingBotTurn>();
const presenceListeners = new Set<(botId: string) => void | Promise<void>>();

async function persistBotStatus(
  botId: string,
  fields: Partial<{
    presenceStatus: "online" | "offline";
    lastSeenAt: Date;
    connectorId: string | null;
    connectorName: string | null;
    connectorVersion: string | null;
    deviceId: string | null;
    lastError: string | null;
  }>,
) {
  await db
    .update(bot)
    .set({
      ...fields,
      updatedAt: new Date(),
    })
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
}

const expirySweep = setInterval(() => {
  const now = Date.now();
  for (const [botId, connection] of botConnections.entries()) {
    if (now - connection.lastSeenAt < OFFLINE_GRACE_MS) continue;
    void unregisterBotConnection(botId, "Connector heartbeat expired");
    connection.ws.close?.();
  }
}, EXPIRY_SWEEP_MS);

expirySweep.unref?.();

export function onBotPresenceChanged(listener: (botId: string) => void | Promise<void>) {
  presenceListeners.add(listener);
  return () => presenceListeners.delete(listener);
}

export async function registerBotConnection(connection: Omit<BotConnection, "lastSeenAt">) {
  const existing = botConnections.get(connection.botId);
  if (existing && existing.ws !== connection.ws) {
    existing.ws.close?.();
  }

  botConnections.set(connection.botId, {
    ...connection,
    lastSeenAt: Date.now(),
  });

  await persistBotStatus(connection.botId, {
    presenceStatus: "online",
    lastSeenAt: new Date(),
    connectorId: connection.connectorId,
    connectorName: connection.connectorName,
    connectorVersion: connection.connectorVersion,
    deviceId: connection.deviceId,
    lastError: null,
  });
  await notifyBotPresenceChanged(connection.botId);
}

export async function refreshBotConnection(botId: string) {
  const connection = botConnections.get(botId);
  if (!connection) return;
  connection.lastSeenAt = Date.now();

  await persistBotStatus(botId, {
    presenceStatus: "online",
    lastSeenAt: new Date(connection.lastSeenAt),
    lastError: null,
  });
}

export async function unregisterBotConnection(botId: string, lastError: string | null = null) {
  if (!botConnections.has(botId)) return;
  botConnections.delete(botId);
  clearPendingTurns(botId);

  await persistBotStatus(botId, {
    presenceStatus: "offline",
    lastSeenAt: new Date(),
    lastError,
  });
  await notifyBotPresenceChanged(botId);
}

export function getBotConnection(botId: string): BotConnection | null {
  return botConnections.get(botId) ?? null;
}

export function isBotOnline(botId: string): boolean {
  const connection = botConnections.get(botId);
  if (!connection) return false;
  return Date.now() - connection.lastSeenAt < OFFLINE_GRACE_MS;
}

export function getBotLastSeenAt(botId: string): Date | null {
  const connection = botConnections.get(botId);
  return connection ? new Date(connection.lastSeenAt) : null;
}

export function getBotConnectionMeta(botId: string) {
  const connection = botConnections.get(botId);
  if (!connection) return null;

  return {
    connectorId: connection.connectorId,
    connectorName: connection.connectorName,
    connectorVersion: connection.connectorVersion,
    deviceId: connection.deviceId,
    lastSeenAt: new Date(connection.lastSeenAt),
  };
}

export async function requestBotAction(options: {
  botId: string;
  payload: BotTurnRequestPayload;
}): Promise<GameAction | null> {
  const connection = botConnections.get(options.botId);
  if (!connection) return null;

  const requestId = crypto.randomUUID();
  const timeoutMs = options.payload.timeoutMs;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingTurns.delete(requestId);
      resolve(null);
    }, timeoutMs);

    pendingTurns.set(requestId, {
      botId: options.botId,
      resolve,
      timer,
    });

    try {
      connection.ws.send(
        JSON.stringify({
          type: "turn_request",
          requestId,
          payload: options.payload,
        }),
      );
    } catch {
      clearTimeout(timer);
      pendingTurns.delete(requestId);
      resolve(null);
    }
  });
}

export function resolveBotAction(requestId: string, action: GameAction | null) {
  const pending = pendingTurns.get(requestId);
  if (!pending) return false;
  clearTimeout(pending.timer);
  pendingTurns.delete(requestId);
  pending.resolve(action);
  return true;
}
