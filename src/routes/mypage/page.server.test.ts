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
		update: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	user: { id: 'id', name: 'name', image: 'image' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { load, actions } from './+page.server';

function makeUpdateChain() {
	const chain = {
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue([])
	};
	vi.mocked(db.update).mockReturnValue(chain as never);
	return chain;
}

function makeEvent(
	user?: { id: string; name: string; image?: string },
	fields: Record<string, string | File> = {}
) {
	const formData = new FormData();
	for (const [k, v] of Object.entries(fields)) {
		if (typeof v === 'string') formData.set(k, v);
		else formData.set(k, v);
	}
	return {
		locals: { user },
		request: { formData: () => Promise.resolve(formData) }
	} as never;
}

describe('mypage load', () => {
	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(load(makeEvent())).rejects.toMatchObject({ location: '/login' });
		expect(redirect).toHaveBeenCalledWith(303, '/login');
	});

	it('로그인 상태면 사용자 정보 반환', async () => {
		const result = await load(makeEvent({ id: 'user-1', name: '홍길동', image: '/img.png' }));
		expect(result).toMatchObject({
			username: '홍길동',
			avatarSrc: '/img.png',
			recentMatches: [],
			stats: { games: 0, wins: 0, streak: 0 }
		});
	});

	it('image가 없으면 avatarSrc는 빈 문자열', async () => {
		const result = await load(makeEvent({ id: 'user-1', name: '이름' }));
		expect(result.avatarSrc).toBe('');
	});
});

describe('mypage updateProfile action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 fail 401', async () => {
		const result = await actions.updateProfile(makeEvent());
		expect(fail).toHaveBeenCalledWith(401, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 401 });
	});

	it('이름이 없으면 fail 400', async () => {
		const result = await actions.updateProfile(makeEvent({ id: 'user-1', name: '기존이름' }));
		expect(fail).toHaveBeenCalledWith(400, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('이름이 공백만 있으면 fail 400', async () => {
		const result = await actions.updateProfile(
			makeEvent({ id: 'user-1', name: '기존이름' }, { name: '   ' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('이름만 있을 때 업데이트 성공', async () => {
		makeUpdateChain();
		const result = await actions.updateProfile(
			makeEvent({ id: 'user-1', name: '기존이름' }, { name: '새이름' })
		);
		expect(result).toEqual({ success: true });
	});

	it('이미지 파일이 있을 때 base64로 변환하여 업데이트', async () => {
		makeUpdateChain();
		const file = new File(['image data'], 'avatar.png', { type: 'image/png' });
		const formData = new FormData();
		formData.set('name', '새이름');
		formData.set('image', file);
		const event = {
			locals: { user: { id: 'user-1', name: '기존이름' } },
			request: { formData: () => Promise.resolve(formData) }
		} as never;
		const result = await actions.updateProfile(event);
		expect(result).toEqual({ success: true });
	});
});
