import { describe, it, expect, mock, beforeEach } from 'bun:test';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetSession = mock(async (..._args: any[]): Promise<any> => null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = mock((..._args: any[]): any => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	from: (..._: any[]) => ({ where: async (...__: any[]) => [] })
}));

mock.module('./auth', () => ({
	auth: {
		api: {
			getSession: mockGetSession
		}
	}
}));

mock.module('../db', () => ({
	db: {
		query: {
			roomPlayer: { findMany: mock(async () => []) },
			user: { findMany: mock(async () => []) },
			assistant: { findMany: mock(async () => []) },
			llmModel: { findMany: mock(async () => []) }
		},
		select: mockSelect
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
	eq: (a: unknown, b: unknown) => ({ a, b }),
	and: (...args: unknown[]) => ({ op: 'and', args }),
	or: (...args: unknown[]) => ({ op: 'or', args }),
	count: (col: unknown) => ({ op: 'count', col }),
	desc: (col: unknown) => ({ op: 'desc', col }),
	inArray: (col: unknown, vals: unknown) => ({ op: 'inArray', col, vals }),
	isNull: (col: unknown) => ({ op: 'isNull', col }),
	relations: () => ({}),
	sql: {}
}));

const { getUser, requireUser, requireAdmin } = await import('./getUser');

function makeRequest(cookie = ''): Request {
	return new Request('http://localhost', {
		headers: cookie ? { cookie } : {}
	});
}

beforeEach(() => {
	mockGetSession.mockClear();
	mockSelect.mockClear();
});

describe('getUser', () => {
	it('returns null when no session', async () => {
		// mockGetSession default returns null
		const result = await getUser(makeRequest());
		expect(result).toBeNull();
	});

	it('returns null when user not found in DB', async () => {
		mockGetSession.mockImplementationOnce(async () => ({ user: { id: 'u1' } }));
		// mockSelect default returns empty array
		const result = await getUser(makeRequest('better-auth.session_token=abc123'));
		expect(result).toBeNull();
	});

	it('returns user when session and user found', async () => {
		const mockUser = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'user', image: null };
		mockGetSession.mockImplementationOnce(async () => ({ user: { id: 'u1' } }));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: async () => [mockUser] })
		}));
		const result = await getUser(makeRequest('better-auth.session_token=tok'));
		expect(result).toEqual(mockUser);
	});
});

describe('requireUser', () => {
	it('throws Unauthorized when no session', async () => {
		await expect(requireUser(makeRequest())).rejects.toThrow('Unauthorized');
	});

	it('returns user when authenticated', async () => {
		const mockUser = { id: 'u1', name: 'Bob', email: 'bob@test.com', role: 'user', image: null };
		mockGetSession.mockImplementationOnce(async () => ({ user: { id: 'u1' } }));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: async () => [mockUser] })
		}));
		const result = await requireUser(makeRequest('better-auth.session_token=tok'));
		expect(result).toEqual(mockUser);
	});
});

describe('requireAdmin', () => {
	it('throws Unauthorized when no session', async () => {
		await expect(requireAdmin(makeRequest())).rejects.toThrow('Unauthorized');
	});

	it('throws Forbidden when user is not admin', async () => {
		const mockUser = { id: 'u1', name: 'Bob', email: 'bob@test.com', role: 'user', image: null };
		mockGetSession.mockImplementationOnce(async () => ({ user: { id: 'u1' } }));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: async () => [mockUser] })
		}));
		await expect(requireAdmin(makeRequest('better-auth.session_token=tok'))).rejects.toThrow('Forbidden');
	});

	it('returns user when role is admin', async () => {
		const adminUser = { id: 'a1', name: 'Admin', email: 'admin@test.com', role: 'admin', image: null };
		mockGetSession.mockImplementationOnce(async () => ({ user: { id: 'a1' } }));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: async () => [adminUser] })
		}));
		const result = await requireAdmin(makeRequest('better-auth.session_token=adminTok'));
		expect(result).toEqual(adminUser);
	});
});
