import Elysia from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { bot } from "../db/schema";
import { hashBotSecret } from "../lib/botAuth";
import type { BotConnectorClientMessage } from "../lib/botProtocol";
import {
  refreshBotConnection,
  registerBotConnection,
  resolveBotAction,
  unregisterBotConnection,
} from "../lib/botPresence";

const HEARTBEAT_INTERVAL_MS = 10_000;
const wsBotIds = new Map<string, string>();

export const botConnectorWsPlugin = new Elysia().ws("/ws/bot-connector", {
  async open(ws) {
    const ctx = ws.data as any;
    const botId = (ctx.query?.botId ?? "") as string;
    const token = (ctx.query?.token ?? "") as string;

    if (!botId || !token) {
      ws.send(JSON.stringify({ type: "error", message: "Missing bot connector credentials." }));
      ws.close();
      return;
    }

    const botRecord = await db.query.bot.findFirst({
      where: eq(bot.id, botId),
    });

    if (
      !botRecord ||
      !botRecord.active ||
      botRecord.pairingStatus !== "paired" ||
      !botRecord.connectorTokenHash ||
      botRecord.connectorTokenHash !== hashBotSecret(token)
    ) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid bot connector credentials." }));
      ws.close();
      return;
    }

    const connectorId = ((ctx.query?.connectorId as string | undefined) ?? botRecord.connectorId ?? null)?.trim() || null;
    const connectorName = ((ctx.query?.connectorName as string | undefined) ?? botRecord.connectorName ?? null)?.trim() || null;
    const connectorVersion = ((ctx.query?.connectorVersion as string | undefined) ?? botRecord.connectorVersion ?? null)?.trim() || null;
    const deviceId = ((ctx.query?.deviceId as string | undefined) ?? botRecord.deviceId ?? null)?.trim() || null;
    const wsId = (ws as any).id as string;

    wsBotIds.set(wsId, botId);
    await registerBotConnection({
      botId,
      ws,
      connectorId,
      connectorName,
      connectorVersion,
      deviceId,
    });

    ws.send(
      JSON.stringify({
        type: "hello_ack",
        botId,
        heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      }),
    );
  },

  async message(ws, rawMessage) {
    const wsId = (ws as any).id as string;
    const botId = wsBotIds.get(wsId);
    if (!botId) return;

    let msg: BotConnectorClientMessage;
    try {
      const text = typeof rawMessage === "string" ? rawMessage : JSON.stringify(rawMessage);
      msg = JSON.parse(text);
    } catch {
      return;
    }

    if (msg.type === "heartbeat") {
      if (msg.botId !== botId) return;
      await refreshBotConnection(botId);
      return;
    }

    if (msg.type === "action_result") {
      if (msg.botId !== botId) return;
      resolveBotAction(msg.requestId, msg.action ?? null);
    }
  },

  async close(ws) {
    const wsId = (ws as any).id as string;
    const botId = wsBotIds.get(wsId);
    wsBotIds.delete(wsId);
    if (!botId) return;
    await unregisterBotConnection(botId);
  },
});
