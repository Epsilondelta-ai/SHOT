"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

// @MX:NOTE: 리플레이 플레이어 페이지 - 턴별 재생 지원

type ReplayPlayer = {
  id: string;
  userId: string | null;
  botId: string | null;
  name: string;
  isBot: boolean;
  seat: number;
  finalHp: number;
};

type ReplayEvent = {
  id: string;
  turn: number;
  eventType: string;
  eventData: string;
  actorId: string | null;
  createdAt: string | null;
};

type ReplayGame = {
  id: string;
  status: string;
  stateJson: string;
  createdAt: string | null;
  endedAt: string | null;
};

type ReplayData = {
  id: string;
  gameId: string;
  game: ReplayGame;
  players: ReplayPlayer[];
  events: ReplayEvent[];
};

type ActionEventData = {
  actorId?: string;
  actionType?: string;
  targetId?: string;
  damage?: number;
  botReasoning?: string;
};

type EliminatedEventData = {
  playerId?: string;
};

type GameEndedEventData = {
  winnerId?: string;
  result?: string;
};

type Frame = {
  turn: number;
  actorName: string;
  actorId: string;
  action: string;
  targetName: string | null;
  damage: number | null;
  botReasoning: string | null;
  eliminated: string[];
  hpChanges: Record<string, number>;
};

function buildFrames(players: ReplayPlayer[], events: ReplayEvent[]): Frame[] {
  const playerById = new Map<string, ReplayPlayer>();
  for (const p of players) {
    if (p.userId) playerById.set(p.userId, p);
    if (p.botId) playerById.set(p.botId, p);
    playerById.set(p.id, p);
  }

  function resolveName(id: string | undefined): string {
    if (!id) return "Unknown";
    const p = playerById.get(id);
    return p?.name ?? id.slice(0, 8);
  }

  const frames: Frame[] = [];
  const eliminatedThisTurn: string[] = [];

  let currentFrame: Frame | null = null;

  for (const ev of events) {
    if (ev.eventType === "ACTION_TAKEN") {
      // Save previous frame if exists
      if (currentFrame) {
        frames.push({ ...currentFrame, eliminated: [...eliminatedThisTurn] });
        eliminatedThisTurn.length = 0;
      }

      const data = JSON.parse(ev.eventData) as ActionEventData;
      const actorId = data.actorId ?? ev.actorId ?? "";
      const actorName = resolveName(actorId);
      const targetName = data.targetId ? resolveName(data.targetId) : null;

      currentFrame = {
        turn: ev.turn,
        actorId,
        actorName,
        action: data.actionType ?? "UNKNOWN",
        targetName,
        damage: data.damage ?? null,
        botReasoning: data.botReasoning ?? null,
        eliminated: [],
        hpChanges: {},
      };

      if (data.actionType === "SHOOT" && data.targetId && data.damage) {
        currentFrame.hpChanges[data.targetId] = -(data.damage);
      }
    } else if (ev.eventType === "PLAYER_ELIMINATED") {
      const data = JSON.parse(ev.eventData) as EliminatedEventData;
      if (data.playerId) {
        eliminatedThisTurn.push(resolveName(data.playerId));
      }
    }
  }

  // Push last frame
  if (currentFrame) {
    frames.push({ ...currentFrame, eliminated: [...eliminatedThisTurn] });
  }

  return frames;
}

function HpDots({ hp, maxHp = 5 }: { hp: number; maxHp?: number }) {
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
  isActor,
}: {
  player: ReplayPlayer;
  isActor: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "#111",
        border: isActor ? "2px solid #ef4444" : "1px solid #222",
        borderRadius: 8,
        padding: "0.875rem 1rem",
        transition: "border-color 0.2s",
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
        {isActor && (
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
            행동
          </span>
        )}
      </div>
      <HpDots hp={player.finalHp} />
    </div>
  );
}

export default function ReplayPage() {
  const params = useParams();
  const replayId = params.id as string;

  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/replays/${replayId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Replay not found");
        return r.json() as Promise<ReplayData>;
      })
      .then((d) => {
        setData(d);
        setFrames(buildFrames(d.players, d.events));
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "리플레이를 불러올 수 없습니다.");
      })
      .finally(() => setLoading(false));
  }, [replayId]);

  const stopPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    if (frames.length === 0) return;
    setPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= frames.length - 1) {
          stopPlay();
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
  }, [frames.length, stopPlay]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handlePrev = () => {
    stopPlay();
    setCurrentFrame((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    stopPlay();
    setCurrentFrame((prev) => Math.min(frames.length - 1, prev + 1));
  };

  const handlePlayPause = () => {
    if (playing) {
      stopPlay();
    } else {
      if (currentFrame >= frames.length - 1) {
        setCurrentFrame(0);
      }
      startPlay();
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0a0a0a",
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

  if (error || !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          color: "#ef4444",
        }}
      >
        <p>{error || "리플레이를 불러올 수 없습니다."}</p>
        <a href="/replays" style={{ color: "#888", fontSize: "0.875rem" }}>
          목록으로 돌아가기
        </a>
      </div>
    );
  }

  const frame = frames[currentFrame] ?? null;
  const totalFrames = frames.length;
  const progressPct = totalFrames > 1 ? (currentFrame / (totalFrames - 1)) * 100 : 0;

  // Determine actor player id for highlight
  const actorPlayerId = frame?.actorId ?? null;

  return (
    <div
      style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#f0f0f0" }}
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
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
          <a
            href="/lobby"
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "#ef4444",
              letterSpacing: "0.1em",
              textDecoration: "none",
            }}
          >
            SHOT
          </a>
          <span style={{ color: "#333" }}>/</span>
          <a
            href="/replays"
            style={{ fontSize: "0.875rem", color: "#888", textDecoration: "none" }}
          >
            리플레이
          </a>
          <span style={{ color: "#333" }}>/</span>
          <span
            style={{ fontSize: "0.8125rem", fontFamily: "monospace", color: "#555" }}
          >
            {data.gameId.slice(0, 8)}
          </span>
        </div>
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
          REPLAY
        </span>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem" }}>
        {/* Players */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          {data.players.map((player) => {
            const isActor =
              actorPlayerId !== null &&
              (player.userId === actorPlayerId ||
                player.botId === actorPlayerId ||
                player.id === actorPlayerId);
            return (
              <PlayerCard key={player.id} player={player} isActor={isActor} />
            );
          })}
        </div>

        {/* Current frame info */}
        {frame ? (
          <div
            style={{
              backgroundColor: "#111",
              border: "1px solid #222",
              borderRadius: 8,
              padding: "1rem 1.25rem",
              marginBottom: "1.25rem",
              minHeight: 80,
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#555",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              턴 {frame.turn}
            </div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#f0f0f0",
                marginBottom: "0.25rem",
              }}
            >
              {frame.action === "SHOOT" ? (
                <>
                  <span style={{ color: "#ef4444" }}>{frame.actorName}</span>
                  {" → "}
                  <span>{frame.targetName ?? "?"}</span>
                  {frame.damage != null && (
                    <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>
                      -{frame.damage} HP
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span style={{ color: "#888" }}>{frame.actorName}</span>
                  <span style={{ color: "#555", marginLeft: "0.5rem" }}>PASS</span>
                </>
              )}
            </div>
            {frame.eliminated.length > 0 && (
              <div style={{ marginTop: "0.375rem", fontSize: "0.8125rem", color: "#ef4444" }}>
                탈락: {frame.eliminated.join(", ")}
              </div>
            )}
            {frame.botReasoning && (
              <div
                style={{
                  marginTop: "0.625rem",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#0d0d0d",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  fontSize: "0.8125rem",
                  color: "#777",
                  fontStyle: "italic",
                }}
              >
                <span style={{ color: "#555", fontStyle: "normal" }}>AI: </span>
                {frame.botReasoning}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "#111",
              border: "1px solid #1a1a1a",
              borderRadius: 8,
              padding: "2rem",
              marginBottom: "1.25rem",
              textAlign: "center",
              color: "#444",
              fontSize: "0.9375rem",
            }}
          >
            {totalFrames === 0
              ? "이 리플레이에는 행동이 없습니다."
              : "턴을 선택하세요."}
          </div>
        )}

        {/* Progress bar */}
        {totalFrames > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                height: 4,
                backgroundColor: "#1a1a1a",
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: "0.375rem",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  backgroundColor: "#ef4444",
                  transition: "width 0.2s",
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                color: "#555",
              }}
            >
              <span>행동 {currentFrame + 1}</span>
              <span>총 {totalFrames}개</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            justifyContent: "center",
          }}
        >
          <button
            onClick={handlePrev}
            disabled={currentFrame === 0 || totalFrames === 0}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#1a1a1a",
              color: currentFrame === 0 || totalFrames === 0 ? "#333" : "#aaa",
              border: "1px solid #2a2a2a",
              borderRadius: 4,
              fontSize: "0.875rem",
              cursor: currentFrame === 0 || totalFrames === 0 ? "not-allowed" : "pointer",
            }}
          >
            이전
          </button>
          <button
            onClick={handlePlayPause}
            disabled={totalFrames === 0}
            style={{
              padding: "0.5rem 1.5rem",
              backgroundColor: playing ? "#333" : "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: totalFrames === 0 ? "not-allowed" : "pointer",
              minWidth: 80,
            }}
          >
            {playing ? "일시정지" : "재생"}
          </button>
          <button
            onClick={handleNext}
            disabled={currentFrame >= totalFrames - 1 || totalFrames === 0}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#1a1a1a",
              color:
                currentFrame >= totalFrames - 1 || totalFrames === 0
                  ? "#333"
                  : "#aaa",
              border: "1px solid #2a2a2a",
              borderRadius: 4,
              fontSize: "0.875rem",
              cursor:
                currentFrame >= totalFrames - 1 || totalFrames === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            다음
          </button>
        </div>

        {/* Events timeline */}
        <div style={{ marginTop: "2rem" }}>
          <h3
            style={{
              margin: "0 0 0.75rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            타임라인 ({totalFrames}개 행동)
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {frames.map((f, idx) => (
              <button
                key={idx}
                onClick={() => {
                  stopPlay();
                  setCurrentFrame(idx);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: idx === currentFrame ? "#1a1a1a" : "transparent",
                  border:
                    idx === currentFrame
                      ? "1px solid #ef444433"
                      : "1px solid transparent",
                  borderRadius: 4,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "#aaa",
                  fontSize: "0.8125rem",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    width: 36,
                    textAlign: "right",
                    color: "#555",
                    fontFamily: "monospace",
                    flexShrink: 0,
                  }}
                >
                  T{f.turn}
                </span>
                <span style={{ flex: 1 }}>
                  {f.action === "SHOOT" ? (
                    <>
                      <span style={{ color: "#ef4444" }}>{f.actorName}</span>
                      {" → "}
                      <span>{f.targetName ?? "?"}</span>
                      {f.damage != null && (
                        <span style={{ color: "#666", marginLeft: "0.25rem" }}>
                          (-{f.damage})
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span>{f.actorName}</span>
                      <span style={{ color: "#444", marginLeft: "0.5rem" }}>PASS</span>
                    </>
                  )}
                  {f.eliminated.length > 0 && (
                    <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>
                      [{f.eliminated.join(", ")} 탈락]
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
