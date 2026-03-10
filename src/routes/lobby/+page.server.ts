import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { room, roomPlayer } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	const lobbies = await db
		.select({
			id: room.id,
			name: room.name,
			icon: room.icon,
			maxPlayers: room.maxPlayers,
			status: room.status,
			currentPlayers: count(roomPlayer.id)
		})
		.from(room)
		.leftJoin(roomPlayer, eq(room.id, roomPlayer.roomId))
		.groupBy(room.id)
		.orderBy(room.createdAt);

	return { lobbies };
};
