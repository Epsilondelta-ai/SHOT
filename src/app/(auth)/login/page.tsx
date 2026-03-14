"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      router.push("/lobby");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h1 style={styles.title}>SHOT</h1>
      <p style={styles.subtitle}>Sign in to your account</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
            placeholder="you@example.com"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={styles.input}
            placeholder="••••••••"
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p style={styles.footer}>
        No account?{" "}
        <Link href="/signup" style={styles.link}>
          Sign up
        </Link>
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: "100%",
    maxWidth: 400,
    padding: "2.5rem",
    backgroundColor: "#111111",
    border: "1px solid #222222",
    borderRadius: 8,
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    fontWeight: 700,
    color: "#ef4444",
    letterSpacing: "0.15em",
    textAlign: "center",
  },
  subtitle: {
    margin: "0.5rem 0 1.5rem",
    fontSize: "0.875rem",
    color: "#666666",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  label: {
    fontSize: "0.875rem",
    color: "#aaaaaa",
  },
  input: {
    padding: "0.625rem 0.75rem",
    backgroundColor: "#1a1a1a",
    border: "1px solid #333333",
    borderRadius: 4,
    color: "#ffffff",
    fontSize: "1rem",
    outline: "none",
  },
  error: {
    margin: 0,
    padding: "0.625rem 0.75rem",
    backgroundColor: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 4,
    color: "#ef4444",
    fontSize: "0.875rem",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    backgroundColor: "#ef4444",
    border: "none",
    borderRadius: 4,
    color: "#ffffff",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  footer: {
    marginTop: "1.5rem",
    fontSize: "0.875rem",
    color: "#666666",
    textAlign: "center",
  },
  link: {
    color: "#ef4444",
    textDecoration: "none",
  },
};
