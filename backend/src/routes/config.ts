import Elysia from 'elysia';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { assistant, bot } from '../db/schema';
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
		try {
			await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const rawBots = await db.select().from(bot).orderBy(bot.createdAt);
		return rawBots.map((b) => ({
			id: b.id,
			name: b.name,
			apiKey: b.apiKey,
			active: b.active,
			created: b.createdAt.toISOString().split('T')[0],
			updated: b.updatedAt.toISOString().split('T')[0]
		}));
	})

	.post('/api/config/bots', async ({ request, set }) => {
		try {
			await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const body = (await request.json()) as { name: string; apiKey: string; active?: boolean };
		if (!body.name || !body.apiKey) {
			set.status = 400;
			return { error: 'Name and API key are required' };
		}

		await db.insert(bot).values({
			name: body.name,
			apiKey: body.apiKey,
			active: body.active ?? true
		});
		return { success: true };
	})

	.put('/api/config/bots/:id', async ({ params, request, set }) => {
		try {
			await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const body = (await request.json()) as { name: string; apiKey: string; active?: boolean };
		if (!body.name || !body.apiKey) {
			set.status = 400;
			return { error: 'Missing fields' };
		}

		await db
			.update(bot)
			.set({ name: body.name, apiKey: body.apiKey, active: body.active ?? true, updatedAt: new Date() })
			.where(eq(bot.id, params.id));
		return { success: true };
	})

	.delete('/api/config/bots/:id', async ({ params, request, set }) => {
		try {
			await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		await db.delete(bot).where(eq(bot.id, params.id));
		return { success: true };
	});
