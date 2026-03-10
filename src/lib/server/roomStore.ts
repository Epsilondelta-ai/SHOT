type ChatEntry = {
	id: string;
	userId: string;
	userName: string;
	text: string;
	ts: number;
};

const chats = new Map<string, ChatEntry[]>();

export function getChats(roomId: string): ChatEntry[] {
	return chats.get(roomId) ?? [];
}

export function addChat(roomId: string, entry: ChatEntry): void {
	if (!chats.has(roomId)) chats.set(roomId, []);
	const msgs = chats.get(roomId)!;
	msgs.push(entry);
	if (msgs.length > 100) chats.set(roomId, msgs.slice(-100));
}

export function clearChats(roomId: string): void {
	chats.delete(roomId);
}

// Pub/sub: roomId → set of listeners
type RoomListener = (event: unknown) => void;
const listeners = new Map<string, Set<RoomListener>>();

export function subscribeToRoom(roomId: string, fn: RoomListener): () => void {
	if (!listeners.has(roomId)) listeners.set(roomId, new Set());
	listeners.get(roomId)!.add(fn);
	return () => listeners.get(roomId)?.delete(fn);
}

export function emitRoomEvent(roomId: string, event: unknown): void {
	listeners.get(roomId)?.forEach((fn) => fn(event));
}

// Heartbeat tracking: roomId → userId → lastSeen timestamp
const heartbeats = new Map<string, Map<string, number>>();

export function updateHeartbeat(roomId: string, userId: string): void {
	if (!heartbeats.has(roomId)) heartbeats.set(roomId, new Map());
	heartbeats.get(roomId)!.set(userId, Date.now());
}

export function getStaleUsers(roomId: string, thresholdMs: number): string[] {
	const roomBeats = heartbeats.get(roomId);
	if (!roomBeats) return [];
	const now = Date.now();
	return [...roomBeats.entries()]
		.filter(([, ts]) => now - ts > thresholdMs)
		.map(([userId]) => userId);
}

export function removeHeartbeat(roomId: string, userId: string): void {
	heartbeats.get(roomId)?.delete(userId);
}
