import Elysia from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { bot } from "../db/schema";
import { hashBotSecret } from "../lib/botAuth";
import { getOwnedBot, listBotsForUser, serializeBot } from "../lib/bots";
import { requireUser } from "../lib/getUser";

export const botRoutes = new Elysia()
  .get("/api/bots", async ({ request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    return listBotsForUser(user.id);
  })

  .post("/api/bots", async ({ request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const body = (await request.json()) as {
      name?: string;
      active?: boolean;
    };
    if (!body.name?.trim()) {
      set.status = 400;
      return { error: "Name is required" };
    }

    const rawApiKey = crypto.randomUUID();

    const [createdBot] = await db
      .insert(bot)
      .values({
        userId: user.id,
        name: body.name.trim(),
        active: body.active ?? true,
        presenceStatus: "offline",
        apiKey: hashBotSecret(rawApiKey),
      })
      .returning();

    return {
      success: true,
      bot: serializeBot(createdBot),
      apiKey: rawApiKey,
    };
  })

  .put("/api/bots/:id", async ({ params, request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const existingBot = await getOwnedBot(params.id, user.id);
    if (!existingBot) {
      set.status = 404;
      return { error: "Bot not found" };
    }

    const body = (await request.json()) as {
      name?: string;
      active?: boolean;
    };
    if (!body.name?.trim()) {
      set.status = 400;
      return { error: "Name is required" };
    }

    await db
      .update(bot)
      .set({
        name: body.name.trim(),
        active: body.active ?? true,
        updatedAt: new Date(),
      })
      .where(eq(bot.id, params.id));

    const updatedBot = await getOwnedBot(params.id, user.id);
    return { success: true, bot: updatedBot ? serializeBot(updatedBot) : null };
  })

  .delete("/api/bots/:id", async ({ params, request, set }) => {
    let user;
    try {
      user = await requireUser(request);
    } catch {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const existingBot = await getOwnedBot(params.id, user.id);
    if (!existingBot) {
      set.status = 404;
      return { error: "Bot not found" };
    }

    await db.delete(bot).where(eq(bot.id, params.id));
    return { success: true };
  });
