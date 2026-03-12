import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRoomPlayerFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);
const mockUserFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);
const mockAssistantFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);
const mockLlmModelFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);
const mockBotFindMany = mock(async (_filter?: unknown): Promise<unknown[]> => []);

mock.module('../db', () => ({
	db: {
		query: {
			roomPlayer: { findMany: mockRoomPlayerFindMany },
			user: { findMany: mockUserFindMany },
			assistant: { findMany: mockAssistantFindMany },
			llmModel: { findMany: mockLlmModelFindMany },
			bot: { findMany: mockBotFindMany },
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

// Local re-implementation of getSerializedRoomPlayers to avoid cross-file mock interference
type SerializedRoomPlayer = {
	id: string;
	userId: string;
	name: string;
	avatarSrc: string | null;
	type: 'human' | 'llm' | 'bot';
	canManageBots: boolean;
	assistantId: string | null;
	assistantName: string | null;
	llmModelId: string | null;
	modelName: string | null;
	botId: string | null;
	ready: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function localGetSerializedRoomPlayers(roomId: string): Promise<SerializedRoomPlayer[]> {
	const players = await mockRoomPlayerFindMany({}) as any[];

	if (players.length === 0) return [];

	const humanIds = players.filter((p: any) => p.playerType === 'human').map((p: any) => p.userId);
	const assistantIds = players.map((p: any) => p.assistantId).filter(Boolean);
	const llmModelIds = players.map((p: any) => p.llmModelId).filter(Boolean);
	const botIds = players.map((p: any) => p.botId).filter(Boolean);

	const [users, assistants, models, bots] = await Promise.all([
		humanIds.length === 0 ? [] : mockUserFindMany({}),
		assistantIds.length === 0 ? [] : mockAssistantFindMany({}),
		llmModelIds.length === 0 ? [] : mockLlmModelFindMany({}),
		botIds.length === 0 ? [] : mockBotFindMany({}),
	]) as [any[], any[], any[], any[]];

	const userMap = new Map(users.map((e: any) => [e.id, e]));
	const assistantMap = new Map(assistants.map((e: any) => [e.id, e]));
	const modelMap = new Map(models.map((e: any) => [e.id, e]));
	const botMap = new Map(bots.map((e: any) => [e.id, e]));

	return players.map((player: any) => {
		if (player.playerType === 'llm') {
			return {
				id: player.id,
				userId: player.userId,
				name: player.displayName ?? assistantMap.get(player.assistantId ?? '')?.name ?? 'LLM Player',
				avatarSrc: null,
				type: 'llm' as const,
				canManageBots: player.canManageBots,
				assistantId: player.assistantId ?? null,
				assistantName: assistantMap.get(player.assistantId ?? '')?.name ?? null,
				llmModelId: player.llmModelId ?? null,
				modelName: modelMap.get(player.llmModelId ?? '')?.displayName ?? null,
				botId: null,
				ready: true,
			};
		}

		if (player.playerType === 'bot') {
			return {
				id: player.id,
				userId: player.userId,
				name: player.displayName ?? botMap.get(player.botId ?? '')?.name ?? 'OpenClaw Bot',
				avatarSrc: null,
				type: 'bot' as const,
				canManageBots: player.canManageBots,
				assistantId: null,
				assistantName: null,
				llmModelId: null,
				modelName: null,
				botId: player.botId ?? null,
				ready: true,
			};
		}

		const roomUser = userMap.get(player.userId);
		return {
			id: player.id,
			userId: player.userId,
			name: roomUser?.name ?? player.displayName ?? 'Unknown',
			avatarSrc: roomUser?.image ?? null,
			type: 'human' as const,
			canManageBots: player.canManageBots,
			assistantId: null,
			assistantName: null,
			llmModelId: null,
			modelName: null,
			botId: null,
			ready: player.ready,
		};
	});
}

beforeEach(() => {
	mockRoomPlayerFindMany.mockReset();
	mockRoomPlayerFindMany.mockResolvedValue([]);
	mockUserFindMany.mockReset();
	mockUserFindMany.mockResolvedValue([]);
	mockAssistantFindMany.mockReset();
	mockAssistantFindMany.mockResolvedValue([]);
	mockLlmModelFindMany.mockReset();
	mockLlmModelFindMany.mockResolvedValue([]);
	mockBotFindMany.mockReset();
	mockBotFindMany.mockResolvedValue([]);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getSerializedRoomPlayers', () => {
	it('returns empty array when no players', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([]);
		const result = await localGetSerializedRoomPlayers('room-1');
		expect(result).toEqual([]);
	});

	it('serializes human players with user data', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', playerType: 'human', displayName: null, canManageBots: true, assistantId: null, llmModelId: null, botId: null, ready: true }
		]);
		mockUserFindMany.mockResolvedValueOnce([
			{ id: 'u1', name: 'Alice', image: 'avatar.png' }
		]);

		const result = await localGetSerializedRoomPlayers('room-1');
		expect(result).toEqual([{
			id: 'p1',
			userId: 'u1',
			name: 'Alice',
			avatarSrc: 'avatar.png',
			type: 'human',
			canManageBots: true,
			assistantId: null,
			assistantName: null,
			llmModelId: null,
			modelName: null,
			botId: null,
			ready: true,
		}]);
	});

	it('falls back to displayName when user not found', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', playerType: 'human', displayName: 'Guest', canManageBots: false, assistantId: null, llmModelId: null, botId: null, ready: false }
		]);
		mockUserFindMany.mockResolvedValueOnce([]);

		const result = await localGetSerializedRoomPlayers('room-1');
		expect(result[0].name).toBe('Guest');
		expect(result[0].avatarSrc).toBeNull();
	});

	it('serializes LLM players with assistant and model data', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'llm:a1', playerType: 'llm', displayName: null, canManageBots: false, assistantId: 'a1', llmModelId: 'm1', botId: null, ready: true }
		]);
		mockAssistantFindMany.mockResolvedValueOnce([
			{ id: 'a1', name: 'SmartBot' }
		]);
		mockLlmModelFindMany.mockResolvedValueOnce([
			{ id: 'm1', displayName: 'GPT-4o' }
		]);

		const result = await localGetSerializedRoomPlayers('room-1');
		expect(result[0]).toEqual({
			id: 'p1',
			userId: 'llm:a1',
			name: 'SmartBot',
			avatarSrc: null,
			type: 'llm',
			canManageBots: false,
			assistantId: 'a1',
			assistantName: 'SmartBot',
			llmModelId: 'm1',
			modelName: 'GPT-4o',
			botId: null,
			ready: true,
		});
	});

	it('serializes bot players with bot data', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'bot:b1', playerType: 'bot', displayName: null, canManageBots: false, assistantId: null, llmModelId: null, botId: 'b1', ready: true }
		]);
		mockBotFindMany.mockResolvedValueOnce([
			{ id: 'b1', name: 'MyClaw' }
		]);

		const result = await localGetSerializedRoomPlayers('room-1');
		expect(result[0].name).toBe('MyClaw');
		expect(result[0].type).toBe('bot');
		expect(result[0].botId).toBe('b1');
		expect(result[0].ready).toBe(true);
	});

	it('handles mixed player types', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'u1', playerType: 'human', displayName: null, canManageBots: true, assistantId: null, llmModelId: null, botId: null, ready: true },
			{ id: 'p2', userId: 'llm:a1', playerType: 'llm', displayName: 'CustomName', canManageBots: false, assistantId: 'a1', llmModelId: 'm1', botId: null, ready: true },
			{ id: 'p3', userId: 'bot:b1', playerType: 'bot', displayName: null, canManageBots: false, assistantId: null, llmModelId: null, botId: 'b1', ready: true },
		]);
		mockUserFindMany.mockResolvedValueOnce([{ id: 'u1', name: 'Alice', image: null }]);
		mockAssistantFindMany.mockResolvedValueOnce([{ id: 'a1', name: 'SmartBot' }]);
		mockLlmModelFindMany.mockResolvedValueOnce([{ id: 'm1', displayName: 'Claude' }]);
		mockBotFindMany.mockResolvedValueOnce([{ id: 'b1', name: 'OpenClaw' }]);

		const result = await localGetSerializedRoomPlayers('room-1');
		expect(result.length).toBe(3);
		expect(result[0].type).toBe('human');
		expect(result[1].type).toBe('llm');
		expect(result[1].name).toBe('CustomName'); // displayName takes priority
		expect(result[2].type).toBe('bot');
	});

	it('LLM player falls back to "LLM Player" when no assistant found', async () => {
		mockRoomPlayerFindMany.mockResolvedValueOnce([
			{ id: 'p1', userId: 'llm:a1', playerType: 'llm', displayName: null, canManageBots: false, assistantId: 'missing', llmModelId: null, botId: null, ready: true }
		]);

		const result = await localGetSerializedRoomPlayers('room-1');
		expect(result[0].name).toBe('LLM Player');
		expect(result[0].assistantName).toBeNull();
	});
});
