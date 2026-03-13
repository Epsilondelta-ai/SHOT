import Elysia from 'elysia';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { assistant, bot } from '../db/schema';
import { listBotsForUser, serializeBot, getOwnedBot } from '../lib/bots';
import { requireUser } from '../lib/getUser';

export const configRoutes = new Elysia()
	.get('/api/config/assistants', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const rawAssistants = await db
			.select()
			.from(assistant)
			.where(eq(assistant.userId, u.id))
			.orderBy(assistant.createdAt);

		return rawAssistants.map((a) => ({
			id: a.id,
			name: a.name,
			prompt: a.prompt,
			active: a.active,
			created: a.createdAt.toISOString().split('T')[0],
			updated: a.updatedAt.toISOString().split('T')[0]
		}));
	})

	.post('/api/config/assistants', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const body = (await request.json()) as { name: string; prompt: string; active?: boolean };
		if (!body.name || !body.prompt) {
			set.status = 400;
			return { error: 'Name and prompt are required' };
		}

		await db.insert(assistant).values({
			name: body.name,
			prompt: body.prompt,
			active: body.active ?? true,
			userId: u.id
		});
		return { success: true };
	})

	.put('/api/config/assistants/:id', async ({ params, request, set }) => {
		try {
			await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const body = (await request.json()) as { name: string; prompt: string; active?: boolean };
		if (!body.name || !body.prompt) {
			set.status = 400;
			return { error: 'Missing fields' };
		}

		await db
			.update(assistant)
			.set({ name: body.name, prompt: body.prompt, active: body.active ?? true, updatedAt: new Date() })
			.where(eq(assistant.id, params.id));
		return { success: true };
	})

	.delete('/api/config/assistants/:id', async ({ params, request, set }) => {
		try {
			await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		await db.delete(assistant).where(eq(assistant.id, params.id));
		return { success: true };
	})

	.get('/api/config/bots', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		return listBotsForUser(u.id);
	})

	.post('/api/config/bots', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const body = (await request.json()) as { name: string; active?: boolean };
		if (!body.name?.trim()) {
			set.status = 400;
			return { error: 'Name is required' };
		}

		const [createdBot] = await db
			.insert(bot)
			.values({
				userId: u.id,
				name: body.name.trim(),
				provider: 'openclaw',
				active: body.active ?? true,
				pairingStatus: 'unpaired',
				presenceStatus: 'offline',
				apiKey: ''
			})
			.returning();
		return { success: true, bot: serializeBot(createdBot) };
	})

	.put('/api/config/bots/:id', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const existingBot = await getOwnedBot(params.id, u.id);
		if (!existingBot) {
			set.status = 404;
			return { error: 'Bot not found' };
		}

		const body = (await request.json()) as { name: string; active?: boolean };
		if (!body.name?.trim()) {
			set.status = 400;
			return { error: 'Name is required' };
		}

		await db
			.update(bot)
			.set({ name: body.name.trim(), active: body.active ?? true, updatedAt: new Date() })
			.where(eq(bot.id, params.id));
		return { success: true };
	})

	.delete('/api/config/bots/:id', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const existingBot = await getOwnedBot(params.id, u.id);
		if (!existingBot) {
			set.status = 404;
			return { error: 'Bot not found' };
		}

		await db.delete(bot).where(eq(bot.id, params.id));
		return { success: true };
	});
