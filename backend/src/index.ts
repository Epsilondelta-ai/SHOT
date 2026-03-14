import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./lib/auth";
import { roomWsPlugin } from "./ws/roomWs";
import { gameWsPlugin } from "./ws/gameWs";
import { roomRoutes } from "./routes/rooms";
import { gameRoutes } from "./routes/games";
import { botRoutes } from "./routes/bots";
import { adminRoutes } from "./routes/admin";
import { configRoutes } from "./routes/config";
import { meRoutes } from "./routes/me";
import { replayRoutes } from "./routes/replays";
import { botClientRoutes } from "./routes/botClient";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const PORT = Number(process.env.PORT ?? 3001);
const IS_DEV = process.env.NODE_ENV === "development";


const app = new Elysia({ serve: { maxRequestBodySize: 20 * 1024 * 1024 } })
  // ── CORS ──────────────────────────────────────────────────────────────────
  .use(cors({
    origin: IS_DEV ? true : FRONTEND_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }))

  // ── Origin validation (CSRF protection) ──────────────────────────────────
  // Bot-client routes use Authorization header auth, not cookies — exempt from origin check
  .onBeforeHandle(({ request, set }) => {
    if (!IS_DEV && request.method !== "GET" && request.method !== "OPTIONS") {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/bot-client/")) return;
      const origin = request.headers.get("origin");
      if (origin && origin !== FRONTEND_URL) {
        set.status = 403;
        return { error: "Invalid origin" };
      }
    }
  })

  // ── Auth (better-auth handles all /api/auth/* routes) ─────────────────────
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  .use(roomRoutes)
  .use(gameRoutes)
  .use(botRoutes)
  .use(adminRoutes)
  .use(configRoutes)
  .use(meRoutes)
  .use(replayRoutes)
  .use(botClientRoutes)
  .use(roomWsPlugin)
  .use(gameWsPlugin)
  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);
