import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { replays, games, gamePlayers, roomParticipants, bots } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, inArray } from "drizzle-orm";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;

  // 1. gameIds where user was a direct player
  const playerRows = await db
    .select({ gameId: gamePlayers.gameId })
    .from(gamePlayers)
    .where(eq(gamePlayers.userId, userId));

  // 2. gameIds from rooms where user was a participant (spectator or player)
  const participantRooms = await db
    .select({ roomId: roomParticipants.roomId })
    .from(roomParticipants)
    .where(eq(roomParticipants.userId, userId));

  let spectatorGameIds: string[] = [];
  if (participantRooms.length > 0) {
    const roomIds = participantRooms.map((r) => r.roomId);
    const roomGames = await db
      .select({ id: games.id, roomId: games.roomId })
      .from(games)
      .where(inArray(games.roomId, roomIds));
    spectatorGameIds = roomGames.map((g) => g.id);
  }

  // 3. gameIds where user's bots played
  const userBots = await db
    .select({ id: bots.id })
    .from(bots)
    .where(eq(bots.ownerId, userId));

  let botGameIds: string[] = [];
  if (userBots.length > 0) {
    const botIds = userBots.map((b) => b.id);
    const botPlayerRows = await db
      .select({ gameId: gamePlayers.gameId })
      .from(gamePlayers)
      .where(inArray(gamePlayers.botId, botIds));
    botGameIds = botPlayerRows.map((r) => r.gameId);
  }

  // Union all gameIds
  const allGameIds = Array.from(
    new Set([
      ...playerRows.map((r) => r.gameId),
      ...spectatorGameIds,
      ...botGameIds,
    ])
  );

  if (allGameIds.length === 0) {
    return NextResponse.json([]);
  }

  // Get replays for those games
  const replayRows = await db
    .select()
    .from(replays)
    .where(inArray(replays.gameId, allGameIds));

  if (replayRows.length === 0) {
    return NextResponse.json([]);
  }

  const replayGameIds = replayRows.map((r) => r.gameId);
  const gameRows = await db
    .select()
    .from(games)
    .where(inArray(games.id, replayGameIds));

  const gameMap = new Map(gameRows.map((g) => [g.id, g]));

  // Get player counts per game
  const playerCountRows = await db
    .select({ gameId: gamePlayers.gameId, id: gamePlayers.id })
    .from(gamePlayers)
    .where(inArray(gamePlayers.gameId, replayGameIds));

  const playerCountMap = new Map<string, number>();
  for (const row of playerCountRows) {
    playerCountMap.set(row.gameId, (playerCountMap.get(row.gameId) ?? 0) + 1);
  }

  const result = replayRows.map((replay) => {
    const game = gameMap.get(replay.gameId);
    return {
      id: replay.id,
      gameId: replay.gameId,
      createdAt: replay.createdAt,
      game: game
        ? {
            id: game.id,
            status: game.status,
            endedAt: game.endedAt,
            playerCount: playerCountMap.get(game.id) ?? 0,
          }
        : null,
    };
  });

  return NextResponse.json(result);
}
