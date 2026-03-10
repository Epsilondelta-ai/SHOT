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
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	user: {
		id: 'id',
		role: 'role',
		name: 'name',
		email: 'email',
		createdAt: 'created_at',
		lastSeenAt: 'last_seen_at',
		banStart: 'ban_start',
		banEnd: 'ban_end',
		banReason: 'ban_reason'
	},
	room: {
		id: 'id',
		name: 'name',
		maxPlayers: 'max_players',
		status: 'status',
		createdAt: 'created_at'
	},
	roomPlayer: { id: 'id', roomId: 'room_id' },
	assistant: {
		id: 'id',
		userId: 'user_id',
		name: 'name',
		prompt: 'prompt',
		active: 'active',
		createdAt: 'created_at',
		updatedAt: 'updated_at'
	},
	banHistory: { id: 'id', userId: 'user_id', createdAt: 'created_at' },
	llmProvider: {
		provider: 'provider',
		apiKey: 'api_key',
		active: 'active',
		updatedAt: 'updated_at'
	},
	llmModel: {
		id: 'id',
		provider: 'provider',
		apiModelName: 'api_model_name',
		displayName: 'display_name',
		active: 'active',
		createdAt: 'created_at',
		updatedAt: 'updated_at'
	}
}));

vi.mock('drizzle-orm', () => ({
	count: vi.fn(() => 'count(*)'),
	eq: vi.fn(),
	desc: vi.fn(),
	isNull: vi.fn()
}));

import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { load, actions } from './+page.server';

const NOW = new Date('2024-01-15T12:00:00.000Z');

// Shared mock setup helpers
function makeChain(result: unknown[]) {
	const chain: Record<string, unknown> = {};
	const terminal = vi.fn().mockResolvedValue(result);
	chain.from = vi.fn().mockReturnValue(chain);
	chain.where = vi.fn().mockReturnValue(chain);
	chain.leftJoin = vi.fn().mockReturnValue(chain);
	chain.innerJoin = vi.fn().mockReturnValue(chain);
	chain.groupBy = vi.fn().mockReturnValue(chain);
	chain.orderBy = vi.fn().mockReturnValue(chain);
	chain.limit = vi.fn().mockReturnValue(chain);
	// make the chain itself thenable (await-able) using the terminal result
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

function makeThenableChain(resolveValue: unknown = []) {
	const chain: Record<string, unknown> = {};
	const resolver = () => Promise.resolve(resolveValue);
	chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
		resolver().then(resolve, reject);
	chain.values = vi.fn().mockReturnValue(chain);
	chain.onConflictDoUpdate = vi.fn().mockReturnValue(chain);
	chain.returning = vi.fn().mockReturnValue(chain);
	chain.set = vi.fn().mockReturnValue(chain);
	chain.where = vi.fn().mockReturnValue(chain);
	return chain;
}

function makeInsertChain() {
	const chain = makeThenableChain([]);
	vi.mocked(db.insert).mockReturnValue(chain as never);
	return chain;
}

function makeUpdateChain() {
	const chain = makeThenableChain([]);
	vi.mocked(db.update).mockReturnValue(chain as never);
	return chain;
}

function makeDeleteChain() {
	const chain = makeThenableChain([]);
	vi.mocked(db.delete).mockReturnValue(chain as never);
	return chain;
}

function makeEvent(user?: object, fields: Record<string, string> = {}) {
	const formData = new FormData();
	for (const [k, v] of Object.entries(fields)) formData.set(k, v);
	return {
		locals: { user },
		request: { formData: () => Promise.resolve(formData) }
	} as never;
}

// Default full data set for load tests
function setupFullLoadMocks(userRole = 'admin') {
	setupSelectMocks([
		[{ role: userRole }], // getAdminUser - db user check
		[
			{
				id: 'u-1',
				name: '유저',
				email: 'u@e.com',
				role: 'user',
				createdAt: NOW,
				lastSeenAt: NOW,
				banStart: null,
				banEnd: null,
				banReason: null
			}
		], // users
		[{ id: 'r-1', name: '방', currentPlayers: 2, maxPlayers: 4, status: 'waiting' }], // rooms
		[
			{
				id: 'a-1',
				name: '어시스턴트',
				prompt: '프롬프트',
				active: true,
				createdAt: NOW,
				updatedAt: NOW
			}
		], // assistants
		[{ userId: 'u-1', total: 1 }], // banCounts
		[], // llmProviders
		[] // llmModels
	]);
}

describe('admin load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(load(makeEvent())).rejects.toMatchObject({ location: '/login' });
		expect(redirect).toHaveBeenCalledWith(303, '/login');
	});

	it('admin이 아닌 유저는 /로 리다이렉트', async () => {
		setupSelectMocks([[{ role: 'user' }]]);
		await expect(load(makeEvent({ id: 'user-1' }))).rejects.toMatchObject({ location: '/' });
		expect(redirect).toHaveBeenCalledWith(303, '/');
	});

	it('DB에 유저가 없으면 /로 리다이렉트', async () => {
		setupSelectMocks([[]]);
		await expect(load(makeEvent({ id: 'user-1' }))).rejects.toMatchObject({ location: '/' });
	});

	it('admin이면 데이터 반환', async () => {
		setupFullLoadMocks('admin');
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, any>;
		expect(result).toHaveProperty('users');
		expect(result).toHaveProperty('rooms');
		expect(result).toHaveProperty('assistants');
		expect(result).toHaveProperty('llmProviders');
		expect(result).toHaveProperty('llmModels');
	});

	it('llmProviders는 항상 4개 provider 포함', async () => {
		setupFullLoadMocks('admin');
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, any>;
		expect(result.llmProviders).toHaveLength(4);
		const providerNames = result.llmProviders.map((p: { provider: string }) => p.provider);
		expect(providerNames).toContain('anthropic');
		expect(providerNames).toContain('openai');
		expect(providerNames).toContain('google');
		expect(providerNames).toContain('xai');
	});

	it('밴된 유저의 banned 필드가 true', async () => {
		const futureDate = new Date(Date.now() + 86400000);
		setupSelectMocks([
			[{ role: 'admin' }],
			[
				{
					id: 'u-1',
					name: '유저',
					email: 'u@e.com',
					role: 'user',
					createdAt: NOW,
					lastSeenAt: null,
					banStart: NOW,
					banEnd: futureDate,
					banReason: '위반'
				}
			],
			[],
			[],
			[],
			[],
			[]
		]);
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, any>;
		expect(result.users[0].banned).toBe(true);
	});

	it('온라인 유저의 online 필드가 true', async () => {
		const recentTime = new Date(Date.now() - 60000); // 1분 전
		setupSelectMocks([
			[{ role: 'admin' }],
			[
				{
					id: 'u-1',
					name: '유저',
					email: 'u@e.com',
					role: 'user',
					createdAt: NOW,
					lastSeenAt: recentTime,
					banStart: null,
					banEnd: null,
					banReason: null
				}
			],
			[],
			[],
			[],
			[],
			[]
		]);
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, any>;
		expect(result.users[0].online).toBe(true);
	});
});

describe('admin setRole action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(actions.setRole(makeEvent())).rejects.toMatchObject({ location: '/login' });
	});

	it('admin이 아니면 /로 리다이렉트', async () => {
		setupSelectMocks([[{ role: 'user' }]]);
		await expect(actions.setRole(makeEvent({ id: 'u-1' }))).rejects.toMatchObject({
			location: '/'
		});
	});

	it('userId가 없으면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.setRole(makeEvent({ id: 'admin-1' }, { role: 'user' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('유효하지 않은 role이면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.setRole(
			makeEvent({ id: 'admin-1' }, { userId: 'u-1', role: 'superadmin' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('자신의 admin 권한을 제거하려 하면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.setRole(
			makeEvent({ id: 'admin-1' }, { userId: 'admin-1', role: 'user' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		makeUpdateChain();
		const result = await actions.setRole(
			makeEvent({ id: 'admin-1' }, { userId: 'u-1', role: 'admin' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('admin banUser action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		const result = await actions.banUser(
			makeEvent({}, { endAt: '2025-01-01', reason: '규칙 위반' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('endAt이 없으면 fail 400', async () => {
		const result = await actions.banUser(makeEvent({}, { id: 'u-1', reason: '이유' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('reason이 없으면 fail 400', async () => {
		const result = await actions.banUser(makeEvent({}, { id: 'u-1', endAt: '2025-01-01' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeUpdateChain();
		const insertChain = { values: vi.fn().mockResolvedValue([]) };
		vi.mocked(db.insert).mockReturnValue(insertChain as never);
		const result = await actions.banUser(
			makeEvent({}, { id: 'u-1', startAt: '2024-01-01', endAt: '2025-01-01', reason: '규칙 위반' })
		);
		expect(result).toEqual({ success: true });
	});

	it('startAt이 없으면 현재 시간 사용', async () => {
		makeUpdateChain();
		const insertChain = { values: vi.fn().mockResolvedValue([]) };
		vi.mocked(db.insert).mockReturnValue(insertChain as never);
		const result = await actions.banUser(
			makeEvent({}, { id: 'u-1', endAt: '2025-01-01', reason: '이유' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('admin unbanUser action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		const result = await actions.unbanUser(makeEvent({}, { reason: '이유' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('reason이 없으면 fail 400', async () => {
		const result = await actions.unbanUser(makeEvent({}, { id: 'u-1' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환 (최근 banHistory 존재)', async () => {
		const updateChain1 = makeThenableChain([]);
		const updateChain2 = makeThenableChain([]);
		vi.mocked(db.update)
			.mockReturnValueOnce(updateChain1 as never)
			.mockReturnValueOnce(updateChain2 as never);
		setupSelectMocks([[{ id: 'bh-1' }]]);

		const result = await actions.unbanUser(makeEvent({}, { id: 'u-1', reason: '용서' }));
		expect(result).toEqual({ success: true });
	});

	it('banHistory가 없어도 success 반환', async () => {
		const updateChain = makeThenableChain([]);
		vi.mocked(db.update).mockReturnValue(updateChain as never);
		setupSelectMocks([[]]);
		const result = await actions.unbanUser(makeEvent({}, { id: 'u-1', reason: '용서' }));
		expect(result).toEqual({ success: true });
	});
});

describe('admin closeRoom action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		const result = await actions.closeRoom(makeEvent());
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeDeleteChain();
		const result = await actions.closeRoom(makeEvent({}, { id: 'r-1' }));
		expect(result).toEqual({ success: true });
	});
});

describe('admin createAssistant action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('name이 없으면 fail 400', async () => {
		const result = await actions.createAssistant(makeEvent({}, { prompt: '프롬프트' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('prompt가 없으면 fail 400', async () => {
		const result = await actions.createAssistant(makeEvent({}, { name: '이름' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		const insertChain = { values: vi.fn().mockResolvedValue([]) };
		vi.mocked(db.insert).mockReturnValue(insertChain as never);
		const result = await actions.createAssistant(
			makeEvent({}, { name: '이름', prompt: '프롬프트', active: 'true' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('admin updateAssistant action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		const result = await actions.updateAssistant(
			makeEvent({}, { name: '이름', prompt: '프롬프트' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeUpdateChain();
		const result = await actions.updateAssistant(
			makeEvent({}, { id: 'a-1', name: '이름', prompt: '프롬프트', active: 'false' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('admin deleteAssistant action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		const result = await actions.deleteAssistant(makeEvent());
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeDeleteChain();
		const result = await actions.deleteAssistant(makeEvent({}, { id: 'a-1' }));
		expect(result).toEqual({ success: true });
	});
});

describe('admin saveLlmApiKey action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(actions.saveLlmApiKey(makeEvent())).rejects.toMatchObject({ location: '/login' });
	});

	it('유효하지 않은 provider면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.saveLlmApiKey(
			makeEvent({ id: 'admin-1' }, { provider: 'invalid', apiKey: 'key' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('apiKey가 없으면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.saveLlmApiKey(
			makeEvent({ id: 'admin-1' }, { provider: 'openai' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		makeInsertChain();
		const result = await actions.saveLlmApiKey(
			makeEvent({ id: 'admin-1' }, { provider: 'openai', apiKey: 'sk-123' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('admin toggleLlmProvider action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('유효하지 않은 provider면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.toggleLlmProvider(
			makeEvent({ id: 'admin-1' }, { provider: 'bad', active: 'true' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		makeInsertChain();
		const result = await actions.toggleLlmProvider(
			makeEvent({ id: 'admin-1' }, { provider: 'anthropic', active: 'true' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('admin addLlmModel action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('필드가 없으면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.addLlmModel(
			makeEvent({ id: 'admin-1' }, { provider: 'openai', apiModelName: 'gpt-4' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('유효하지 않은 provider면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.addLlmModel(
			makeEvent({ id: 'admin-1' }, { provider: 'bad', apiModelName: 'gpt-4', displayName: 'GPT-4' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const insertChain = { values: vi.fn().mockResolvedValue([]) };
		vi.mocked(db.insert).mockReturnValue(insertChain as never);
		const result = await actions.addLlmModel(
			makeEvent(
				{ id: 'admin-1' },
				{ provider: 'openai', apiModelName: 'gpt-4', displayName: 'GPT-4' }
			)
		);
		expect(result).toEqual({ success: true });
	});
});

describe('admin updateLlmModel action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.updateLlmModel(
			makeEvent({ id: 'admin-1' }, { apiModelName: 'gpt-4', displayName: 'GPT-4' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		makeUpdateChain();
		const result = await actions.updateLlmModel(
			makeEvent({ id: 'admin-1' }, { id: 'm-1', apiModelName: 'gpt-4', displayName: 'GPT-4' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('admin deleteLlmModel action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.deleteLlmModel(makeEvent({ id: 'admin-1' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		makeDeleteChain();
		const result = await actions.deleteLlmModel(makeEvent({ id: 'admin-1' }, { id: 'm-1' }));
		expect(result).toEqual({ success: true });
	});
});

describe('admin toggleLlmModel action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		const result = await actions.toggleLlmModel(makeEvent({ id: 'admin-1' }, { active: 'true' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		setupSelectMocks([[{ role: 'admin' }]]);
		makeUpdateChain();
		const result = await actions.toggleLlmModel(
			makeEvent({ id: 'admin-1' }, { id: 'm-1', active: 'false' })
		);
		expect(result).toEqual({ success: true });
	});
});
