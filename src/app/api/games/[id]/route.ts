import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games, gamePlayers, users, bots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { GameState } from "@/lib/game/events";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: gameId } = await params;

  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const state = JSON.parse(game.stateJson) as GameState;

  const players = await db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId));

  const playersWithNames = await Promise.all(
    players.map(async (p) => {
      if (p.userId) {
        const [user] = await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, p.userId));
        return { ...p, name: user?.username ?? null };
      }
      if (p.botId) {
        const [bot] = await db
          .select({ id: bots.id, name: bots.name })
          .from(bots)
          .where(eq(bots.id, p.botId));
        return { ...p, name: bot?.name ?? null };
      }
      return { ...p, name: null };
    })
  );

  return NextResponse.json({ ...game, state, players: playersWithNames });
}
