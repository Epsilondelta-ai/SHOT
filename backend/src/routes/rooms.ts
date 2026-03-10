import Elysia from 'elysia';
import { db } from '../db';
import { eq, and, count, inArray, isNull, or } from 'drizzle-orm';
import { assistant, llmModel, llmProvider, room, roomPlayer } from '../db/schema';
import { getUser } from '../lib/getUser';
import { getSerializedRoomPlayers } from '../lib/roomPlayers';
import { broadcastPlayers } from '../ws/roomWs';

async function getRoomOptions(userId: string) {
	const activeProviders = await db
		.select({ provider: llmProvider.provider })
		.from(llmProvider)
		.where(eq(llmProvider.active, true));

	const providerKeys = activeProviders.map((provider) => provider.provider);

	const [assistants, models] = await Promise.all([
		db
			.select({
				id: assistant.id,
				name: assistant.name,
				prompt: assistant.prompt,
				userId: assistant.userId
			})
			.from(assistant)
			.where(and(eq(assistant.active, true), or(eq(assistant.userId, userId), isNull(assistant.userId))))
			.orderBy(assistant.createdAt),
		providerKeys.length === 0
			? Promise.resolve([])
			: db
					.select({
						id: llmModel.id,
						provider: llmModel.provider,
						apiModelName: llmModel.apiModelName,
						displayName: llmModel.displayName
					})
					.from(llmModel)
					.where(and(eq(llmModel.active, true), inArray(llmModel.provider, providerKeys)))
					.orderBy(llmModel.createdAt)
	]);

	return {
		assistants: assistants.map((entry) => ({
			id: entry.id,
			name: entry.name,
			prompt: entry.prompt,
			scope: entry.userId === userId ? 'personal' : 'global'
		})),
		llmModels: models
	};
}

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

		const playerRecords = await db.query.roomPlayer.findMany({
			where: eq(roomPlayer.roomId, params.id)
		});

		const isInRoom = playerRecords.some((player) => player.playerType === 'human' && player.userId === u.id);
		if (!isInRoom) {
			if (playerRecords.length >= roomData.maxPlayers) {
				set.status = 403;
				return { error: 'Room is full' };
			}
			await db.insert(roomPlayer).values({ roomId: params.id, userId: u.id, playerType: 'human' });
		}

		const [players, roomOptions] = await Promise.all([
			getSerializedRoomPlayers(params.id),
			getRoomOptions(u.id)
		]);
		const hostPlayer = players.find((player) => player.type === 'human') ?? players[0];

		return {
			roomId: roomData.id,
			roomName: roomData.name,
			roomCode: roomData.id.slice(0, 6).toUpperCase(),
			maxPlayers: roomData.maxPlayers,
			myId: u.id,
			hostId: hostPlayer?.id ?? '',
			players,
			chatMessages: [],
			...roomOptions
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

		const remainingPlayers = await db.query.roomPlayer.findMany({
			where: eq(roomPlayer.roomId, params.id)
		});

		if (!remainingPlayers.some((player) => player.playerType === 'human')) {
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
	})

	.post('/api/rooms/:id/llm-players', async ({ params, request, set }) => {
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

		const playerRecords = await db.query.roomPlayer.findMany({
			where: eq(roomPlayer.roomId, params.id)
		});
		const hostPlayer = playerRecords.find((player) => player.playerType === 'human') ?? playerRecords[0];
		if (!hostPlayer || hostPlayer.userId !== u.id) {
			set.status = 403;
			return { error: 'Only the host can add LLM players' };
		}
		if (playerRecords.length >= roomData.maxPlayers) {
			set.status = 403;
			return { error: 'Room is full' };
		}

		const body = (await request.json()) as { assistantId?: string; llmModelId?: string };
		if (!body.assistantId || !body.llmModelId) {
			set.status = 400;
			return { error: 'Assistant and model are required' };
		}

		const [selectedAssistant, selectedModel] = await Promise.all([
			db.query.assistant.findFirst({
				where: and(
					eq(assistant.id, body.assistantId),
					eq(assistant.active, true),
					or(eq(assistant.userId, u.id), isNull(assistant.userId))
				),
				columns: { id: true, name: true }
			}),
			db
				.select({
					id: llmModel.id,
					displayName: llmModel.displayName
				})
				.from(llmModel)
				.innerJoin(llmProvider, eq(llmModel.provider, llmProvider.provider))
				.where(
					and(
						eq(llmModel.id, body.llmModelId),
						eq(llmModel.active, true),
						eq(llmProvider.active, true)
					)
				)
				.then((rows) => rows[0] ?? null)
		]);

		if (!selectedAssistant || !selectedModel) {
			set.status = 400;
			return { error: 'Invalid assistant or model' };
		}

		const displayName = `${selectedAssistant.name} (${selectedModel.displayName})`;
		const [newPlayer] = await db
			.insert(roomPlayer)
			.values({
				roomId: params.id,
				userId: `llm:${crypto.randomUUID()}`,
				playerType: 'llm',
				displayName,
				assistantId: selectedAssistant.id,
				llmModelId: selectedModel.id
			})
			.returning();

		await broadcastPlayers(params.id);

		return {
			success: true,
			player: {
				id: newPlayer.id,
				userId: newPlayer.userId,
				name: displayName,
				avatarSrc: null,
				type: 'llm',
				assistantId: selectedAssistant.id,
				assistantName: selectedAssistant.name,
				llmModelId: selectedModel.id,
				modelName: selectedModel.displayName,
				ready: true
			}
		};
	});
