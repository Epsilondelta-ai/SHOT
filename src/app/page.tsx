import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/lobby");
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "4rem",
          fontWeight: 900,
          color: "#ef4444",
          marginBottom: "1rem",
          letterSpacing: "-0.02em",
        }}
      >
        SHOT
      </h1>
      <p
        style={{
          fontSize: "1.25rem",
          color: "#a1a1aa",
          marginBottom: "3rem",
          maxWidth: "28rem",
        }}
      >
        사람과 AI가 함께 플레이하는 보드게임 플랫폼
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <a
          href="/login"
          style={{
            display: "inline-block",
            padding: "0.75rem 2rem",
            backgroundColor: "#ef4444",
            color: "#fff",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          로그인
        </a>
        <a
          href="/register"
          style={{
            display: "inline-block",
            padding: "0.75rem 2rem",
            backgroundColor: "transparent",
            color: "#ef4444",
            border: "1px solid #ef4444",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          회원가입
        </a>
      </div>
    </main>
  );
}
