import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRoomPlayerFindMany = mock(async (): Promise<unknown[]> => []);

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

mock.module('../db', () => ({
	db: {
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

const { getRoomById, getHumanRoomPlayer, syncRoomAfterHumanDeparture } = await import('./roomState');

function localParseRoomCapacity(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 5 || parsed > 8) {
		return null;
	}

	return parsed;
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
		const result = await getRoomById('nonexistent');
		expect(result).toBeNull();
	});

	it('returns room when found', async () => {
		const roomData = { id: 'r1', name: 'Room 1', maxPlayers: 5 };
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([roomData]) })
		}));
		const result = await getRoomById('r1');
		expect(result).toEqual(roomData);
	});
});

describe('getHumanRoomPlayer', () => {
	it('returns null when player not found', async () => {
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([]) })
		}));
		const result = await getHumanRoomPlayer('r1', 'u1');
		expect(result).toBeNull();
	});

	it('returns player when found', async () => {
		const player = { id: 'p1', userId: 'u1', roomId: 'r1', playerType: 'human' };
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([player]) })
		}));
		const result = await getHumanRoomPlayer('r1', 'u1');
		expect(result).toEqual(player);
	});
});

describe('syncRoomAfterHumanDeparture', () => {
	it('returns deleted when room not found', async () => {
		// getRoomById returns empty
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: () => Promise.resolve([]) })
		}));
		const result = await syncRoomAfterHumanDeparture('r1');
		expect(result.deleted).toBe(true);
		expect(result.hostUserId).toBeNull();
	});

	it('deletes room when no humans remain', async () => {
		// getRoomById returns room
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ id: 'r1', name: 'Room', hostUserId: 'u1', maxPlayers: 5 }])
			})
		}));
		// findMany: only bots remain
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p2', userId: 'llm:bot1', playerType: 'llm', roomId: 'r1' }
		]);
		const result = await syncRoomAfterHumanDeparture('r1');
		expect(result.deleted).toBe(true);
		expect(result.hostUserId).toBeNull();
	});

	it('transfers host when original host left', async () => {
		// getRoomById returns room with host u1
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ id: 'r1', name: 'Room', hostUserId: 'u1', maxPlayers: 5 }])
			})
		}));
		// findMany: u2 remains (u1 left)
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p2', userId: 'u2', playerType: 'human', roomId: 'r1' }
		]);
		const result = await syncRoomAfterHumanDeparture('r1');
		expect(result.deleted).toBe(false);
		expect(result.hostUserId).toBe('u2');
	});

	it('keeps same host when host is still in room', async () => {
		// getRoomById returns room with host u1
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({
				where: () => Promise.resolve([{ id: 'r1', name: 'Room', hostUserId: 'u1', maxPlayers: 5 }])
			})
		}));
		// findMany: u1 and u2 both remain
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', playerType: 'human', roomId: 'r1' },
			{ id: 'p2', userId: 'u2', playerType: 'human', roomId: 'r1' }
		]);
		const result = await syncRoomAfterHumanDeparture('r1');
		expect(result.deleted).toBe(false);
		expect(result.hostUserId).toBe('u1');
	});
});
