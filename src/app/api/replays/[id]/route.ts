import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { replays, games, gamePlayers, gameEvents, users, bots } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [replay] = await db
    .select()
    .from(replays)
    .where(eq(replays.id, id));

  if (!replay) {
    return NextResponse.json({ error: "Replay not found" }, { status: 404 });
  }

  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, replay.gameId));

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const playerRows = await db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, game.id));

  // Resolve player names
  const playerList = await Promise.all(
    playerRows.map(async (p) => {
      let name = "Unknown";
      let isBot = false;

      if (p.userId) {
        const [user] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, p.userId));
        if (user) name = user.username;
      } else if (p.botId) {
        const [bot] = await db
          .select({ name: bots.name })
          .from(bots)
          .where(eq(bots.id, p.botId));
        if (bot) name = bot.name;
        isBot = true;
      }

      return {
        id: p.id,
        userId: p.userId,
        botId: p.botId,
        name,
        isBot,
        seat: p.seat,
        finalHp: p.hp,
      };
    })
  );

  const eventRows = await db
    .select()
    .from(gameEvents)
    .where(eq(gameEvents.gameId, game.id))
    .orderBy(asc(gameEvents.turn), asc(gameEvents.createdAt));

  const eventList = eventRows.map((e) => ({
    id: e.id,
    turn: e.turn,
    eventType: e.eventType,
    eventData: e.eventData,
    actorId: e.actorId,
    createdAt: e.createdAt,
  }));

  return NextResponse.json({
    id: replay.id,
    gameId: replay.gameId,
    game: {
      id: game.id,
      status: game.status,
      stateJson: game.stateJson,
      createdAt: game.createdAt,
      endedAt: game.endedAt,
    },
    players: playerList,
    events: eventList,
  });
}
