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
	onerror: (() => void) | null = null;
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

import { createGameSocket } from './gameSocket.svelte';

beforeEach(() => {
	MockWebSocket.reset();
});

describe('createGameSocket', () => {
	it('connects to correct WS URL on creation', () => {
		createGameSocket('room-123', {});
		expect(MockWebSocket.instances).toHaveLength(1);
		expect(MockWebSocket.instances[0].url).toBe('ws://test-backend/ws/game/room-123');
	});

	it('appends spectator query when requested', () => {
		createGameSocket('room-123', {}, { spectator: true });
		expect(MockWebSocket.instances).toHaveLength(1);
		expect(MockWebSocket.instances[0].url).toBe('ws://test-backend/ws/game/room-123?spectator=1');
	});

	it('calls onGameState callback when game_state message received', () => {
		const onGameState = vi.fn();
		createGameSocket('room-1', { onGameState });

		const ws = MockWebSocket.instances[0];
		const snapshot = {
			roomId: 'room-1',
			round: 1,
			maxRound: 5,
			currentTurnPlayerId: 'p1',
			viewerMode: 'player',
			myPlayerId: 'p1',
			myTeam: null,
			phase: 'acting',
			remainingChatTurns: 2,
			canReveal: false,
			mustUseAttack: false,
			winnerTeam: null,
			players: [],
			logs: [],
			chatMessages: []
		};

		ws.onmessage?.({
			data: JSON.stringify({ type: 'game_state', snapshot })
		} as MessageEvent);

		expect(onGameState).toHaveBeenCalledWith(snapshot);
	});

	it('calls onError callback when error message received', () => {
		const onError = vi.fn();
		createGameSocket('room-1', { onError });

		const ws = MockWebSocket.instances[0];
		ws.onmessage?.({
			data: JSON.stringify({ type: 'error' })
		} as MessageEvent);

		expect(onError).toHaveBeenCalledTimes(1);
	});

	it('calls onRedirect callback when redirect message received', () => {
		const onRedirect = vi.fn();
		createGameSocket('room-1', { onRedirect });

		const ws = MockWebSocket.instances[0];
		ws.onmessage?.({
			data: JSON.stringify({ type: 'redirect', url: '/results' })
		} as MessageEvent);

		expect(onRedirect).toHaveBeenCalledWith('/results');
	});

	it('calls onError callback when WebSocket onerror fires', () => {
		const onError = vi.fn();
		createGameSocket('room-1', { onError });

		const ws = MockWebSocket.instances[0];
		ws.onerror?.();

		expect(onError).toHaveBeenCalledTimes(1);
	});

	it('ignores malformed JSON messages', () => {
		const onGameState = vi.fn();
		createGameSocket('room-1', { onGameState });

		const ws = MockWebSocket.instances[0];
		expect(() => ws.onmessage?.({ data: 'not-json' } as MessageEvent)).not.toThrow();
		expect(onGameState).not.toHaveBeenCalled();
	});

	it('does not throw when callbacks are not provided', () => {
		createGameSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		expect(() => {
			ws.onmessage?.({ data: JSON.stringify({ type: 'game_state', snapshot: {} }) } as MessageEvent);
			ws.onmessage?.({ data: JSON.stringify({ type: 'error' }) } as MessageEvent);
			ws.onmessage?.({ data: JSON.stringify({ type: 'redirect', url: '/end' }) } as MessageEvent);
			ws.onerror?.();
		}).not.toThrow();
	});

	it('sendAction sends correct message when WS is open', () => {
		const socket = createGameSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		socket.sendAction({ type: 'chat', text: 'hello' });
		expect(ws.sent).toContain(JSON.stringify({ type: 'chat', text: 'hello' }));
	});

	it('sendAction sends end-turn action', () => {
		const socket = createGameSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		socket.sendAction({ type: 'end-turn' });
		expect(ws.sent).toContain(JSON.stringify({ type: 'end-turn' }));
	});

	it('sendAction sends play-card action with targetId', () => {
		const socket = createGameSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		socket.sendAction({ type: 'play-card', card: 'attack', targetId: 'p2' });
		expect(ws.sent).toContain(JSON.stringify({ type: 'play-card', card: 'attack', targetId: 'p2' }));
	});

	it('does not send action when WS is not open', () => {
		const socket = createGameSocket('room-1', {});
		const ws = MockWebSocket.instances[0];
		ws.readyState = MockWebSocket.CLOSED;

		socket.sendAction({ type: 'end-turn' });
		expect(ws.sent).toHaveLength(0);
	});

	it('does not send action when spectator', () => {
		const socket = createGameSocket('room-1', {}, { spectator: true });
		const ws = MockWebSocket.instances[0];

		socket.sendAction({ type: 'end-turn' });
		expect(ws.sent).toHaveLength(0);
	});

	it('close() closes the WebSocket', () => {
		const socket = createGameSocket('room-1', {});
		const ws = MockWebSocket.instances[0];

		socket.close();
		expect(ws.readyState).toBe(MockWebSocket.CLOSED);
	});
});
