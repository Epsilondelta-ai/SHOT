export type EventType =
  | "GAME_STARTED"
  | "TURN_CHANGED"
  | "ACTION_TAKEN"
  | "PLAYER_ELIMINATED"
  | "GAME_ENDED";

export interface GameEvent {
  type: EventType;
  data: Record<string, unknown>;
  turn: number;
  timestamp: string;
}

export interface ActionTakenData {
  actorId: string;
  actionType: "SHOOT" | "PASS";
  targetId?: string;
  damage?: number;
}

export interface TurnChangedData {
  currentPlayerId: string;
  turn: number;
}

export interface PlayerEliminatedData {
  playerId: string;
  by: string;
}

export interface GameEndedData {
  winnerId?: string;
  result: "win" | "draw";
  finalState: GameState;
}

export interface GameState {
  gameId: string;
  turn: number;
  currentPlayerIndex: number;
  players: PlayerState[];
  status: "active" | "finished";
  winner?: string;
  result?: "win" | "draw";
  consecutivePasses: number;
}

export interface PlayerState {
  id: string; // userId or botId
  name: string;
  isBot: boolean;
  hp: number;
  status: "alive" | "eliminated";
  seat: number;
}
