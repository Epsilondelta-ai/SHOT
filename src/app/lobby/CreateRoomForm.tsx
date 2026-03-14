"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function CreateRoomForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), maxPlayers }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "방 생성 실패");
        return;
      }
      router.push(`/room/${data.id}`);
    } catch {
      setError("네트워크 오류. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "0.625rem 1.25rem",
            backgroundColor: "#ef4444",
            border: "none",
            borderRadius: 6,
            color: "#fff",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 방 만들기
        </button>
      ) : (
        <div
          style={{
            backgroundColor: "#111",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            padding: "1.25rem",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#f0f0f0",
            }}
          >
            새 방 만들기
          </h3>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.8125rem", color: "#888" }}>
                방 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                maxLength={40}
                placeholder="방 이름을 입력하세요"
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 4,
                  color: "#f0f0f0",
                  fontSize: "0.9375rem",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label style={{ fontSize: "0.8125rem", color: "#888" }}>
                최대 플레이어 수 (2-6)
              </label>
              <input
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                min={2}
                max={6}
                required
                disabled={loading}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 4,
                  color: "#f0f0f0",
                  fontSize: "0.9375rem",
                  outline: "none",
                  width: 80,
                }}
              />
            </div>
            {error && (
              <p
                style={{
                  margin: 0,
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 4,
                  color: "#ef4444",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "0.5rem 1.125rem",
                  backgroundColor: "#ef4444",
                  border: "none",
                  borderRadius: 4,
                  color: "#fff",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "생성 중..." : "만들기"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError("");
                  setName("");
                }}
                disabled={loading}
                style={{
                  padding: "0.5rem 1.125rem",
                  backgroundColor: "transparent",
                  border: "1px solid #333",
                  borderRadius: 4,
                  color: "#888",
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                }}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
