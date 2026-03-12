import { eq } from "drizzle-orm";
import { db } from "../db";
import { gameRecord, gameReplayFrame } from "../db/schema";
import { createOmniscientSnapshot } from "./gameState";

// In-memory seq counter per room
const frameCounters = new Map<string, number>();

export function recordGameStart(roomId: string, playerNames: string[]): void {
  frameCounters.set(roomId, 0);
  db.insert(gameRecord)
    .values({
      roomId,
      playerCount: playerNames.length,
      playerNames: JSON.stringify(playerNames),
      startedAt: new Date(),
    })
    .run();
  recordFrame(roomId, "Game started");
}

export function recordFrame(roomId: string, actionSummary: string | null): void {
  const snapshot = createOmniscientSnapshot(roomId);
  if (!snapshot) return;

  const seq = frameCounters.get(roomId) ?? 0;
  frameCounters.set(roomId, seq + 1);

  db.insert(gameReplayFrame)
    .values({
      id: crypto.randomUUID(),
      roomId,
      seq,
      snapshot: JSON.stringify(snapshot),
      actionSummary,
    })
    .run();
}

export function recordGameEnd(roomId: string, winnerTeam: string): void {
  db.update(gameRecord)
    .set({ winnerTeam, finishedAt: new Date() })
    .where(eq(gameRecord.roomId, roomId))
    .run();
  recordFrame(roomId, `Game over: ${winnerTeam} win`);
  frameCounters.delete(roomId);
}
