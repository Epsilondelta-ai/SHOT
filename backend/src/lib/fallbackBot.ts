import { applyGameAction, createSnapshot, getValidActionsForUser } from './gameState';

export function runFallbackTurn(roomId: string, userId: string): void {
  const actions = getValidActionsForUser(roomId, userId);
  if (actions.length === 0) return;

  const snapshot = createSnapshot(roomId, userId, { allowSpectator: false });

  if (snapshot.phase === 'chatting') {
    applyGameAction(roomId, userId, { type: 'skip-chat' });
    const nextActions = getValidActionsForUser(roomId, userId);
    if (nextActions.length > 0 && createSnapshot(roomId, userId, { allowSpectator: false }).phase === 'acting') {
      runFallbackTurn(roomId, userId);
    }
    return;
  }

  if (snapshot.phase === 'acting') {
    if (snapshot.mustUseAttack) {
      const attackAction = actions.find(a => a.type === 'play-card' && a.card === 'attack');
      if (attackAction) {
        applyGameAction(roomId, userId, attackAction);
        runFallbackTurn(roomId, userId);
        return;
      }
    }
    try {
      applyGameAction(roomId, userId, { type: 'end-turn' });
    } catch {
      const attackAction = actions.find(a => a.type === 'play-card' && a.card === 'attack');
      if (attackAction) {
        applyGameAction(roomId, userId, attackAction);
        runFallbackTurn(roomId, userId);
      }
    }
  }
}
