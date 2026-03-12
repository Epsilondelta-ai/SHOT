import Elysia from "elysia";
import { and, count, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "../db";
import {
  assistant,
  bot,
  llmModel,
  llmProvider,
  room,
  roomPlayer,
} from "../db/schema";
import { getUser } from "../lib/getUser";
import {
  getHumanRoomPlayer,
  getRoomById,
  parseRoomCapacity,
  syncRoomAfterHumanDeparture,
} from "../lib/roomState";
import { getSerializedRoomPlayers } from "../lib/roomPlayers";
import { broadcastPlayers } from "../ws/roomWs";

function isSpectatorRequest(request: Request) {
  return new URL(request.url).searchParams.get("spectator") === "1";
}

function getHostPlayerId(
  players: Awaited<ReturnType<typeof getSerializedRoomPlayers>>,
  hostUserId: string,
) {
  return (
    players.find(
      (player) => player.type === "human" && player.userId === hostUserId,
    )?.id ??
    players.find((player) => player.type === "human")?.id ??
    players[0]?.id ??
    ""
  );
}

async function getRoomPlayerCount(roomId: string) {
  const [{ playerCount }] = await db
    .select({ playerCount: count(roomPlayer.id) })
    .from(roomPlayer)
    .where(eq(roomPlayer.roomId, roomId));

  return playerCount;
}

async function getRoomOptions(userId: string) {
  const activeProviders = await db
    .select({ provider: llmProvider.provider })
    .from(llmProvider)
    .where(eq(llmProvider.active, true));

  const providerKeys = activeProviders.map((provider) => provider.provider);

  const [assistants, models, bots] = await Promise.all([
    db
      .select({
        id: assistant.id,
        name: assistant.name,
        prompt: assistant.prompt,
        userId: assistant.userId,
      })
      .from(assistant)
      .where(
        and(
          eq(assistant.active, true),
          or(eq(assistant.userId, userId), isNull(assistant.userId)),
        ),
      )
      .orderBy(assistant.createdAt),
    providerKeys.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: llmModel.id,
            provider: llmModel.provider,
            apiModelName: llmModel.apiModelName,
            displayName: llmModel.displayName,
          })
          .from(llmModel)
          .where(
            and(
              eq(llmModel.active, true),
              inArray(llmModel.provider, providerKeys),
            ),
          )
          .orderBy(llmModel.createdAt),
    db
      .select({
        id: bot.id,
        name: bot.name,
      })
      .from(bot)
      .where(eq(bot.active, true))
      .orderBy(bot.createdAt),
  ]);

  return {
    assistants: assistants.map((entry) => ({
      id: entry.id,
      name: entry.name,
      prompt: entry.prompt,
      scope: entry.userId === userId ? "personal" : "global",
    })),
    llmModels: models,
    bots,
  };
}

async function getRoomManagementContext(roomId: string, userId: string) {
  const roomData = await getRoomById(roomId);
  if (!roomData) {
    return {
      roomData: null,
      member: null,
      isHost: false,
      canManageBots: false,
    };
  }

  const member = await getHumanRoomPlayer(roomId, userId);
  const isHost = roomData.hostUserId === userId;

  return {
    roomData,
    member,
    isHost,
    canManageBots: isHost || member?.canManageBots === true,
  };
}

export const roomRoutes = new Elysia()
  .get("/api/rooms", async () => {
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
      .groupBy(room.id)
      .orderBy(room.createdAt);

    return rooms;
  })

  .post("/api/rooms", async ({ request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const body = (await request.json()) as {
      name: string;
      icon?: string;
      maxPlayers?: number;
    };
    if (!body.name?.trim()) {
      set.status = 400;
      return { error: "Name is required" };
    }

    const maxPlayers =
      body.maxPlayers === undefined ? 5 : parseRoomCapacity(body.maxPlayers);
    if (!maxPlayers) {
      set.status = 400;
      return { error: "Max players must be between 5 and 8" };
    }

    const [newRoom] = await db
      .insert(room)
      .values({
        name: body.name.trim(),
        icon: body.icon ?? "swords",
        maxPlayers,
        hostUserId: u.id,
      })
      .returning();

    await db.insert(roomPlayer).values({
      roomId: newRoom.id,
      userId: u.id,
      playerType: "human",
      canManageBots: true,
    });

    return newRoom;
  })

  .get("/api/rooms/:id", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const roomData = await getRoomById(params.id);
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }

    const existingMember = await getHumanRoomPlayer(params.id, u.id);
    const isSpectator = isSpectatorRequest(request) && !existingMember;

    if (!existingMember && !isSpectator) {
      if (roomData.status === "in_progress") {
        set.status = 403;
        return { error: "Game is already in progress" };
      }

      const playerCount = await getRoomPlayerCount(params.id);
      if (playerCount >= roomData.maxPlayers) {
        set.status = 403;
        return { error: "Room is full" };
      }

      await db.insert(roomPlayer).values({
        roomId: params.id,
        userId: u.id,
        playerType: "human",
        canManageBots: false,
      });
      await broadcastPlayers(params.id);
    }

    const [players, roomOptions] = await Promise.all([
      getSerializedRoomPlayers(params.id),
      getRoomOptions(u.id),
    ]);

    return {
      roomId: roomData.id,
      roomName: roomData.name,
      roomCode: roomData.id.slice(0, 6).toUpperCase(),
      status: roomData.status,
      maxPlayers: roomData.maxPlayers,
      hostUserId: roomData.hostUserId,
      myId: u.id,
      isSpectator,
      hostId: getHostPlayerId(players, roomData.hostUserId),
      players,
      chatMessages: [],
      ...roomOptions,
    };
  })

  .post("/api/rooms/:id/leave", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await db
      .delete(roomPlayer)
      .where(
        and(
          eq(roomPlayer.roomId, params.id),
          eq(roomPlayer.userId, u.id),
          eq(roomPlayer.playerType, "human"),
        ),
      );

    const result = await syncRoomAfterHumanDeparture(params.id);
    if (!result.deleted) {
      await broadcastPlayers(params.id);
    }

    return { success: true };
  })

  .post("/api/rooms/:id/spectate", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await db
      .delete(roomPlayer)
      .where(
        and(
          eq(roomPlayer.roomId, params.id),
          eq(roomPlayer.userId, u.id),
          eq(roomPlayer.playerType, "human"),
        ),
      );

    const roomData = await getRoomById(params.id);
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }

    if (roomData.hostUserId === u.id) {
      const remaining = await db.query.roomPlayer.findMany({
        where: and(eq(roomPlayer.roomId, params.id), eq(roomPlayer.playerType, "human")),
      });
      if (remaining.length > 0) {
        const nextHost = remaining[0];
        await db.update(room).set({ hostUserId: nextHost.userId }).where(eq(room.id, params.id));
        await db.update(roomPlayer).set({ canManageBots: true }).where(
          and(eq(roomPlayer.roomId, params.id), eq(roomPlayer.userId, nextHost.userId)),
        );
      }
    }

    await broadcastPlayers(params.id);
    return { success: true };
  })

  .post("/api/rooms/:id/join", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const existingMember = await getHumanRoomPlayer(params.id, u.id);
    if (!existingMember) {
      const roomData = await getRoomById(params.id);
      if (!roomData) {
        set.status = 404;
        return { error: "Room not found" };
      }
      if (roomData.status === "in_progress") {
        set.status = 403;
        return { error: "Game is already in progress" };
      }

      const playerCount = await getRoomPlayerCount(params.id);
      if (playerCount >= roomData.maxPlayers) {
        set.status = 403;
        return { error: "Room is full" };
      }

      await db.insert(roomPlayer).values({
        roomId: params.id,
        userId: u.id,
        playerType: "human",
        canManageBots: false,
      });
      await broadcastPlayers(params.id);
    }

    return { success: true, roomId: params.id };
  })

  .post("/api/rooms/:id/capacity", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const roomData = await getRoomById(params.id);
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }
    if (roomData.hostUserId !== u.id) {
      set.status = 403;
      return { error: "Only the host can change room capacity" };
    }

    const body = (await request.json()) as { maxPlayers?: number };
    const maxPlayers = parseRoomCapacity(body.maxPlayers);
    if (!maxPlayers) {
      set.status = 400;
      return { error: "Max players must be between 5 and 8" };
    }

    const playerCount = await getRoomPlayerCount(params.id);
    if (playerCount > maxPlayers) {
      set.status = 400;
      return {
        error: "New capacity cannot be smaller than the current player count",
      };
    }

    await db.update(room).set({ maxPlayers }).where(eq(room.id, params.id));
    await broadcastPlayers(params.id);

    return { success: true, maxPlayers };
  })

  .post("/api/rooms/:id/host", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const roomData = await getRoomById(params.id);
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }
    if (roomData.hostUserId !== u.id) {
      set.status = 403;
      return { error: "Only the host can transfer host ownership" };
    }

    const body = (await request.json()) as { userId?: string };
    if (!body.userId) {
      set.status = 400;
      return { error: "Target user is required" };
    }

    const targetMember = await getHumanRoomPlayer(params.id, body.userId);
    if (!targetMember) {
      set.status = 404;
      return { error: "Target player not found in room" };
    }

    if (body.userId !== roomData.hostUserId) {
      await db
        .update(room)
        .set({ hostUserId: body.userId })
        .where(eq(room.id, params.id));
      await db
        .update(roomPlayer)
        .set({ canManageBots: false })
        .where(
          and(
            eq(roomPlayer.roomId, params.id),
            eq(roomPlayer.userId, roomData.hostUserId),
            eq(roomPlayer.playerType, "human"),
          ),
        );
      await db
        .update(roomPlayer)
        .set({ canManageBots: true })
        .where(
          and(
            eq(roomPlayer.roomId, params.id),
            eq(roomPlayer.userId, body.userId),
            eq(roomPlayer.playerType, "human"),
          ),
        );
      await broadcastPlayers(params.id);
    }

    return { success: true, hostUserId: body.userId };
  })

  .post("/api/rooms/:id/bot-permissions", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const roomData = await getRoomById(params.id);
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }
    if (roomData.hostUserId !== u.id) {
      set.status = 403;
      return { error: "Only the host can grant bot permissions" };
    }

    const body = (await request.json()) as {
      userId?: string;
      canManageBots?: boolean;
    };
    if (!body.userId || typeof body.canManageBots !== "boolean") {
      set.status = 400;
      return { error: "Target user and permission flag are required" };
    }
    if (body.userId === roomData.hostUserId) {
      set.status = 400;
      return { error: "The host already has bot management permission" };
    }

    const targetMember = await getHumanRoomPlayer(params.id, body.userId);
    if (!targetMember) {
      set.status = 404;
      return { error: "Target player not found in room" };
    }

    await db
      .update(roomPlayer)
      .set({ canManageBots: body.canManageBots })
      .where(
        and(
          eq(roomPlayer.roomId, params.id),
          eq(roomPlayer.userId, body.userId),
          eq(roomPlayer.playerType, "human"),
        ),
      );
    await broadcastPlayers(params.id);

    return {
      success: true,
      userId: body.userId,
      canManageBots: body.canManageBots,
    };
  })

  .post("/api/rooms/:id/llm-players", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { roomData, member, isHost, canManageBots } = await getRoomManagementContext(
      params.id,
      u.id,
    );
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }
    if (!member && !isHost) {
      set.status = 403;
      return { error: "You must join the room first" };
    }
    if (!canManageBots) {
      set.status = 403;
      return { error: "Only the host or approved members can add LLM players" };
    }
    if ((await getRoomPlayerCount(params.id)) >= roomData.maxPlayers) {
      set.status = 403;
      return { error: "Room is full" };
    }

    const body = (await request.json()) as {
      assistantId?: string;
      llmModelId?: string;
      language?: string;
      name?: string;
    };
    if (!body.llmModelId) {
      set.status = 400;
      return { error: "Model is required" };
    }
    if (!body.assistantId && !body.name?.trim()) {
      set.status = 400;
      return { error: "Assistant or name is required" };
    }

    const [selectedAssistant, selectedModel] = await Promise.all([
      body.assistantId
        ? db.query.assistant.findFirst({
            where: and(
              eq(assistant.id, body.assistantId),
              eq(assistant.active, true),
              or(eq(assistant.userId, u.id), isNull(assistant.userId)),
            ),
            columns: { id: true, name: true },
          })
        : Promise.resolve(null),
      db
        .select({
          id: llmModel.id,
          displayName: llmModel.displayName,
        })
        .from(llmModel)
        .innerJoin(llmProvider, eq(llmModel.provider, llmProvider.provider))
        .where(
          and(
            eq(llmModel.id, body.llmModelId),
            eq(llmModel.active, true),
            eq(llmProvider.active, true),
          ),
        )
        .then((rows) => rows[0] ?? null),
    ]);

    if (body.assistantId && !selectedAssistant) {
      set.status = 400;
      return { error: "Invalid assistant or model" };
    }
    if (!selectedModel) {
      set.status = 400;
      return { error: "Invalid model" };
    }

    const displayName = selectedAssistant?.name ?? body.name!.trim();
    const [newPlayer] = await db
      .insert(roomPlayer)
      .values({
        roomId: params.id,
        userId: `llm:${crypto.randomUUID()}`,
        playerType: "llm",
        displayName,
        assistantId: selectedAssistant?.id ?? null,
        llmModelId: selectedModel.id,
        language: body.language ?? null,
      })
      .returning();

    await broadcastPlayers(params.id);

    return {
      success: true,
      player: {
        id: newPlayer.id,
        userId: newPlayer.userId,
        name: displayName,
        avatarSrc: null,
        type: "llm" as const,
        canManageBots: false,
        assistantId: selectedAssistant?.id ?? null,
        assistantName: selectedAssistant?.name ?? null,
        llmModelId: selectedModel.id,
        modelName: selectedModel.displayName,
        language: body.language ?? null,
        botId: null,
        ready: true,
      },
    };
  })

  .post("/api/rooms/:id/bot-players", async ({ params, request, set }) => {
    const u = await getUser(request);
    if (!u) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const { roomData, member, isHost, canManageBots } = await getRoomManagementContext(
      params.id,
      u.id,
    );
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }
    if (!member && !isHost) {
      set.status = 403;
      return { error: "You must join the room first" };
    }
    if (!canManageBots) {
      set.status = 403;
      return { error: "Only the host or approved members can add bots" };
    }
    if ((await getRoomPlayerCount(params.id)) >= roomData.maxPlayers) {
      set.status = 403;
      return { error: "Room is full" };
    }

    const body = (await request.json()) as { botId?: string };
    if (!body.botId) {
      set.status = 400;
      return { error: "Bot is required" };
    }

    const selectedBot = await db.query.bot.findFirst({
      where: and(eq(bot.id, body.botId), eq(bot.active, true)),
      columns: { id: true, name: true },
    });
    if (!selectedBot) {
      set.status = 400;
      return { error: "Invalid bot" };
    }

    const displayName = `${selectedBot.name} (OpenClaw)`;
    const [newPlayer] = await db
      .insert(roomPlayer)
      .values({
        roomId: params.id,
        userId: `bot:${crypto.randomUUID()}`,
        playerType: "bot",
        displayName,
        botId: selectedBot.id,
      })
      .returning();

    await broadcastPlayers(params.id);

    return {
      success: true,
      player: {
        id: newPlayer.id,
        userId: newPlayer.userId,
        name: displayName,
        avatarSrc: null,
        type: "bot" as const,
        canManageBots: false,
        assistantId: null,
        assistantName: null,
        llmModelId: null,
        modelName: null,
        botId: selectedBot.id,
        ready: true,
      },
    };
  });
