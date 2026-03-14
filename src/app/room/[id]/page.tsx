"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

// @MX:NOTE: 방 대기실 페이지. 폴링 방식으로 참가자 목록 갱신 (SSE 없음)

type Participant = {
  id: string;
  roomId: string;
  userId: string | null;
  botId: string | null;
  role: string;
  joinedAt: string | null;
  name: string | null;
};

type RoomData = {
  id: string;
  name: string;
  status: string;
  maxPlayers: number;
  createdBy: string;
  gameId: string | null;
  participants: Participant[];
};

type CurrentUser = {
  userId: string;
  username: string;
  email: string;
};

type Bot = {
  id: string;
  name: string;
  backendType: string;
};

function ParticipantRow({ participant }: { participant: Participant }) {
  const isBot = participant.botId !== null;
  const isSpectator = participant.role === "spectator";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.625rem",
        padding: "0.5rem 0.75rem",
        backgroundColor: "#111",
        border: "1px solid #1e1e1e",
        borderRadius: 6,
      }}
    >
      <span style={{ fontSize: "1rem" }}>
        {isSpectator ? "👁️" : isBot ? "🤖" : "👤"}
      </span>
      <span style={{ flex: 1, fontSize: "0.9375rem", color: "#f0f0f0" }}>
        {participant.name ?? (isBot ? "봇" : "알 수 없음")}
      </span>
      {isBot && (
        <span
          style={{
            fontSize: "0.75rem",
            color: "#888",
            backgroundColor: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 4,
            padding: "0.125rem 0.375rem",
          }}
        >
          BOT
        </span>
      )}
      {isSpectator && (
        <span style={{ fontSize: "0.75rem", color: "#666" }}>관전</span>
      )}
    </div>
  );
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [room, setRoom] = useState<RoomData | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [myBots, setMyBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("방을 찾을 수 없습니다.");
        }
        return;
      }
      const data = (await res.json()) as RoomData;
      setRoom(data);

      // If game started, redirect appropriately
      if (data.status === "playing" && data.gameId) {
        const myParticipant = data.participants.find(
          (p) => p.userId === currentUser?.userId
        );
        if (myParticipant?.role === "player") {
          router.push(`/game/${data.gameId}`);
        } else {
          router.push(`/spectate/${data.gameId}`);
        }
      }
    } catch {
      // ignore polling errors
    }
  }, [roomId, currentUser?.userId, router]);

  // Fetch current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: unknown) => {
        const d = data as { user?: CurrentUser; error?: string };
        if (d.user) setCurrentUser(d.user);
        else router.push("/login");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Initial room fetch
  useEffect(() => {
    if (!currentUser) return;
    fetchRoom().finally(() => setLoading(false));
  }, [currentUser, fetchRoom]);

  // Poll every 2 seconds
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [currentUser, fetchRoom]);

  // Fetch my bots when bot panel opens
  useEffect(() => {
    if (!showBotPanel) return;
    fetch("/api/bots")
      .then((r) => r.json())
      .then((data: unknown) => {
        // API returns { bots: [...] }
        const d = data as { bots?: Bot[] } | Bot[];
        const arr = Array.isArray(d) ? d : (d as { bots?: Bot[] }).bots ?? [];
        setMyBots(arr);
      })
      .catch(() => setMyBots([]));
  }, [showBotPanel]);

  async function handleJoin(role: "player" | "spectator") {
    setActionError("");
    setJoining(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "참가 실패");
        return;
      }
      await fetchRoom();
    } catch {
      setActionError("네트워크 오류. 다시 시도해주세요.");
    } finally {
      setJoining(false);
    }
  }

  async function handleAddBot(botId: string) {
    setActionError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/bots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "봇 추가 실패");
        return;
      }
      setShowBotPanel(false);
      await fetchRoom();
    } catch {
      setActionError("네트워크 오류. 다시 시도해주세요.");
    }
  }

  async function handleStart() {
    setActionError("");
    setStarting(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/start`, {
        method: "POST",
      });
      const data = (await res.json()) as { gameId?: string; error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "게임 시작 실패");
        return;
      }
      if (data.gameId) {
        router.push(`/game/${data.gameId}`);
      }
    } catch {
      setActionError("네트워크 오류. 다시 시도해주세요.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: "0.9375rem",
        }}
      >
        불러오는 중...
      </div>
    );
  }

  if (error || !room) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          color: "#ef4444",
        }}
      >
        <p>{error || "방을 불러올 수 없습니다."}</p>
        <a href="/lobby" style={{ color: "#888", fontSize: "0.875rem" }}>
          로비로 돌아가기
        </a>
      </div>
    );
  }

  const isCreator = currentUser?.userId === room.createdBy;
  const myParticipant = room.participants.find(
    (p) => p.userId === currentUser?.userId
  );
  const players = room.participants.filter((p) => p.role === "player");
  const spectators = room.participants.filter((p) => p.role === "spectator");
  const playerCount = players.length;
  const canStart = isCreator && playerCount >= 2 && room.status === "waiting";
  const canJoinAsPlayer =
    !myParticipant &&
    room.status === "waiting" &&
    playerCount < room.maxPlayers;
  const canJoinAsSpectator = !myParticipant && room.status === "waiting";

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
          gap: "1rem",
        }}
      >
        <a
          href="/lobby"
          style={{
            color: "#888",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          ← 로비
        </a>
        <span
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#f0f0f0",
            flex: 1,
          }}
        >
          {room.name}
        </span>
        <span style={{ fontSize: "0.8125rem", color: "#666" }}>
          {playerCount}/{room.maxPlayers} 플레이어
        </span>
      </header>

      <main
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {actionError && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.625rem 0.875rem",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6,
              color: "#ef4444",
              fontSize: "0.875rem",
            }}
          >
            {actionError}
          </div>
        )}

        {/* Join buttons for non-participants */}
        {!myParticipant && room.status === "waiting" && (
          <div
            style={{
              display: "flex",
              gap: "0.625rem",
              marginBottom: "1.5rem",
            }}
          >
            {canJoinAsPlayer && (
              <button
                onClick={() => handleJoin("player")}
                disabled={joining}
                style={{
                  padding: "0.625rem 1.125rem",
                  backgroundColor: "#ef4444",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: joining ? "not-allowed" : "pointer",
                  opacity: joining ? 0.7 : 1,
                }}
              >
                플레이어로 참가
              </button>
            )}
            {canJoinAsSpectator && (
              <button
                onClick={() => handleJoin("spectator")}
                disabled={joining}
                style={{
                  padding: "0.625rem 1.125rem",
                  backgroundColor: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  color: "#aaa",
                  fontSize: "0.9375rem",
                  cursor: joining ? "not-allowed" : "pointer",
                  opacity: joining ? 0.7 : 1,
                }}
              >
                관전자로 참가
              </button>
            )}
          </div>
        )}

        {/* My role indicator */}
        {myParticipant && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "0.5rem 0.875rem",
              backgroundColor: "#111",
              border: "1px solid #222",
              borderRadius: 6,
              fontSize: "0.875rem",
              color: "#888",
            }}
          >
            현재 역할:{" "}
            <span style={{ color: "#f0f0f0", fontWeight: 600 }}>
              {myParticipant.role === "player" ? "플레이어" : "관전자"}
            </span>
          </div>
        )}

        {/* Players section */}
        <section style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              margin: "0 0 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            플레이어 ({playerCount}/{room.maxPlayers})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {players.map((p) => (
              <ParticipantRow key={p.id} participant={p} />
            ))}
            {playerCount < room.maxPlayers &&
              Array.from({ length: room.maxPlayers - playerCount }).map(
                (_, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "#0d0d0d",
                      border: "1px dashed #1e1e1e",
                      borderRadius: 6,
                      fontSize: "0.875rem",
                      color: "#333",
                    }}
                  >
                    빈 자리
                  </div>
                )
              )}
          </div>
        </section>

        {/* Bot invite (creator only) */}
        {isCreator && room.status === "waiting" && playerCount < room.maxPlayers && (
          <div style={{ marginBottom: "1.5rem" }}>
            {!showBotPanel ? (
              <button
                onClick={() => setShowBotPanel(true)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  color: "#888",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                🤖 봇 초대
              </button>
            ) : (
              <div
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #222",
                  borderRadius: 8,
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                    봇 선택
                  </span>
                  <button
                    onClick={() => setShowBotPanel(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#666",
                      cursor: "pointer",
                      fontSize: "1rem",
                    }}
                  >
                    ✕
                  </button>
                </div>
                {myBots.length === 0 ? (
                  <p style={{ color: "#555", fontSize: "0.875rem", margin: 0 }}>
                    보유한 봇이 없습니다.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {myBots.map((bot) => (
                      <button
                        key={bot.id}
                        onClick={() => handleAddBot(bot.id)}
                        style={{
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #2a2a2a",
                          borderRadius: 6,
                          color: "#f0f0f0",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span>🤖</span>
                        <span>{bot.name}</span>
                        <span style={{ color: "#555", fontSize: "0.75rem" }}>
                          {bot.backendType}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Spectators section */}
        {spectators.length > 0 && (
          <section style={{ marginBottom: "1.5rem" }}>
            <h2
              style={{
                margin: "0 0 0.75rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              관전자 ({spectators.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {spectators.map((p) => (
                <ParticipantRow key={p.id} participant={p} />
              ))}
            </div>
          </section>
        )}

        {/* Start game (creator only) */}
        {isCreator && room.status === "waiting" && (
          <div>
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: canStart ? "#ef4444" : "#1a1a1a",
                border: canStart ? "none" : "1px solid #2a2a2a",
                borderRadius: 6,
                color: canStart ? "#fff" : "#444",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: canStart && !starting ? "pointer" : "not-allowed",
                transition: "background-color 0.15s",
              }}
            >
              {starting
                ? "시작 중..."
                : canStart
                ? "게임 시작"
                : `게임 시작 (최소 2명 필요, 현재 ${playerCount}명)`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
