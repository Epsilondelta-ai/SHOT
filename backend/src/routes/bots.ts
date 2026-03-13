import Elysia from "elysia";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { bot } from "../db/schema";
import { createConnectorToken, createPairingCode, hashBotSecret } from "../lib/botAuth";
import { getOwnedBot, listBotsForUser, serializeBot } from "../lib/bots";
import { requireUser } from "../lib/getUser";

const PAIRING_WINDOW_MS = 10 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 10_000;

function createWsUrl(request: Request, botId: string, connectorToken: string) {
  const url = new URL(request.url);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/bot-connector";
  url.search = new URLSearchParams({
    botId,
    token: connectorToken,
  }).toString();
  return url.toString();
}

export const botRoutes = new Elysia()
  .get("/api/bots", async ({ request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    return listBotsForUser(user.id);
  })

  .post("/api/bots", async ({ request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const body = (await request.json()) as { name?: string; active?: boolean };
    if (!body.name?.trim()) {
      set.status = 400;
      return { error: "Name is required" };
    }

    const [createdBot] = await db
      .insert(bot)
      .values({
        userId: user.id,
        name: body.name.trim(),
        provider: "openclaw",
        active: body.active ?? true,
        pairingStatus: "unpaired",
        presenceStatus: "offline",
        apiKey: "",
      })
      .returning();

    return { success: true, bot: serializeBot(createdBot) };
  })

  .put("/api/bots/:id", async ({ params, request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const existingBot = await getOwnedBot(params.id, user.id);
    if (!existingBot) {
      set.status = 404;
      return { error: "Bot not found" };
    }

    const body = (await request.json()) as { name?: string; active?: boolean };
    if (!body.name?.trim()) {
      set.status = 400;
      return { error: "Name is required" };
    }

    await db
      .update(bot)
      .set({
        name: body.name.trim(),
        active: body.active ?? true,
        updatedAt: new Date(),
      })
      .where(eq(bot.id, params.id));

    const updatedBot = await getOwnedBot(params.id, user.id);
    return { success: true, bot: updatedBot ? serializeBot(updatedBot) : null };
  })

  .delete("/api/bots/:id", async ({ params, request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const existingBot = await getOwnedBot(params.id, user.id);
    if (!existingBot) {
      set.status = 404;
      return { error: "Bot not found" };
    }

    await db.delete(bot).where(eq(bot.id, params.id));
    return { success: true };
  })

  .post("/api/bots/:id/pair/start", async ({ params, request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const existingBot = await getOwnedBot(params.id, user.id);
    if (!existingBot) {
      set.status = 404;
      return { error: "Bot not found" };
    }

    const pairingCode = createPairingCode();
    const expiresAt = new Date(Date.now() + PAIRING_WINDOW_MS);

    await db
      .update(bot)
      .set({
        pairingStatus: "pairing",
        presenceStatus: "offline",
        pairingCode,
        pairingCodeExpiresAt: expiresAt,
        connectorTokenHash: null,
        connectorId: null,
        connectorName: null,
        connectorVersion: null,
        deviceId: null,
        lastSeenAt: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(bot.id, params.id));

    return {
      success: true,
      pairingCode,
      expiresAt: expiresAt.toISOString(),
    };
  })

  .post("/api/bots/:id/pair/cancel", async ({ params, request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const existingBot = await getOwnedBot(params.id, user.id);
    if (!existingBot) {
      set.status = 404;
      return { error: "Bot not found" };
    }

    await db
      .update(bot)
      .set({
        pairingStatus: existingBot.connectorTokenHash ? "paired" : "unpaired",
        presenceStatus: "offline",
        pairingCode: null,
        pairingCodeExpiresAt: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(bot.id, params.id));

    return { success: true };
  })

  .post("/api/bots/pair/redeem", async ({ request, set }) => {
    const body = (await request.json()) as {
      pairingCode?: string;
      connectorId?: string;
      connectorName?: string;
      connectorVersion?: string;
      deviceId?: string;
    };

    const pairingCode = body.pairingCode?.trim().toUpperCase();
    if (!pairingCode) {
      set.status = 400;
      return { error: "Pairing code is required" };
    }

    const pendingBot = await db.query.bot.findFirst({
      where: and(eq(bot.pairingCode, pairingCode), gt(bot.pairingCodeExpiresAt, new Date())),
    });

    if (!pendingBot) {
      set.status = 404;
      return { error: "Pairing code not found or expired" };
    }

    const connectorToken = createConnectorToken();
    const connectorId = body.connectorId?.trim() || crypto.randomUUID();

    await db
      .update(bot)
      .set({
        pairingStatus: "paired",
        presenceStatus: "offline",
        pairingCode: null,
        pairingCodeExpiresAt: null,
        connectorTokenHash: hashBotSecret(connectorToken),
        connectorId,
        connectorName: body.connectorName?.trim() || pendingBot.connectorName || null,
        connectorVersion: body.connectorVersion?.trim() || pendingBot.connectorVersion || null,
        deviceId: body.deviceId?.trim() || pendingBot.deviceId || null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(bot.id, pendingBot.id));

    return {
      success: true,
      botId: pendingBot.id,
      connectorId,
      connectorToken,
      wsUrl: createWsUrl(request, pendingBot.id, connectorToken),
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    };
  });
