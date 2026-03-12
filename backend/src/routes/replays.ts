import Elysia from "elysia";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { gameRecord } from "../db/schema";

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
    const record = db
      .select()
      .from(gameRecord)
      .where(eq(gameRecord.roomId, params.roomId))
      .get();

    if (!record?.replayData) {
      set.status = 404;
      return { error: "No frames found" };
    }

    type FrameEntry = { snapshot: unknown; actionSummary: string | null };
    const frames = JSON.parse(record.replayData) as FrameEntry[];

    return {
      frames: frames.map((f, i) => ({
        seq: i,
        snapshot: f.snapshot,
        actionSummary: f.actionSummary,
      })),
    };
  });
