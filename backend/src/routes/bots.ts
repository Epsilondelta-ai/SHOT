import Elysia from 'elysia';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { bot } from '../db/schema';
import { requireUser } from '../lib/getUser';

function generateApiKey(): string {
	return 'mr_' + crypto.randomUUID().replace(/-/g, '');
}

export const botRoutes = new Elysia()
	.get('/api/config/bots', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const bots = await db
			.select({
				id: bot.id,
				name: bot.name,
				image: bot.image,
				active: bot.active,
				createdAt: bot.createdAt
			})
			.from(bot)
			.where(eq(bot.userId, u.id))
			.orderBy(bot.createdAt);

		return bots.map((b) => ({
			id: b.id,
			name: b.name,
			image: b.image,
			active: b.active,
			createdAt: b.createdAt
		}));
	})

	.post('/api/config/bots', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const body = (await request.json()) as { name: string; image?: string };
		if (!body.name) {
			set.status = 400;
			return { error: 'Name is required' };
		}

		const apiKey = generateApiKey();
		const [created] = await db
			.insert(bot)
			.values({
				userId: u.id,
				name: body.name,
				image: body.image ?? null,
				apiKey
			})
			.returning();

		return {
			id: created.id,
			name: created.name,
			image: created.image,
			active: created.active,
			createdAt: created.createdAt,
			apiKey: created.apiKey
		};
	})

	.put('/api/config/bots/:id', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const existing = await db.query.bot.findFirst({ where: eq(bot.id, params.id) });
		if (!existing) {
			set.status = 404;
			return { error: 'Not found' };
		}
		if (existing.userId !== u.id) {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { name?: string; image?: string };

		await db
			.update(bot)
			.set({
				...(body.name !== undefined ? { name: body.name } : {}),
				...(body.image !== undefined ? { image: body.image } : {})
			})
			.where(and(eq(bot.id, params.id), eq(bot.userId, u.id)));

		const [updated] = await db
			.select({
				id: bot.id,
				name: bot.name,
				image: bot.image,
				active: bot.active,
				createdAt: bot.createdAt
			})
			.from(bot)
			.where(eq(bot.id, params.id));

		return updated;
	})

	.delete('/api/config/bots/:id', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const existing = await db.query.bot.findFirst({ where: eq(bot.id, params.id) });
		if (!existing) {
			set.status = 404;
			return { error: 'Not found' };
		}
		if (existing.userId !== u.id) {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		await db.delete(bot).where(and(eq(bot.id, params.id), eq(bot.userId, u.id)));
		return { success: true };
	})

	.post('/api/config/bots/:id/regenerate-key', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const existing = await db.query.bot.findFirst({ where: eq(bot.id, params.id) });
		if (!existing) {
			set.status = 404;
			return { error: 'Not found' };
		}
		if (existing.userId !== u.id) {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const newApiKey = generateApiKey();
		await db
			.update(bot)
			.set({ apiKey: newApiKey })
			.where(and(eq(bot.id, params.id), eq(bot.userId, u.id)));

		return { apiKey: newApiKey };
	});
