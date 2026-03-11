import Elysia from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { room } from "../db/schema";
import {
  applyGameAction,
  createSnapshot,
  getGame,
  initializeGame,
} from "../lib/gameState";
import { getUser } from "../lib/getUser";
import { getRoomById } from "../lib/roomState";
import { getSerializedRoomPlayers } from "../lib/roomPlayers";
import { broadcastPlayers } from "../ws/roomWs";

function isSpectatorRequest(request: Request) {
  return new URL(request.url).searchParams.get("spectator") === "1";
}

export const gameRoutes = new Elysia()
  .get("/api/games/:id", async ({ params, request, set }) => {
    const user = await getUser(request);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!getGame(params.id)) {
      set.status = 404;
      return { error: "Game not found" };
    }

    try {
      return createSnapshot(params.id, user.id, {
        allowSpectator: isSpectatorRequest(request),
      });
    } catch (error) {
      set.status = 403;
      return { error: error instanceof Error ? error.message : "Forbidden" };
    }
  })

  .post("/api/games/:id/start", async ({ params, request, set }) => {
    const user = await getUser(request);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const roomData = await getRoomById(params.id);
    if (!roomData) {
      set.status = 404;
      return { error: "Room not found" };
    }
    if (roomData.hostUserId !== user.id) {
      set.status = 403;
      return { error: "Only the host can start the game" };
    }

    const players = await getSerializedRoomPlayers(params.id);
    if (players.length < 5) {
      set.status = 400;
      return { error: "At least 5 players are required to start the game" };
    }
    if (players.some((player) => player.type !== "human")) {
      set.status = 400;
      return {
        error: "Bots and LLM players are not yet supported for live games",
      };
    }
    if (
      players.some(
        (player) => player.userId !== roomData.hostUserId && !player.ready,
      )
    ) {
      set.status = 400;
      return {
        error: "All non-host players must be ready before starting",
      };
    }

    initializeGame(params.id, players);
    await db
      .update(room)
      .set({ status: "in_progress" })
      .where(eq(room.id, params.id));
    await broadcastPlayers(params.id);

    return { success: true, roomId: params.id };
  })

  .post("/api/games/:id/actions", async ({ params, request, set }) => {
    const user = await getUser(request);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const body = (await request.json()) as
      | { type: "chat"; text: string }
      | { type: "skip-chat" }
      | { type: "reveal" }
      | {
          type: "play-card";
          card: "attack" | "heal" | "jail" | "verify";
          targetId?: string;
        }
      | { type: "end-turn" };

    try {
      applyGameAction(params.id, user.id, body);
      return createSnapshot(params.id, user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid action";
      set.status = message === "Game not found." ? 404 : 400;
      return { error: message };
    }
  });
