import { eq } from "drizzle-orm";
import { db } from "../db";
import { roomPlayer } from "../db/schema";

export type SerializedRoomPlayer = {
  id: string;
  userId: string;
  name: string;
  avatarSrc: string | null;
  type: "human" | "llm" | "external";
  assistantId: string | null;
  assistantName: string | null;
  llmModelId: string | null;
  modelName: string | null;
  language: string | null;
  ready: boolean;
  ownerName: string | null;
  provider: string | null;
  isOperator: boolean;
};

export async function getSerializedRoomPlayers(
  roomId: string,
): Promise<SerializedRoomPlayer[]> {
  const players = await db.query.roomPlayer.findMany({
    where: eq(roomPlayer.roomId, roomId),
  });

  if (players.length === 0) {
    return [];
  }

  const humanIds = players
    .filter((player) => player.playerType === "human")
    .map((player) => player.userId);
  const assistantIds = players
    .map((player) => player.assistantId)
    .filter((assistantId): assistantId is string => !!assistantId);
  const llmModelIds = players
    .map((player) => player.llmModelId)
    .filter((llmModelId): llmModelId is string => !!llmModelId);
  const botIds = players
    .map((player) => player.botId)
    .filter((botId): botId is string => !!botId);

  const [users, assistants, models, bots] = await Promise.all([
    humanIds.length === 0
      ? Promise.resolve([])
      : db.query.user.findMany({
          where: (table, { inArray }) => inArray(table.id, humanIds),
          columns: { id: true, name: true, image: true },
        }),
    assistantIds.length === 0
      ? Promise.resolve([])
      : db.query.assistant.findMany({
          where: (table, { inArray }) => inArray(table.id, assistantIds),
          columns: { id: true, name: true },
        }),
    llmModelIds.length === 0
      ? Promise.resolve([])
      : db.query.llmModel.findMany({
          where: (table, { inArray }) => inArray(table.id, llmModelIds),
          columns: { id: true, displayName: true, provider: true },
        }),
    botIds.length === 0
      ? Promise.resolve([])
      : db.query.bot.findMany({
          where: (table, { inArray }) => inArray(table.id, botIds),
          columns: { id: true, name: true, image: true, userId: true },
        }),
  ]);

  const userMap = new Map(users.map((entry) => [entry.id, entry]));
  const assistantMap = new Map(assistants.map((entry) => [entry.id, entry]));
  const modelMap = new Map(models.map((entry) => [entry.id, entry]));
  const botMap = new Map(bots.map((entry) => [entry.id, entry]));

  const botOwnerIds = bots.map((b) => b.userId);
  const botOwners =
    botOwnerIds.length === 0
      ? []
      : await db.query.user.findMany({
          where: (table, { inArray }) => inArray(table.id, botOwnerIds),
          columns: { id: true, name: true },
        });
  const botOwnerMap = new Map(botOwners.map((entry) => [entry.id, entry]));

  return players.map((player) => {
    if (player.playerType === "llm") {
      return {
        id: player.id,
        userId: player.userId,
        name:
          player.displayName ??
          assistantMap.get(player.assistantId ?? "")?.name ??
          "LLM Player",
        avatarSrc: null,
        type: "llm",
        assistantId: player.assistantId ?? null,
        assistantName: assistantMap.get(player.assistantId ?? "")?.name ?? null,
        llmModelId: player.llmModelId ?? null,
        modelName: modelMap.get(player.llmModelId ?? "")?.displayName ?? null,
        language: player.language ?? null,
        ready: true,
        ownerName: null,
        provider: modelMap.get(player.llmModelId ?? "")?.provider ?? null,
        isOperator: player.isOperator,
      };
    }

    if (player.playerType === "external") {
      const bot = botMap.get(player.botId ?? "");
      const owner = bot ? botOwnerMap.get(bot.userId) : null;
      return {
        id: player.id,
        userId: player.userId,
        name: bot?.name ?? player.displayName ?? "External Bot",
        avatarSrc: bot?.image ?? null,
        type: "external",
        assistantId: null,
        assistantName: null,
        llmModelId: null,
        modelName: null,
        language: null,
        ready: player.ready,
        ownerName: owner?.name ?? null,
        provider: null,
        isOperator: player.isOperator,
      };
    }

    const roomUser = userMap.get(player.userId);
    return {
      id: player.id,
      userId: player.userId,
      name: roomUser?.name ?? player.displayName ?? "Unknown",
      avatarSrc: roomUser?.image ?? null,
      type: "human",
      assistantId: null,
      assistantName: null,
      llmModelId: null,
      modelName: null,
      language: null,
      ready: player.ready,
      ownerName: null,
      provider: null,
      isOperator: player.isOperator,
    };
  });
}
