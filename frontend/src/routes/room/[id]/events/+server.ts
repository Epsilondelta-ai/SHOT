import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { roomPlayer } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import {
	getStaleUsers,
	removeHeartbeat,
	subscribeToRoom,
	updateHeartbeat
} from '$lib/server/roomStore';
import { emitPlayers } from '$lib/server/roomEvents';

export const GET: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const { id } = event.params;
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			const send = (data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					// connection closed
				}
			};

			// Register heartbeat on connect and send initial player list
			updateHeartbeat(id, event.locals.user!.id);
			emitPlayers(id);

			// Subscribe to room events → push immediately when emitted
			const unsubscribe = subscribeToRoom(id, send);

			// Heartbeat stale check every 10s
			const heartbeatInterval = setInterval(async () => {
				const stale = getStaleUsers(id, 30_000);
				for (const userId of stale) {
					await db
						.delete(roomPlayer)
						.where(and(eq(roomPlayer.roomId, id), eq(roomPlayer.userId, userId)));
					removeHeartbeat(id, userId);
				}
				if (stale.length > 0) {
					await emitPlayers(id);
				}
			}, 10_000);

			event.request.signal.addEventListener('abort', () => {
				unsubscribe();
				clearInterval(heartbeatInterval);
				try {
					controller.close();
				} catch {
					// already closed
				}
			});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
