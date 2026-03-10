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
			signUpEmail: vi.fn()
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

const validFields = {
	name: '홍길동',
	email: 'test@example.com',
	password: 'password123',
	confirmPassword: 'password123'
};

describe('signup load', () => {
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

describe('signup action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('필드가 비어있으면 fail 400', async () => {
		const result = await actions.default(makeEvent({}));
		expect(fail).toHaveBeenCalledWith(400, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('이름이 없으면 fail 400', async () => {
		const { name: _, ...rest } = validFields;
		const result = await actions.default(makeEvent(rest));
		expect(result).toMatchObject({ status: 400 });
	});

	it('비밀번호 불일치 시 fail 400', async () => {
		const result = await actions.default(
			makeEvent({ ...validFields, confirmPassword: 'different' })
		);
		expect(fail).toHaveBeenCalledWith(400, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('회원가입 성공 시 /lobby로 리다이렉트', async () => {
		vi.mocked(auth.api.signUpEmail).mockResolvedValueOnce(
			new Response(null, { status: 200 }) as never
		);

		await expect(actions.default(makeEvent(validFields))).rejects.toMatchObject({
			location: '/lobby'
		});
		expect(redirect).toHaveBeenCalledWith(303, '/lobby');
	});

	it('이메일 중복 등 API 실패 시 fail 반환', async () => {
		vi.mocked(auth.api.signUpEmail).mockResolvedValueOnce(
			new Response(JSON.stringify({ message: '이미 사용 중인 이메일입니다.' }), {
				status: 422
			}) as never
		);

		const result = await actions.default(makeEvent(validFields));
		expect(fail).toHaveBeenCalledWith(422, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 422 });
	});

	it('응답 JSON 파싱 실패 시 기본 에러 메시지 사용', async () => {
		vi.mocked(auth.api.signUpEmail).mockResolvedValueOnce(
			new Response('invalid json', { status: 500 }) as never
		);

		const result = await actions.default(makeEvent(validFields));
		expect(fail).toHaveBeenCalledWith(
			500,
			expect.objectContaining({ error: '회원가입에 실패했습니다.' })
		);
		expect(result).toMatchObject({ status: 500 });
	});
});
