import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, room, roomPlayer, assistant } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

async function getAdminUser(locals: App.Locals) {
	if (!locals.user) redirect(303, '/login');

	const [dbUser] = await db
		.select({ role: user.role })
		.from(user)
		.where(eq(user.id, locals.user.id));

	if (!dbUser || dbUser.role !== 'admin') redirect(303, '/');

	return locals.user;
}

export const load: PageServerLoad = async (event) => {
	await getAdminUser(event.locals);

	const users = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			createdAt: user.createdAt,
			banned: user.banned
		})
		.from(user)
		.orderBy(user.createdAt);

	const rooms = await db
		.select({
			id: room.id,
			name: room.name,
			currentPlayers: count(roomPlayer.id),
			maxPlayers: room.maxPlayers,
			status: room.status
		})
		.from(room)
		.leftJoin(roomPlayer, eq(room.id, roomPlayer.roomId))
		.groupBy(room.id);

	const assistants = await db.select().from(assistant).orderBy(assistant.createdAt);

	return {
		users: users.map((u) => ({
			id: u.id,
			name: u.name,
			email: u.email,
			role: u.role,
			games: 0,
			joined: u.createdAt.toISOString().split('T')[0],
			banned: u.banned
		})),
		rooms: rooms.map((r) => ({
			id: r.id,
			name: r.name,
			host: '',
			currentPlayers: r.currentPlayers,
			maxPlayers: r.maxPlayers,
			status: r.status
		})),
		assistants: assistants.map((a) => ({
			id: a.id,
			name: a.name,
			prompt: a.prompt,
			active: a.active,
			created: a.createdAt.toISOString().split('T')[0],
			updated: a.updatedAt.toISOString().split('T')[0]
		})),
		llmProviders: [] as {
			id: string;
			name: string;
			baseUrl: string;
			apiKey: string;
			active: boolean;
		}[],
		llmModels: [] as {
			id: string;
			providerId: string;
			name: string;
			contextWindow: number;
			costInput: number;
			costOutput: number;
			enabled: boolean;
		}[]
	};
};

export const actions: Actions = {
	setRole: async (event) => {
		const currentUser = await getAdminUser(event.locals);

		const data = await event.request.formData();
		const userId = data.get('userId') as string;
		const role = data.get('role') as string;

		if (!userId || !['admin', 'user'].includes(role)) {
			return fail(400, { error: '잘못된 요청입니다.' });
		}

		if (userId === currentUser.id && role === 'user') {
			return fail(400, { error: '자신의 관리자 권한은 제거할 수 없습니다.' });
		}

		await db
			.update(user)
			.set({ role: role as 'admin' | 'user' })
			.where(eq(user.id, userId));
		return { success: true };
	},

	banUser: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		if (!id) return fail(400, { error: 'Missing id' });
		await db.update(user).set({ banned: true }).where(eq(user.id, id));
		return { success: true };
	},

	unbanUser: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		if (!id) return fail(400, { error: 'Missing id' });
		await db.update(user).set({ banned: false }).where(eq(user.id, id));
		return { success: true };
	},

	closeRoom: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		if (!id) return fail(400, { error: 'Missing id' });
		await db.delete(room).where(eq(room.id, id));
		return { success: true };
	},

	createAssistant: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const prompt = data.get('prompt') as string;
		const active = data.get('active') === 'true';
		if (!name || !prompt) return fail(400, { error: 'Name and prompt are required' });
		await db.insert(assistant).values({ name, prompt, active });
		return { success: true };
	},

	updateAssistant: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const name = data.get('name') as string;
		const prompt = data.get('prompt') as string;
		const active = data.get('active') === 'true';
		if (!id || !name || !prompt) return fail(400, { error: 'Missing fields' });
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
	}
};
