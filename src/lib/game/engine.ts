import type { GameState, PlayerState, ActionTakenData, GameEvent } from "./events";

export function createGameState(
  gameId: string,
  players: { id: string; name: string; isBot: boolean; seat: number }[]
): GameState {
  return {
    gameId,
    turn: 0,
    currentPlayerIndex: 0,
    consecutivePasses: 0,
    status: "active",
    players: players.map((p) => ({
      ...p,
      hp: 5,
      status: "alive" as const,
    })),
  };
}

export function getAlivePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => p.status === "alive");
}

export function getCurrentPlayer(state: GameState): PlayerState {
  const alive = getAlivePlayers(state);
  return alive[state.currentPlayerIndex % alive.length];
}

export function applyAction(
  state: GameState,
  actorId: string,
  action: { type: "SHOOT"; targetId: string } | { type: "PASS" }
): { newState: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const newState = JSON.parse(JSON.stringify(state)) as GameState;

  const actor = newState.players.find((p) => p.id === actorId);
  if (!actor || actor.status !== "alive") {
    throw new Error(`Actor ${actorId} is not in the game or eliminated`);
  }

  const currentTurnPlayer = getCurrentPlayer(newState);
  if (currentTurnPlayer.id !== actorId) {
    throw new Error(`It's not ${actorId}'s turn`);
  }

  if (action.type === "SHOOT") {
    const target = newState.players.find((p) => p.id === action.targetId);
    if (!target || target.status !== "alive") {
      throw new Error(`Target ${action.targetId} is not valid`);
    }
    if (target.id === actorId) {
      throw new Error("Cannot shoot yourself");
    }

    target.hp -= 1;
    newState.consecutivePasses = 0;

    const actionData: ActionTakenData = {
      actorId,
      actionType: "SHOOT",
      targetId: action.targetId,
      damage: 1,
    };
    events.push({
      type: "ACTION_TAKEN",
      data: actionData as unknown as Record<string, unknown>,
      turn: newState.turn,
      timestamp: new Date().toISOString(),
    });

    if (target.hp <= 0) {
      target.status = "eliminated";
      events.push({
        type: "PLAYER_ELIMINATED",
        data: { playerId: target.id, by: actorId },
        turn: newState.turn,
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    newState.consecutivePasses += 1;
    events.push({
      type: "ACTION_TAKEN",
      data: { actorId, actionType: "PASS" } as unknown as Record<string, unknown>,
      turn: newState.turn,
      timestamp: new Date().toISOString(),
    });
  }

  // Check win/draw conditions
  const winResult = checkWinner(newState);

  if (winResult) {
    newState.status = "finished";
    newState.winner = winResult.winnerId;
    newState.result = winResult.result;
    events.push({
      type: "GAME_ENDED",
      data: {
        winnerId: winResult.winnerId,
        result: winResult.result,
        finalState: newState,
      } as unknown as Record<string, unknown>,
      turn: newState.turn,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Advance turn
    newState.turn += 1;
    const newAlive = getAlivePlayers(newState);
    const currentIdx = newAlive.findIndex((p) => p.id === actorId);
    newState.currentPlayerIndex = (currentIdx + 1) % newAlive.length;

    events.push({
      type: "TURN_CHANGED",
      data: {
        currentPlayerId: newAlive[newState.currentPlayerIndex].id,
        turn: newState.turn,
      } as unknown as Record<string, unknown>,
      turn: newState.turn,
      timestamp: new Date().toISOString(),
    });
  }

  return { newState, events };
}

export function checkWinner(
  state: GameState
): { winnerId?: string; result: "win" | "draw" } | null {
  const alive = getAlivePlayers(state);

  if (alive.length === 1) {
    return { winnerId: alive[0].id, result: "win" };
  }

  if (alive.length === 0) {
    return { result: "draw" };
  }

  // Draw if all alive players have passed consecutively (full round)
  if (state.consecutivePasses >= alive.length) {
    return { result: "draw" };
  }

  return null;
}
