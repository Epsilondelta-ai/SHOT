import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { room, roomPlayer } from '$lib/server/db/schema';
import { and, count, eq } from 'drizzle-orm';
import { emitPlayers } from '$lib/server/roomEvents';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return new Response(null, { status: 204 });
	}

	const { id } = event.params;

	await db
		.delete(roomPlayer)
		.where(and(eq(roomPlayer.roomId, id), eq(roomPlayer.userId, event.locals.user.id)));

	const [{ remaining }] = await db
		.select({ remaining: count(roomPlayer.id) })
		.from(roomPlayer)
		.where(eq(roomPlayer.roomId, id));

	if (remaining === 0) {
		await db.delete(room).where(eq(room.id, id));
	} else {
		await emitPlayers(id);
	}

	return new Response(null, { status: 204 });
};
