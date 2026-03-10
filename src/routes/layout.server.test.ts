import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	user: { id: 'id', role: 'role' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { db } from '$lib/server/db';
import { load } from './+layout.server';

function makeSelectChain(result: unknown[]) {
	const chain = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue(result)
	};
	vi.mocked(db.select).mockReturnValue(chain as never);
	return chain;
}

function makeEvent(user?: { id: string; name?: string; image?: string }) {
	return { locals: { user } } as never;
}

describe('layout load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 isAdmin false와 빈 username 반환', async () => {
		const result = await load(makeEvent());
		expect(result).toEqual({ username: '', avatarSrc: '', isAdmin: false });
	});

	it('로그인 상태이고 admin role이면 isAdmin true 반환', async () => {
		makeSelectChain([{ role: 'admin' }]);
		const result = await load(makeEvent({ id: 'user-1', name: '관리자', image: '/img.png' }));
		expect(result).toEqual({ username: '관리자', avatarSrc: '/img.png', isAdmin: true });
	});

	it('로그인 상태이고 user role이면 isAdmin false 반환', async () => {
		makeSelectChain([{ role: 'user' }]);
		const result = await load(makeEvent({ id: 'user-1', name: '일반유저' }));
		expect(result).toEqual({ username: '일반유저', avatarSrc: '', isAdmin: false });
	});

	it('DB에서 유저를 찾지 못하면 isAdmin false 반환', async () => {
		makeSelectChain([]);
		const result = await load(makeEvent({ id: 'user-1', name: '테스트' }));
		expect(result).toEqual({ username: '테스트', avatarSrc: '', isAdmin: false });
	});

	it('image가 없으면 avatarSrc는 빈 문자열', async () => {
		makeSelectChain([{ role: 'user' }]);
		const result = (await load(makeEvent({ id: 'user-1', name: '이름' }))) as Record<
			string,
			unknown
		>;
		expect(result.avatarSrc).toBe('');
	});
});
