import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { room, roomPlayer } from '$lib/server/db/schema';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	const { id } = event.params;

	const [roomData] = await db.select().from(room).where(eq(room.id, id));
	if (!roomData) {
		error(404, 'Room not found');
	}

	const playerRecords = await db
		.select({ userId: roomPlayer.userId, name: user.name })
		.from(roomPlayer)
		.innerJoin(user, eq(roomPlayer.userId, user.id))
		.where(eq(roomPlayer.roomId, id));

	const players = playerRecords.map((p) => ({
		id: p.userId,
		name: p.name,
		ready: false
	}));

	return {
		roomName: roomData.name,
		roomCode: roomData.id.slice(0, 6).toUpperCase(),
		maxPlayers: roomData.maxPlayers,
		myId: event.locals.user.id,
		hostId: players[0]?.id ?? '',
		players,
		chatMessages: [] as { id: string; sender: string; text: string; isSystem?: boolean }[]
	};
};
