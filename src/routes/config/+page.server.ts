import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { assistant, bot } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	const rawAssistants = await db.select().from(assistant).orderBy(assistant.createdAt);
	const rawBots = await db.select().from(bot).orderBy(bot.createdAt);

	return {
		assistants: rawAssistants.map((a) => ({
			id: a.id,
			name: a.name,
			prompt: a.prompt,
			active: a.active,
			created: a.createdAt.toISOString().split('T')[0],
			updated: a.updatedAt.toISOString().split('T')[0]
		})),
		bots: rawBots.map((b) => ({
			id: b.id,
			name: b.name,
			apiKey: b.apiKey,
			active: b.active,
			created: b.createdAt.toISOString().split('T')[0],
			updated: b.updatedAt.toISOString().split('T')[0]
		}))
	};
};

export const actions: Actions = {
	createAssistant: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const prompt = data.get('prompt') as string;
		const active = data.get('active') === 'true';

		if (!name || !prompt) {
			return fail(400, { error: 'Name and prompt are required' });
		}

		await db.insert(assistant).values({ name, prompt, active });
		return { success: true };
	},

	updateAssistant: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const name = data.get('name') as string;
		const prompt = data.get('prompt') as string;
		const active = data.get('active') === 'true';

		if (!id || !name || !prompt) {
			return fail(400, { error: 'Missing fields' });
		}

		await db
			.update(assistant)
			.set({ name, prompt, active, updatedAt: new Date() })
			.where(eq(assistant.id, id));
		return { success: true };
	},

	deleteAssistant: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;

		if (!id) return fail(400, { error: 'Missing id' });

		await db.delete(assistant).where(eq(assistant.id, id));
		return { success: true };
	},

	createBot: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const apiKey = data.get('apiKey') as string;
		const active = data.get('active') === 'true';

		if (!name || !apiKey) {
			return fail(400, { error: 'Name and API key are required' });
		}

		await db.insert(bot).values({ name, apiKey, active });
		return { success: true };
	},

	updateBot: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const name = data.get('name') as string;
		const apiKey = data.get('apiKey') as string;
		const active = data.get('active') === 'true';

		if (!id || !name || !apiKey) {
			return fail(400, { error: 'Missing fields' });
		}

		await db
			.update(bot)
			.set({ name, apiKey, active, updatedAt: new Date() })
			.where(eq(bot.id, id));
		return { success: true };
	},

	deleteBot: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;

		if (!id) return fail(400, { error: 'Missing id' });

		await db.delete(bot).where(eq(bot.id, id));
		return { success: true };
	}
};
