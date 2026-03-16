import { describe, it, expect, mock, beforeEach } from 'bun:test';
import Elysia from 'elysia';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'user', image: null };
const mockRequireUser = mock(async (): Promise<typeof mockUser> => mockUser);

const mockBot = { id: 'b1', userId: 'u1', name: 'TestBot', image: null, apiKey: 'mr_abc123', active: true, createdAt: new Date() };
const mockRequireBot = mock(async () => ({ id: 'b1', userId: 'u1', name: 'TestBot' }));

const now = new Date();

const mockRoomRow = { id: 'r1', name: 'Test Room', status: 'waiting', maxPlayers: 5, hostUserId: 'u1', icon: 'swords', createdAt: now };
const mockInvitationRow = { id: 'inv1', botId: 'b1', roomId: 'r1', status: 'pending', createdAt: now };
const mockPlayerRow = { id: 'p1', roomId: 'r1', userId: 'bot:b1', playerType: 'external', botId: 'b1', displayName: 'TestBot', ready: false };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = mock((..._args: any[]): any => ({
	from: (..._: unknown[]) => ({
		where: (...__: unknown[]) => Promise.resolve([]),
		innerJoin: (...__: unknown[]) => ({
			where: (...___: unknown[]) => Promise.resolve([])
		})
	})
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInsert = mock((..._args: any[]): any => ({
	values: (..._: unknown[]) => ({
		returning: () => Promise.resolve([mockInvitationRow])
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockBotFindFirst = mock(async (): Promise<any> => mockBot);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInvitationFindFirst = mock(async (): Promise<any> => mockInvitationRow);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRoomPlayerFindFirst = mock(async (): Promise<any> => null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRoomPlayerFindMany = mock(async (): Promise<any> => []);

mock.module('../db', () => ({
	db: {
		select: mockSelect,
		insert: mockInsert,
		update: mockUpdate,
		delete: mockDelete,
		query: {
			bot: { findFirst: mockBotFindFirst },
			botInvitation: { findFirst: mockInvitationFindFirst },
			roomPlayer: { findFirst: mockRoomPlayerFindFirst, findMany: mockRoomPlayerFindMany },
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
	room: { id: 'room.id', name: 'room.name', icon: 'room.icon', maxPlayers: 'room.maxPlayers', status: 'room.status', createdAt: 'room.createdAt', hostUserId: 'room.hostUserId' },
	roomPlayer: { id: 'roomPlayer.id', roomId: 'roomPlayer.roomId', userId: 'roomPlayer.userId', playerType: 'roomPlayer.playerType', displayName: 'roomPlayer.displayName', assistantId: 'roomPlayer.assistantId', llmModelId: 'roomPlayer.llmModelId', botId: 'roomPlayer.botId', ready: 'roomPlayer.ready' },
	assistant: { id: 'assistant.id', userId: 'assistant.userId', name: 'assistant.name', prompt: 'assistant.prompt', active: 'assistant.active', createdAt: 'assistant.createdAt', updatedAt: 'assistant.updatedAt' },
	llmProvider: { provider: 'llmProvider.provider', apiKey: 'llmProvider.apiKey', active: 'llmProvider.active', updatedAt: 'llmProvider.updatedAt' },
	llmModel: { id: 'llmModel.id', provider: 'llmModel.provider', apiModelName: 'llmModel.apiModelName', displayName: 'llmModel.displayName', active: 'llmModel.active', createdAt: 'llmModel.createdAt' },
	gameRulebook: { id: 'gameRulebook.id', name: 'gameRulebook.name', content: 'gameRulebook.content', active: 'gameRulebook.active', createdAt: 'gameRulebook.createdAt', updatedAt: 'gameRulebook.updatedAt' },
	gameRecord: { roomId: 'gameRecord.roomId', playerCount: 'gameRecord.playerCount', playerNames: 'gameRecord.playerNames', winnerTeam: 'gameRecord.winnerTeam', startedAt: 'gameRecord.startedAt', finishedAt: 'gameRecord.finishedAt', replayData: 'gameRecord.replayData' },
	gameReplayFrame: { id: 'gameReplayFrame.id', roomId: 'gameReplayFrame.roomId', seq: 'gameReplayFrame.seq', snapshot: 'gameReplayFrame.snapshot', actionSummary: 'gameReplayFrame.actionSummary', createdAt: 'gameReplayFrame.createdAt' },
	gameParticipant: { roomId: 'gameParticipant.roomId', userId: 'gameParticipant.userId', playerName: 'gameParticipant.playerName', participationType: 'gameParticipant.participationType' },
	bot: { id: 'bot.id', userId: 'bot.userId', name: 'bot.name', image: 'bot.image', apiKey: 'bot.apiKey', active: 'bot.active', createdAt: 'bot.createdAt' },
	botInvitation: { id: 'botInvitation.id', botId: 'botInvitation.botId', roomId: 'botInvitation.roomId', status: 'botInvitation.status', createdAt: 'botInvitation.createdAt' },
	userRelations: {}, banHistoryRelations: {}, sessionRelations: {}, accountRelations: {}, roomRelations: {}, roomPlayerRelations: {}, botRelations: {}, botInvitationRelations: {}
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

mock.module('../lib/botAuth', () => ({
	requireBot: mockRequireBot
}));

const { botRoutes } = await import('./bots');

function makeApp() {
	return new Elysia().use(botRoutes);
}

beforeEach(() => {
	mockRequireUser.mockReset();
	mockRequireUser.mockResolvedValue(mockUser);
	mockRequireBot.mockReset();
	mockRequireBot.mockResolvedValue({ id: 'b1', userId: 'u1', name: 'TestBot' });
	mockSelect.mockReset();
	mockSelect.mockImplementation((..._args: unknown[]): unknown => ({
		from: (..._: unknown[]) => ({
			where: (...__: unknown[]) => Promise.resolve([]),
			innerJoin: (...__: unknown[]) => ({
				where: (...___: unknown[]) => Promise.resolve([])
			})
		})
	}));
	mockInsert.mockReset();
	mockInsert.mockImplementation((..._args: unknown[]): unknown => ({
		values: (..._: unknown[]) => ({
			returning: () => Promise.resolve([mockInvitationRow])
		})
	}));
	mockUpdate.mockReset();
	mockUpdate.mockImplementation((..._args: unknown[]): unknown => ({
		set: (..._: unknown[]) => ({
			where: (...__: unknown[]) => Promise.resolve()
		})
	}));
	mockDelete.mockReset();
	mockDelete.mockImplementation((..._args: unknown[]): unknown => ({
		where: (..._: unknown[]) => Promise.resolve()
	}));
	mockBotFindFirst.mockReset();
	mockBotFindFirst.mockResolvedValue(mockBot);
	mockInvitationFindFirst.mockReset();
	mockInvitationFindFirst.mockResolvedValue(mockInvitationRow);
	mockRoomPlayerFindFirst.mockReset();
	mockRoomPlayerFindFirst.mockResolvedValue(null);
	mockRoomPlayerFindMany.mockReset();
	mockRoomPlayerFindMany.mockResolvedValue([]);
});

// ── POST /api/rooms/:roomId/invite-bot/:botId ─────────────────────────────────

describe('POST /api/rooms/:roomId/invite-bot/:botId', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'POST' })
		);
		expect(res.status).toBe(401);
	});

	it('returns 403 when bot belongs to another user', async () => {
		mockBotFindFirst.mockResolvedValueOnce({ ...mockBot, userId: 'other-user' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'POST' })
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Forbidden');
	});

	it('returns 400 when room not found', async () => {
		mockSelect.mockImplementationOnce((..._args: unknown[]): unknown => ({
			from: () => ({ where: () => Promise.resolve([]) })
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'POST' })
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Room not found');
	});

	it('returns 400 when room is not waiting', async () => {
		mockSelect.mockImplementationOnce((..._args: unknown[]): unknown => ({
			from: () => ({ where: () => Promise.resolve([{ ...mockRoomRow, status: 'in_progress' }]) })
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'POST' })
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Room is not in waiting status');
	});

	it('returns 400 when bot already invited', async () => {
		mockSelect.mockImplementationOnce((..._args: unknown[]): unknown => ({
			from: () => ({ where: () => Promise.resolve([mockRoomRow]) })
		}));
		// invitation findFirst returns pending invitation
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'POST' })
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Bot already invited');
	});

	it('returns 400 when bot is already in room', async () => {
		mockSelect.mockImplementationOnce((..._args: unknown[]): unknown => ({
			from: () => ({ where: () => Promise.resolve([mockRoomRow]) })
		}));
		mockInvitationFindFirst.mockResolvedValueOnce(null as any);
		mockRoomPlayerFindFirst.mockResolvedValueOnce(mockPlayerRow as any);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'POST' })
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Bot is already in the room');
	});

	it('creates invitation and returns invitationId', async () => {
		mockSelect.mockImplementationOnce((..._args: unknown[]): unknown => ({
			from: () => ({ where: () => Promise.resolve([mockRoomRow]) })
		}));
		mockInvitationFindFirst.mockResolvedValueOnce(null as any);
		mockRoomPlayerFindFirst.mockResolvedValueOnce(null as any);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'POST' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.invitationId).toBe('inv1');
	});
});

// ── DELETE /api/rooms/:roomId/invite-bot/:botId ───────────────────────────────

describe('DELETE /api/rooms/:roomId/invite-bot/:botId', () => {
	it('returns 401 when not authenticated', async () => {
		mockRequireUser.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'DELETE' })
		);
		expect(res.status).toBe(401);
	});

	it('returns 403 when bot belongs to another user', async () => {
		mockBotFindFirst.mockResolvedValueOnce({ ...mockBot, userId: 'other-user' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'DELETE' })
		);
		expect(res.status).toBe(403);
	});

	it('cancels invitation and removes room player', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'DELETE' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});

	it('succeeds even when no pending invitation exists', async () => {
		mockInvitationFindFirst.mockResolvedValueOnce(null as any);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/invite-bot/b1', { method: 'DELETE' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

// ── GET /api/bot/invitations ──────────────────────────────────────────────────

describe('GET /api/bot/invitations', () => {
	it('returns 401 when no API key', async () => {
		mockRequireBot.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/bot/invitations'));
		expect(res.status).toBe(401);
	});

	it('returns pending invitations for the bot', async () => {
		mockSelect.mockImplementationOnce((..._args: unknown[]): unknown => ({
			from: () => ({
				innerJoin: () => ({
					where: () =>
						Promise.resolve([
							{ invitationId: 'inv1', roomId: 'r1', roomName: 'Test Room', createdAt: now }
						])
				})
			})
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/invitations', {
				headers: { 'X-API-Key': 'mr_abc123' }
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body[0].invitationId).toBe('inv1');
		expect(body[0].roomName).toBe('Test Room');
	});
});

// ── POST /api/bot/rooms/:roomId/join ──────────────────────────────────────────

describe('POST /api/bot/rooms/:roomId/join', () => {
	it('returns 401 when no API key', async () => {
		mockRequireBot.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/rooms/r1/join', { method: 'POST' })
		);
		expect(res.status).toBe(401);
	});

	it('returns 400 when no pending invitation', async () => {
		mockInvitationFindFirst.mockResolvedValueOnce(null as any);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/rooms/r1/join', {
				method: 'POST',
				headers: { 'X-API-Key': 'mr_abc123' }
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('No pending invitation');
	});

	it('returns 400 when room not found', async () => {
		mockSelect.mockImplementationOnce((..._args: unknown[]): unknown => ({
			from: () => ({ where: () => Promise.resolve([]) })
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/rooms/r1/join', {
				method: 'POST',
				headers: { 'X-API-Key': 'mr_abc123' }
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Room not found');
	});

	it('returns 400 when room is full', async () => {
		mockSelect
			.mockImplementationOnce((..._args: unknown[]): unknown => ({
				from: () => ({ where: () => Promise.resolve([mockRoomRow]) })
			}))
			.mockImplementationOnce((..._args: unknown[]): unknown => ({
				from: () => ({ where: () => Promise.resolve([{ playerCount: 5 }]) })
			}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/rooms/r1/join', {
				method: 'POST',
				headers: { 'X-API-Key': 'mr_abc123' }
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Room is full');
	});

	it('joins room and returns playerId', async () => {
		mockSelect
			.mockImplementationOnce((..._args: unknown[]): unknown => ({
				from: () => ({ where: () => Promise.resolve([mockRoomRow]) })
			}))
			.mockImplementationOnce((..._args: unknown[]): unknown => ({
				from: () => ({ where: () => Promise.resolve([{ playerCount: 2 }]) })
			}));
		mockInsert.mockImplementationOnce((..._args: unknown[]): unknown => ({
			values: () => ({ returning: () => Promise.resolve([mockPlayerRow]) })
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/rooms/r1/join', {
				method: 'POST',
				headers: { 'X-API-Key': 'mr_abc123' }
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.playerId).toBe('p1');
	});
});

// ── POST /api/bot/rooms/:roomId/ready ─────────────────────────────────────────

describe('POST /api/bot/rooms/:roomId/ready', () => {
	it('returns 401 when no API key', async () => {
		mockRequireBot.mockRejectedValueOnce(new Error('Unauthorized'));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/rooms/r1/ready', { method: 'POST' })
		);
		expect(res.status).toBe(401);
	});

	it('returns 404 when player not found', async () => {
		mockRoomPlayerFindFirst.mockResolvedValueOnce(null as any);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/rooms/r1/ready', {
				method: 'POST',
				headers: { 'X-API-Key': 'mr_abc123' }
			})
		);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Player not found in room');
	});

	it('sets ready and returns ready: true', async () => {
		mockRoomPlayerFindFirst.mockResolvedValueOnce(mockPlayerRow as any);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/bot/rooms/r1/ready', {
				method: 'POST',
				headers: { 'X-API-Key': 'mr_abc123' }
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ready).toBe(true);
	});
});
