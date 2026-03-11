import { describe, it, expect, mock, beforeEach } from 'bun:test';
import Elysia from 'elysia';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'user', image: null };
const mockRequireUser = mock(async (): Promise<typeof mockUser> => mockUser);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = mock((..._args: any[]): any => ({
	from: (..._: unknown[]) => ({
		where: (...__: unknown[]) => ({
			orderBy: (...___: unknown[]) => Promise.resolve([])
		}),
		orderBy: (...__: unknown[]) => Promise.resolve([])
	})
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInsert = mock((..._args: any[]): any => ({
	values: (..._: unknown[]) => Promise.resolve()
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdate = mock((..._args: any[]): any => ({
	set: (..._: unknown[]) => ({
		where: (...__: unknown[]) => Promise.resolve()
	})
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDelete = mock((..._args: any[]): any => ({
	where: (..._: unknown[]) => Promise.resolve()
}));

mock.module('../db', () => ({
	db: {
		select: mockSelect,
		insert: mockInsert,
		update: mockUpdate,
		delete: mockDelete,
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

const { configRoutes } = await import('./config');

function makeApp() {
	return new Elysia().use(configRoutes);
}

beforeEach(() => {
	mockRequireUser.mockReset();
	mockRequireUser.mockResolvedValue(mockUser);
	mockSelect.mockClear();
	mockInsert.mockClear();
	mockUpdate.mockClear();
	mockDelete.mockClear();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/config/assistants', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/config/assistants'));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('returns assistants for authenticated user', async () => {
		const now = new Date();
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => ({
					orderBy: () =>
						Promise.resolve([
							{ id: 'a1', name: 'MyBot', prompt: 'be nice', active: true, createdAt: now, updatedAt: now }
						])
				})
			})
		}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/config/assistants'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].id).toBe('a1');
		expect(body[0].name).toBe('MyBot');
		expect(body[0].prompt).toBe('be nice');
		expect(body[0].active).toBe(true);
	});
});

describe('POST /api/config/assistants', () => {
	it('returns 400 when name or prompt missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/assistants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'test' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Name and prompt are required');
	});

	it('creates assistant successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/assistants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'NewBot', prompt: 'hello world' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('PUT /api/config/assistants/:id', () => {
	it('returns 400 when fields missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/assistants/a1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'x' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Missing fields');
	});

	it('updates assistant successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/assistants/a1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Updated', prompt: 'new prompt' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('DELETE /api/config/assistants/:id', () => {
	it('deletes assistant successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/assistants/a1', { method: 'DELETE' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('GET /api/config/bots', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/config/bots'));
		expect(res.status).toBe(401);
	});

	it('returns bots list', async () => {
		const now = new Date();
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				orderBy: () =>
					Promise.resolve([
						{ id: 'b1', name: 'BotX', apiKey: 'key123', active: true, createdAt: now, updatedAt: now }
					])
			})
		}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/config/bots'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].id).toBe('b1');
		expect(body[0].name).toBe('BotX');
		expect(body[0].apiKey).toBe('key123');
	});
});

describe('POST /api/config/bots', () => {
	it('returns 400 when name or apiKey missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'test' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Name and API key are required');
	});

	it('creates bot successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'NewBot', apiKey: 'sk-xxx' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('PUT /api/config/bots/:id', () => {
	it('returns 400 when fields missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'x' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Missing fields');
	});

	it('updates bot successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Updated', apiKey: 'new-key' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('DELETE /api/config/bots/:id', () => {
	it('deletes bot successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1', { method: 'DELETE' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});
