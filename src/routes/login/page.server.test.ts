import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
	fail: vi.fn((status: number, data: Record<string, unknown>) => ({ status, data })),
	redirect: vi.fn((status: number, location: string) => {
		const err = Object.assign(new Error('redirect'), { status, location });
		throw err;
	})
}));

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			signInEmail: vi.fn()
		}
	}
}));

import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { actions, load } from './+page.server';

function makeEvent(fields: Record<string, string>, user?: object) {
	const formData = new FormData();
	for (const [k, v] of Object.entries(fields)) formData.set(k, v);
	return {
		request: { formData: () => Promise.resolve(formData) },
		locals: { user }
	} as never;
}

describe('login load', () => {
	it('로그인 상태면 /lobby로 리다이렉트', async () => {
		await expect(load(makeEvent({}, { id: '1' }))).rejects.toMatchObject({
			location: '/lobby'
		});
		expect(redirect).toHaveBeenCalledWith(303, '/lobby');
	});

	it('비로그인 상태면 아무것도 반환하지 않음', async () => {
		const result = await load(makeEvent({}));
		expect(result).toBeUndefined();
	});
});

describe('login action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('이메일이 없으면 fail 400', async () => {
		const result = await actions.default(makeEvent({ password: 'pass123' }));
		expect(fail).toHaveBeenCalledWith(400, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('비밀번호가 없으면 fail 400', async () => {
		const result = await actions.default(makeEvent({ email: 'test@example.com' }));
		expect(fail).toHaveBeenCalledWith(400, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('로그인 성공 시 /lobby로 리다이렉트', async () => {
		vi.mocked(auth.api.signInEmail).mockResolvedValueOnce(
			new Response(null, { status: 200 }) as never
		);

		await expect(
			actions.default(makeEvent({ email: 'test@example.com', password: 'pass123' }))
		).rejects.toMatchObject({ location: '/lobby' });

		expect(redirect).toHaveBeenCalledWith(303, '/lobby');
	});

	it('로그인 실패 시 fail 반환', async () => {
		vi.mocked(auth.api.signInEmail).mockResolvedValueOnce(
			new Response(JSON.stringify({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' }), {
				status: 401
			}) as never
		);

		const result = await actions.default(
			makeEvent({ email: 'test@example.com', password: 'wrong' })
		);
		expect(fail).toHaveBeenCalledWith(401, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 401 });
	});
});
