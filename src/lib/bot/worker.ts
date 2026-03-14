import { db } from "@/lib/db";
import { games, gamePlayers, bots, gameEvents, rooms, replays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentPlayer, getAlivePlayers, applyAction } from "@/lib/game/engine";
import { publish } from "@/lib/sse/broker";
import { shotLLMDecide } from "./adapters/shot-llm";
import { externalAgentDecide } from "./adapters/external";
import type { GameState } from "@/lib/game/events";
import type { BotAction } from "./adapters/types";

// Track which bots are currently processing to avoid double-processing
const processingBots = new Set<string>();

export async function processBotTurn(gameId: string): Promise<void> {
  // Get current game state
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game || game.status !== "active") return;

  const state = JSON.parse(game.stateJson) as GameState;
  if (state.status !== "active") return;

  const currentPlayer = getCurrentPlayer(state);
  if (!currentPlayer) return;

  // Find gamePlayer matching currentPlayer.id (which is botId for bots)
  const allGamePlayers = await db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId));

  const currentGamePlayer = allGamePlayers.find(
    (gp) => gp.botId === currentPlayer.id || gp.userId === currentPlayer.id
  );

  if (!currentGamePlayer || !currentGamePlayer.botId) return; // It's a human's turn

  const botId = currentGamePlayer.botId;

  // Avoid double processing
  const lockKey = `${gameId}:${botId}`;
  if (processingBots.has(lockKey)) return;
  processingBots.add(lockKey);

  try {
    const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
    if (!bot) return;

    // Build valid actions
    const alivePlayers = getAlivePlayers(state);
    const opponents = alivePlayers.filter((p) => p.id !== currentPlayer.id);
    const validActions: BotAction[] = [
      ...opponents.map((p) => ({
        type: "SHOOT" as const,
        targetId: p.id,
        targetName: p.name,
      })),
      { type: "PASS" as const },
    ];

    // Get recent game history
    const recentEvents = await db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.gameId, gameId))
      .limit(10);

    const gameHistory = recentEvents.map((e) => {
      const data = JSON.parse(e.eventData) as {
        actorId?: string;
        actionType?: string;
        targetId?: string;
      };
      if (e.eventType === "ACTION_TAKEN") {
        return `Turn ${e.turn}: ${data.actorId ?? "unknown"} ${
          data.actionType === "SHOOT" ? `shot ${data.targetId ?? "unknown"}` : "passed"
        }`;
      }
      return `Turn ${e.turn}: ${e.eventType}`;
    });

    // Make decision
    let decision: { action: BotAction; reasoning?: string };

    if (bot.backendType === "shot-llm") {
      decision = await shotLLMDecide({
        gameState: state,
        myPlayerId: currentPlayer.id,
        myPlayerState: currentPlayer,
        validActions,
        gameHistory,
      });
    } else if (bot.backendType === "external") {
      const config = bot.backendConfig
        ? (JSON.parse(bot.backendConfig) as { webhookUrl?: string })
        : {};
      if (!config.webhookUrl) {
        decision = {
          action: validActions[Math.floor(Math.random() * validActions.length)],
          reasoning: "fallback - no webhookUrl configured",
        };
      } else {
        decision = await externalAgentDecide(config.webhookUrl, {
          gameState: state,
          myPlayerId: currentPlayer.id,
          myPlayerState: currentPlayer,
          validActions,
          gameHistory,
        });
      }
    } else {
      // Fallback: random
      decision = {
        action: validActions[Math.floor(Math.random() * validActions.length)],
      };
    }

    // Add small delay to make bot feel more natural (1-2 seconds)
    await new Promise<void>((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 1000)
    );

    // Apply action
    const actionParam: { type: "SHOOT"; targetId: string } | { type: "PASS" } =
      decision.action.type === "SHOOT"
        ? { type: "SHOOT", targetId: decision.action.targetId! }
        : { type: "PASS" };

    const { newState, events } = applyAction(state, currentPlayer.id, actionParam);

    // Save new state to DB
    await db
      .update(games)
      .set({ stateJson: JSON.stringify(newState) })
      .where(eq(games.id, gameId));

    // Record events
    for (const event of events) {
      await db.insert(gameEvents).values({
        id: crypto.randomUUID(),
        gameId,
        turn: event.turn,
        eventType: event.type,
        eventData: JSON.stringify({
          ...event.data,
          botReasoning: decision.reasoning,
        }),
        actorId: botId,
      });
    }

    // Handle game over
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

    // Broadcast SSE
    publish(`game:${gameId}`, {
      type: "GAME_EVENTS",
      events,
      newState,
    });

    // If game continues, check if next player is also a bot
    if (newState.status === "active") {
      setTimeout(() => {
        processBotTurn(gameId).catch((err: unknown) =>
          console.error("Bot chain error:", err)
        );
      }, 500);
    }
  } finally {
    processingBots.delete(lockKey);
  }
}
