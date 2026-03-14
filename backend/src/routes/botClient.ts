import Elysia from "elysia";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db";
import { bot, room, roomPlayer } from "../db/schema";
import { requireBotClient } from "../lib/botClientAuth";
import { isBotBusy } from "../lib/bots";
import {
  getPollingTurnForBot,
  registerBotClientHeartbeat,
  resolveBotAction,
} from "../lib/botPresence";
import {
  createSnapshot,
  getGame,
} from "../lib/gameState";
import { broadcastPlayers } from "../ws/roomWs";

async function getRoomPlayerCount(roomId: string): Promise<number> {
  const [{ playerCount }] = await db
    .select({ playerCount: count(roomPlayer.id) })
    .from(roomPlayer)
    .where(eq(roomPlayer.roomId, roomId));
  return playerCount;
}

async function getBotRoomPlayer(roomId: string, botId: string) {
  return db.query.roomPlayer.findFirst({
    where: and(eq(roomPlayer.roomId, roomId), eq(roomPlayer.botId, botId)),
  });
}

export const botClientRoutes = new Elysia()

  // ── Identity ──────────────────────────────────────────────────────────────

  .get("/api/bot-client/me", async ({ request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    return {
      id: botRecord.id,
      name: botRecord.name,
      clientMode: botRecord.clientMode,
      followUserId: botRecord.followUserId,
      presenceStatus: botRecord.presenceStatus,
      active: botRecord.active,
      createdAt: botRecord.createdAt,
    };
  })

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  .post("/api/bot-client/heartbeat", async ({ request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    await registerBotClientHeartbeat(botRecord.id);
    return { ok: true, lastSeenAt: new Date().toISOString() };
  })

  // ── Room Discovery ────────────────────────────────────────────────────────

  .get("/api/bot-client/rooms", async ({ request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    const url = new URL(request.url);
    const excludeJoined = url.searchParams.get("exclude_joined") === "1";

    const rooms = await db
      .select({
        id: room.id,
        name: room.name,
        icon: room.icon,
        maxPlayers: room.maxPlayers,
        status: room.status,
        currentPlayers: count(roomPlayer.id),
      })
      .from(room)
      .leftJoin(roomPlayer, eq(room.id, roomPlayer.roomId))
      .where(eq(room.status, "waiting"))
      .groupBy(room.id)
      .orderBy(room.createdAt);

    const available = rooms.filter((r) => r.currentPlayers < r.maxPlayers);

    if (!excludeJoined) return available;

    // Filter out rooms the bot is already in
    const joinedRooms = await db
      .select({ roomId: roomPlayer.roomId })
      .from(roomPlayer)
      .where(eq(roomPlayer.botId, botRecord.id));
    const joinedRoomIds = new Set(joinedRooms.map((r) => r.roomId));

    return available.filter((r) => !joinedRoomIds.has(r.id));
  })

  .get("/api/bot-client/rooms/follow", async ({ request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    if (botRecord.clientMode !== "follow-owner" || !botRecord.followUserId) {
      set.status = 400;
      return { error: "Bot is not in follow-owner mode or has no followUserId configured" };
    }

    const playerEntry = await db.query.roomPlayer.findFirst({
      where: and(
        eq(roomPlayer.userId, botRecord.followUserId),
        eq(roomPlayer.playerType, "human"),
      ),
    });

    if (!playerEntry) return { room: null };

    const roomData = await db.query.room.findFirst({
      where: eq(room.id, playerEntry.roomId),
    });

    if (!roomData) return { room: null };

    const currentPlayers = await getRoomPlayerCount(roomData.id);
    return {
      room: {
        id: roomData.id,
        name: roomData.name,
        icon: roomData.icon,
        maxPlayers: roomData.maxPlayers,
        status: roomData.status,
        currentPlayers,
      },
    };
  })

  // ── Room Participation ────────────────────────────────────────────────────

  .post("/api/bot-client/rooms/:id/join", async ({ params, request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    const roomData = await db.query.room.findFirst({
      where: eq(room.id, params.id),
    });
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }
    if (roomData.status !== "waiting") {
      set.status = 403;
      return { error: "Room is not accepting new players" };
    }

    const currentPlayers = await getRoomPlayerCount(params.id);
    if (currentPlayers >= roomData.maxPlayers) {
      set.status = 403;
      return { error: "Room is full" };
    }

    const existing = await getBotRoomPlayer(params.id, botRecord.id);
    if (existing) {
      set.status = 400;
      return { error: "Bot is already in this room" };
    }

    if (await isBotBusy(botRecord.id)) {
      set.status = 400;
      return { error: "Bot is already in another room" };
    }

    const displayName = botRecord.name;
    const [newPlayer] = await db
      .insert(roomPlayer)
      .values({
        roomId: params.id,
        userId: `bot:${crypto.randomUUID()}`,
        playerType: "bot",
        displayName,
        botId: botRecord.id,
        ready: true,
      })
      .returning();

    await broadcastPlayers(params.id);

    return {
      success: true,
      roomId: params.id,
      playerId: newPlayer.id,
      userId: newPlayer.userId,
    };
  })

  .post("/api/bot-client/rooms/:id/ready", async ({ params, request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    const botPlayer = await getBotRoomPlayer(params.id, botRecord.id);
    if (!botPlayer) {
      set.status = 404;
      return { error: "Bot is not in this room" };
    }

    await db
      .update(roomPlayer)
      .set({ ready: true })
      .where(eq(roomPlayer.id, botPlayer.id));

    await broadcastPlayers(params.id);
    return { success: true };
  })

  .delete("/api/bot-client/rooms/:id/leave", async ({ params, request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    await db
      .delete(roomPlayer)
      .where(
        and(
          eq(roomPlayer.roomId, params.id),
          eq(roomPlayer.botId, botRecord.id),
        ),
      );

    await broadcastPlayers(params.id);
    return { success: true };
  })

  // ── Game Turn Polling ─────────────────────────────────────────────────────

  .get("/api/bot-client/games/:id/turn", async ({ params, request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    const botPlayer = await getBotRoomPlayer(params.id, botRecord.id);
    if (!botPlayer) {
      set.status = 403;
      return { error: "Bot is not a player in this room" };
    }

    const pendingTurn = getPollingTurnForBot(botRecord.id);
    if (!pendingTurn) {
      return { hasTurn: false };
    }

    return {
      hasTurn: true,
      requestId: pendingTurn.requestId,
      payload: pendingTurn.payload,
    };
  })

  .post("/api/bot-client/games/:id/actions", async ({ params, request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    const botPlayer = await getBotRoomPlayer(params.id, botRecord.id);
    if (!botPlayer) {
      set.status = 403;
      return { error: "Bot is not a player in this room" };
    }

    const body = (await request.json()) as {
      requestId?: string;
      action?:
        | { type: "chat"; text: string }
        | { type: "skip-chat" }
        | { type: "reveal" }
        | { type: "play-card"; card: "attack" | "heal" | "jail" | "verify"; targetId?: string }
        | { type: "end-turn" }
        | null;
    };

    if (!body.requestId) {
      set.status = 400;
      return { error: "requestId is required" };
    }

    // Pass botRecord.id for ownership validation; botPlayer loop handles broadcast/turn continuation
    const resolved = resolveBotAction(body.requestId, body.action ?? null, botRecord.id);
    if (!resolved) {
      set.status = 410;
      return { error: "Turn request not found or already expired" };
    }

    return { success: true };
  })

  // ── Game Snapshot ─────────────────────────────────────────────────────────

  .get("/api/bot-client/games/:id/snapshot", async ({ params, request, set }) => {
    let botRecord;
    try {
      botRecord = await requireBotClient(request);
    } catch (e) {
      set.status = 401;
      return { error: e instanceof Error ? e.message : "Unauthorized" };
    }

    if (!getGame(params.id)) {
      set.status = 404;
      return { error: "Game not found" };
    }

    const botPlayer = await getBotRoomPlayer(params.id, botRecord.id);
    if (!botPlayer) {
      set.status = 403;
      return { error: "Bot is not a player in this room" };
    }

    try {
      return createSnapshot(params.id, botPlayer.userId);
    } catch (error) {
      set.status = 403;
      return { error: error instanceof Error ? error.message : "Forbidden" };
    }
  });
