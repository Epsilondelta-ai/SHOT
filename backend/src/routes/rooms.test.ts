import { describe, it, expect, mock, beforeEach } from 'bun:test';
import Elysia from 'elysia';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'user', image: null };

const mockGetUser = mock(async (): Promise<typeof mockUser | null> => mockUser);
const mockGetSerializedRoomPlayers = mock(async (): Promise<unknown[]> => []);
const mockBroadcastPlayers = mock(async () => {});
const mockGetRoomById = mock(async (): Promise<unknown | null> => null);
const mockGetHumanRoomPlayer = mock(async (): Promise<unknown | null> => null);
const mockParseRoomCapacity = mock((v: unknown): number | null => {
	const parsed = Number(v);
	if (!Number.isInteger(parsed) || parsed < 5 || parsed > 8) return null;
	return parsed;
});
const mockSyncRoomAfterHumanDeparture = mock(async () => ({ deleted: false, hostUserId: null }));

const mockRoomPlayerFindMany = mock(async (): Promise<unknown[]> => []);
const mockRoomPlayerFindFirst = mock(async (): Promise<unknown | null> => null);
const mockBotFindMany = mock(async (): Promise<unknown[]> => []);
const mockBotFindFirst = mock(async (): Promise<unknown | null> => null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = mock((..._args: any[]): any => ({
	from: (..._: unknown[]) => ({
		where: (...__: unknown[]) => Promise.resolve([]),
		leftJoin: (...__: unknown[]) => ({
			groupBy: (...___: unknown[]) => ({
				orderBy: (...____: unknown[]) => Promise.resolve([])
			})
		})
	})
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInsert = mock((..._args: any[]): any => ({
	values: (..._: unknown[]) => ({
		returning: () => Promise.resolve([{ id: 'new-room-id', name: 'Test Room', icon: 'swords', maxPlayers: 4, status: 'waiting' }])
	})
}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDelete = mock((..._args: any[]): any => ({
	where: (..._: unknown[]) => Promise.resolve()
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
		insert: mockInsert,
		update: mockUpdate,
		delete: mockDelete,
			query: {
				roomPlayer: { findMany: mockRoomPlayerFindMany, findFirst: mockRoomPlayerFindFirst },
				user: { findMany: mock(async () => []) },
				assistant: { findMany: mock(async () => []), findFirst: mock(async () => null) },
				llmModel: { findMany: mock(async () => []) },
				bot: { findMany: mockBotFindMany, findFirst: mockBotFindFirst },
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
	gameRecord: { roomId: 'gameRecord.roomId', playerCount: 'gameRecord.playerCount', playerNames: 'gameRecord.playerNames', winnerTeam: 'gameRecord.winnerTeam', startedAt: 'gameRecord.startedAt', finishedAt: 'gameRecord.finishedAt', replayData: 'gameRecord.replayData' },
	gameReplayFrame: { id: 'gameReplayFrame.id', roomId: 'gameReplayFrame.roomId', seq: 'gameReplayFrame.seq', snapshot: 'gameReplayFrame.snapshot', actionSummary: 'gameReplayFrame.actionSummary', createdAt: 'gameReplayFrame.createdAt' },
	gameParticipant: { id: 'gameParticipant.id', roomId: 'gameParticipant.roomId', userId: 'gameParticipant.userId', participationType: 'gameParticipant.participationType', createdAt: 'gameParticipant.createdAt' },
	userRelations: {}, banHistoryRelations: {}, sessionRelations: {}, accountRelations: {}, roomRelations: {}, roomPlayerRelations: {}
}));

mock.module('drizzle-orm', () => ({
	eq: (a: unknown, b: unknown) => ({ op: 'eq', a, b }),
	and: (...args: unknown[]) => ({ op: 'and', args }),
	count: (col: unknown) => ({ op: 'count', col }),
	desc: (col: unknown) => ({ op: 'desc', col }),
	inArray: (col: unknown, vals: unknown) => ({ op: 'inArray', col, vals }),
	isNull: (col: unknown) => ({ op: 'isNull', col }),
	or: (...args: unknown[]) => ({ op: 'or', args }),
	relations: () => ({}),
	sql: {}
}));

mock.module('../lib/getUser', () => ({
	getUser: mockGetUser,
	requireUser: mockGetUser,
	requireAdmin: mockGetUser,
}));

mock.module('../lib/roomState', () => ({
	getRoomById: mockGetRoomById,
	getHumanRoomPlayer: mockGetHumanRoomPlayer,
	parseRoomCapacity: mockParseRoomCapacity,
	syncRoomAfterHumanDeparture: mockSyncRoomAfterHumanDeparture,
	MIN_ROOM_PLAYERS: 5,
	MAX_ROOM_PLAYERS: 8
}));

mock.module('../lib/roomPlayers', () => ({
	getSerializedRoomPlayers: mockGetSerializedRoomPlayers
}));

mock.module('../ws/roomWs', () => ({
	broadcastPlayers: mockBroadcastPlayers
}));

const { roomRoutes } = await import('./rooms');

function makeApp() {
	return new Elysia().use(roomRoutes);
}

beforeEach(() => {
	mockGetUser.mockReset();
	mockGetUser.mockResolvedValue(mockUser);
	mockGetSerializedRoomPlayers.mockReset();
	mockGetSerializedRoomPlayers.mockResolvedValue([]);
	mockBroadcastPlayers.mockReset();
	mockRoomPlayerFindMany.mockReset();
	mockRoomPlayerFindMany.mockResolvedValue([]);
	mockRoomPlayerFindFirst.mockReset();
	mockRoomPlayerFindFirst.mockResolvedValue(null);
	mockBotFindMany.mockReset();
	mockBotFindMany.mockResolvedValue([]);
	mockBotFindFirst.mockReset();
	mockBotFindFirst.mockResolvedValue(null);
	mockGetRoomById.mockReset();
	mockGetRoomById.mockResolvedValue(null);
	mockGetHumanRoomPlayer.mockReset();
	mockGetHumanRoomPlayer.mockResolvedValue(null);
	mockSyncRoomAfterHumanDeparture.mockReset();
	mockSyncRoomAfterHumanDeparture.mockResolvedValue({ deleted: false, hostUserId: null });
	mockSelect.mockReset();
	mockSelect.mockImplementation((..._args: unknown[]) => ({
		from: (..._: unknown[]) => ({
			where: (...__: unknown[]) => Promise.resolve([]),
			leftJoin: (...__: unknown[]) => ({
				groupBy: (...___: unknown[]) => ({
					orderBy: (...____: unknown[]) => Promise.resolve([])
				})
			})
		})
	}));
	mockInsert.mockReset();
	mockInsert.mockImplementation((..._args: unknown[]) => ({
		values: (..._: unknown[]) => ({
			returning: () =>
				Promise.resolve([{ id: 'new-room-id', name: 'Test Room', icon: 'swords', maxPlayers: 5, status: 'waiting' }])
		})
	}));
	mockUpdate.mockReset();
	mockUpdate.mockImplementation((..._args: unknown[]) => ({
		set: (..._: unknown[]) => ({
			where: (...__: unknown[]) => Promise.resolve()
		})
	}));
	mockDelete.mockReset();
	mockDelete.mockImplementation((..._args: unknown[]) => ({
		where: (..._: unknown[]) => Promise.resolve()
	}));
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/rooms', () => {
	it('returns list of rooms', async () => {
		const rooms = [
			{ id: 'r1', name: 'Room 1', icon: 'swords', maxPlayers: 4, status: 'waiting', currentPlayers: 2 }
		];
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				leftJoin: () => ({
					groupBy: () => ({
						orderBy: () => Promise.resolve(rooms)
					})
				})
			})
		}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/rooms'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual(rooms);
	});
});

describe('POST /api/rooms', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Test' })
			})
		);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('returns 400 when name is empty', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: '' })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Name is required');
	});

	it('creates room when authenticated with valid name', async () => {
		const newRoom = { id: 'new-id', name: 'My Room', icon: 'swords', maxPlayers: 4, status: 'waiting' };
		mockInsert.mockImplementationOnce(() => ({
			values: () => ({
				returning: () => Promise.resolve([newRoom])
			})
		}));
		mockInsert.mockImplementationOnce(() => ({
			values: () => Promise.resolve()
		}));

		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'My Room' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.name).toBe('My Room');
	});
});

describe('POST /api/rooms/:id/leave', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/leave', { method: 'POST' })
		);
		expect(res.status).toBe(401);
	});

	it('returns success when user leaves room', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p2', userId: 'u2', playerType: 'human' }
		]);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/leave', { method: 'POST' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});
});

describe('POST /api/rooms/:id/join', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/join', { method: 'POST' })
		);
		expect(res.status).toBe(401);
	});

	it('returns success when joining room as new member', async () => {
		mockGetHumanRoomPlayer.mockResolvedValueOnce(null); // not existing member
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', name: 'Room', maxPlayers: 5, hostUserId: 'u2' });
		// getRoomPlayerCount
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ playerCount: 1 }])
			})
		}));
		mockInsert.mockImplementationOnce(() => ({
			values: () => Promise.resolve()
		}));

		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/join', { method: 'POST' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.roomId).toBe('r1');
	});

	it('returns success when already a member', async () => {
		mockGetHumanRoomPlayer.mockResolvedValueOnce({ id: 'p1', userId: 'u1', playerType: 'human' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/join', { method: 'POST' })
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.roomId).toBe('r1');
	});

	it('returns 404 when room not found', async () => {
		mockGetHumanRoomPlayer.mockResolvedValueOnce(null);
		mockGetRoomById.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/join', { method: 'POST' })
		);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Room not found');
	});

	it('returns 403 when room is full', async () => {
		mockGetHumanRoomPlayer.mockResolvedValueOnce(null);
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', name: 'Room', maxPlayers: 5, hostUserId: 'u2' });
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ playerCount: 5 }])
			})
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/join', { method: 'POST' })
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Room is full');
	});

	it('returns 403 when a game is already in progress', async () => {
		mockGetHumanRoomPlayer.mockResolvedValueOnce(null);
		mockGetRoomById.mockResolvedValueOnce({
			id: 'r1',
			name: 'Room',
			maxPlayers: 5,
			hostUserId: 'u2',
			status: 'in_progress'
		});

		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/join', { method: 'POST' })
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Game is already in progress');
	});
});

describe('GET /api/rooms/:id', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/rooms/r1'));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('returns 404 when room not found', async () => {
		mockGetRoomById.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/rooms/r1'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Room not found');
	});

	it('returns room data for existing member', async () => {
		const roomData = { id: 'r1abcd', name: 'Room 1', maxPlayers: 5, hostUserId: 'u1' };
		mockGetRoomById.mockResolvedValueOnce(roomData);
		mockGetHumanRoomPlayer.mockResolvedValueOnce({ id: 'p1', userId: 'u1', playerType: 'human', canManageBots: true });
		mockGetSerializedRoomPlayers.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', name: 'Alice', avatarSrc: null, type: 'human', assistantId: null, assistantName: null, llmModelId: null, modelName: null, ready: false }
		]);
			// getRoomOptions: 1) providers, 2) assistants; bots come from listRoomBotsForUser
			mockSelect
				.mockImplementationOnce(() => ({
					from: () => ({ where: () => Promise.resolve([]) })
				}))
				.mockImplementationOnce(() => ({
					from: () => ({ where: () => ({ orderBy: () => Promise.resolve([]) }) })
				}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/rooms/r1'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.roomId).toBe('r1abcd');
		expect(body.roomName).toBe('Room 1');
		expect(body.myId).toBe('u1');
		expect(body.roomCode).toBe('R1ABCD');
		expect(body.maxPlayers).toBe(5);
		expect(body.players).toBeArray();
	});

	it('auto-joins new user and returns room data', async () => {
		const roomData = { id: 'r1abcd', name: 'Room 1', maxPlayers: 5, hostUserId: 'u2' };
		mockGetRoomById.mockResolvedValueOnce(roomData);
		mockGetHumanRoomPlayer.mockResolvedValueOnce(null); // not existing member
		// getRoomPlayerCount
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([{ playerCount: 2 }]) })
		}));
		mockInsert.mockImplementationOnce(() => ({
			values: () => Promise.resolve()
		}));
			// getRoomOptions: 1) providers, 2) assistants; bots come from listRoomBotsForUser
			mockSelect
				.mockImplementationOnce(() => ({
					from: () => ({ where: () => Promise.resolve([]) })
				}))
				.mockImplementationOnce(() => ({
					from: () => ({ where: () => ({ orderBy: () => Promise.resolve([]) }) })
				}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/rooms/r1'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.roomId).toBe('r1abcd');
		expect(mockBroadcastPlayers).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when room is full for new user', async () => {
		const roomData = { id: 'r1abcd', name: 'Room 1', maxPlayers: 5, hostUserId: 'u2' };
		mockGetRoomById.mockResolvedValueOnce(roomData);
		mockGetHumanRoomPlayer.mockResolvedValueOnce(null); // not existing member
		// getRoomPlayerCount returns maxPlayers
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([{ playerCount: 5 }]) })
		}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/rooms/r1'));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Room is full');
	});

	it('returns spectator room data without auto-joining', async () => {
		const roomData = {
			id: 'r1abcd',
			name: 'Room 1',
			maxPlayers: 5,
			hostUserId: 'u2',
			status: 'in_progress'
		};
		mockGetRoomById.mockResolvedValueOnce(roomData);
		mockGetHumanRoomPlayer.mockResolvedValueOnce(null);
		mockGetSerializedRoomPlayers.mockResolvedValueOnce([
			{
				id: 'p2',
				userId: 'u2',
				name: 'Host',
				avatarSrc: null,
				type: 'human',
				canManageBots: true,
				assistantId: null,
				assistantName: null,
				llmModelId: null,
				modelName: null,
				botId: null,
				ready: true
			}
		]);
			mockSelect
				.mockImplementationOnce(() => ({
					from: () => ({ where: () => Promise.resolve([]) })
				}))
				.mockImplementationOnce(() => ({
					from: () => ({ where: () => ({ orderBy: () => Promise.resolve([]) }) })
				}));

		const app = makeApp();
		const res = await app.handle(new Request('http://localhost/api/rooms/r1?spectator=1'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.isSpectator).toBe(true);
		expect(mockBroadcastPlayers).not.toHaveBeenCalled();
		expect(mockInsert).not.toHaveBeenCalled();
	});
});

describe('POST /api/rooms/:id/capacity', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/capacity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ maxPlayers: 6 })
			})
		);
		expect(res.status).toBe(401);
	});

	it('returns 404 when room not found', async () => {
		mockGetRoomById.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/capacity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ maxPlayers: 6 })
			})
		);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Room not found');
	});

	it('returns 403 when not host', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u2', maxPlayers: 5 });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/capacity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ maxPlayers: 6 })
			})
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Only the host can change room capacity');
	});

	it('returns 400 for invalid capacity', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u1', maxPlayers: 5 });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/capacity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ maxPlayers: 3 })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Max players must be between 5 and 8');
	});

	it('updates capacity successfully', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u1', maxPlayers: 5 });
		// getRoomPlayerCount
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ playerCount: 3 }])
			})
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/capacity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ maxPlayers: 7 })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.maxPlayers).toBe(7);
	});
});

describe('POST /api/rooms/:id/host', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/host', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 'u2' })
			})
		);
		expect(res.status).toBe(401);
	});

	it('returns 403 when not host', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u2' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/host', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 'u3' })
			})
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Only the host can transfer host ownership');
	});

	it('returns 400 when no userId provided', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u1' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/host', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Target user is required');
	});

	it('transfers host successfully', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u1' });
		mockGetHumanRoomPlayer.mockResolvedValueOnce({ id: 'p2', userId: 'u2', playerType: 'human' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/host', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 'u2' })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.hostUserId).toBe('u2');
	});
});

describe('POST /api/rooms/:id/bot-permissions', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/bot-permissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 'u2', canManageBots: true })
			})
		);
		expect(res.status).toBe(401);
	});

	it('returns 403 when not host', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u2' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/bot-permissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 'u3', canManageBots: true })
			})
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Only the host can grant bot permissions');
	});

	it('returns 400 when targeting host user', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u1' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/bot-permissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 'u1', canManageBots: false })
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('The host already has bot management permission');
	});

	it('grants bot permission successfully', async () => {
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u1' });
		mockGetHumanRoomPlayer.mockResolvedValueOnce({ id: 'p2', userId: 'u2', playerType: 'human' });
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/bot-permissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: 'u2', canManageBots: true })
			})
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.userId).toBe('u2');
		expect(body.canManageBots).toBe(true);
	});
});

describe('POST /api/rooms/:id/llm-players', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/llm-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assistantId: 'a1', llmModelId: 'm1' })
			})
		);
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('returns 403 when not admin', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/llm-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assistantId: 'a1', llmModelId: 'm1' })
			})
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('Only admins can add LLM players');
	});

	it('returns 404 when room not found', async () => {
		mockGetUser.mockResolvedValueOnce({ ...mockUser, role: 'admin' });
		mockGetRoomById.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/llm-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assistantId: 'a1', llmModelId: 'm1' })
			})
		);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Room not found');
	});

	it('returns 403 when not a member', async () => {
		mockGetUser.mockResolvedValueOnce({ ...mockUser, role: 'admin' });
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u2', maxPlayers: 5 });
		mockGetHumanRoomPlayer.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/llm-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assistantId: 'a1', llmModelId: 'm1' })
			})
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe('You must join the room first');
	});

	it('returns 400 when assistantId or llmModelId missing', async () => {
		mockGetUser.mockResolvedValueOnce({ ...mockUser, role: 'admin' });
		mockGetRoomById.mockResolvedValueOnce({ id: 'r1', hostUserId: 'u1', maxPlayers: 5 });
		mockGetHumanRoomPlayer.mockResolvedValueOnce({ id: 'p1', userId: 'u1', canManageBots: true });
		// getRoomPlayerCount
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ playerCount: 2 }])
			})
		}));
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/llm-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Model is required');
	});
});

describe('POST /api/rooms/:id/bot-players', () => {
	it('returns 401 when not authenticated', async () => {
		mockGetUser.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/bot-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ botId: 'b1' })
			})
		);
		expect(res.status).toBe(401);
	});

	it('returns 404 when bot not owned by user', async () => {
		// mockBotFindFirst returns null (bot not owned by this user)
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/bot-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ botId: 'b1' })
			})
		);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Bot not found');
	});

	it('returns 404 when room not found', async () => {
		mockBotFindFirst.mockResolvedValueOnce({
			id: 'b1', userId: 'u1', name: 'TestBot', active: true, presenceStatus: 'online',
		});
		mockGetRoomById.mockResolvedValueOnce(null);
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/bot-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ botId: 'b1' })
			})
		);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBe('Room not found');
	});

	it('returns 400 when botId missing', async () => {
		const app = makeApp();
		const res = await app.handle(
			new Request('http://localhost/api/rooms/r1/bot-players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Bot is required');
	});
});
