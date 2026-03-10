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
	assistant: {
		id: 'id',
		userId: 'user_id',
		name: 'name',
		prompt: 'prompt',
		active: 'active',
		createdAt: 'created_at',
		updatedAt: 'updated_at'
	},
	bot: {
		id: 'id',
		name: 'name',
		apiKey: 'api_key',
		active: 'active',
		createdAt: 'created_at',
		updatedAt: 'updated_at'
	}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { load, actions } from './+page.server';

const NOW = new Date('2024-01-01T00:00:00.000Z');

function makeSelectChain(results: unknown[][]) {
	let callCount = 0;
	vi.mocked(db.select).mockImplementation(() => {
		const idx = callCount++;
		const result = results[idx] ?? [];
		return {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockResolvedValue(result)
		} as never;
	});
}

function makeInsertChain() {
	const chain = { values: vi.fn().mockResolvedValue([]) };
	vi.mocked(db.insert).mockReturnValue(chain as never);
	return chain;
}

function makeUpdateChain() {
	const chain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) };
	vi.mocked(db.update).mockReturnValue(chain as never);
	return chain;
}

function makeDeleteChain() {
	const chain = { where: vi.fn().mockResolvedValue([]) };
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

const mockAssistant = {
	id: 'a-1',
	name: '어시스턴트',
	prompt: '프롬프트',
	active: true,
	createdAt: NOW,
	updatedAt: NOW,
	userId: 'user-1'
};
const mockBot = {
	id: 'b-1',
	name: '봇',
	apiKey: 'key',
	active: true,
	createdAt: NOW,
	updatedAt: NOW
};

describe('config load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(load(makeEvent())).rejects.toMatchObject({ location: '/login' });
		expect(redirect).toHaveBeenCalledWith(303, '/login');
	});

	it('로그인 상태면 assistants와 bots 반환', async () => {
		makeSelectChain([[mockAssistant], [mockBot]]);
		const result = (await load(makeEvent({ id: 'user-1' }))) as Record<string, any>;
		expect(result.assistants).toHaveLength(1);
		expect(result.bots).toHaveLength(1);
		expect(result.assistants[0]).toMatchObject({ id: 'a-1', name: '어시스턴트' });
		expect(result.bots[0]).toMatchObject({ id: 'b-1', name: '봇' });
	});
});

describe('config createAssistant action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('비로그인 상태면 /login으로 리다이렉트', async () => {
		await expect(actions.createAssistant(makeEvent())).rejects.toMatchObject({
			location: '/login'
		});
	});

	it('name이 없으면 fail 400', async () => {
		const result = await actions.createAssistant(
			makeEvent({ id: 'user-1' }, { prompt: '프롬프트' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('prompt가 없으면 fail 400', async () => {
		const result = await actions.createAssistant(makeEvent({ id: 'user-1' }, { name: '이름' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeInsertChain();
		const result = await actions.createAssistant(
			makeEvent({ id: 'user-1' }, { name: '이름', prompt: '프롬프트', active: 'true' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('config updateAssistant action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		const result = await actions.updateAssistant(
			makeEvent({ id: 'user-1' }, { name: '이름', prompt: '프롬프트' })
		);
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeUpdateChain();
		const result = await actions.updateAssistant(
			makeEvent({}, { id: 'a-1', name: '이름', prompt: '프롬프트', active: 'true' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('config deleteAssistant action', () => {
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

describe('config createBot action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('name이 없으면 fail 400', async () => {
		const result = await actions.createBot(makeEvent({}, { apiKey: 'key' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('apiKey가 없으면 fail 400', async () => {
		const result = await actions.createBot(makeEvent({}, { name: '봇' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeInsertChain();
		const result = await actions.createBot(
			makeEvent({}, { name: '봇', apiKey: 'key', active: 'true' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('config updateBot action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		const result = await actions.updateBot(makeEvent({}, { name: '봇', apiKey: 'key' }));
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeUpdateChain();
		const result = await actions.updateBot(
			makeEvent({}, { id: 'b-1', name: '봇', apiKey: 'key', active: 'false' })
		);
		expect(result).toEqual({ success: true });
	});
});

describe('config deleteBot action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('id가 없으면 fail 400', async () => {
		const result = await actions.deleteBot(makeEvent());
		expect(result).toMatchObject({ status: 400 });
	});

	it('정상 입력이면 success 반환', async () => {
		makeDeleteChain();
		const result = await actions.deleteBot(makeEvent({}, { id: 'b-1' }));
		expect(result).toEqual({ success: true });
	});
});
