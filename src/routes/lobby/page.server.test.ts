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
		select: vi.fn(),
		insert: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	room: {
		id: 'id',
		name: 'name',
		icon: 'icon',
		maxPlayers: 'max_players',
		status: 'status',
		createdAt: 'created_at'
	},
	roomPlayer: { id: 'id', roomId: 'room_id', userId: 'user_id' }
}));

vi.mock('drizzle-orm', () => ({
	count: vi.fn(() => 'count(*)'),
	eq: vi.fn()
}));

import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { load, actions } from './+page.server';

function makeEvent(user?: object, fields: Record<string, string> = {}) {
	const formData = new FormData();
	for (const [k, v] of Object.entries(fields)) formData.set(k, v);
	return {
		locals: { user },
		request: { formData: () => Promise.resolve(formData) }
	} as never;
}

function makeSelectChain(result: unknown[]) {
	const chain = {
		from: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		groupBy: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockResolvedValue(result)
	};
	vi.mocked(db.select).mockReturnValue(chain as never);
	return chain;
}

function makeInsertChain(returningResult: unknown[] = [{ id: 'new-room-id' }]) {
	const chain = {
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue(returningResult)
	};
	vi.mocked(db.insert).mockReturnValue(chain as never);
	return chain;
}

describe('lobby load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(load(makeEvent())).rejects.toMatchObject({ location: '/login' });
		expect(redirect).toHaveBeenCalledWith(303, '/login');
	});

	it('로그인 상태면 lobbies 반환', async () => {
		makeSelectChain([
			{
				id: 'room-1',
				name: '방1',
				icon: 'swords',
				maxPlayers: 4,
				status: 'waiting',
				currentPlayers: 2
			}
		]);

		const result = await load(makeEvent({ id: 'user-1' }));
		expect(result).toHaveProperty('lobbies');
		expect(result.lobbies).toHaveLength(1);
	});

	it('빈 방 목록도 정상 반환', async () => {
		makeSelectChain([]);
		const result = await load(makeEvent({ id: 'user-1' }));
		expect(result.lobbies).toEqual([]);
	});
});

describe('lobby createRoom action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(actions.createRoom(makeEvent())).rejects.toMatchObject({ location: '/login' });
	});

	it('이름이 없으면 fail 400', async () => {
		const result = await actions.createRoom(
			makeEvent({ id: 'user-1' }, { icon: 'swords', maxPlayers: '4' })
		);
		expect(fail).toHaveBeenCalledWith(400, expect.objectContaining({ error: expect.any(String) }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('이름이 공백만 있으면 fail 400', async () => {
		const result = await actions.createRoom(makeEvent({ id: 'user-1' }, { name: '   ' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('방 생성 성공 시 /room/:id로 리다이렉트', async () => {
		const insertChain = makeInsertChain([{ id: 'new-room-id' }]);

		// second insert for roomPlayer
		const playerChain = { values: vi.fn().mockResolvedValue([]) };
		vi.mocked(db.insert)
			.mockReturnValueOnce(insertChain as never)
			.mockReturnValueOnce(playerChain as never);

		await expect(
			actions.createRoom(
				makeEvent({ id: 'user-1' }, { name: '테스트 방', icon: 'swords', maxPlayers: '4' })
			)
		).rejects.toMatchObject({ location: '/room/new-room-id' });

		expect(redirect).toHaveBeenCalledWith(303, '/room/new-room-id');
	});

	it('maxPlayers가 없으면 기본값 4 사용', async () => {
		const insertChain = makeInsertChain([{ id: 'room-id' }]);
		const playerChain = { values: vi.fn().mockResolvedValue([]) };
		vi.mocked(db.insert)
			.mockReturnValueOnce(insertChain as never)
			.mockReturnValueOnce(playerChain as never);

		await expect(
			actions.createRoom(makeEvent({ id: 'user-1' }, { name: '방' }))
		).rejects.toMatchObject({ location: '/room/room-id' });
	});
});
