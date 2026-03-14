import { eq } from "drizzle-orm";
import { db } from "../db";
import { bot } from "../db/schema";
import { hashBotSecret } from "./botAuth";

export type BotClientRow = typeof bot.$inferSelect;

export async function getBotFromApiKey(apiKey: string): Promise<BotClientRow | null> {
  if (!apiKey) return null;
  const keyHash = hashBotSecret(apiKey);
  const result = await db.query.bot.findFirst({
    where: eq(bot.apiKey, keyHash),
  });
  return result ?? null;
}

export async function requireBotClient(request: Request): Promise<BotClientRow> {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bot\s+(.+)$/i);
  if (!match) {
    throw new Error("Missing or invalid Authorization header. Expected: Authorization: Bot <apiKey>");
  }

  const apiKey = match[1].trim();
  const botRecord = await getBotFromApiKey(apiKey);

  if (!botRecord) {
    throw new Error("Invalid API key");
  }
  if (!botRecord.active) {
    throw new Error("Bot is inactive");
  }

  return botRecord;
}
