import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./lib/auth";
import { roomWsPlugin } from "./ws/roomWs";
import { gameWsPlugin } from "./ws/gameWs";
import { botConnectorWsPlugin } from "./ws/botConnectorWs";
import { roomRoutes } from "./routes/rooms";
import { gameRoutes } from "./routes/games";
import { botRoutes } from "./routes/bots";
import { adminRoutes } from "./routes/admin";
import { configRoutes } from "./routes/config";
import { meRoutes } from "./routes/me";
import { replayRoutes } from "./routes/replays";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const PORT = Number(process.env.PORT ?? 3001);
const IS_DEV = process.env.NODE_ENV === "development";

const app = new Elysia()
  .use(
    cors({
      origin: IS_DEV ? true : FRONTEND_URL,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  )
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  .use(roomRoutes)
  .use(gameRoutes)
  .use(botRoutes)
  .use(adminRoutes)
  .use(configRoutes)
  .use(meRoutes)
  .use(replayRoutes)
  .use(roomWsPlugin)
  .use(gameWsPlugin)
  .use(botConnectorWsPlugin)
  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);
