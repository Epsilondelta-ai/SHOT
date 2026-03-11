import { WS_BACKEND_URL } from '$lib/config';
import type { GameSnapshot, GameAction } from '$lib/types/game';

type GameSocketCallbacks = {
	onGameState?: (snapshot: GameSnapshot) => void;
	onError?: () => void;
};

type GameSocketOptions = {
	spectator?: boolean;
};

export function createGameSocket(
	roomId: string,
	callbacks: GameSocketCallbacks,
	options: GameSocketOptions = {}
) {
	let ws: WebSocket | null = null;
	let isSpectator = options.spectator ?? false;

	function connect() {
		const spectatorQuery = isSpectator ? '?spectator=1' : '';
		ws = new WebSocket(`${WS_BACKEND_URL}/ws/game/${roomId}${spectatorQuery}`);

		ws.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data as string);
				if (msg.type === 'game_state') {
					callbacks.onGameState?.(msg.snapshot as GameSnapshot);
				} else if (msg.type === 'error') {
					callbacks.onError?.();
				}
			} catch {
				// ignore parse errors
			}
		};

		ws.onerror = () => {
			callbacks.onError?.();
		};

		ws.onclose = () => {
			// Do not auto-reconnect; let the component handle it
		};
	}

	function sendAction(action: GameAction) {
		if (isSpectator) return;
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(action));
		}
	}

	function close() {
		ws?.close();
		ws = null;
	}

	connect();

	return { sendAction, close };
}
