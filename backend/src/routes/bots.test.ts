import { describe, it, expect, mock, beforeEach } from 'bun:test';
import Elysia from 'elysia';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'user', image: null };
const mockRequireUser = mock(async (): Promise<typeof mockUser> => mockUser);

const now = new Date();
const mockBotRow = {
	id: 'b1',
	userId: 'u1',
	name: 'TestBot',
	image: null,
	apiKey: 'mr_abc123',
	active: true,
	createdAt: now
};

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
	values: (..._: unknown[]) => ({
		returning: () => Promise.resolve([mockBotRow])
	})
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

const mockFindFirst = mock(async () => mockBotRow);

mock.module('../db', () => ({
	db: {
		select: mockSelect,
		insert: mockInsert,
		update: mockUpdate,
		delete: mockDelete,
		query: {
			bot: { findFirst: mockFindFirst },
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
	llmProvider: { provider: 'llmProvider.provider', apiKey: 'llmProvider.apiKey', active: 'llmProvider.active', updatedAt: 'llmProvider.updatedAt' },
	llmModel: { id: 'llmModel.id', provider: 'llmModel.provider', apiModelName: 'llmModel.apiModelName', displayName: 'llmModel.displayName', active: 'llmModel.active', createdAt: 'llmModel.createdAt' },
	gameRulebook: { id: 'gameRulebook.id', name: 'gameRulebook.name', content: 'gameRulebook.content', active: 'gameRulebook.active', createdAt: 'gameRulebook.createdAt', updatedAt: 'gameRulebook.updatedAt' },
	gameRecord: { roomId: 'gameRecord.roomId', playerCount: 'gameRecord.playerCount', playerNames: 'gameRecord.playerNames', winnerTeam: 'gameRecord.winnerTeam', startedAt: 'gameRecord.startedAt', finishedAt: 'gameRecord.finishedAt', replayData: 'gameRecord.replayData' },
	gameReplayFrame: { id: 'gameReplayFrame.id', roomId: 'gameReplayFrame.roomId', seq: 'gameReplayFrame.seq', snapshot: 'gameReplayFrame.snapshot', actionSummary: 'gameReplayFrame.actionSummary', createdAt: 'gameReplayFrame.createdAt' },
	gameParticipant: { roomId: 'gameParticipant.roomId', userId: 'gameParticipant.userId', playerName: 'gameParticipant.playerName', participationType: 'gameParticipant.participationType' },
	bot: { id: 'bot.id', userId: 'bot.userId', name: 'bot.name', image: 'bot.image', apiKey: 'bot.apiKey', active: 'bot.active', createdAt: 'bot.createdAt' },
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

const { botRoutes } = await import('./bots');

function makeApp() {
	return new Elysia().use(botRoutes);
}

beforeEach(() => {
	mockRequireUser.mockReset();
	mockRequireUser.mockResolvedValue(mockUser);
	mockSelect.mockClear();
	mockInsert.mockClear();
	mockUpdate.mockClear();
	mockDelete.mockClear();
	mockFindFirst.mockReset();
	mockFindFirst.mockResolvedValue(mockBotRow);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/config/bots', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/config/bots'));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('returns bots for authenticated user without apiKey', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => ({
					orderBy: () =>
						Promise.resolve([
							{ id: 'b1', name: 'TestBot', image: null, active: true, createdAt: now }
						])
				})
			})
		}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/config/bots'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].id).toBe('b1');
		expect(body[0].name).toBe('TestBot');
		expect(body[0].apiKey).toBeUndefined();
	});
});

describe('POST /api/config/bots', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'MyBot' })
			})
		);
		expect(res.status).toBe(401);
	});

	it('returns 400 when name is missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Name is required');
	});

	it('creates bot and returns apiKey', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'NewBot' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe('b1');
		expect(body.name).toBe('TestBot');
		expect(body.apiKey).toBe('mr_abc123');
	});
});

describe('PUT /api/config/bots/:id', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Updated' })
			})
		);
		expect(res.status).toBe(401);
	});

	it('returns 403 when trying to update another user\'s bot', async () => {
		mockFindFirst.mockResolvedValueOnce({ ...mockBotRow, userId: 'other-user' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Hacked' })
			})
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Forbidden');
	});

	it('updates bot successfully and does not return apiKey', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () =>
					Promise.resolve([{ id: 'b1', name: 'Updated', image: null, active: true, createdAt: now }])
			})
		}));

		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Updated' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.name).toBe('Updated');
		expect(body.apiKey).toBeUndefined();
	});
});

describe('DELETE /api/config/bots/:id', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1', { method: 'DELETE' })
		);
		expect(res.status).toBe(401);
	});

	it('returns 403 when trying to delete another user\'s bot', async () => {
		mockFindFirst.mockResolvedValueOnce({ ...mockBotRow, userId: 'other-user' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1', { method: 'DELETE' })
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Forbidden');
	});

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

describe('POST /api/config/bots/:id/regenerate-key', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1/regenerate-key', { method: 'POST' })
		);
		expect(res.status).toBe(401);
	});

	it('returns 403 when trying to regenerate key for another user\'s bot', async () => {
		mockFindFirst.mockResolvedValueOnce({ ...mockBotRow, userId: 'other-user' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1/regenerate-key', { method: 'POST' })
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Forbidden');
	});

	it('regenerates api key and returns new apiKey', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/config/bots/b1/regenerate-key', { method: 'POST' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.apiKey).toBeDefined();
		expect(typeof body.apiKey).toBe('string');
		expect(body.apiKey.startsWith('mr_')).toBe(true);
	});
});
