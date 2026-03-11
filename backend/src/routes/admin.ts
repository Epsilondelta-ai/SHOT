import Elysia from 'elysia';
import { db } from '../db';
import { eq, desc, count, isNull } from 'drizzle-orm';
import { user, room, roomPlayer, assistant, banHistory, llmProvider, llmModel, gameRulebook } from '../db/schema';
import { requireAdmin } from '../lib/getUser';

export const adminRoutes = new Elysia()
	.get('/api/admin/users', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const users = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				createdAt: user.createdAt,
				lastSeenAt: user.lastSeenAt,
				banStart: user.banStart,
				banEnd: user.banEnd,
				banReason: user.banReason
			})
			.from(user)
			.orderBy(user.createdAt);

		const banCounts = await db
			.select({ userId: banHistory.userId, total: count(banHistory.id) })
			.from(banHistory)
			.groupBy(banHistory.userId);
		const banCountMap = Object.fromEntries(banCounts.map((b) => [b.userId, b.total]));

		return users.map((u) => ({
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
			online:
				u.lastSeenAt !== null &&
				u.lastSeenAt !== undefined &&
				u.lastSeenAt > new Date(Date.now() - 5 * 60 * 1000)
		}));
	})

	.get('/api/admin/rooms', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

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

		return rooms.map((r) => ({
			id: r.id,
			name: r.name,
			host: '',
			currentPlayers: r.currentPlayers,
			maxPlayers: r.maxPlayers,
			status: r.status
		}));
	})

	.post('/api/admin/users/:id/role', async ({ params, request, set }) => {
		let admin;
		try {
			admin = await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { role: string };
		if (!['admin', 'user'].includes(body.role)) {
			set.status = 400;
			return { error: 'Invalid role' };
		}

		if (params.id === admin.id && body.role === 'user') {
			set.status = 400;
			return { error: '자신의 관리자 권한은 제거할 수 없습니다.' };
		}

		await db
			.update(user)
			.set({ role: body.role as 'admin' | 'user' })
			.where(eq(user.id, params.id));
		return { success: true };
	})

	.post('/api/admin/users/:id/ban', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as {
			startAt?: string;
			endAt: string;
			reason: string;
		};
		if (!body.endAt || !body.reason) {
			set.status = 400;
			return { error: 'Missing fields' };
		}

		const banStartDate = body.startAt ? new Date(body.startAt) : new Date();
		const banEndDate = new Date(body.endAt);

		await db
			.update(user)
			.set({ banStart: banStartDate, banEnd: banEndDate, banReason: body.reason })
			.where(eq(user.id, params.id));
		await db.insert(banHistory).values({
			userId: params.id,
			banStart: banStartDate,
			banEnd: banEndDate,
			banReason: body.reason
		});
		return { success: true };
	})

	.post('/api/admin/users/:id/unban', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { reason: string };
		if (!body.reason) {
			set.status = 400;
			return { error: 'Missing reason' };
		}

		const now = new Date();
		await db
			.update(user)
			.set({ banStart: null, banEnd: null, banReason: null })
			.where(eq(user.id, params.id));

		const [latest] = await db
			.select({ id: banHistory.id })
			.from(banHistory)
			.where(eq(banHistory.userId, params.id))
			.orderBy(desc(banHistory.createdAt))
			.limit(1);

		if (latest) {
			await db
				.update(banHistory)
				.set({ unbannedAt: now, unbanReason: body.reason })
				.where(eq(banHistory.id, latest.id));
		}
		return { success: true };
	})

	.get('/api/admin/ban-history/:userId', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const history = await db
			.select()
			.from(banHistory)
			.where(eq(banHistory.userId, params.userId))
			.orderBy(desc(banHistory.createdAt));

		return history.map((h) => ({
			id: h.id,
			banStart: h.banStart?.toISOString().split('T')[0] ?? null,
			banEnd: h.banEnd.toISOString().split('T')[0],
			banReason: h.banReason ?? '',
			unbannedAt: h.unbannedAt?.toISOString().split('T')[0] ?? null,
			unbanReason: h.unbanReason ?? null,
			createdAt: h.createdAt.toISOString().split('T')[0]
		}));
	})

	.post('/api/admin/rooms/:id/close', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		await db.delete(room).where(eq(room.id, params.id));
		return { success: true };
	})

	.get('/api/admin/assistants', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const assistants = await db
			.select()
			.from(assistant)
			.where(isNull(assistant.userId))
			.orderBy(assistant.createdAt);

		return assistants.map((a) => ({
			id: a.id,
			name: a.name,
			prompt: a.prompt,
			active: a.active,
			created: a.createdAt.toISOString().split('T')[0],
			updated: a.updatedAt.toISOString().split('T')[0]
		}));
	})

	.post('/api/admin/assistants', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { name: string; prompt: string; active?: boolean };
		if (!body.name || !body.prompt) {
			set.status = 400;
			return { error: 'Name and prompt are required' };
		}

		await db.insert(assistant).values({
			name: body.name,
			prompt: body.prompt,
			active: body.active ?? true
		});
		return { success: true };
	})

	.put('/api/admin/assistants/:id', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
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

	.delete('/api/admin/assistants/:id', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		await db.delete(assistant).where(eq(assistant.id, params.id));
		return { success: true };
	})

	.get('/api/admin/llm-providers', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const llmProviderRows = await db.select().from(llmProvider);
		const llmModelRows = await db.select().from(llmModel).orderBy(llmModel.createdAt);
		const PROVIDERS = ['anthropic', 'openai', 'google', 'xai'] as const;
		const llmProviderMap = Object.fromEntries(llmProviderRows.map((p) => [p.provider, p]));

		return {
			llmProviders: PROVIDERS.map((p) => ({
				provider: p,
				apiKey: llmProviderMap[p]?.apiKey ?? '',
				active: llmProviderMap[p]?.active ?? false
			})),
			llmModels: llmModelRows.map((m) => ({
				id: m.id,
				provider: m.provider,
				apiModelName: m.apiModelName,
				displayName: m.displayName,
				active: m.active
			}))
		};
	})

	.post('/api/admin/llm-providers/save-key', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { provider: string; apiKey: string };
		if (!['anthropic', 'openai', 'google', 'xai'].includes(body.provider)) {
			set.status = 400;
			return { error: 'Invalid provider' };
		}
		if (!body.apiKey) {
			set.status = 400;
			return { error: 'API key is required' };
		}

		await db
			.insert(llmProvider)
			.values({ provider: body.provider as 'anthropic' | 'openai' | 'google' | 'xai', apiKey: body.apiKey })
			.onConflictDoUpdate({ target: llmProvider.provider, set: { apiKey: body.apiKey, updatedAt: new Date() } });
		return { success: true };
	})

	.post('/api/admin/llm-providers/toggle', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { provider: string; active: boolean };
		if (!['anthropic', 'openai', 'google', 'xai'].includes(body.provider)) {
			set.status = 400;
			return { error: 'Invalid provider' };
		}

		await db
			.insert(llmProvider)
			.values({
				provider: body.provider as 'anthropic' | 'openai' | 'google' | 'xai',
				apiKey: '',
				active: body.active
			})
			.onConflictDoUpdate({ target: llmProvider.provider, set: { active: body.active, updatedAt: new Date() } });
		return { success: true };
	})

	.post('/api/admin/llm-models', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as {
			provider: string;
			apiModelName: string;
			displayName: string;
		};
		if (!body.provider || !body.apiModelName || !body.displayName) {
			set.status = 400;
			return { error: 'Missing fields' };
		}
		if (!['anthropic', 'openai', 'google', 'xai'].includes(body.provider)) {
			set.status = 400;
			return { error: 'Invalid provider' };
		}

		await db.insert(llmModel).values({
			provider: body.provider as 'anthropic' | 'openai' | 'google' | 'xai',
			apiModelName: body.apiModelName,
			displayName: body.displayName
		});
		return { success: true };
	})

	.put('/api/admin/llm-models/:id', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { apiModelName: string; displayName: string };
		if (!body.apiModelName || !body.displayName) {
			set.status = 400;
			return { error: 'Missing fields' };
		}

		await db
			.update(llmModel)
			.set({ apiModelName: body.apiModelName, displayName: body.displayName })
			.where(eq(llmModel.id, params.id));
		return { success: true };
	})

	.delete('/api/admin/llm-models/:id', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		await db.delete(llmModel).where(eq(llmModel.id, params.id));
		return { success: true };
	})

	.post('/api/admin/llm-models/:id/toggle', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { active: boolean };
		await db.update(llmModel).set({ active: body.active }).where(eq(llmModel.id, params.id));
		return { success: true };
	})

	.get('/api/admin/rulebook', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const rulebooks = await db.select().from(gameRulebook).orderBy(gameRulebook.createdAt);

		return rulebooks.map((r) => ({
			id: r.id,
			name: r.name,
			content: r.content,
			active: r.active,
			created: r.createdAt.toISOString().split('T')[0],
			updated: r.updatedAt.toISOString().split('T')[0]
		}));
	})

	.post('/api/admin/rulebook', async ({ request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { name: string; content: string; active?: boolean };
		if (!body.name || !body.content) {
			set.status = 400;
			return { error: 'Name and content are required' };
		}

		await db.insert(gameRulebook).values({
			name: body.name,
			content: body.content,
			active: body.active ?? true
		});
		return { success: true };
	})

	.put('/api/admin/rulebook/:id', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { name: string; content: string; active?: boolean };
		if (!body.name || !body.content) {
			set.status = 400;
			return { error: 'Missing fields' };
		}

		await db
			.update(gameRulebook)
			.set({ name: body.name, content: body.content, active: body.active ?? true, updatedAt: new Date() })
			.where(eq(gameRulebook.id, params.id));
		return { success: true };
	})

	.delete('/api/admin/rulebook/:id', async ({ params, request, set }) => {
		try {
			await requireAdmin(request);
		} catch {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		await db.delete(gameRulebook).where(eq(gameRulebook.id, params.id));
		return { success: true };
	});
