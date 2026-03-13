import type { GameAction, GameSnapshot } from "./gameState";

export type BotTurnRequestPayload = {
  botId: string;
  roomId: string;
  playerId: string;
  userId: string;
  language: string | null;
  snapshot: GameSnapshot;
  validActions: GameAction[];
  timeoutMs: number;
};

export type BotConnectorClientMessage =
  | { type: "heartbeat"; botId: string; connectorId?: string }
  | {
      type: "action_result";
      requestId: string;
      botId: string;
      action: GameAction | null;
      error?: string;
    };

export type BotConnectorServerMessage =
  | {
      type: "hello_ack";
      botId: string;
      heartbeatIntervalMs: number;
    }
  | {
      type: "turn_request";
      requestId: string;
      payload: BotTurnRequestPayload;
    }
  | { type: "error"; message: string };
