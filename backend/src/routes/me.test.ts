import { describe, it, expect, mock, beforeEach } from 'bun:test';
import Elysia from 'elysia';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'user', image: null };
const mockRequireUser = mock(async (): Promise<typeof mockUser> => mockUser);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = mock((..._args: any[]): any => ({
	from: (..._: unknown[]) => ({
		where: (...__: unknown[]) => Promise.resolve([])
	})
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdate = mock((..._args: any[]): any => ({
	set: (..._: unknown[]) => ({
		where: (...__: unknown[]) => Promise.resolve()
	})
}));

mock.module('../db', () => ({
	db: {
		select: mockSelect,
		update: mockUpdate,
		query: {
			session: { findFirst: mock(async () => null) }
		}
	}
}));

mock.module('../db/schema', () => ({
	user: { id: 'user.id', name: 'user.name', email: 'user.email', role: 'user.role', image: 'user.image', createdAt: 'user.createdAt', updatedAt: 'user.updatedAt', banStart: 'user.banStart', banEnd: 'user.banEnd', banReason: 'user.banReason', lastSeenAt: 'user.lastSeenAt', emailVerified: 'user.emailVerified' },
	session: { id: 'session.id', token: 'session.token', userId: 'session.userId', expiresAt: 'session.expiresAt', createdAt: 'session.createdAt', updatedAt: 'session.updatedAt', ipAddress: 'session.ipAddress', userAgent: 'session.userAgent' },
	account: { id: 'account.id', userId: 'account.userId' },
	verification: { id: 'verification.id' },
	banHistory: { id: 'banHistory.id', userId: 'banHistory.userId', createdAt: 'banHistory.createdAt' },
	task: { id: 'task.id' },
	room: { id: 'room.id', name: 'room.name', icon: 'room.icon', maxPlayers: 'room.maxPlayers', status: 'room.status', createdAt: 'room.createdAt' },
	roomPlayer: { id: 'roomPlayer.id', roomId: 'roomPlayer.roomId', userId: 'roomPlayer.userId', playerType: 'roomPlayer.playerType', displayName: 'roomPlayer.displayName', assistantId: 'roomPlayer.assistantId', llmModelId: 'roomPlayer.llmModelId' },
	assistant: { id: 'assistant.id', userId: 'assistant.userId', name: 'assistant.name', prompt: 'assistant.prompt', active: 'assistant.active', createdAt: 'assistant.createdAt', updatedAt: 'assistant.updatedAt' },
	bot: { id: 'bot.id', name: 'bot.name', apiKey: 'bot.apiKey', active: 'bot.active', createdAt: 'bot.createdAt', updatedAt: 'bot.updatedAt' },
	llmProvider: { provider: 'llmProvider.provider', apiKey: 'llmProvider.apiKey', active: 'llmProvider.active', updatedAt: 'llmProvider.updatedAt' },
	llmModel: { id: 'llmModel.id', provider: 'llmModel.provider', apiModelName: 'llmModel.apiModelName', displayName: 'llmModel.displayName', active: 'llmModel.active', createdAt: 'llmModel.createdAt' },
	gameRulebook: { id: 'gameRulebook.id', name: 'gameRulebook.name', content: 'gameRulebook.content', active: 'gameRulebook.active', createdAt: 'gameRulebook.createdAt', updatedAt: 'gameRulebook.updatedAt' },
	gameParticipant: { id: 'gameParticipant.id', roomId: 'gameParticipant.roomId', userId: 'gameParticipant.userId', participationType: 'gameParticipant.participationType', createdAt: 'gameParticipant.createdAt' },
	gameRecord: { id: 'gameRecord.id', roomId: 'gameRecord.roomId', winnerTeam: 'gameRecord.winnerTeam', createdAt: 'gameRecord.createdAt' },
	userRelations: {}, banHistoryRelations: {}, sessionRelations: {}, accountRelations: {}, roomRelations: {}, roomPlayerRelations: {}
}));

mock.module('drizzle-orm', () => ({
	eq: (a: unknown, b: unknown) => ({ op: 'eq', a, b }),
	and: (...args: unknown[]) => ({ op: 'and', args }),
	or: (...args: unknown[]) => ({ op: 'or', args }),
	count: (col: unknown) => ({ op: 'count', col }),
	desc: (col: unknown) => ({ op: 'desc', col }),
	inArray: (col: unknown, vals: unknown) => ({ op: 'inArray', col, vals }),
	isNull: (col: unknown) => ({ op: 'isNull', col }),
	relations: () => ({}),
	sql: {}
}));

mock.module('../lib/getUser', () => ({
	requireUser: mockRequireUser
}));

const { meRoutes } = await import('./me');

function makeApp() {
	return new Elysia().use(meRoutes);
}

beforeEach(() => {
	mockRequireUser.mockReset();
	mockRequireUser.mockResolvedValue(mockUser);
	mockSelect.mockClear();
	mockUpdate.mockClear();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/me', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/me'));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('returns 404 when user not found in DB', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([])
			})
		}));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/me'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('User not found');
	});

	it('returns user profile with stats', async () => {
		const dbUser = {
			id: 'u1', name: 'Alice', email: 'alice@test.com', image: 'photo.jpg', role: 'user',
			banStart: null, banEnd: null, banReason: null
		};
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([dbUser])
			})
		}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/me'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe('u1');
		expect(body.name).toBe('Alice');
		expect(body.email).toBe('alice@test.com');
		expect(body.image).toBe('photo.jpg');
		expect(body.banned).toBe(false);
		expect(body.stats).toEqual({ games: 0, wins: 0, streak: 0 });
		expect(body.recentMatches).toEqual([]);
	});

	it('marks user as banned when banEnd is in the future', async () => {
		const futureDate = new Date(Date.now() + 86400000);
		const dbUser = {
			id: 'u1', name: 'Banned', email: 'ban@test.com', image: null, role: 'user',
			banStart: new Date(), banEnd: futureDate, banReason: 'Bad behavior'
		};
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([dbUser])
			})
		}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/me'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.banned).toBe(true);
		expect(body.banReason).toBe('Bad behavior');
	});
});

describe('PUT /api/me', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Test' })
			})
		);
		expect(res.status).toBe(401);
	});

	it('returns 400 when name is empty', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: '  ' })
			})
		);
		expect(res.status).toBe(400);
	});

	it('updates name successfully via JSON', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'New Name' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});

	it('updates name and image via JSON', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'New Name', image: 'data:image/png;base64,abc' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});

	it('updates name via multipart form data', async () => {
		const formData = new FormData();
		formData.append('name', 'FormName');
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/me', {
				method: 'PUT',
				body: formData
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});

	it('updates name and image via multipart form data', async () => {
		const formData = new FormData();
		formData.append('name', 'FormName');
		formData.append('image', new File(['fake-image-data'], 'avatar.png', { type: 'image/png' }));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/me', {
				method: 'PUT',
				body: formData
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});

	it('returns 400 when multipart name is empty', async () => {
		const formData = new FormData();
		formData.append('name', '   ');
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/me', {
				method: 'PUT',
				body: formData
			})
		);
		expect(res.status).toBe(400);
	});
});
