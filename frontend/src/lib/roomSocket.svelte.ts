import { WS_BACKEND_URL } from '$lib/config';

type Player = {
	id: string;
	userId: string;
	name: string;
	avatarSrc: string | null;
	type: 'human' | 'llm' | 'bot';
	canManageBots: boolean;
	assistantId: string | null;
	assistantName: string | null;
	llmModelId: string | null;
	modelName: string | null;
	botId: string | null;
	ready: boolean;
};

type ChatMessage = {
	id: string;
	sender: string;
	text: string;
	isSystem?: boolean;
};

type Spectator = {
	userId: string;
	userName: string;
};

type RoomSocketCallbacks = {
	onPlayers?: (
		players: Player[],
		room?: { hostUserId: string; maxPlayers: number; status?: string },
		spectators?: Spectator[]
	) => void;
	onChat?: (message: ChatMessage) => void;
	onKicked?: (payload: { playerId: string; userId: string }) => void;
	onError?: () => void;
};

type RoomSocketOptions = {
	spectator?: boolean;
};

export function createRoomSocket(
	roomId: string,
	callbacks: RoomSocketCallbacks,
	options: RoomSocketOptions = {}
) {
	let ws: WebSocket | null = null;

	function connect() {
		const spectatorQuery = options.spectator ? '?spectator=1' : '';
		ws = new WebSocket(`${WS_BACKEND_URL}/ws/room/${roomId}${spectatorQuery}`);

		ws.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data);
				if (msg.type === 'players') {
					callbacks.onPlayers?.(msg.players, msg.room, msg.spectators);
				} else if (msg.type === 'chat') {
					callbacks.onChat?.({
						id: crypto.randomUUID(),
						sender: msg.userName,
						text: ` ${msg.text}`
					});
				} else if (msg.type === 'kicked') {
					callbacks.onKicked?.({ playerId: msg.playerId, userId: msg.userId });
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

	function send(data: unknown) {
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(data));
		}
	}

	function sendChat(text: string) {
		send({ type: 'chat', text });
	}

	function sendKick(targetPlayerId: string) {
		send({ type: 'kick', targetPlayerId });
	}

	function sendReady(ready: boolean) {
		send({ type: 'ready', ready });
	}

	function close() {
		ws?.close();
		ws = null;
	}

	connect();

	return {
		sendChat,
		sendKick,
		sendReady,
		close
	};
}
