"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Bot = {
  id: string;
  name: string;
  backendType: "shot-llm" | "external";
  backendConfig: string | null;
};

function BackendBadge({ type }: { type: string }) {
  const isShotLlm = type === "shot-llm";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: isShotLlm ? "#ef444422" : "#3b82f622",
        color: isShotLlm ? "#ef4444" : "#3b82f6",
        border: `1px solid ${isShotLlm ? "#ef444444" : "#3b82f644"}`,
      }}
    >
      {isShotLlm ? "SHOT LLM" : "External"}
    </span>
  );
}

function getWebhookUrl(bot: Bot): string | null {
  if (bot.backendType !== "external" || !bot.backendConfig) return null;
  try {
    const cfg = JSON.parse(bot.backendConfig) as { webhookUrl?: string };
    return cfg.webhookUrl ?? null;
  } catch {
    return null;
  }
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [backendType, setBackendType] = useState<"shot-llm" | "external">(
    "shot-llm"
  );
  const [webhookUrl, setWebhookUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchBots = async () => {
    try {
      const res = await fetch("/api/bots");
      if (!res.ok) throw new Error("Failed to fetch bots");
      const data = (await res.json()) as { bots: Bot[] };
      setBots(data.bots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBots();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const body: {
      name: string;
      backendType: string;
      backendConfig?: { webhookUrl: string };
    } = { name, backendType };

    if (backendType === "external") {
      body.backendConfig = { webhookUrl };
    }

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create bot");
      }
      setName("");
      setWebhookUrl("");
      setBackendType("shot-llm");
      setShowForm(false);
      await fetchBots();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 봇을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/bots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete bot");
      await fetchBots();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

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
        <span
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#ef4444",
            letterSpacing: "0.1em",
          }}
        >
          SHOT
        </span>
        <Link
          href="/lobby"
          style={{ fontSize: "0.875rem", color: "#888", textDecoration: "none" }}
        >
          ← 로비로 돌아가기
        </Link>
      </header>

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
            내 봇
          </h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            {showForm ? "취소" : "+ 봇 만들기"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={(e) => void handleCreate(e)}
            style={{
              backgroundColor: "#111",
              border: "1px solid #222",
              borderRadius: 8,
              padding: "1.25rem",
              marginBottom: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 600,
                color: "#f0f0f0",
              }}
            >
              봇 만들기
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.875rem", color: "#aaa" }}>봇 이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="봇 이름 입력"
                required
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #333",
                  borderRadius: 6,
                  color: "#f0f0f0",
                  fontSize: "0.9375rem",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.875rem", color: "#aaa" }}>백엔드 타입</label>
              <div style={{ display: "flex", gap: "16px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "#f0f0f0",
                    fontSize: "0.9375rem",
                  }}
                >
                  <input
                    type="radio"
                    name="backendType"
                    value="shot-llm"
                    checked={backendType === "shot-llm"}
                    onChange={() => setBackendType("shot-llm")}
                    style={{ accentColor: "#ef4444" }}
                  />
                  SHOT Built-in LLM
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "#f0f0f0",
                    fontSize: "0.9375rem",
                  }}
                >
                  <input
                    type="radio"
                    name="backendType"
                    value="external"
                    checked={backendType === "external"}
                    onChange={() => setBackendType("external")}
                    style={{ accentColor: "#ef4444" }}
                  />
                  External Webhook
                </label>
              </div>
            </div>

            {backendType === "external" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.875rem", color: "#aaa" }}>
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-bot-server.com/webhook"
                  required
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: 6,
                    color: "#f0f0f0",
                    fontSize: "0.9375rem",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {createError && (
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#ef444422",
                  border: "1px solid #ef444444",
                  borderRadius: 6,
                  color: "#ef4444",
                  fontSize: "0.875rem",
                }}
              >
                {createError}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              style={{
                padding: "10px 20px",
                backgroundColor: creating ? "#555" : "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: creating ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "0.9375rem",
                alignSelf: "flex-start",
              }}
            >
              {creating ? "생성 중..." : "봇 생성"}
            </button>
          </form>
        )}

        {loading && (
          <div style={{ color: "#666", textAlign: "center", padding: "2rem" }}>
            로딩 중...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#ef444422",
              border: "1px solid #ef444444",
              borderRadius: 8,
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
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
              내 봇 목록 ({bots.length})
            </h2>

            {bots.length === 0 ? (
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
                봇이 없습니다. 새 봇을 만들어보세요.
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}
              >
                {bots.map((bot) => {
                  const webhookUrl = getWebhookUrl(bot);
                  return (
                    <div
                      key={bot.id}
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
                            {bot.name}
                          </span>
                          <BackendBadge type={bot.backendType} />
                        </div>
                        {webhookUrl && (
                          <div
                            style={{
                              fontSize: "0.8125rem",
                              color: "#666",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {webhookUrl.length > 60
                              ? webhookUrl.slice(0, 60) + "..."
                              : webhookUrl}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => void handleDelete(bot.id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "transparent",
                          border: "1px solid #333",
                          borderRadius: 6,
                          color: "#888",
                          cursor: "pointer",
                          fontSize: "0.8125rem",
                          flexShrink: 0,
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
