import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { room, roomPlayer } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import type { Actions } from '@sveltejs/kit';
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

export const actions: Actions = {
	createRoom: async (event) => {
		if (!event.locals.user) redirect(303, '/login');

		const data = await event.request.formData();
		const name = data.get('name') as string;
		const icon = (data.get('icon') as string) || 'swords';
		const maxPlayers = parseInt(data.get('maxPlayers') as string) || 4;

		if (!name?.trim()) return fail(400, { error: 'Name is required' });

		const [newRoom] = await db
			.insert(room)
			.values({ name: name.trim(), icon, maxPlayers })
			.returning({ id: room.id });

		await db.insert(roomPlayer).values({ roomId: newRoom.id, userId: event.locals.user.id });

		redirect(303, `/room/${newRoom.id}`);
	}
};
