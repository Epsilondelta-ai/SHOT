import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { gameParticipant, gameRecord } from "../db/schema";
import { createOmniscientSnapshot } from "./gameState";

type FrameEntry = {
  snapshot: ReturnType<typeof createOmniscientSnapshot>;
  actionSummary: string | null;
};

// In-memory frame buffer per room — flushed to DB on game end
const frameBuffers = new Map<string, FrameEntry[]>();
// Guard against recording game end twice
const finishedRooms = new Set<string>();

export function recordGameStart(
  roomId: string,
  players: Array<{ userId: string; name: string }>,
): void {
  frameBuffers.set(roomId, []);
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

  const buffer = frameBuffers.get(roomId);
  if (!buffer) return;

  buffer.push({ snapshot, actionSummary });
}

export function recordGameEnd(roomId: string, winnerTeam: string): void {
  if (finishedRooms.has(roomId)) return;
  finishedRooms.add(roomId);

  recordFrame(roomId, `게임 종료: ${winnerTeam} 승리`);

  const buffer = frameBuffers.get(roomId) ?? [];
  frameBuffers.delete(roomId);

  db.update(gameRecord)
    .set({
      winnerTeam,
      finishedAt: new Date(),
      replayData: JSON.stringify(buffer),
    })
    .where(eq(gameRecord.roomId, roomId))
    .run();

  finishedRooms.delete(roomId);
}
