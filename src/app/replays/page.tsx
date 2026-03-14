import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { replays, games, gamePlayers, roomParticipants, bots } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

// @MX:NOTE: 리플레이 목록 페이지 - 서버 컴포넌트, 세션 필요

type ReplayItem = {
  id: string;
  gameId: string;
  createdAt: string | null;
  game: {
    id: string;
    status: string;
    endedAt: string | null;
    playerCount: number;
  } | null;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReplayRow({ item }: { item: ReplayItem }) {
  const game = item.game;
  return (
    <div
      style={{
        backgroundColor: "#111",
        border: "1px solid #222",
        borderRadius: 8,
        padding: "0.875rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            marginBottom: "0.25rem",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              fontFamily: "monospace",
              color: "#666",
            }}
          >
            {item.gameId.slice(0, 8)}
          </span>
          {game && (
            <span
              style={{
                display: "inline-block",
                padding: "0.1rem 0.4rem",
                borderRadius: 4,
                fontSize: "0.7rem",
                fontWeight: 600,
                backgroundColor: game.status === "finished" ? "#22222288" : "#ef444422",
                color: game.status === "finished" ? "#888" : "#ef4444",
                border: `1px solid ${game.status === "finished" ? "#333" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              {game.status === "finished" ? "종료" : game.status}
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "#888" }}>
          {game ? (
            <>
              <span>플레이어 {game.playerCount}명</span>
              <span style={{ marginLeft: "0.75rem", color: "#555" }}>
                {formatDate(game.endedAt ?? item.createdAt)}
              </span>
            </>
          ) : (
            <span style={{ color: "#555" }}>{formatDate(item.createdAt)}</span>
          )}
        </div>
      </div>
      <a
        href={`/replay/${item.id}`}
        style={{
          padding: "0.375rem 0.875rem",
          backgroundColor: "#ef4444",
          color: "#fff",
          borderRadius: 4,
          fontSize: "0.875rem",
          fontWeight: 600,
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        보기
      </a>
    </div>
  );
}

export default async function ReplaysPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.userId;

  // Get all accessible gameIds
  const playerRows = await db
    .select({ gameId: gamePlayers.gameId })
    .from(gamePlayers)
    .where(eq(gamePlayers.userId, userId));

  const participantRooms = await db
    .select({ roomId: roomParticipants.roomId })
    .from(roomParticipants)
    .where(eq(roomParticipants.userId, userId));

  let spectatorGameIds: string[] = [];
  if (participantRooms.length > 0) {
    const roomIds = participantRooms.map((r) => r.roomId);
    const roomGames = await db
      .select({ id: games.id })
      .from(games)
      .where(inArray(games.roomId, roomIds));
    spectatorGameIds = roomGames.map((g) => g.id);
  }

  const userBots = await db
    .select({ id: bots.id })
    .from(bots)
    .where(eq(bots.ownerId, userId));

  let botGameIds: string[] = [];
  if (userBots.length > 0) {
    const botIds = userBots.map((b) => b.id);
    const botPlayerRows = await db
      .select({ gameId: gamePlayers.gameId })
      .from(gamePlayers)
      .where(inArray(gamePlayers.botId, botIds));
    botGameIds = botPlayerRows.map((r) => r.gameId);
  }

  const allGameIds = Array.from(
    new Set([
      ...playerRows.map((r) => r.gameId),
      ...spectatorGameIds,
      ...botGameIds,
    ])
  );

  let replayItems: ReplayItem[] = [];

  if (allGameIds.length > 0) {
    const replayRows = await db
      .select()
      .from(replays)
      .where(inArray(replays.gameId, allGameIds));

    if (replayRows.length > 0) {
      const replayGameIds = replayRows.map((r) => r.gameId);
      const gameRows = await db
        .select()
        .from(games)
        .where(inArray(games.id, replayGameIds));
      const gameMap = new Map(gameRows.map((g) => [g.id, g]));

      const playerCountRows = await db
        .select({ gameId: gamePlayers.gameId, id: gamePlayers.id })
        .from(gamePlayers)
        .where(inArray(gamePlayers.gameId, replayGameIds));
      const playerCountMap = new Map<string, number>();
      for (const row of playerCountRows) {
        playerCountMap.set(row.gameId, (playerCountMap.get(row.gameId) ?? 0) + 1);
      }

      replayItems = replayRows
        .map((replay) => {
          const game = gameMap.get(replay.gameId);
          return {
            id: replay.id,
            gameId: replay.gameId,
            createdAt: replay.createdAt,
            game: game
              ? {
                  id: game.id,
                  status: game.status,
                  endedAt: game.endedAt,
                  playerCount: playerCountMap.get(game.id) ?? 0,
                }
              : null,
          };
        })
        .sort((a, b) => {
          const dateA = a.game?.endedAt ?? a.createdAt ?? "";
          const dateB = b.game?.endedAt ?? b.createdAt ?? "";
          return dateB.localeCompare(dateA);
        });
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#f0f0f0",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #1a1a1a",
          padding: "0 1.5rem",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a
            href="/lobby"
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#ef4444",
              letterSpacing: "0.1em",
              textDecoration: "none",
            }}
          >
            SHOT
          </a>
          <span style={{ color: "#333", fontSize: "1rem" }}>/</span>
          <span style={{ fontSize: "0.9375rem", color: "#888" }}>리플레이</span>
        </div>
        <span style={{ fontSize: "0.875rem", color: "#666" }}>
          {session.username}
        </span>
      </header>

      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        <h1
          style={{
            margin: "0 0 1.5rem",
            fontSize: "1.375rem",
            fontWeight: 700,
            color: "#f0f0f0",
          }}
        >
          내 리플레이
        </h1>

        {replayItems.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "#444",
              backgroundColor: "#111",
              border: "1px solid #1a1a1a",
              borderRadius: 8,
              fontSize: "0.9375rem",
            }}
          >
            리플레이가 없습니다. 게임을 플레이하면 자동으로 저장됩니다.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {replayItems.map((item) => (
              <ReplayRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
