import { db } from '../db';
import { eq } from 'drizzle-orm';
import { bot } from '../db/schema';

export async function requireBot(request: Request): Promise<{ id: string; userId: string; name: string }> {
	const apiKey = request.headers.get('X-API-Key');
	if (!apiKey) throw new Error('Unauthorized');

	const found = await db.query.bot.findFirst({ where: eq(bot.apiKey, apiKey) });
	if (!found || found.active === false) throw new Error('Unauthorized');

	return { id: found.id, userId: found.userId, name: found.name };
}
