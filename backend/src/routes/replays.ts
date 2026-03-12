import Elysia from "elysia";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { gameRecord, gameReplayFrame } from "../db/schema";

export const replayRoutes = new Elysia()
  .get("/api/replays", async () => {
    const records = await db
      .select()
      .from(gameRecord)
      .where(isNotNull(gameRecord.finishedAt))
      .orderBy(desc(gameRecord.startedAt));

    return {
      records: records.map((r) => ({
        roomId: r.roomId,
        playerCount: r.playerCount,
        playerNames: JSON.parse(r.playerNames) as string[],
        winnerTeam: r.winnerTeam,
        startedAt: r.startedAt instanceof Date ? r.startedAt.getTime() : r.startedAt,
        finishedAt: r.finishedAt instanceof Date ? r.finishedAt.getTime() : r.finishedAt,
      })),
    };
  })

  .get("/api/replays/:roomId/frames", async ({ params, set }) => {
    const frames = await db
      .select()
      .from(gameReplayFrame)
      .where(eq(gameReplayFrame.roomId, params.roomId))
      .orderBy(gameReplayFrame.seq);

    if (frames.length === 0) {
      set.status = 404;
      return { error: "No frames found" };
    }

    return {
      frames: frames.map((f) => ({
        id: f.id,
        seq: f.seq,
        snapshot: JSON.parse(f.snapshot),
        actionSummary: f.actionSummary,
        createdAt: f.createdAt instanceof Date ? f.createdAt.getTime() : f.createdAt,
      })),
    };
  });
