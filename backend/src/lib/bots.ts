import { and, eq, type InferInsertModel } from "drizzle-orm";
import { db } from "../db";
import { bot, room, roomPlayer } from "../db/schema";
import { formatDate, formatIso } from "./botAuth";
import { getBotConnectionMeta, isBotOnline } from "./botPresence";

export type PublicBotSummary = {
  id: string;
  name: string;
  provider: "openclaw";
  active: boolean;
  pairingStatus: "unpaired" | "pairing" | "paired" | "error";
  presenceStatus: "online" | "offline";
  created: string | null;
  updated: string | null;
  lastSeenAt: string | null;
  pairingCodeExpiresAt: string | null;
  connectorName: string | null;
  connectorVersion: string | null;
  deviceId: string | null;
  busy: boolean;
};

type BotRow = Awaited<ReturnType<typeof db.query.bot.findFirst>>;
type BotInsert = InferInsertModel<typeof bot>;

export async function getOwnedBot(botId: string, userId: string) {
  return db.query.bot.findFirst({
    where: and(eq(bot.id, botId), eq(bot.userId, userId)),
  });
}

export const getBotForUser = getOwnedBot;

export async function getOwnedBots(userId: string) {
  return db.query.bot.findMany({
    where: eq(bot.userId, userId),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
}

export async function isBotBusy(botId: string, excludeRoomId?: string): Promise<boolean> {
  const rows = await db
    .select({ roomId: roomPlayer.roomId })
    .from(roomPlayer)
    .innerJoin(room, eq(room.id, roomPlayer.roomId))
    .where(eq(roomPlayer.botId, botId));

  return rows.some((entry) => entry.roomId !== excludeRoomId);
}

export function serializeBot(botRow: NonNullable<BotRow>, busy = false): PublicBotSummary {
  const liveMeta = getBotConnectionMeta(botRow.id);
  const lastSeenAt = liveMeta?.lastSeenAt ?? botRow.lastSeenAt;

  return {
    id: botRow.id,
    name: botRow.name,
    provider: "openclaw",
    active: botRow.active,
    pairingStatus: botRow.pairingStatus,
    presenceStatus: isBotOnline(botRow.id) ? "online" : botRow.presenceStatus,
    created: formatDate(botRow.createdAt),
    updated: formatDate(botRow.updatedAt),
    lastSeenAt: formatIso(lastSeenAt),
    pairingCodeExpiresAt: formatIso(botRow.pairingCodeExpiresAt),
    connectorName: liveMeta?.connectorName ?? botRow.connectorName ?? null,
    connectorVersion: liveMeta?.connectorVersion ?? botRow.connectorVersion ?? null,
    deviceId: liveMeta?.deviceId ?? botRow.deviceId ?? null,
    busy,
  };
}

export async function listBotsForUser(userId: string): Promise<PublicBotSummary[]> {
  const rows = await getOwnedBots(userId);

  return Promise.all(rows.map(async (entry) => serializeBot(entry, await isBotBusy(entry.id))));
}

export async function listRoomBotsForUser(userId: string, roomId?: string) {
  const rows = await db.query.bot.findMany({
    where: and(eq(bot.userId, userId), eq(bot.active, true)),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  return Promise.all(
    rows.map(async (entry) => serializeBot(entry, await isBotBusy(entry.id, roomId))),
  );
}

export const serializeBotSummary = serializeBot;

export async function setBotPresence(
  botId: string,
  presenceStatus: 'online' | 'offline',
  extras: Partial<BotInsert> = {},
) {
  await db
    .update(bot)
    .set({
      presenceStatus,
      updatedAt: new Date(),
      ...extras,
    })
    .where(eq(bot.id, botId));
}
