import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./lib/auth";
import { createRateLimit } from "./lib/rateLimit";
import { roomWsPlugin } from "./ws/roomWs";
import { gameWsPlugin } from "./ws/gameWs";
import { roomRoutes } from "./routes/rooms";
import { gameRoutes } from "./routes/games";
import { adminRoutes } from "./routes/admin";
import { configRoutes } from "./routes/config";
import { meRoutes } from "./routes/me";
import { replayRoutes } from "./routes/replays";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const PORT = Number(process.env.PORT ?? 3001);
const IS_DEV = process.env.NODE_ENV === "development";

const authRateLimit = createRateLimit({ windowMs: 60_000, max: 10 });
const apiRateLimit = createRateLimit({ windowMs: 60_000, max: 120 });

const app = new Elysia()
  // ── CORS ──────────────────────────────────────────────────────────────────
  .use(cors({
    origin: IS_DEV ? true : FRONTEND_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }))

  // ── Rate limiting ────────────────────────────────────────────────────────
  .onBeforeHandle(({ request, set }) => {
    if (IS_DEV) return;

    const url = new URL(request.url);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";

    // Stricter rate limit for auth endpoints
    if (url.pathname.startsWith("/api/auth/")) {
      const result = authRateLimit.check(ip);
      if (!result.allowed) {
        set.status = 429;
        return { error: "Too many requests. Please try again later." };
      }
    }

    // General API rate limit
    if (url.pathname.startsWith("/api/")) {
      const result = apiRateLimit.check(ip);
      if (!result.allowed) {
        set.status = 429;
        return { error: "Too many requests. Please try again later." };
      }
    }

    // Origin validation for state-changing requests (CSRF protection)
    if (!IS_DEV && request.method !== "GET" && request.method !== "OPTIONS") {
      const origin = request.headers.get("origin");
      if (origin && origin !== FRONTEND_URL) {
        set.status = 403;
        return { error: "Invalid origin" };
      }
    }
  })

  // ── Auth (better-auth handles all /api/auth/* routes) ─────────────────────
  .all("/api/auth/*", ({ request }) => auth.handler(request))

  // ── Routes ────────────────────────────────────────────────────────────────
  .use(roomRoutes)
  .use(gameRoutes)
  .use(adminRoutes)
  .use(configRoutes)
  .use(meRoutes)
  .use(replayRoutes)

  // ── WebSocket ─────────────────────────────────────────────────────────────
  .use(roomWsPlugin)
  .use(gameWsPlugin)

  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);
