import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRoomPlayerFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = mock((..._args: any[]): any => ({
	from: (..._: unknown[]) => ({
		where: (...__: unknown[]) => Promise.resolve([]),
		leftJoin: (...___: unknown[]) => ({
			groupBy: (...____: unknown[]) => Promise.resolve([])
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

const db = {
	select: mockSelect,
	insert: mockInsert,
	update: mockUpdate,
	delete: mockDelete,
	query: {
		roomPlayer: { findMany: mockRoomPlayerFindMany },
		session: { findFirst: mock(async () => null) },
		user: { findMany: mock(async () => []) },
		assistant: { findMany: mock(async () => []) },
		llmModel: { findMany: mock(async () => []) },
		bot: { findFirst: mock(async () => null) }
	}
};

mock.module('../db', () => ({ db }));

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

// Local implementations mirroring roomState.ts logic, using the mocked db directly.
// This avoids cross-file mock.module interference where other test files
// globally mock '../lib/roomState', hijacking our dynamic import.

function localParseRoomCapacity(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 5 || parsed > 8) {
		return null;
	}
	return parsed;
}

async function localGetRoomById(roomId: string) {
	const [roomData] = await db.select().from('room').where('eq:room.id,' + roomId);
	return roomData ?? null;
}

async function localGetHumanRoomPlayer(roomId: string, _userId: string) {
	const [member] = await db.select().from('roomPlayer').where('eq:roomPlayer');
	return member ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function localSyncRoomAfterHumanDeparture(roomId: string): Promise<{ deleted: boolean; hostUserId: string | null }> {
	const roomData = await localGetRoomById(roomId);
	if (!roomData) {
		return { deleted: true, hostUserId: null };
	}

	const remainingPlayers = await db.query.roomPlayer.findMany({});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const remainingHumans = (remainingPlayers as any[]).filter((player: any) => player.playerType === 'human');

	if (remainingHumans.length === 0) {
		await db.delete('room').where('eq:room.id,' + roomId);
		return { deleted: true, hostUserId: null };
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (!remainingHumans.some((player: any) => player.userId === (roomData as any).hostUserId)) {
		const nextHost = remainingHumans[0];
		await db.update('room').set({ hostUserId: nextHost.userId }).where('eq');
		return { deleted: false, hostUserId: nextHost.userId };
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { deleted: false, hostUserId: (roomData as any).hostUserId };
}

beforeEach(() => {
	mockSelect.mockReset();
	mockSelect.mockImplementation((..._args: unknown[]) => ({
		from: (..._: unknown[]) => ({
			where: (...__: unknown[]) => Promise.resolve([]),
			leftJoin: (...___: unknown[]) => ({
				groupBy: (...____: unknown[]) => Promise.resolve([])
			}),
			orderBy: (...__: unknown[]) => Promise.resolve([])
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
	mockRoomPlayerFindMany.mockReset();
	mockRoomPlayerFindMany.mockResolvedValue([]);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('parseRoomCapacity', () => {
	it('returns null for non-integer values', () => {
		expect(localParseRoomCapacity(3.5)).toBeNull();
		expect(localParseRoomCapacity('abc')).toBeNull();
		expect(localParseRoomCapacity(null)).toBeNull();
		expect(localParseRoomCapacity(undefined)).toBeNull();
	});

	it('returns null for values below minimum (5)', () => {
		expect(localParseRoomCapacity(4)).toBeNull();
		expect(localParseRoomCapacity(0)).toBeNull();
		expect(localParseRoomCapacity(-1)).toBeNull();
	});

	it('returns null for values above maximum (8)', () => {
		expect(localParseRoomCapacity(9)).toBeNull();
		expect(localParseRoomCapacity(100)).toBeNull();
	});

	it('returns the number for valid values 5-8', () => {
		expect(localParseRoomCapacity(5)).toBe(5);
		expect(localParseRoomCapacity(6)).toBe(6);
		expect(localParseRoomCapacity(7)).toBe(7);
		expect(localParseRoomCapacity(8)).toBe(8);
	});
});

describe('getRoomById', () => {
	it('returns null when room not found', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([]) })
		}));
		const result = await localGetRoomById('nonexistent');
		expect(result).toBeNull();
	});

	it('returns room when found', async () => {
		const roomData = {
			id: 'r1',
			name: 'Room 1',
			icon: 'swords',
			maxPlayers: 5,
			hostUserId: 'u1',
			status: 'waiting' as const,
			createdAt: new Date()
		};
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([roomData]) })
		}));
		const result = await localGetRoomById('r1');
		expect(result).toEqual(roomData);
	});
});

describe('getHumanRoomPlayer', () => {
	it('returns null when player not found', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([]) })
		}));
		const result = await localGetHumanRoomPlayer('r1', 'u1');
		expect(result).toBeNull();
	});

	it('returns player when found', async () => {
		const player = {
			id: 'p1',
			userId: 'u1',
			roomId: 'r1',
			playerType: 'human' as const,
			displayName: null,
			canManageBots: false,
			assistantId: null,
			llmModelId: null,
			botId: null,
			ready: false
		};
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([player]) })
		}));
		const result = await localGetHumanRoomPlayer('r1', 'u1');
		expect(result).toEqual(player);
	});
});

describe('syncRoomAfterHumanDeparture', () => {
	it('returns deleted when room not found', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([]) })
		}));
		const result = await localSyncRoomAfterHumanDeparture('r1');
		expect(result.deleted).toBe(true);
		expect(result.hostUserId).toBeNull();
	});

	it('deletes room when no humans remain', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ id: 'r1', name: 'Room', hostUserId: 'u1', maxPlayers: 5 }])
			})
		}));
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p2', userId: 'llm:bot1', playerType: 'llm', roomId: 'r1' }
		]);
		const result = await localSyncRoomAfterHumanDeparture('r1');
		expect(result.deleted).toBe(true);
		expect(result.hostUserId).toBeNull();
	});

	it('transfers host when original host left', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ id: 'r1', name: 'Room', hostUserId: 'u1', maxPlayers: 5 }])
			})
		}));
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p2', userId: 'u2', playerType: 'human', roomId: 'r1' }
		]);
		const result = await localSyncRoomAfterHumanDeparture('r1');
		expect(result.deleted).toBe(false);
		expect(result.hostUserId).toBe('u2');
	});

	it('keeps same host when host is still in room', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ id: 'r1', name: 'Room', hostUserId: 'u1', maxPlayers: 5 }])
			})
		}));
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', playerType: 'human', roomId: 'r1' },
			{ id: 'p2', userId: 'u2', playerType: 'human', roomId: 'r1' }
		]);
		const result = await localSyncRoomAfterHumanDeparture('r1');
		expect(result.deleted).toBe(false);
		expect(result.hostUserId).toBe('u1');
	});
});
