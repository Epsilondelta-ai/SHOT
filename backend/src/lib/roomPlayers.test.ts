import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRoomPlayerFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);
const mockUserFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);
const mockAssistantFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);
const mockLlmModelFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);

mock.module('../db', () => ({
	db: {
		query: {
			roomPlayer: { findMany: mockRoomPlayerFindMany },
			user: { findMany: mockUserFindMany },
			assistant: { findMany: mockAssistantFindMany },
			llmModel: { findMany: mockLlmModelFindMany },
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
	gameParticipant: { id: 'gameParticipant.id', roomId: 'gameParticipant.roomId', userId: 'gameParticipant.userId', participationType: 'gameParticipant.participationType', createdAt: 'gameParticipant.createdAt' },
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

beforeEach(() => {
	mockRoomPlayerFindMany.mockReset();
	mockRoomPlayerFindMany.mockResolvedValue([]);
	mockUserFindMany.mockReset();
	mockUserFindMany.mockResolvedValue([]);
	mockAssistantFindMany.mockReset();
	mockAssistantFindMany.mockResolvedValue([]);
	mockLlmModelFindMany.mockReset();
	mockLlmModelFindMany.mockResolvedValue([]);
});

// ── Tests ────────────────────────────────────────────────────────────────────

const { getSerializedRoomPlayers } = await import('./roomPlayers');

describe('getSerializedRoomPlayers', () => {
	it('returns empty array when no players', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([]);
		const result = await getSerializedRoomPlayers('room-1');
		expect(result).toEqual([]);
	});

	it('serializes human players with user data', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', playerType: 'human', displayName: null, assistantId: null, llmModelId: null, ready: true }
		]);
		mockUserFindMany.mockResolvedValueOnce([
			{ id: 'u1', name: 'Alice', image: 'avatar.png' }
		]);

		const result = await getSerializedRoomPlayers('room-1');
		expect(result).toEqual([{
			id: 'p1',
			userId: 'u1',
			name: 'Alice',
			avatarSrc: 'avatar.png',
			type: 'human',
			assistantId: null,
			assistantName: null,
			llmModelId: null,
			modelName: null,
			language: null,
			ready: true,
		}]);
	});

	it('falls back to displayName when user not found', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', playerType: 'human', displayName: 'Guest', assistantId: null, llmModelId: null, ready: false }
		]);
		mockUserFindMany.mockResolvedValueOnce([]);

		const result = await getSerializedRoomPlayers('room-1');
		expect(result[0].name).toBe('Guest');
		expect(result[0].avatarSrc).toBeNull();
	});

	it('serializes LLM players with assistant and model data', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'llm:a1', playerType: 'llm', displayName: null, assistantId: 'a1', llmModelId: 'm1', ready: true }
		]);
		mockAssistantFindMany.mockResolvedValueOnce([
			{ id: 'a1', name: 'SmartBot' }
		]);
		mockLlmModelFindMany.mockResolvedValueOnce([
			{ id: 'm1', displayName: 'GPT-4o' }
		]);

		const result = await getSerializedRoomPlayers('room-1');
		expect(result[0]).toEqual({
			id: 'p1',
			userId: 'llm:a1',
			name: 'SmartBot',
			avatarSrc: null,
			type: 'llm',
			assistantId: 'a1',
			assistantName: 'SmartBot',
			llmModelId: 'm1',
			modelName: 'GPT-4o',
			language: null,
			ready: true,
		});
	});

	it('handles mixed player types (human + LLM)', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', playerType: 'human', displayName: null, assistantId: null, llmModelId: null, ready: true },
			{ id: 'p2', userId: 'llm:a1', playerType: 'llm', displayName: 'CustomName', assistantId: 'a1', llmModelId: 'm1', ready: true },
		]);
		mockUserFindMany.mockResolvedValueOnce([{ id: 'u1', name: 'Alice', image: null }]);
		mockAssistantFindMany.mockResolvedValueOnce([{ id: 'a1', name: 'SmartBot' }]);
		mockLlmModelFindMany.mockResolvedValueOnce([{ id: 'm1', displayName: 'Claude' }]);

		const result = await getSerializedRoomPlayers('room-1');
		expect(result.length).toBe(2);
		expect(result[0].type).toBe('human');
		expect(result[1].type).toBe('llm');
		expect(result[1].name).toBe('CustomName');
	});

	it('LLM player falls back to "LLM Player" when no assistant found', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'llm:a1', playerType: 'llm', displayName: null, assistantId: 'missing', llmModelId: null, ready: true }
		]);

		const result = await getSerializedRoomPlayers('room-1');
		expect(result[0].name).toBe('LLM Player');
		expect(result[0].assistantName).toBeNull();
	});
});
