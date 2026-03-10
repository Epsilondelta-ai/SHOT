import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock $lib/config before importing module
vi.mock('$lib/config', () => ({
	WS_BACKEND_URL: 'ws://test-backend'
}));

// Mock WebSocket
class MockWebSocket {
	static OPEN = 1;
	static CONNECTING = 0;
	static CLOSING = 2;
	static CLOSED = 3;

	readyState: number = MockWebSocket.OPEN;
	url: string;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onclose: (() => void) | null = null;
	sent: string[] = [];

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
	}

	send(data: string) {
		this.sent.push(data);
	}

	close() {
		this.readyState = MockWebSocket.CLOSED;
	}

	static instances: MockWebSocket[] = [];
	static reset() {
		this.instances = [];
	}
}

vi.stubGlobal('WebSocket', MockWebSocket);
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });

import { createRoomSocket } from './roomSocket.svelte';

beforeEach(() => {
	MockWebSocket.reset();
});

describe('createRoomSocket', () => {
	it('connects to correct WS URL on creation', () => {
		createRoomSocket('room-123', {});
		expect(MockWebSocket.instances).toHaveLength(1);
		expect(MockWebSocket.instances[0].url).toBe('ws://test-backend/ws/room/room-123');
	});

	it('calls onPlayers callback when players message received', () => {
		const onPlayers = vi.fn();
		createRoomSocket('room-1', { onPlayers });

		const ws = MockWebSocket.instances[0];
		ws.onmessage?.({
			data: JSON.stringify({
				type: 'players',
				room: { hostUserId: 'u1', maxPlayers: 5, status: 'in_progress' },
				players: [
					{
						id: '1',
						userId: 'u1',
						name: 'Alice',
						avatarSrc: null,
						type: 'human',
						canManageBots: true,
						assistantId: null,
						assistantName: null,
						llmModelId: null,
						modelName: null,
						botId: null,
						ready: false
					}
				]
			})
		} as MessageEvent);

		expect(onPlayers).toHaveBeenCalledWith(
			[
				{
					id: '1',
					userId: 'u1',
					name: 'Alice',
					avatarSrc: null,
					type: 'human',
					canManageBots: true,
					assistantId: null,
					assistantName: null,
					llmModelId: null,
					modelName: null,
					botId: null,
					ready: false
				}
			],
			{ hostUserId: 'u1', maxPlayers: 5, status: 'in_progress' }
		);
	});

	it('calls onChat callback when chat message received', () => {
		const onChat = vi.fn();
		createRoomSocket('room-1', { onChat });

		const ws = MockWebSocket.instances[0];
		ws.onmessage?.({
			data: JSON.stringify({ type: 'chat', userName: 'Bob', text: 'hello' })
		} as MessageEvent);

		expect(onChat).toHaveBeenCalledWith({
			id: 'test-uuid',
			sender: 'Bob',
			text: ' hello'
		});
	});

	it('calls onKicked callback when kicked message received', () => {
		const onKicked = vi.fn();
		createRoomSocket('room-1', { onKicked });

		const ws = MockWebSocket.instances[0];
		ws.onmessage?.({
			data: JSON.stringify({ type: 'kicked', playerId: 'player-2', userId: 'u2' })
		} as MessageEvent);

		expect(onKicked).toHaveBeenCalledWith({ playerId: 'player-2', userId: 'u2' });
	});

	it('ignores malformed JSON messages', () => {
		const onPlayers = vi.fn();
		createRoomSocket('room-1', { onPlayers });

		const ws = MockWebSocket.instances[0];
		expect(() => ws.onmessage?.({ data: 'not-json' } as MessageEvent)).not.toThrow();
		expect(onPlayers).not.toHaveBeenCalled();
	});

	it('sendChat sends correct message when WS is open', () => {
		const socket = createRoomSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		socket.sendChat('Hello!');
		expect(ws.sent).toContain(JSON.stringify({ type: 'chat', text: 'Hello!' }));
	});

	it('sendKick sends correct message when WS is open', () => {
		const socket = createRoomSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		socket.sendKick('player-99');
		expect(ws.sent).toContain(JSON.stringify({ type: 'kick', targetPlayerId: 'player-99' }));
	});

	it('sendReady sends correct message when WS is open', () => {
		const socket = createRoomSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		socket.sendReady(true);
		expect(ws.sent).toContain(JSON.stringify({ type: 'ready', ready: true }));
	});

	it('does not send when WS is not open', () => {
		const socket = createRoomSocket('room-1', {});
		const ws = MockWebSocket.instances[0];
		ws.readyState = MockWebSocket.CLOSED;

		socket.sendChat('hello');
		expect(ws.sent).toHaveLength(0);
	});

	it('close() closes the WebSocket', () => {
		const socket = createRoomSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		socket.close();
		expect(ws.readyState).toBe(MockWebSocket.CLOSED);
	});

	it('does not throw when callbacks are not provided', () => {
		createRoomSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		expect(() => {
			ws.onmessage?.({ data: JSON.stringify({ type: 'players', players: [] }) } as MessageEvent);
			ws.onmessage?.({
				data: JSON.stringify({ type: 'chat', userName: 'X', text: 'y' })
			} as MessageEvent);
			ws.onmessage?.({ data: JSON.stringify({ type: 'kicked', userId: 'u1' }) } as MessageEvent);
		}).not.toThrow();
	});
});
