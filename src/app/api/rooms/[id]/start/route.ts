import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rooms, roomParticipants, games, gamePlayers, gameEvents, users, bots } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { publish } from "@/lib/sse/broker";
import { createGameState } from "@/lib/game/engine";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: roomId } = await params;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.createdBy !== session.userId) {
    return NextResponse.json({ error: "Only the room creator can start the game" }, { status: 403 });
  }
  if (room.status !== "waiting") {
    return NextResponse.json({ error: "Room is not in waiting state" }, { status: 409 });
  }

  const playerParticipants = await db
    .select()
    .from(roomParticipants)
    .where(
      and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.role, "player")
      )
    );

  if (playerParticipants.length < 2) {
    return NextResponse.json(
      { error: "At least 2 players are required to start" },
      { status: 400 }
    );
  }

  // Resolve player names
  const playerInfos = await Promise.all(
    playerParticipants.map(async (p, seat) => {
      if (p.userId) {
        const [user] = await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, p.userId));
        return { id: p.userId, name: user?.username ?? "Unknown", isBot: false, seat };
      }
      if (p.botId) {
        const [bot] = await db
          .select({ id: bots.id, name: bots.name })
          .from(bots)
          .where(eq(bots.id, p.botId));
        return { id: p.botId, name: bot?.name ?? "Bot", isBot: true, seat };
      }
      return { id: p.id, name: "Unknown", isBot: false, seat };
    })
  );

  const gameId = crypto.randomUUID();
  const initialState = createGameState(gameId, playerInfos);

  await db.insert(games).values({
    id: gameId,
    roomId,
    status: "active",
    stateJson: JSON.stringify(initialState),
  });

  await Promise.all(
    playerInfos.map((player, idx) =>
      db.insert(gamePlayers).values({
        id: crypto.randomUUID(),
        gameId,
        userId: playerParticipants[idx].userId ?? null,
        botId: playerParticipants[idx].botId ?? null,
        seat: player.seat,
        hp: 5,
        status: "alive",
      })
    )
  );

  await db.insert(gameEvents).values({
    id: crypto.randomUUID(),
    gameId,
    turn: 0,
    eventType: "GAME_STARTED",
    eventData: JSON.stringify({ players: playerInfos }),
    actorId: session.userId,
  });

  await db
    .update(rooms)
    .set({ status: "playing", gameId })
    .where(eq(rooms.id, roomId));

  publish(`room:${roomId}`, { type: "GAME_STARTED", gameId });

  return NextResponse.json({ gameId });
}
