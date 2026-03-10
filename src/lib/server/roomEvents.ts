import { db } from '$lib/server/db';
import { roomPlayer } from '$lib/server/db/schema';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { emitRoomEvent } from '$lib/server/roomStore';

export async function emitPlayers(roomId: string): Promise<void> {
	const playerRecords = await db
		.select({ userId: roomPlayer.userId, name: user.name })
		.from(roomPlayer)
		.innerJoin(user, eq(roomPlayer.userId, user.id))
		.where(eq(roomPlayer.roomId, roomId));

	emitRoomEvent(roomId, {
		type: 'players',
		players: playerRecords.map((p) => ({ id: p.userId, name: p.name }))
	});
}
