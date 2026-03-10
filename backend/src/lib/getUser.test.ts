import { describe, it, expect, mock, beforeEach } from 'bun:test';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindFirst = mock(async (..._args: any[]): Promise<any> => null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSelect = mock((..._args: any[]): any => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	from: (..._: any[]) => ({ where: async (...__: any[]) => [] })
}));

mock.module('../db', () => ({
	db: {
		query: { session: { findFirst: mockFindFirst } },
		select: mockSelect
	}
}));

mock.module('../db/schema', () => ({
	session: { token: 'session.token' },
	user: { id: 'user.id', name: 'user.name', email: 'user.email', role: 'user.role', image: 'user.image' }
}));

mock.module('drizzle-orm', () => ({
	eq: (a: unknown, b: unknown) => ({ a, b })
}));

const { getUser, requireUser, requireAdmin } = await import('./getUser');

function makeRequest(cookie = ''): Request {
	return new Request('http://localhost', {
		headers: cookie ? { cookie } : {}
	});
}

beforeEach(() => {
	mockFindFirst.mockClear();
	mockSelect.mockClear();
});

describe('getUser', () => {
	it('returns null when no cookie present', async () => {
		const result = await getUser(makeRequest());
		expect(result).toBeNull();
		expect(mockFindFirst).not.toHaveBeenCalled();
	});

	it('returns null when cookie has no session token', async () => {
		const result = await getUser(makeRequest('other-cookie=value'));
		expect(result).toBeNull();
	});

	it('returns null when session not found in DB', async () => {
		// mockFindFirst default returns null
		const result = await getUser(makeRequest('better-auth.session_token=abc123'));
		expect(result).toBeNull();
	});

	it('returns null when user not found in DB', async () => {
		mockFindFirst.mockImplementationOnce(async () => ({ userId: 'user-1', token: 'abc123' }));
		// mockSelect default returns empty array
		const result = await getUser(makeRequest('better-auth.session_token=abc123'));
		expect(result).toBeNull();
	});

	it('returns user when session and user found', async () => {
		const mockUser = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'user', image: null };
		mockFindFirst.mockImplementationOnce(async () => ({ userId: 'u1', token: 'tok' }));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: async () => [mockUser] })
		}));
		const result = await getUser(makeRequest('better-auth.session_token=tok'));
		expect(result).toEqual(mockUser);
	});

	it('decodes URL-encoded session token before DB lookup', async () => {
		// default: session not found → null
		const result = await getUser(makeRequest('better-auth.session_token=hello%20world'));
		expect(mockFindFirst).toHaveBeenCalledTimes(1);
		expect(result).toBeNull();
	});
});

describe('requireUser', () => {
	it('throws Unauthorized when no user', async () => {
		await expect(requireUser(makeRequest())).rejects.toThrow('Unauthorized');
	});

	it('returns user when authenticated', async () => {
		const mockUser = { id: 'u1', name: 'Bob', email: 'bob@test.com', role: 'user', image: null };
		mockFindFirst.mockImplementationOnce(async () => ({ userId: 'u1', token: 'tok' }));
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
		mockFindFirst.mockImplementationOnce(async () => ({ userId: 'u1', token: 'tok' }));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: async () => [mockUser] })
		}));
		await expect(requireAdmin(makeRequest('better-auth.session_token=tok'))).rejects.toThrow('Forbidden');
	});

	it('returns user when role is admin', async () => {
		const adminUser = { id: 'a1', name: 'Admin', email: 'admin@test.com', role: 'admin', image: null };
		mockFindFirst.mockImplementationOnce(async () => ({ userId: 'a1', token: 'adminTok' }));
		mockSelect.mockImplementationOnce(() => ({
			from: () => ({ where: async () => [adminUser] })
		}));
		const result = await requireAdmin(makeRequest('better-auth.session_token=adminTok'));
		expect(result).toEqual(adminUser);
	});
});
