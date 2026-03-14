"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function NavBar({ username }: { username?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 24px",
        background: "#111",
        borderBottom: "1px solid #222",
        gap: "24px",
      }}
    >
      <Link
        href="/lobby"
        style={{
          color: "#ef4444",
          fontWeight: "bold",
          fontSize: "20px",
          textDecoration: "none",
          letterSpacing: "0.1em",
        }}
      >
        SHOT
      </Link>
      <Link href="/lobby" style={{ color: "#f0f0f0", textDecoration: "none" }}>
        로비
      </Link>
      <Link href="/bots" style={{ color: "#f0f0f0", textDecoration: "none" }}>
        내 봇
      </Link>
      <Link
        href="/replays"
        style={{ color: "#f0f0f0", textDecoration: "none" }}
      >
        리플레이
      </Link>
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {username && (
          <span style={{ color: "#888", fontSize: "14px" }}>{username}</span>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid #333",
            color: "#888",
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
