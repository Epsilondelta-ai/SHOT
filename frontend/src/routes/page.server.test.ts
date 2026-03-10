import { describe, it, expect, vi } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status: number, location: string) => {
		const err = Object.assign(new Error('redirect'), { status, location });
		throw err;
	})
}));

import { redirect } from '@sveltejs/kit';
import { load } from './+page.server';

function makeEvent(user?: object) {
	return { locals: { user } } as never;
}

describe('root page load', () => {
	it('로그인 상태면 /lobby로 리다이렉트', async () => {
		await expect(load(makeEvent({ id: '1' }))).rejects.toMatchObject({ location: '/lobby' });
		expect(redirect).toHaveBeenCalledWith(303, '/lobby');
	});

	it('비로그인 상태면 아무것도 반환하지 않음', async () => {
		const result = await load(makeEvent());
		expect(result).toBeUndefined();
	});
});
