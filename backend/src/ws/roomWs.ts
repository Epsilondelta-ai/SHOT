import Elysia from 'elysia';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { room, roomPlayer, session } from '../db/schema';
import { getSerializedRoomPlayers } from '../lib/roomPlayers';

type RoomMessage =
	| { type: 'chat'; text: string }
	| { type: 'kick'; targetPlayerId: string };

// roomId → Set of ws ids
const roomSockets = new Map<string, Set<string>>();
// ws id → ws object (any to avoid circular type issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsById = new Map<string, any>();

function broadcast(roomId: string, payload: unknown, excludeId?: string) {
	const ids = roomSockets.get(roomId);
	if (!ids) return;
	const data = JSON.stringify(payload);
	for (const id of ids) {
		if (id !== excludeId) wsById.get(id)?.send(data);
	}
}

export async function broadcastPlayers(roomId: string) {
	const players = await getSerializedRoomPlayers(roomId);
	if (players.length === 0) return;

	const payload = JSON.stringify({
		type: 'players',
		players
	});

	const ids = roomSockets.get(roomId);
	if (!ids) return;
	for (const id of ids) wsById.get(id)?.send(payload);
}

export const roomWsPlugin = new Elysia()
	.ws('/ws/room/:roomId', {
		async upgrade({ params, request, set }) {
			// Extract session token from cookie
			const rawCookie = request.headers.get('cookie') ?? '';
			const tokenMatch = rawCookie.match(/better-auth\.session_token=([^;]+)/);
			if (!tokenMatch) {
				set.status = 401;
				return;
			}

			const sess = await db.query.session.findFirst({
				where: eq(session.token, decodeURIComponent(tokenMatch[1])),
				with: { user: true }
			});
			if (!sess) {
				set.status = 401;
				return;
			}

			return {
				userId: sess.userId,
				userName: sess.user.name,
				roomId: params.roomId
			};
		},

		open(ws) {
			const { roomId, userId } = (ws.data as unknown) as { roomId: string; userId: string; userName: string };
			const wsId = `${roomId}:${userId}:${Date.now()}`;
			(ws as unknown as { _id: string })._id = wsId;
			wsById.set(wsId, ws);

			if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
			roomSockets.get(roomId)!.add(wsId);

			broadcastPlayers(roomId);
		},

		async message(ws, rawMessage) {
			const { roomId, userId, userName } = ws.data as {
				roomId: string;
				userId: string;
				userName: string;
			};

			let msg: RoomMessage;
			try {
				const text = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
				msg = JSON.parse(text);
			} catch {
				return;
			}

			if (msg.type === 'chat') {
				broadcast(roomId, {
					type: 'chat',
					userId,
					userName,
					text: msg.text,
					timestamp: Date.now()
				});
			} else if (msg.type === 'kick') {
				const players = await db.query.roomPlayer.findMany({
					where: eq(roomPlayer.roomId, roomId)
				});
				if (players[0]?.userId !== userId) return;

				const [targetPlayer] = players.filter((player) => player.id === msg.targetPlayerId);
				if (!targetPlayer) return;

				await db.delete(roomPlayer).where(and(eq(roomPlayer.roomId, roomId), eq(roomPlayer.id, msg.targetPlayerId)));

				broadcast(roomId, { type: 'kicked', playerId: msg.targetPlayerId, userId: targetPlayer.userId });
				await broadcastPlayers(roomId);
			}
		},

		async close(ws) {
			const { roomId, userId } = (ws.data as unknown) as { roomId: string; userId: string };
			const wsId = (ws as unknown as { _id: string })._id;

			roomSockets.get(roomId)?.delete(wsId);
			wsById.delete(wsId);
			if (roomSockets.get(roomId)?.size === 0) roomSockets.delete(roomId);

			await db
				.delete(roomPlayer)
				.where(and(eq(roomPlayer.roomId, roomId), eq(roomPlayer.userId, userId)));

			const remaining = await db.query.roomPlayer.findMany({
				where: eq(roomPlayer.roomId, roomId)
			});

			if (!remaining.some((player) => player.playerType === 'human')) {
				await db.delete(room).where(eq(room.id, roomId));
			} else {
				await broadcastPlayers(roomId);
			}
		}
	});
