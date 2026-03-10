import { WS_BACKEND_URL } from '$lib/config';

type Player = {
	id: string;
	userId: string;
	name: string;
	image: string | null;
};

type ChatMessage = {
	id: string;
	sender: string;
	text: string;
	isSystem?: boolean;
};

type RoomSocketCallbacks = {
	onPlayers?: (players: Player[]) => void;
	onChat?: (message: ChatMessage) => void;
	onKicked?: (userId: string) => void;
};

export function createRoomSocket(roomId: string, callbacks: RoomSocketCallbacks) {
	let ws: WebSocket | null = null;

	function connect() {
		ws = new WebSocket(`${WS_BACKEND_URL}/ws/room/${roomId}`);

		ws.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data);
				if (msg.type === 'players') {
					callbacks.onPlayers?.(msg.players);
				} else if (msg.type === 'chat') {
					callbacks.onChat?.({
						id: crypto.randomUUID(),
						sender: msg.userName,
						text: ` ${msg.text}`
					});
				} else if (msg.type === 'kicked') {
					callbacks.onKicked?.(msg.userId);
				}
			} catch {
				// ignore parse errors
			}
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

	function sendKick(targetUserId: string) {
		send({ type: 'kick', targetUserId });
	}

	function close() {
		ws?.close();
		ws = null;
	}

	connect();

	return {
		sendChat,
		sendKick,
		close
	};
}
