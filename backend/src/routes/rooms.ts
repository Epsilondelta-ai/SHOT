import Elysia from 'elysia';
import { db } from '../db';
import { eq, and, count } from 'drizzle-orm';
import { room, roomPlayer, user } from '../db/schema';
import { getUser } from '../lib/getUser';

export const roomRoutes = new Elysia()
	.get('/api/rooms', async () => {
		const rooms = await db
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

		return rooms;
	})

	.post('/api/rooms', async ({ request, set }) => {
		const u = await getUser(request);
		if (!u) {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const body = (await request.json()) as { name: string; icon?: string; maxPlayers?: number };
		if (!body.name?.trim()) {
			set.status = 400;
			return { error: 'Name is required' };
		}

		const [newRoom] = await db
			.insert(room)
			.values({
				name: body.name.trim(),
				icon: body.icon ?? 'swords',
				maxPlayers: body.maxPlayers ?? 4
			})
			.returning();

		await db.insert(roomPlayer).values({ roomId: newRoom.id, userId: u.id });

		return newRoom;
	})

	.get('/api/rooms/:id', async ({ params, request, set }) => {
		const u = await getUser(request);
		if (!u) {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const [roomData] = await db.select().from(room).where(eq(room.id, params.id));
		if (!roomData) {
			set.status = 404;
			return { error: 'Room not found' };
		}

		const playerRecords = await db
			.select({ userId: roomPlayer.userId, name: user.name, image: user.image })
			.from(roomPlayer)
			.innerJoin(user, eq(roomPlayer.userId, user.id))
			.where(eq(roomPlayer.roomId, params.id));

		const isInRoom = playerRecords.some((p) => p.userId === u.id);
		if (!isInRoom) {
			if (playerRecords.length >= roomData.maxPlayers) {
				set.status = 403;
				return { error: 'Room is full' };
			}
			await db.insert(roomPlayer).values({ roomId: params.id, userId: u.id });
			playerRecords.push({ userId: u.id, name: u.name, image: u.image ?? null });
		}

		const players = playerRecords.map((p) => ({
			id: p.userId,
			name: p.name,
			image: p.image,
			ready: false
		}));

		return {
			roomId: roomData.id,
			roomName: roomData.name,
			roomCode: roomData.id.slice(0, 6).toUpperCase(),
			maxPlayers: roomData.maxPlayers,
			myId: u.id,
			hostId: players[0]?.id ?? '',
			players,
			chatMessages: []
		};
	})

	.post('/api/rooms/:id/leave', async ({ params, request, set }) => {
		const u = await getUser(request);
		if (!u) {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		await db
			.delete(roomPlayer)
			.where(and(eq(roomPlayer.roomId, params.id), eq(roomPlayer.userId, u.id)));

		const [{ remaining }] = await db
			.select({ remaining: count(roomPlayer.id) })
			.from(roomPlayer)
			.where(eq(roomPlayer.roomId, params.id));

		if (remaining === 0) {
			await db.delete(room).where(eq(room.id, params.id));
		}

		return { success: true };
	})

	.post('/api/rooms/:id/join', async ({ params, request, set }) => {
		const u = await getUser(request);
		if (!u) {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const [existing] = await db
			.select()
			.from(roomPlayer)
			.where(and(eq(roomPlayer.roomId, params.id), eq(roomPlayer.userId, u.id)));

		if (!existing) {
			const [roomData] = await db.select().from(room).where(eq(room.id, params.id));
			if (!roomData) {
				set.status = 404;
				return { error: 'Room not found' };
			}

			const [{ playerCount }] = await db
				.select({ playerCount: count(roomPlayer.id) })
				.from(roomPlayer)
				.where(eq(roomPlayer.roomId, params.id));

			if (playerCount >= roomData.maxPlayers) {
				set.status = 403;
				return { error: 'Room is full' };
			}

			await db.insert(roomPlayer).values({ roomId: params.id, userId: u.id });
		}

		return { success: true, roomId: params.id };
	});
