import { broadcastGameState } from "../ws/gameWs";
import {
  applyGameAction,
  createSnapshot,
  forceAdvanceTurn,
  getCurrentTurnController,
  type GameAction,
  type GameSnapshot,
} from "./gameState";
import { requestBotActionPolling } from "./botPresence";
import { maybeRunLlmTurn } from "./llmPlayer";

const BOT_ACTION_TIMEOUT_MS = 15_000;

function getValidActions(snapshot: GameSnapshot, userId: string): GameAction[] {
  const me = snapshot.players.find((player) => player.userId === userId);
  if (!me || !me.alive) return [{ type: "end-turn" }];
  if (snapshot.currentTurnPlayerId !== me.id) return [];

  const actions: GameAction[] = [];

  if (snapshot.phase === "chatting") {
    actions.push({ type: "chat", text: "" });
    actions.push({ type: "skip-chat" });
    return actions;
  }

  if (snapshot.phase === "acting") {
    if (snapshot.canReveal) {
      actions.push({ type: "reveal" });
    }

    const alivePlayers = snapshot.players.filter((player) => player.alive && player.id !== me.id);

    if (me.attacks > 0) {
      for (const target of alivePlayers) {
        actions.push({ type: "play-card", card: "attack", targetId: target.id });
      }
    }

    const healTargets = snapshot.players.filter((player) => player.alive && player.hp < player.maxHp);
    if (me.cards.includes("heal") && healTargets.length > 0) {
      for (const target of healTargets) {
        actions.push({ type: "play-card", card: "heal", targetId: target.id });
      }
    }

    if (me.cards.includes("jail")) {
      for (const target of alivePlayers.filter((player) => !player.isJailed)) {
        actions.push({ type: "play-card", card: "jail", targetId: target.id });
      }
    }

    if (me.cards.includes("verify")) {
      const verifyTargets = snapshot.players.filter(
        (player) => player.alive && player.role === "normal" && !player.isJailed,
      );
      for (const target of verifyTargets) {
        actions.push({ type: "play-card", card: "verify", targetId: target.id });
      }
    }

    if (!snapshot.mustUseAttack) {
      actions.push({ type: "end-turn" });
    }
  }

  return actions;
}

function buildBotTurnPayload(options: {
  botId: string;
  roomId: string;
  playerId: string;
  userId: string;
  language: string | null;
}) {
  const snapshot = createSnapshot(options.roomId, options.userId);
  return {
    botId: options.botId,
    roomId: options.roomId,
    playerId: options.playerId,
    userId: options.userId,
    language: options.language,
    snapshot,
    validActions: getValidActions(snapshot, options.userId),
    timeoutMs: BOT_ACTION_TIMEOUT_MS,
  };
}

function applyBotFallback(roomId: string, userId: string) {
  forceAdvanceTurn(roomId, userId);
}

export async function maybeRunBotTurn(roomId: string): Promise<void> {
  while (true) {
    const info = getCurrentTurnController(roomId);
    if (!info || info.controller !== "bot") return;

    if (!info.botId) {
      applyBotFallback(roomId, info.userId);
      await broadcastGameState(roomId);
      return;
    }

    const payload = buildBotTurnPayload({
      botId: info.botId,
      roomId,
      playerId: info.playerId,
      userId: info.userId,
      language: info.language,
    });

    const action = await requestBotActionPolling({ botId: info.botId, payload });

    if (!action) {
      applyBotFallback(roomId, info.userId);
      await broadcastGameState(roomId);
      continue;
    }

    try {
      applyGameAction(roomId, info.userId, action);
    } catch {
      applyBotFallback(roomId, info.userId);
    }

    await broadcastGameState(roomId);
  }
}

export async function maybeRunAutomatedTurn(roomId: string): Promise<void> {
  while (true) {
    const info = getCurrentTurnController(roomId);
    if (!info || info.controller === "human") return;

    if (info.controller === "llm") {
      await maybeRunLlmTurn(roomId);
      continue;
    }

    await maybeRunBotTurn(roomId);
  }
}
