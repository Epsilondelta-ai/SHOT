import { Elysia } from "elysia";
import { auth } from "./lib/auth";
import { roomWsPlugin } from "./ws/roomWs";
import { roomRoutes } from "./routes/rooms";
import { gameRoutes } from "./routes/games";
import { adminRoutes } from "./routes/admin";
import { configRoutes } from "./routes/config";
import { meRoutes } from "./routes/me";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const PORT = Number(process.env.PORT ?? 3001);

const app = new Elysia()
  // ── CORS ──────────────────────────────────────────────────────────────────
  .onBeforeHandle(({ request, set }) => {
    set.headers["Access-Control-Allow-Origin"] = FRONTEND_URL;
    set.headers["Access-Control-Allow-Credentials"] = "true";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    set.headers["Access-Control-Allow-Methods"] =
      "GET, POST, PUT, DELETE, OPTIONS";

    if (request.method === "OPTIONS") {
      set.status = 204;
      return "";
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

  // ── WebSocket ─────────────────────────────────────────────────────────────
  .use(roomWsPlugin)

  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);
