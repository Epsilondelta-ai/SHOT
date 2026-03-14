import type { GameState } from "@/lib/game/events";

// Simple function to trigger bot processing after a human action
export function triggerBotIfNeeded(gameId: string, newState: GameState): void {
  if (newState.status !== "active") return;

  // Fire and forget
  import("./worker")
    .then(({ processBotTurn }) => {
      processBotTurn(gameId).catch((err: unknown) =>
        console.error("Bot worker error:", err)
      );
    })
    .catch((err: unknown) => console.error("Bot worker import error:", err));
}
