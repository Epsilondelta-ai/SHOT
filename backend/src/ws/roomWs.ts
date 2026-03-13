import Elysia from "elysia";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { roomPlayer, session } from "../db/schema";
import { getSerializedRoomPlayers } from "../lib/roomPlayers";
import { getRoomById, syncRoomAfterHumanDeparture } from "../lib/roomState";
import { onBotPresenceChanged } from "../lib/botPresence";

type RoomMessage =
  | { type: "chat"; text: string }
  | { type: "kick"; targetPlayerId: string }
  | { type: "ready"; ready: boolean };

type WsUser = {
  userId: string;
  userName: string;
  roomId: string;
  isSpectator: boolean;
};

// roomId → Set of ws ids
const roomSockets = new Map<string, Set<string>>();
// ws id → ws object (any to avoid circular type issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsById = new Map<string, any>();
// ws id → authenticated user data
const wsUserData = new Map<string, WsUser>();
// userId → Set of ws ids (per-user connection limit)
const userConnections = new Map<string, Set<string>>();
const MAX_CONNECTIONS_PER_USER = 5;
// ws id → message timestamps for rate limiting
const wsMessageTimestamps = new Map<string, number[]>();
const WS_RATE_LIMIT = 30; // messages per minute

function broadcast(roomId: string, payload: unknown, excludeId?: string) {
  const ids = roomSockets.get(roomId);
  if (!ids) return;
  const data = JSON.stringify(payload);
  for (const id of ids) {
    if (id !== excludeId) wsById.get(id)?.send(data);
  }
}

export async function broadcastPlayers(roomId: string) {
  const [players, roomData] = await Promise.all([
    getSerializedRoomPlayers(roomId),
    getRoomById(roomId),
  ]);
  if (!roomData) return;

  const wsIds = roomSockets.get(roomId);
  const spectators = wsIds
    ? [...wsIds]
        .map((id) => wsUserData.get(id))
        .filter((u): u is WsUser => !!u && u.isSpectator)
        .map((u) => ({ userId: u.userId, userName: u.userName }))
    : [];

  const payload = JSON.stringify({
    type: "players",
    players,
    spectators,
    room: {
      hostUserId: roomData.hostUserId,
      maxPlayers: roomData.maxPlayers,
      status: roomData.status,
    },
  });

  const ids = roomSockets.get(roomId);
  if (!ids) return;
  for (const id of ids) wsById.get(id)?.send(payload);
}

onBotPresenceChanged(async (botId) => {
  const affectedRooms = await db
    .select({ roomId: roomPlayer.roomId })
    .from(roomPlayer)
    .where(and(eq(roomPlayer.botId, botId), eq(roomPlayer.playerType, "bot")));

  const roomIds = [...new Set(affectedRooms.map((entry) => entry.roomId))];
  for (const roomId of roomIds) {
    await broadcastPlayers(roomId);
  }
});

export const roomWsPlugin = new Elysia().ws("/ws/room/:roomId", {
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
    // better-auth sends TOKEN.HMAC_SIGNATURE in cookie; DB stores only TOKEN
    const decodedToken = rawToken.split(".")[0];
    const sess = await db.query.session.findFirst({
      where: eq(session.token, decodedToken),
      with: { user: true },
    });

    if (!sess || sess.expiresAt < new Date()) {
      ws.close();
      return;
    }

    const isSpectator = ctx.query?.spectator === "1";
    // Use ws.id (Elysia's built-in unique connection ID) as the key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsId = (ws as any).id as string;

    const userConns = userConnections.get(sess.userId) ?? new Set();
    if (userConns.size >= MAX_CONNECTIONS_PER_USER) {
      ws.close();
      return;
    }
    userConns.add(wsId);
    userConnections.set(sess.userId, userConns);

    wsById.set(wsId, ws);
    wsUserData.set(wsId, {
      userId: sess.userId,
      userName: sess.user.name ?? sess.user.email ?? "Unknown",
      roomId,
      isSpectator,
    });

    if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
    roomSockets.get(roomId)!.add(wsId);

    await broadcastPlayers(roomId);
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

    const { roomId, userId, userName, isSpectator } = userData;

    let msg: RoomMessage;
    try {
      const text =
        typeof rawMessage === "string"
          ? rawMessage
          : JSON.stringify(rawMessage);
      msg = JSON.parse(text);
    } catch {
      return;
    }

    if (isSpectator) {
      return;
    }

    if (msg.type === "chat") {
      if (!msg.text || typeof msg.text !== 'string' || msg.text.length > 500) return;
      broadcast(roomId, {
        type: "chat",
        userId,
        userName,
        text: msg.text,
        timestamp: Date.now(),
      });
    } else if (msg.type === "kick") {
      const roomData = await getRoomById(roomId);
      if (!roomData || roomData.hostUserId !== userId) return;

      const players = await db.query.roomPlayer.findMany({
        where: eq(roomPlayer.roomId, roomId),
      });

      const [targetPlayer] = players.filter(
        (player) => player.id === msg.targetPlayerId,
      );
      if (!targetPlayer) return;

      await db
        .delete(roomPlayer)
        .where(
          and(
            eq(roomPlayer.roomId, roomId),
            eq(roomPlayer.id, msg.targetPlayerId),
          ),
        );

      if (targetPlayer.playerType === "human") {
        const result = await syncRoomAfterHumanDeparture(roomId);
        if (result.deleted) return;
      }

      broadcast(roomId, {
        type: "kicked",
        playerId: msg.targetPlayerId,
        userId: targetPlayer.userId,
      });
      await broadcastPlayers(roomId);
    } else if (msg.type === "ready") {
      await db
        .update(roomPlayer)
        .set({ ready: msg.ready })
        .where(
          and(
            eq(roomPlayer.roomId, roomId),
            eq(roomPlayer.userId, userId),
            eq(roomPlayer.playerType, "human"),
          ),
        );

      await broadcastPlayers(roomId);
    }
  },

  async close(ws) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsId = (ws as any).id as string;
    const userData = wsUserData.get(wsId);
    const roomId = userData?.roomId;

    if (roomId) roomSockets.get(roomId)?.delete(wsId);
    wsById.delete(wsId);
    wsUserData.delete(wsId);
    if (roomId && roomSockets.get(roomId)?.size === 0) roomSockets.delete(roomId);

    if (userData) {
      const userConns = userConnections.get(userData.userId);
      if (userConns) {
        userConns.delete(wsId);
        if (userConns.size === 0) userConnections.delete(userData.userId);
      }
    }
    wsMessageTimestamps.delete(wsId);

    if (!userData || userData.isSpectator) {
      return;
    }

    const { userId } = userData;

    const existingPlayer = await db.query.roomPlayer.findFirst({
      where: and(
        eq(roomPlayer.roomId, roomId!),
        eq(roomPlayer.userId, userId),
        eq(roomPlayer.playerType, "human"),
      ),
    });

    if (!existingPlayer) return;

    await db
      .delete(roomPlayer)
      .where(
        and(
          eq(roomPlayer.roomId, roomId!),
          eq(roomPlayer.userId, userId),
          eq(roomPlayer.playerType, "human"),
        ),
      );

    const result = await syncRoomAfterHumanDeparture(roomId!);
    if (!result.deleted) {
      await broadcastPlayers(roomId!);
    }
  },
});
