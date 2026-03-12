import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { gameParticipant, gameRecord, gameReplayFrame } from "../db/schema";
import { createOmniscientSnapshot } from "./gameState";

// In-memory seq counter per room
const frameCounters = new Map<string, number>();
// Guard against recording game end twice
const finishedRooms = new Set<string>();

export function recordGameStart(
  roomId: string,
  players: Array<{ userId: string; name: string }>,
): void {
  frameCounters.set(roomId, 0);
  const playerNames = players.map((p) => p.name);
  db.insert(gameRecord)
    .values({
      roomId,
      playerCount: playerNames.length,
      playerNames: JSON.stringify(playerNames),
      startedAt: new Date(),
    })
    .run();
  for (const player of players) {
    db.insert(gameParticipant)
      .values({
        id: crypto.randomUUID(),
        roomId,
        userId: player.userId,
        participationType: "player",
      })
      .run();
  }
  recordFrame(roomId, "게임 시작");
}

export function recordSpectator(roomId: string, userId: string): void {
  const existing = db
    .select()
    .from(gameParticipant)
    .where(and(eq(gameParticipant.roomId, roomId), eq(gameParticipant.userId, userId)))
    .get();
  if (existing) return;
  const record = db.select().from(gameRecord).where(eq(gameRecord.roomId, roomId)).get();
  if (!record) return;
  db.insert(gameParticipant)
    .values({
      id: crypto.randomUUID(),
      roomId,
      userId,
      participationType: "spectator",
    })
    .run();
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
  if (finishedRooms.has(roomId)) return;
  finishedRooms.add(roomId);
  db.update(gameRecord)
    .set({ winnerTeam, finishedAt: new Date() })
    .where(eq(gameRecord.roomId, roomId))
    .run();
  recordFrame(roomId, `게임 종료: ${winnerTeam} 승리`);
  frameCounters.delete(roomId);
  finishedRooms.delete(roomId);
}
