import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status: number, location: string) => {
		const err = Object.assign(new Error('redirect'), { status, location });
		throw err;
	}),
	fail: vi.fn((status: number, data: Record<string, unknown>) => ({ status, data }))
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	user: { id: 'id', banStart: 'ban_start', banEnd: 'ban_end', banReason: 'ban_reason' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			signOut: vi.fn().mockResolvedValue({})
		}
	}
}));

import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { load, actions } from './+page.server';

function makeSelectChain(result: unknown[]) {
	const chain = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue(result)
	};
	vi.mocked(db.select).mockReturnValue(chain as never);
	return chain;
}

function makeEvent(user?: { id: string }) {
	return {
		locals: { user },
		request: { headers: new Headers() }
	} as never;
}

describe('banned page load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(load(makeEvent())).rejects.toMatchObject({ location: '/login' });
		expect(redirect).toHaveBeenCalledWith(303, '/login');
	});

	it('밴이 없는 유저는 /lobby로 리다이렉트', async () => {
		makeSelectChain([{ banStart: null, banEnd: null, banReason: null }]);
		await expect(load(makeEvent({ id: 'user-1' }))).rejects.toMatchObject({ location: '/lobby' });
		expect(redirect).toHaveBeenCalledWith(302, '/lobby');
	});

	it('밴 기간이 지난 유저는 /lobby로 리다이렉트', async () => {
		const pastDate = new Date(Date.now() - 1000);
		makeSelectChain([{ banStart: new Date(), banEnd: pastDate, banReason: '이유' }]);
		await expect(load(makeEvent({ id: 'user-1' }))).rejects.toMatchObject({ location: '/lobby' });
	});

	it('유효한 밴인 경우 밴 정보 반환', async () => {
		const futureDate = new Date(Date.now() + 86400000);
		const startDate = new Date();
		makeSelectChain([{ banStart: startDate, banEnd: futureDate, banReason: '규칙 위반' }]);
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, unknown>;
		expect(result).toMatchObject({
			banEnd: futureDate.toISOString().split('T')[0],
			banReason: '규칙 위반'
		});
	});

	it('banStart가 없으면 banStart는 null 반환', async () => {
		const futureDate = new Date(Date.now() + 86400000);
		makeSelectChain([{ banStart: null, banEnd: futureDate, banReason: '이유' }]);
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, unknown>;
		expect(result.banStart).toBeNull();
	});
});

describe('banned signout action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('signout 후 /login으로 리다이렉트', async () => {
		await expect(actions.signout(makeEvent({ id: 'user-1' }))).rejects.toMatchObject({
			location: '/login'
		});
		expect(redirect).toHaveBeenCalledWith(303, '/login');
	});
});
