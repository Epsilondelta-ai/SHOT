import { appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { GameAction } from "./gameState";

export type LlmLogEntry = {
  timestamp: string;
  roomId: string;
  round: number;
  phase: string;
  player: {
    userId: string;
    name: string;
    assistantId: string | null;
    assistantName?: string;
    provider: string;
    model: string;
  };
  attempt: number;
  systemPrompt: string;
  userPrompt: string;
  rawResponse: string | null;
  parsedAction: GameAction | null;
  success: boolean;
  error: string | null;
  historyLength?: number;
  outcome:
    | "action_applied"
    | "parse_failed"
    | "api_error"
    | "force_end_turn"
    | "no_context";
};

const LOG_DIR = join(process.cwd(), "logs");

function ensureLogDir(): void {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function getLogFilePath(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return join(LOG_DIR, `llm-${date}.jsonl`);
}

export function writeLlmLog(entry: LlmLogEntry): void {
  ensureLogDir();
  try {
    appendFileSync(getLogFilePath(), JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // never crash the game loop due to logging failure
  }
}

export function llmLog(
  partial: Omit<LlmLogEntry, "timestamp">,
): void {
  writeLlmLog({ timestamp: new Date().toISOString(), ...partial });
}
