import { describe, it, expect, mock, beforeEach } from 'bun:test';
import Elysia from 'elysia';

// ── Mocks ────────────────────────────────────────────────────────────────────

const adminUser = { id: 'admin1', name: 'Admin', email: 'admin@test.com', role: 'admin', image: null };

const mockRequireAdmin = mock(async (): Promise<typeof adminUser> => adminUser);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = mock((..._args: any[]): any => ({
	from: (..._: unknown[]) => ({
		where: (...__: unknown[]) => ({
			orderBy: (...___: unknown[]) => ({
				limit: (...____: unknown[]) => Promise.resolve([])
			})
		}),
		leftJoin: (...__: unknown[]) => ({
			groupBy: (...___: unknown[]) => Promise.resolve([])
		}),
		orderBy: (...__: unknown[]) => Promise.resolve([]),
		groupBy: (...__: unknown[]) => Promise.resolve([])
	})
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInsert = mock((..._args: any[]): any => ({
	values: (..._: unknown[]) => ({
		onConflictDoUpdate: (...__: unknown[]) => Promise.resolve()
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
	banHistory: { id: 'banHistory.id', userId: 'banHistory.userId', banStart: 'banHistory.banStart', banEnd: 'banHistory.banEnd', banReason: 'banHistory.banReason', unbannedAt: 'banHistory.unbannedAt', unbanReason: 'banHistory.unbanReason', createdAt: 'banHistory.createdAt' },
	task: { id: 'task.id' },
	room: { id: 'room.id', name: 'room.name', icon: 'room.icon', maxPlayers: 'room.maxPlayers', status: 'room.status', createdAt: 'room.createdAt' },
	roomPlayer: { id: 'roomPlayer.id', roomId: 'roomPlayer.roomId', userId: 'roomPlayer.userId', playerType: 'roomPlayer.playerType', displayName: 'roomPlayer.displayName', assistantId: 'roomPlayer.assistantId', llmModelId: 'roomPlayer.llmModelId' },
	assistant: { id: 'assistant.id', userId: 'assistant.userId', name: 'assistant.name', prompt: 'assistant.prompt', active: 'assistant.active', createdAt: 'assistant.createdAt', updatedAt: 'assistant.updatedAt' },
	bot: { id: 'bot.id', name: 'bot.name', apiKey: 'bot.apiKey', active: 'bot.active', createdAt: 'bot.createdAt', updatedAt: 'bot.updatedAt' },
	llmProvider: { provider: 'llmProvider.provider', apiKey: 'llmProvider.apiKey', active: 'llmProvider.active', updatedAt: 'llmProvider.updatedAt' },
	llmModel: { id: 'llmModel.id', provider: 'llmModel.provider', apiModelName: 'llmModel.apiModelName', displayName: 'llmModel.displayName', active: 'llmModel.active', createdAt: 'llmModel.createdAt' },
	gameRulebook: { id: 'gameRulebook.id', name: 'gameRulebook.name', content: 'gameRulebook.content', active: 'gameRulebook.active', createdAt: 'gameRulebook.createdAt', updatedAt: 'gameRulebook.updatedAt' },
	gameRecord: { roomId: 'gameRecord.roomId', playerCount: 'gameRecord.playerCount', playerNames: 'gameRecord.playerNames', winnerTeam: 'gameRecord.winnerTeam', startedAt: 'gameRecord.startedAt', finishedAt: 'gameRecord.finishedAt', replayData: 'gameRecord.replayData' },
	gameReplayFrame: { id: 'gameReplayFrame.id', roomId: 'gameReplayFrame.roomId', seq: 'gameReplayFrame.seq', snapshot: 'gameReplayFrame.snapshot', actionSummary: 'gameReplayFrame.actionSummary', createdAt: 'gameReplayFrame.createdAt' },
	gameParticipant: { roomId: 'gameParticipant.roomId', userId: 'gameParticipant.userId', playerName: 'gameParticipant.playerName', participationType: 'gameParticipant.participationType' },
	userRelations: {}, banHistoryRelations: {}, sessionRelations: {}, accountRelations: {}, roomRelations: {}, roomPlayerRelations: {}
}));

mock.module('drizzle-orm', () => ({
	eq: (a: unknown, b: unknown) => ({ op: 'eq', a, b }),
	and: (...args: unknown[]) => ({ op: 'and', args }),
	or: (...args: unknown[]) => ({ op: 'or', args }),
	desc: (col: unknown) => ({ op: 'desc', col }),
	count: (col: unknown) => ({ op: 'count', col }),
	inArray: (col: unknown, vals: unknown) => ({ op: 'inArray', col, vals }),
	isNull: (col: unknown) => ({ op: 'isNull', col }),
	relations: () => ({}),
	sql: {}
}));

mock.module('../lib/getUser', () => ({
	requireAdmin: mockRequireAdmin
}));

const { adminRoutes } = await import('./admin');

function makeApp() {
	return new Elysia().use(adminRoutes);
}

beforeEach(() => {
	mockRequireAdmin.mockReset();
	mockRequireAdmin.mockResolvedValue(adminUser);
	mockSelect.mockClear();
	mockInsert.mockClear();
	mockUpdate.mockClear();
	mockDelete.mockClear();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
	it('returns 403 when not admin', async () => {
		mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/users'));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Forbidden');
	});

	it('returns users list when admin', async () => {
		const now = new Date();
		const users = [
			{
				id: 'u1', name: 'Bob', email: 'bob@test.com', role: 'user',
				createdAt: now, lastSeenAt: now, banStart: null, banEnd: null, banReason: null
			}
		];
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				orderBy: () => Promise.resolve(users)
			})
		}));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				groupBy: () => Promise.resolve([])
			})
		}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/users'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].id).toBe('u1');
		expect(body[0].name).toBe('Bob');
		expect(body[0].banned).toBe(false);
		expect(body[0].banHistoryCount).toBe(0);
	});
});

describe('GET /api/admin/rooms', () => {
	it('returns 403 when not admin', async () => {
		mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/rooms'));
		expect(res.status).toBe(403);
	});

	it('returns rooms list when admin', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				leftJoin: () => ({
					groupBy: () => Promise.resolve([{ id: 'r1', name: 'Room1', currentPlayers: 2, maxPlayers: 4, status: 'waiting' }])
				})
			})
		}));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/rooms'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].id).toBe('r1');
		expect(body[0].name).toBe('Room1');
	});
});

describe('POST /api/admin/users/:id/role', () => {
	it('returns 403 when not admin', async () => {
		mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/users/u1/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'admin' })
			})
		);
		expect(res.status).toBe(403);
	});

	it('returns 400 for invalid role', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/users/u1/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'superadmin' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid role');
	});

	it('prevents admin from removing own admin role', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/users/admin1/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'user' })
			})
		);
		expect(res.status).toBe(400);
	});

	it('updates role successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/users/u2/role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: 'admin' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('POST /api/admin/users/:id/ban', () => {
	it('returns 400 when missing fields', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/users/u1/ban', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: 'bad' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Missing fields');
	});

	it('bans user successfully', async () => {
		mockInsert.mockImplementationOnce(() => ({
			values: () => Promise.resolve()
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/users/u1/ban', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ endAt: '2030-01-01', reason: 'rule violation' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('POST /api/admin/users/:id/unban', () => {
	it('returns 400 when missing reason', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/users/u1/unban', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Missing reason');
	});

	it('unbans user successfully', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => ({
					orderBy: () => ({
						limit: () => Promise.resolve([{ id: 'bh1' }])
					})
				})
			})
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/users/u1/unban', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: 'appealed' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('POST /api/admin/rooms/:id/close', () => {
	it('closes room successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/rooms/r1/close', { method: 'POST' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('POST /api/admin/assistants', () => {
	it('returns 400 when name or prompt missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/assistants', {
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
		mockInsert.mockImplementationOnce(() => ({
			values: () => Promise.resolve()
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/assistants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Bot', prompt: 'You are a bot' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('DELETE /api/admin/assistants/:id', () => {
	it('deletes assistant successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/assistants/a1', { method: 'DELETE' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('POST /api/admin/llm-providers/save-key', () => {
	it('returns 400 for invalid provider', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-providers/save-key', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'invalid', apiKey: 'key123' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid provider');
	});

	it('returns 400 when apiKey is empty', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-providers/save-key', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'openai', apiKey: '' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('API key is required');
	});

	it('saves key successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-providers/save-key', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant-xxx' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('POST /api/admin/llm-models', () => {
	it('returns 400 when fields missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-models', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'openai' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Missing fields');
	});

	it('returns 400 for invalid provider', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-models', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'invalid', apiModelName: 'gpt-4', displayName: 'GPT-4' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid provider');
	});

	it('creates model successfully', async () => {
		mockInsert.mockImplementationOnce(() => ({
			values: () => Promise.resolve()
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-models', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'openai', apiModelName: 'gpt-4', displayName: 'GPT-4' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('GET /api/admin/ban-history/:userId', () => {
	it('returns 403 when not admin', async () => {
		mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/ban-history/u1'));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Forbidden');
	});

	it('returns ban history for user', async () => {
		const now = new Date();
		const banEnd = new Date(Date.now() + 86400000);
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => ({
					orderBy: () => Promise.resolve([
						{
							id: 'bh1',
							banStart: now,
							banEnd,
							banReason: 'spam',
							unbannedAt: null,
							unbanReason: null,
							createdAt: now
						}
					])
				})
			})
		}));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/ban-history/u1'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].id).toBe('bh1');
		expect(body[0].banReason).toBe('spam');
		expect(body[0].unbannedAt).toBeNull();
	});
});

describe('GET /api/admin/assistants', () => {
	it('returns 403 when not admin', async () => {
		mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/assistants'));
		expect(res.status).toBe(403);
	});

	it('returns global assistants list', async () => {
		const now = new Date();
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => ({
					orderBy: () => Promise.resolve([
						{ id: 'a1', name: 'GlobalBot', prompt: 'be helpful', active: true, createdAt: now, updatedAt: now }
					])
				})
			})
		}));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/assistants'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].id).toBe('a1');
		expect(body[0].name).toBe('GlobalBot');
		expect(body[0].prompt).toBe('be helpful');
		expect(body[0].active).toBe(true);
	});
});

describe('PUT /api/admin/assistants/:id', () => {
	it('returns 403 when not admin', async () => {
		mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/assistants/a1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'x', prompt: 'y' })
			})
		);
		expect(res.status).toBe(403);
	});

	it('returns 400 when fields missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/assistants/a1', {
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
			new Request('http://localhost/api/admin/assistants/a1', {
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

describe('GET /api/admin/llm-providers', () => {
	it('returns 403 when not admin', async () => {
		mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/llm-providers'));
		expect(res.status).toBe(403);
	});

	it('returns providers and models', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => Promise.resolve([
				{ provider: 'openai', apiKey: 'sk-xxx', active: true }
			])
		}));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				orderBy: () => Promise.resolve([
					{ id: 'm1', provider: 'openai', apiModelName: 'gpt-4', displayName: 'GPT-4', active: true }
				])
			})
		}));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/admin/llm-providers'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.llmProviders).toBeArray();
		expect(body.llmProviders.length).toBe(4);
		const openai = body.llmProviders.find((p: { provider: string }) => p.provider === 'openai');
		expect(openai.apiKey).toBe('sk-xxx');
		expect(openai.active).toBe(true);
		expect(body.llmModels[0].id).toBe('m1');
		expect(body.llmModels[0].displayName).toBe('GPT-4');
	});
});

describe('POST /api/admin/llm-providers/toggle', () => {
	it('returns 400 for invalid provider', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-providers/toggle', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'invalid', active: true })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid provider');
	});

	it('toggles provider successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-providers/toggle', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'anthropic', active: false })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('PUT /api/admin/llm-models/:id', () => {
	it('returns 400 when fields missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-models/m1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apiModelName: 'gpt-4' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Missing fields');
	});

	it('updates model successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-models/m1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apiModelName: 'gpt-4-turbo', displayName: 'GPT-4 Turbo' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('DELETE /api/admin/llm-models/:id', () => {
	it('deletes model successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-models/m1', { method: 'DELETE' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('POST /api/admin/llm-models/:id/toggle', () => {
	it('returns 403 when not admin', async () => {
		mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-models/m1/toggle', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: false })
			})
		);
		expect(res.status).toBe(403);
	});

	it('toggles model successfully', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/admin/llm-models/m1/toggle', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: true })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});
