import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	user,
	room,
	roomPlayer,
	assistant,
	banHistory,
	llmProvider,
	session
} from '$lib/server/db/schema';
import { count, eq, desc, gt } from 'drizzle-orm';
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
			banStart: user.banStart,
			banEnd: user.banEnd,
			banReason: user.banReason
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

	const banCounts = await db
		.select({ userId: banHistory.userId, total: count(banHistory.id) })
		.from(banHistory)
		.groupBy(banHistory.userId);
	const banCountMap = Object.fromEntries(banCounts.map((b) => [b.userId, b.total]));

	const activeSessions = await db
		.select({ userId: session.userId })
		.from(session)
		.where(gt(session.expiresAt, new Date()));
	const onlineUserIds = new Set(activeSessions.map((s) => s.userId));

	const llmProviderRows = await db.select().from(llmProvider);

	const PROVIDERS = ['anthropic', 'openai', 'google', 'xai'] as const;
	const llmProviderMap = Object.fromEntries(llmProviderRows.map((p) => [p.provider, p]));

	return {
		users: users.map((u) => ({
			id: u.id,
			name: u.name,
			email: u.email,
			role: u.role,
			games: 0,
			joined: u.createdAt.toISOString().split('T')[0],
			banned: u.banEnd !== null && u.banEnd !== undefined && u.banEnd > new Date(),
			banEnd: u.banEnd?.toISOString().split('T')[0] ?? null,
			banReason: u.banReason ?? null,
			banHistoryCount: banCountMap[u.id] ?? 0,
			online: onlineUserIds.has(u.id)
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
		llmProviders: PROVIDERS.map((p) => ({
			provider: p,
			apiKey: llmProviderMap[p]?.apiKey ?? '',
			active: llmProviderMap[p]?.active ?? false
		}))
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
		const startAt = data.get('startAt') as string;
		const endAt = data.get('endAt') as string;
		const reason = data.get('reason') as string;
		if (!id || !endAt || !reason) return fail(400, { error: 'Missing fields' });
		const banStartDate = startAt ? new Date(startAt) : new Date();
		const banEndDate = new Date(endAt);
		await db
			.update(user)
			.set({ banStart: banStartDate, banEnd: banEndDate, banReason: reason })
			.where(eq(user.id, id));
		await db.insert(banHistory).values({
			userId: id,
			banStart: banStartDate,
			banEnd: banEndDate,
			banReason: reason
		});
		return { success: true };
	},

	unbanUser: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const reason = data.get('reason') as string;
		if (!id || !reason) return fail(400, { error: 'Missing fields' });
		const now = new Date();
		await db
			.update(user)
			.set({ banStart: null, banEnd: null, banReason: null })
			.where(eq(user.id, id));
		const [latest] = await db
			.select({ id: banHistory.id })
			.from(banHistory)
			.where(eq(banHistory.userId, id))
			.orderBy(desc(banHistory.createdAt))
			.limit(1);
		if (latest) {
			await db
				.update(banHistory)
				.set({ unbannedAt: now, unbanReason: reason })
				.where(eq(banHistory.id, latest.id));
		}
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
	},

	saveLlmApiKey: async (event) => {
		await getAdminUser(event.locals);
		const data = await event.request.formData();
		const provider = data.get('provider') as string;
		const apiKey = data.get('apiKey') as string;

		if (!['anthropic', 'openai', 'google', 'xai'].includes(provider)) {
			return fail(400, { error: 'Invalid provider' });
		}
		if (!apiKey) return fail(400, { error: 'API key is required' });

		await db
			.insert(llmProvider)
			.values({ provider: provider as 'anthropic' | 'openai' | 'google' | 'xai', apiKey })
			.onConflictDoUpdate({ target: llmProvider.provider, set: { apiKey, updatedAt: new Date() } });
		return { success: true };
	},

	toggleLlmProvider: async (event) => {
		await getAdminUser(event.locals);
		const data = await event.request.formData();
		const provider = data.get('provider') as string;
		const active = data.get('active') === 'true';

		if (!['anthropic', 'openai', 'google', 'xai'].includes(provider)) {
			return fail(400, { error: 'Invalid provider' });
		}

		await db
			.insert(llmProvider)
			.values({
				provider: provider as 'anthropic' | 'openai' | 'google' | 'xai',
				apiKey: '',
				active
			})
			.onConflictDoUpdate({ target: llmProvider.provider, set: { active, updatedAt: new Date() } });
		return { success: true };
	}
};
