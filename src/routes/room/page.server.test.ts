import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status: number, location: string) => {
		const err = Object.assign(new Error('redirect'), { status, location });
		throw err;
	}),
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
	room: { id: 'id', name: 'name' },
	roomPlayer: { id: 'id', roomId: 'room_id', userId: 'user_id' },
	user: { id: 'id', name: 'name' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { load } from './[id]/+page.server';

let selectCallCount = 0;

function makeSelectChain(results: unknown[][]) {
	selectCallCount = 0;
	vi.mocked(db.select).mockImplementation(() => {
		const idx = selectCallCount++;
		const result = results[idx] ?? [];
		return {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue(result),
			innerJoin: vi.fn().mockReturnThis()
		} as never;
	});
}

function makeEvent(user?: { id: string }, params: Record<string, string> = { id: 'room-1' }) {
	return {
		locals: { user },
		params
	} as never;
}

describe('room page load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(load(makeEvent())).rejects.toMatchObject({ location: '/login' });
		expect(redirect).toHaveBeenCalledWith(303, '/login');
	});

	it('방이 없으면 404 에러', async () => {
		makeSelectChain([[], []]);
		await expect(load(makeEvent({ id: 'user-1' }))).rejects.toMatchObject({ status: 404 });
		expect(error).toHaveBeenCalledWith(404, 'Room not found');
	});

	it('방이 있으면 방 정보 반환', async () => {
		const roomData = { id: 'room-1', name: '테스트 방', maxPlayers: 4 };
		const players = [
			{ userId: 'user-1', name: '플레이어1' },
			{ userId: 'user-2', name: '플레이어2' }
		];

		makeSelectChain([[roomData], players]);

		const result = (await load(makeEvent({ id: 'user-1' }, { id: 'room-1' }))) as Record<string, any>;
		expect(result).toMatchObject({
			roomName: '테스트 방',
			maxPlayers: 4,
			myId: 'user-1'
		});
		expect(result.players).toHaveLength(2);
	});

	it('방 코드는 id의 앞 6자리 대문자', async () => {
		const roomData = { id: 'abcdef123456', name: '방', maxPlayers: 4 };
		makeSelectChain([[roomData], []]);
		const result = (await load(makeEvent({ id: 'user-1' }, { id: 'abcdef123456' }))) as Record<string, any>;
		expect(result.roomCode).toBe('ABCDEF');
	});

	it('플레이어가 없으면 hostId는 빈 문자열', async () => {
		const roomData = { id: 'room-1', name: '방', maxPlayers: 4 };
		makeSelectChain([[roomData], []]);
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, any>;
		expect(result.hostId).toBe('');
	});

	it('플레이어가 있으면 첫 번째 플레이어가 host', async () => {
		const roomData = { id: 'room-1', name: '방', maxPlayers: 4 };
		const players = [{ userId: 'host-id', name: '호스트' }];
		makeSelectChain([[roomData], players]);
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, any>;
		expect(result.hostId).toBe('host-id');
	});
});
