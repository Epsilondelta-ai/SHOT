import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAppendFileSync = mock((..._args: unknown[]) => {});
const mockMkdirSync = mock((..._args: unknown[]) => {});

mock.module('fs', () => ({
	appendFileSync: mockAppendFileSync,
	mkdirSync: mockMkdirSync,
}));

mock.module('path', () => ({
	join: (...parts: string[]) => parts.join('/'),
}));

// Schema mock for consistency with other test files
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
	or: (...args: unknown[]) => ({ op: 'or', args }),
	count: (col: unknown) => ({ op: 'count', col }),
	desc: (col: unknown) => ({ op: 'desc', col }),
	inArray: (col: unknown, vals: unknown) => ({ op: 'inArray', col, vals }),
	isNull: (col: unknown) => ({ op: 'isNull', col }),
	relations: () => ({}),
	sql: {}
}));

// Import the REAL module — no other test file mocks llmLogger
const { writeLlmLog, llmLog } = await import('./llmLogger');
type LlmLogEntry = import('./llmLogger').LlmLogEntry;

beforeEach(() => {
	mockAppendFileSync.mockReset();
	mockMkdirSync.mockReset();
});

// ── Tests ────────────────────────────────────────────────────────────────────

const sampleLogEntry: Omit<LlmLogEntry, 'timestamp'> = {
	roomId: 'room-1',
	round: 2,
	phase: 'acting',
	player: {
		userId: 'u1',
		name: 'TestBot',
		assistantId: 'a1',
		assistantName: 'SmartBot',
		provider: 'anthropic',
		model: 'claude-sonnet',
	},
	attempt: 1,
	systemPrompt: 'You are a game player',
	userPrompt: 'Choose an action',
	rawResponse: '{"type":"end-turn"}',
	parsedAction: { type: 'end-turn' } as const,
	success: true,
	error: null,
	outcome: 'action_applied' as const,
};

describe('writeLlmLog', () => {
	it('creates log directory and writes log entry', () => {
		writeLlmLog({ timestamp: '2026-03-11T00:00:00.000Z', ...sampleLogEntry });

		expect(mockMkdirSync).toHaveBeenCalled();
		expect(mockAppendFileSync).toHaveBeenCalledTimes(1);

		const writtenData = mockAppendFileSync.mock.calls[0][1] as string;
		const parsed = JSON.parse(writtenData.trim());
		expect(parsed.roomId).toBe('room-1');
		expect(parsed.success).toBe(true);
		expect(parsed.outcome).toBe('action_applied');
	});

	it('does not throw when appendFileSync fails', () => {
		mockAppendFileSync.mockImplementationOnce(() => {
			throw new Error('disk full');
		});

		expect(() => {
			writeLlmLog({ timestamp: '2026-03-11T00:00:00.000Z', ...sampleLogEntry });
		}).not.toThrow();
	});

	it('does not throw when mkdirSync fails', () => {
		mockMkdirSync.mockImplementationOnce(() => {
			throw new Error('permission denied');
		});

		expect(() => {
			writeLlmLog({ timestamp: '2026-03-11T00:00:00.000Z', ...sampleLogEntry });
		}).not.toThrow();
	});
});

describe('llmLog', () => {
	it('adds timestamp and calls writeLlmLog', () => {
		llmLog(sampleLogEntry);

		expect(mockAppendFileSync).toHaveBeenCalledTimes(1);
		const writtenData = mockAppendFileSync.mock.calls[0][1] as string;
		const parsed = JSON.parse(writtenData.trim());
		expect(parsed.timestamp).toBeDefined();
		expect(typeof parsed.timestamp).toBe('string');
		expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('includes all log fields', () => {
		llmLog(sampleLogEntry);

		const writtenData = mockAppendFileSync.mock.calls[0][1] as string;
		const parsed = JSON.parse(writtenData.trim());
		expect(parsed.roomId).toBe('room-1');
		expect(parsed.round).toBe(2);
		expect(parsed.phase).toBe('acting');
		expect(parsed.player.name).toBe('TestBot');
		expect(parsed.attempt).toBe(1);
		expect(parsed.success).toBe(true);
		expect(parsed.outcome).toBe('action_applied');
	});

	it('includes historyLength when provided', () => {
		llmLog({ ...sampleLogEntry, historyLength: 42 });

		const writtenData = mockAppendFileSync.mock.calls[0][1] as string;
		const parsed = JSON.parse(writtenData.trim());
		expect(parsed.historyLength).toBe(42);
	});
});
