import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { room, roomPlayer } from '$lib/server/db/schema';
import { user } from '$lib/server/db/schema';
import { and, count, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { emitPlayers } from '$lib/server/roomEvents';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	const { id } = event.params;

	const [roomData] = await db.select().from(room).where(eq(room.id, id));
	if (!roomData) {
		redirect(303, '/lobby');
	}

	const playerRecords = await db
		.select({ userId: roomPlayer.userId, name: user.name })
		.from(roomPlayer)
		.innerJoin(user, eq(roomPlayer.userId, user.id))
		.where(eq(roomPlayer.roomId, id));

	const isInRoom = playerRecords.some((p) => p.userId === event.locals.user.id);
	if (!isInRoom) {
		if (playerRecords.length >= roomData.maxPlayers) {
			redirect(303, '/lobby');
		}
		await db.insert(roomPlayer).values({ roomId: id, userId: event.locals.user.id });
		await emitPlayers(id);
		playerRecords.push({ userId: event.locals.user.id, name: event.locals.user.name });
	}

	const players = playerRecords.map((p) => ({
		id: p.userId,
		name: p.name,
		ready: false
	}));

	return {
		roomId: roomData.id,
		roomName: roomData.name,
		roomCode: roomData.id.slice(0, 6).toUpperCase(),
		maxPlayers: roomData.maxPlayers,
		myId: event.locals.user.id,
		hostId: players[0]?.id ?? '',
		players,
		chatMessages: [] as { id: string; sender: string; text: string; isSystem?: boolean }[]
	};
};

export const actions: Actions = {
	leaveRoom: async (event) => {
		if (!event.locals.user) redirect(303, '/login');

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

		redirect(303, '/lobby');
	}
};
