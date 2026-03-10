import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data: unknown) => ({ body: data })),
	error: vi.fn((status: number, message: string) => {
		const err = Object.assign(new Error(message), { status });
		throw err;
	})
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	user: { id: 'id', role: 'role' },
	banHistory: { id: 'id', userId: 'user_id', createdAt: 'created_at' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn(),
	desc: vi.fn()
}));

import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { GET } from './[userId]/+server';

const NOW = new Date('2024-01-15T00:00:00.000Z');
const LATER = new Date('2024-02-01T00:00:00.000Z');

function makeChain(result: unknown[]) {
	const chain: Record<string, unknown> = {};
	const terminal = vi.fn().mockResolvedValue(result);
	chain.from = vi.fn().mockReturnValue(chain);
	chain.where = vi.fn().mockReturnValue(chain);
	chain.orderBy = vi.fn().mockReturnValue(chain);
	chain.limit = vi.fn().mockReturnValue(chain);
	chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
		terminal().then(resolve, reject);
	return chain;
}

function setupSelectMocks(results: unknown[][]) {
	let callCount = 0;
	vi.mocked(db.select).mockImplementation(() => {
		const idx = callCount++;
		return makeChain(results[idx] ?? []) as never;
	});
}

function makeEvent(
	user?: { id: string },
	params: Record<string, string> = { userId: 'target-user-1' }
) {
	return { locals: { user }, params } as never;
}

describe('GET /api/admin/ban-history/[userId]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 401 에러', async () => {
		await expect(GET(makeEvent())).rejects.toMatchObject({ status: 401 });
		expect(error).toHaveBeenCalledWith(401, 'Unauthorized');
	});

	it('admin이 아니면 403 에러', async () => {
		setupSelectMocks([[{ role: 'user' }]]);
		await expect(GET(makeEvent({ id: 'user-1' }))).rejects.toMatchObject({ status: 403 });
		expect(error).toHaveBeenCalledWith(403, 'Forbidden');
	});

	it('DB에 유저가 없으면 403 에러', async () => {
		setupSelectMocks([[]]);
		await expect(GET(makeEvent({ id: 'user-1' }))).rejects.toMatchObject({ status: 403 });
	});

	it('admin이면 ban history 반환', async () => {
		const banRecord = {
			id: 'bh-1',
			banStart: NOW,
			banEnd: LATER,
			banReason: '규칙 위반',
			unbannedAt: null,
			unbanReason: null,
			createdAt: NOW
		};
		setupSelectMocks([[{ role: 'admin' }], [banRecord]]);
		const result = await GET(makeEvent({ id: 'admin-1' }));
		expect(json).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'bh-1',
					banReason: '규칙 위반',
					unbannedAt: null,
					unbanReason: null
				})
			])
		);
		expect(result).toBeDefined();
	});

	it('빈 ban history도 정상 반환', async () => {
		setupSelectMocks([[{ role: 'admin' }], []]);
		await GET(makeEvent({ id: 'admin-1' }));
		expect(json).toHaveBeenCalledWith([]);
	});

	it('unbannedAt이 있으면 날짜 문자열로 변환', async () => {
		const banRecord = {
			id: 'bh-2',
			banStart: NOW,
			banEnd: LATER,
			banReason: '이유',
			unbannedAt: NOW,
			unbanReason: '용서',
			createdAt: NOW
		};
		setupSelectMocks([[{ role: 'admin' }], [banRecord]]);
		await GET(makeEvent({ id: 'admin-1' }));
		expect(json).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					unbannedAt: NOW.toISOString().split('T')[0],
					unbanReason: '용서'
				})
			])
		);
	});

	it('banStart가 null이면 null 반환', async () => {
		const banRecord = {
			id: 'bh-3',
			banStart: null,
			banEnd: LATER,
			banReason: '이유',
			unbannedAt: null,
			unbanReason: null,
			createdAt: NOW
		};
		setupSelectMocks([[{ role: 'admin' }], [banRecord]]);
		await GET(makeEvent({ id: 'admin-1' }));
		expect(json).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ banStart: null })])
		);
	});
});
