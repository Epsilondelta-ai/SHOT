import { runFallbackTurn } from './fallbackBot';
import { broadcastGameState } from '../ws/gameWs';

// @MX:ANCHOR: pendingTurns tracks active external bot turn timers per room
// @MX:REASON: [AUTO] Central state for timeout management — cancelExternalBotTurn + startExternalBotTurn + resolveExternalBotTurn all mutate this map
const pendingTurns = new Map<string, { userId: string; resolve: () => void }>();

const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export function startExternalBotTurn(roomId: string, userId: string): void {
  cancelExternalBotTurn(roomId);

  const timer = setTimeout(() => {
    pendingTurns.delete(roomId);
    try {
      runFallbackTurn(roomId, userId);
      void broadcastGameState(roomId);
    } catch {
      // game may have ended
    }
  }, TIMEOUT_MS);

  pendingTurns.set(roomId, { userId, resolve: () => clearTimeout(timer) });
}

export function resolveExternalBotTurn(roomId: string): void {
  const pending = pendingTurns.get(roomId);
  if (pending) {
    pending.resolve();
    pendingTurns.delete(roomId);
  }
}

export function cancelExternalBotTurn(roomId: string): void {
  resolveExternalBotTurn(roomId);
}
