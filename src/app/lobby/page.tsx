import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rooms, roomParticipants } from "@/lib/db/schema";
import { ne, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import CreateRoomForm from "./CreateRoomForm";
import { NavBar } from "@/components/NavBar";

// @MX:NOTE: 로비 페이지 - 서버 컴포넌트, 세션 필요
// @MX:ANCHOR: 메인 진입점. 로그인 여부 확인 후 방 목록 렌더링
// @MX:REASON: 모든 게임 흐름이 이 페이지에서 시작됨

type RoomWithCount = {
  id: string;
  name: string;
  status: string;
  maxPlayers: number;
  createdBy: string;
  gameId: string | null;
  createdAt: string | null;
  playerCount: number;
  spectatorCount: number;
};

const statusLabel: Record<string, string> = {
  waiting: "대기 중",
  playing: "진행 중",
};

const statusColor: Record<string, string> = {
  waiting: "#22c55e",
  playing: "#ef4444",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: 99,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: `${statusColor[status] ?? "#888"}22`,
        color: statusColor[status] ?? "#888",
        border: `1px solid ${statusColor[status] ?? "#888"}44`,
      }}
    >
      {statusLabel[status] ?? status}
    </span>
  );
}

function RoomCard({ room }: { room: RoomWithCount }) {
  const isFull = room.playerCount >= room.maxPlayers;
  const isPlaying = room.status === "playing";

  return (
    <div
      style={{
        backgroundColor: "#111",
        border: "1px solid #222",
        borderRadius: 8,
        padding: "1rem 1.25rem",
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
              fontSize: "1rem",
              fontWeight: 600,
              color: "#f0f0f0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {room.name}
          </span>
          <StatusBadge status={room.status} />
        </div>
        <div style={{ fontSize: "0.8125rem", color: "#888" }}>
          <span>
            플레이어 {room.playerCount}/{room.maxPlayers}
          </span>
          {room.spectatorCount > 0 && (
            <span style={{ marginLeft: "0.75rem" }}>
              관전자 {room.spectatorCount}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        {!isPlaying && !isFull && (
          <a
            href={`/room/${room.id}`}
            style={{
              padding: "0.375rem 0.875rem",
              backgroundColor: "#ef4444",
              color: "#fff",
              borderRadius: 4,
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            참가
          </a>
        )}
        {!isPlaying && isFull && (
          <a
            href={`/room/${room.id}`}
            style={{
              padding: "0.375rem 0.875rem",
              backgroundColor: "#222",
              color: "#888",
              borderRadius: 4,
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #333",
            }}
          >
            관전
          </a>
        )}
        {isPlaying && room.gameId && (
          <a
            href={`/spectate/${room.gameId}`}
            style={{
              padding: "0.375rem 0.875rem",
              backgroundColor: "#222",
              color: "#aaa",
              borderRadius: 4,
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #333",
            }}
          >
            관전
          </a>
        )}
      </div>
    </div>
  );
}

export default async function LobbyPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const activeRooms = await db
    .select()
    .from(rooms)
    .where(ne(rooms.status, "finished"));

  const roomsWithCount: RoomWithCount[] = await Promise.all(
    activeRooms.map(async (room) => {
      const participants = await db
        .select()
        .from(roomParticipants)
        .where(eq(roomParticipants.roomId, room.id));
      const playerCount = participants.filter((p) => p.role === "player").length;
      const spectatorCount = participants.filter(
        (p) => p.role === "spectator"
      ).length;
      return { ...room, playerCount, spectatorCount };
    })
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#f0f0f0",
      }}
    >
      <NavBar username={session.username} />

      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "#f0f0f0",
            }}
          >
            로비
          </h1>
        </div>

        <CreateRoomForm />

        <div style={{ marginTop: "2rem" }}>
          <h2
            style={{
              margin: "0 0 0.875rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            방 목록 ({roomsWithCount.length})
          </h2>

          {roomsWithCount.length === 0 ? (
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
              방이 없습니다. 새 방을 만들어보세요.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {roomsWithCount.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
