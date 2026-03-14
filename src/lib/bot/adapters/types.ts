import type { GameState, PlayerState } from "@/lib/game/events";

export interface BotDecisionInput {
  gameState: GameState;
  myPlayerId: string;
  myPlayerState: PlayerState;
  validActions: BotAction[];
  gameHistory: string[]; // last 5 events as human-readable strings
}

export interface BotAction {
  type: "SHOOT" | "PASS";
  targetId?: string;
  targetName?: string;
}

export interface BotDecisionOutput {
  action: BotAction;
  reasoning?: string;
}
