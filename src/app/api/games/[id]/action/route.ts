import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games, gameEvents, replays, rooms } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { publish } from "@/lib/sse/broker";
import { applyAction, getCurrentPlayer } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/events";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: gameId } = await params;

  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "active") {
    return NextResponse.json({ error: "Game is not active" }, { status: 409 });
  }

  const state = JSON.parse(game.stateJson) as GameState;
  const currentPlayer = getCurrentPlayer(state);

  if (currentPlayer.id !== session.userId) {
    return NextResponse.json({ error: "It is not your turn" }, { status: 403 });
  }

  const body = (await request.json()) as { type?: unknown; targetId?: unknown };
  const actionType = body.type;
  const targetId = body.targetId;

  if (actionType !== "SHOOT" && actionType !== "PASS") {
    return NextResponse.json(
      { error: "action type must be 'SHOOT' or 'PASS'" },
      { status: 400 }
    );
  }

  let action: { type: "SHOOT"; targetId: string } | { type: "PASS" };
  if (actionType === "SHOOT") {
    if (typeof targetId !== "string") {
      return NextResponse.json(
        { error: "targetId is required for SHOOT action" },
        { status: 400 }
      );
    }
    action = { type: "SHOOT", targetId };
  } else {
    action = { type: "PASS" };
  }

  let result: ReturnType<typeof applyAction>;
  try {
    result = applyAction(state, session.userId, action);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid action";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { newState, events } = result;

  await db
    .update(games)
    .set({ stateJson: JSON.stringify(newState) })
    .where(eq(games.id, gameId));

  await Promise.all(
    events.map((event) =>
      db.insert(gameEvents).values({
        id: crypto.randomUUID(),
        gameId,
        turn: event.turn,
        eventType: event.type,
        eventData: JSON.stringify(event.data),
        actorId: session.userId,
      })
    )
  );

  if (newState.status === "finished") {
    const now = new Date().toISOString();
    await db
      .update(games)
      .set({ status: "finished", endedAt: now })
      .where(eq(games.id, gameId));

    await db
      .update(rooms)
      .set({ status: "finished" })
      .where(eq(rooms.gameId, gameId));

    await db.insert(replays).values({
      id: crypto.randomUUID(),
      gameId,
    });
  }

  publish(`game:${gameId}`, { type: "GAME_EVENTS", events, newState });

  if (newState.status === "active") {
    const { triggerBotIfNeeded } = await import("@/lib/bot/trigger");
    triggerBotIfNeeded(gameId, newState);
  }

  return NextResponse.json({ success: true, events, newState });
}
