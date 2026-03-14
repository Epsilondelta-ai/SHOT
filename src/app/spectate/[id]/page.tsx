"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import type { GameState, PlayerState } from "@/lib/game/events";

// @MX:NOTE: 관전 페이지. 행동 버튼 없음, SSE로 실시간 업데이트만 수신

type GamePlayer = {
  id: string;
  gameId: string;
  userId: string | null;
  botId: string | null;
  seat: number;
  hp: number;
  status: string;
  name: string | null;
};

type GameData = {
  id: string;
  roomId: string;
  status: string;
  state: GameState;
  players: GamePlayer[];
};

type LogEntry = {
  id: string;
  text: string;
  ts: number;
};

function HpBar({ hp, maxHp = 5 }: { hp: number; maxHp?: number }) {
  return (
    <span
      style={{ fontFamily: "monospace", fontSize: "0.9375rem", letterSpacing: 2 }}
      aria-label={`HP ${hp}/${maxHp}`}
    >
      {Array.from({ length: maxHp }).map((_, i) => (
        <span key={i} style={{ color: i < hp ? "#ef4444" : "#2a2a2a" }}>
          {i < hp ? "●" : "○"}
        </span>
      ))}
    </span>
  );
}

function PlayerCard({
  player,
  isCurrent,
}: {
  player: PlayerState;
  isCurrent: boolean;
}) {
  const eliminated = player.status === "eliminated";
  return (
    <div
      style={{
        backgroundColor: "#111",
        border: isCurrent ? "2px solid #ef4444" : "1px solid #222",
        borderRadius: 8,
        padding: "0.875rem 1rem",
        opacity: eliminated ? 0.4 : 1,
        transition: "border-color 0.2s, opacity 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontSize: "0.875rem" }}>{player.isBot ? "🤖" : "👤"}</span>
        <span
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "#f0f0f0",
            flex: 1,
          }}
        >
          {player.name}
        </span>
        {player.isBot && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "#666",
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 3,
              padding: "0.1rem 0.35rem",
            }}
          >
            BOT
          </span>
        )}
        {isCurrent && !eliminated && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "#ef4444",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 3,
              padding: "0.1rem 0.35rem",
            }}
          >
            현재 턴
          </span>
        )}
      </div>
      <HpBar hp={player.hp} />
      {eliminated && (
        <div style={{ marginTop: "0.375rem", fontSize: "0.75rem", color: "#555" }}>
          탈락
        </div>
      )}
    </div>
  );
}

function GameLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);

  return (
    <div
      ref={ref}
      style={{
        height: 160,
        overflowY: "auto",
        backgroundColor: "#0d0d0d",
        border: "1px solid #1a1a1a",
        borderRadius: 6,
        padding: "0.625rem 0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      {entries.length === 0 ? (
        <span style={{ color: "#444", fontSize: "0.8125rem" }}>
          게임 로그가 여기에 표시됩니다.
        </span>
      ) : (
        entries.map((e) => (
          <div key={e.id} style={{ fontSize: "0.8125rem", color: "#999" }}>
            {e.text}
          </div>
        ))
      )}
    </div>
  );
}

export default function SpectatePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showResult, setShowResult] = useState(false);
  const logIdRef = useRef(0);

  function addLog(text: string) {
    logIdRef.current += 1;
    setLog((prev) => [
      ...prev,
      { id: String(logIdRef.current), text, ts: Date.now() },
    ]);
  }

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) {
        setError("게임을 찾을 수 없습니다.");
        return;
      }
      const data = (await res.json()) as GameData;
      setGameData(data);
      if (data.status === "finished") setShowResult(true);
    } catch {
      setError("게임 데이터를 불러올 수 없습니다.");
    }
  }, [gameId]);

  // Verify session exists (redirect if not logged in)
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: unknown) => {
        const d = data as { user?: unknown; error?: string };
        if (!d.user) router.push("/login");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Initial fetch
  useEffect(() => {
    fetchGame().finally(() => setLoading(false));
  }, [fetchGame]);

  // SSE subscription
  useEffect(() => {
    const source = new EventSource(`/api/games/${gameId}/stream`);

    source.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as {
          type: string;
          events?: Array<{ type: string; data: Record<string, unknown> }>;
        };
        if (event.type === "GAME_EVENTS" && event.events) {
          for (const ev of event.events) {
            if (ev.type === "ACTION_TAKEN") {
              const d = ev.data as {
                actorId?: string;
                actionType?: string;
                targetId?: string;
                damage?: number;
              };
              if (d.actionType === "SHOOT") {
                addLog(
                  `${d.actorId ?? "??"} → ${d.targetId ?? "??"} SHOOT (-${d.damage ?? 1})`
                );
              } else {
                addLog(`${d.actorId ?? "??"} PASS`);
              }
            }
            if (ev.type === "PLAYER_ELIMINATED") {
              const d = ev.data as { playerId?: string };
              addLog(`${d.playerId ?? "??"} 탈락`);
            }
            if (ev.type === "GAME_ENDED") {
              const d = ev.data as { winnerId?: string; result?: string };
              addLog(
                d.result === "draw"
                  ? "게임 종료: 무승부"
                  : `게임 종료: ${d.winnerId ?? "??"} 승리`
              );
              setShowResult(true);
            }
          }
          void fetchGame();
        }
      } catch {
        // ignore parse errors
      }
    };

    source.onerror = () => source.close();
    return () => source.close();
  }, [gameId, fetchGame]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        불러오는 중...
      </div>
    );
  }

  if (error || !gameData) {
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
        <p>{error || "게임을 불러올 수 없습니다."}</p>
        <a href="/lobby" style={{ color: "#888", fontSize: "0.875rem" }}>
          로비로 돌아가기
        </a>
      </div>
    );
  }

  const { state } = gameData;
  const currentPlayerState = state.players[state.currentPlayerIndex];

  const winner = state.winner
    ? (state.players.find((p) => p.id === state.winner)?.name ?? state.winner)
    : undefined;

  return (
    <div
      style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#f0f0f0" }}
    >
      {/* Result overlay */}
      {showResult && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "#111",
              border: "1px solid #333",
              borderRadius: 12,
              padding: "2.5rem",
              textAlign: "center",
              maxWidth: 360,
              width: "90%",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
              {state.result === "draw" ? "🤝" : "🏆"}
            </div>
            <h2
              style={{ margin: "0 0 0.5rem", fontSize: "1.375rem", fontWeight: 700 }}
            >
              {state.result === "draw" ? "무승부" : "게임 종료"}
            </h2>
            {winner && state.result !== "draw" && (
              <p style={{ margin: "0 0 1.5rem", color: "#ef4444", fontWeight: 600 }}>
                {winner} 승리
              </p>
            )}
            <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center" }}>
              <a
                href="/lobby"
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  textDecoration: "none",
                }}
              >
                로비로
              </a>
              <a
                href={`/replay/${gameData.id}`}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor: "transparent",
                  color: "#aaa",
                  border: "1px solid #333",
                  borderRadius: 6,
                  fontSize: "0.9375rem",
                  textDecoration: "none",
                }}
              >
                리플레이 보기
              </a>
            </div>
          </div>
        </div>
      )}

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
        <span
          style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "#ef4444",
            letterSpacing: "0.1em",
          }}
        >
          SHOT
        </span>
        {/* SPECTATING banner */}
        <span
          style={{
            padding: "0.2rem 0.625rem",
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 4,
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#ef4444",
            letterSpacing: "0.08em",
          }}
        >
          SPECTATING
        </span>
        <span style={{ color: "#444", fontSize: "0.9375rem", flex: 1 }}>
          턴 {state.turn}
        </span>
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem" }}>
        {/* Turn indicator */}
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.625rem 0.875rem",
            backgroundColor: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 6,
            fontSize: "0.875rem",
            color: "#888",
          }}
        >
          현재 턴:{" "}
          <span style={{ color: "#f0f0f0", fontWeight: 600 }}>
            {currentPlayerState?.name ?? "알 수 없음"}
          </span>
        </div>

        {/* Players grid — read-only, no action buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          {state.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isCurrent={player.id === currentPlayerState?.id}
            />
          ))}
        </div>

        {/* Game log */}
        <div>
          <h3
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            게임 로그
          </h3>
          <GameLog entries={log} />
        </div>
      </main>
    </div>
  );
}
