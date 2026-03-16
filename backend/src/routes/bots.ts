import Elysia from 'elysia';
import { db } from '../db';
import { eq, and, count } from 'drizzle-orm';
import { bot, botInvitation, room, roomPlayer } from '../db/schema';
import { requireUser } from '../lib/getUser';
import { requireBot } from '../lib/botAuth';
import { createSnapshot, getValidActionsForUser, applyGameAction } from '../lib/gameState';
import { resolveExternalBotTurn } from '../lib/externalBotTurn';
import { broadcastGameState } from '../ws/gameWs';

function generateApiKey(): string {
	return 'mr_' + crypto.randomUUID().replace(/-/g, '');
}

export const botRoutes = new Elysia()
	.get('/api/config/bots', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const bots = await db
			.select({
				id: bot.id,
				name: bot.name,
				image: bot.image,
				active: bot.active,
				createdAt: bot.createdAt
			})
			.from(bot)
			.where(eq(bot.userId, u.id))
			.orderBy(bot.createdAt);

		return bots.map((b) => ({
			id: b.id,
			name: b.name,
			image: b.image,
			active: b.active,
			createdAt: b.createdAt
		}));
	})

	.post('/api/config/bots', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const body = (await request.json()) as { name: string; image?: string };
		if (!body.name) {
			set.status = 400;
			return { error: 'Name is required' };
		}

		const apiKey = generateApiKey();
		const [created] = await db
			.insert(bot)
			.values({
				userId: u.id,
				name: body.name,
				image: body.image ?? null,
				apiKey
			})
			.returning();

		return {
			id: created.id,
			name: created.name,
			image: created.image,
			active: created.active,
			createdAt: created.createdAt,
			apiKey: created.apiKey
		};
	})

	.put('/api/config/bots/:id', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const existing = await db.query.bot.findFirst({ where: eq(bot.id, params.id) });
		if (!existing) {
			set.status = 404;
			return { error: 'Not found' };
		}
		if (existing.userId !== u.id) {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const body = (await request.json()) as { name?: string; image?: string };

		await db
			.update(bot)
			.set({
				...(body.name !== undefined ? { name: body.name } : {}),
				...(body.image !== undefined ? { image: body.image } : {})
			})
			.where(and(eq(bot.id, params.id), eq(bot.userId, u.id)));

		const [updated] = await db
			.select({
				id: bot.id,
				name: bot.name,
				image: bot.image,
				active: bot.active,
				createdAt: bot.createdAt
			})
			.from(bot)
			.where(eq(bot.id, params.id));

		return updated;
	})

	.delete('/api/config/bots/:id', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const existing = await db.query.bot.findFirst({ where: eq(bot.id, params.id) });
		if (!existing) {
			set.status = 404;
			return { error: 'Not found' };
		}
		if (existing.userId !== u.id) {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		await db.delete(bot).where(and(eq(bot.id, params.id), eq(bot.userId, u.id)));
		return { success: true };
	})

	.post('/api/config/bots/:id/regenerate-key', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const existing = await db.query.bot.findFirst({ where: eq(bot.id, params.id) });
		if (!existing) {
			set.status = 404;
			return { error: 'Not found' };
		}
		if (existing.userId !== u.id) {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const newApiKey = generateApiKey();
		await db
			.update(bot)
			.set({ apiKey: newApiKey })
			.where(and(eq(bot.id, params.id), eq(bot.userId, u.id)));

		return { apiKey: newApiKey };
	})

	// ── User-facing invite routes ─────────────────────────────────────────────

	.post('/api/rooms/:id/invite-bot/:botId', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const botRecord = await db.query.bot.findFirst({ where: eq(bot.id, params.botId) });
		if (!botRecord) {
			set.status = 404;
			return { error: 'Bot not found' };
		}
		if (botRecord.userId !== u.id) {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const [roomRecord] = await db.select().from(room).where(eq(room.id, params.id));
		if (!roomRecord) {
			set.status = 400;
			return { error: 'Room not found' };
		}
		if (roomRecord.status !== 'waiting') {
			set.status = 400;
			return { error: 'Room is not in waiting status' };
		}

		const existingInvitation = await db.query.botInvitation.findFirst({
			where: and(
				eq(botInvitation.botId, params.botId),
				eq(botInvitation.roomId, params.id),
				eq(botInvitation.status, 'pending')
			)
		});
		if (existingInvitation) {
			set.status = 400;
			return { error: 'Bot already invited' };
		}

		const existingPlayer = await db.query.roomPlayer.findFirst({
			where: and(eq(roomPlayer.roomId, params.id), eq(roomPlayer.botId, params.botId))
		});
		if (existingPlayer) {
			set.status = 400;
			return { error: 'Bot is already in the room' };
		}

		const [invitation] = await db
			.insert(botInvitation)
			.values({ botId: params.botId, roomId: params.id, status: 'pending' })
			.returning();

		return { invitationId: invitation.id };
	})

	.delete('/api/rooms/:id/invite-bot/:botId', async ({ params, request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const botRecord = await db.query.bot.findFirst({ where: eq(bot.id, params.botId) });
		if (!botRecord) {
			set.status = 404;
			return { error: 'Bot not found' };
		}
		if (botRecord.userId !== u.id) {
			set.status = 403;
			return { error: 'Forbidden' };
		}

		const pendingInvitation = await db.query.botInvitation.findFirst({
			where: and(
				eq(botInvitation.botId, params.botId),
				eq(botInvitation.roomId, params.id),
				eq(botInvitation.status, 'pending')
			)
		});

		if (pendingInvitation) {
			await db
				.update(botInvitation)
				.set({ status: 'cancelled' })
				.where(eq(botInvitation.id, pendingInvitation.id));
		}

		await db
			.delete(roomPlayer)
			.where(and(eq(roomPlayer.roomId, params.id), eq(roomPlayer.botId, params.botId)));

		return { success: true };
	})

	// ── Bot-facing routes ─────────────────────────────────────────────────────

	.get('/api/bot/invitations', async ({ request, set }) => {
		let b;
		try {
			b = await requireBot(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const invitations = await db
			.select({
				invitationId: botInvitation.id,
				roomId: botInvitation.roomId,
				roomName: room.name,
				createdAt: botInvitation.createdAt
			})
			.from(botInvitation)
			.innerJoin(room, eq(botInvitation.roomId, room.id))
			.where(and(eq(botInvitation.botId, b.id), eq(botInvitation.status, 'pending')));

		return invitations;
	})

	.post('/api/bot/rooms/:roomId/join', async ({ params, request, set }) => {
		let b;
		try {
			b = await requireBot(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const pendingInvitation = await db.query.botInvitation.findFirst({
			where: and(
				eq(botInvitation.botId, b.id),
				eq(botInvitation.roomId, params.roomId),
				eq(botInvitation.status, 'pending')
			)
		});
		if (!pendingInvitation) {
			set.status = 400;
			return { error: 'No pending invitation' };
		}

		const [roomRecord] = await db.select().from(room).where(eq(room.id, params.roomId));
		if (!roomRecord) {
			set.status = 400;
			return { error: 'Room not found' };
		}
		if (roomRecord.status !== 'waiting') {
			set.status = 400;
			return { error: 'Room is not in waiting status' };
		}

		const [{ playerCount }] = await db
			.select({ playerCount: count(roomPlayer.id) })
			.from(roomPlayer)
			.where(eq(roomPlayer.roomId, params.roomId));

		if (playerCount >= roomRecord.maxPlayers) {
			set.status = 400;
			return { error: 'Room is full' };
		}

		const [newPlayer] = await db
			.insert(roomPlayer)
			.values({
				roomId: params.roomId,
				userId: 'bot:' + b.id,
				playerType: 'external',
				botId: b.id,
				displayName: b.name,
				ready: false
			})
			.returning();

		await db
			.update(botInvitation)
			.set({ status: 'accepted' })
			.where(eq(botInvitation.id, pendingInvitation.id));

		return { playerId: newPlayer.id };
	})

	.post('/api/bot/rooms/:roomId/ready', async ({ params, request, set }) => {
		let b;
		try {
			b = await requireBot(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const player = await db.query.roomPlayer.findFirst({
			where: and(eq(roomPlayer.botId, b.id), eq(roomPlayer.roomId, params.roomId))
		});
		if (!player) {
			set.status = 404;
			return { error: 'Player not found in room' };
		}

		await db
			.update(roomPlayer)
			.set({ ready: true })
			.where(eq(roomPlayer.id, player.id));

		return { ready: true };
	})

	// ── Bot game state polling ────────────────────────────────────────────────

	.get('/api/bot/games/:roomId/state', async ({ params, request, set }) => {
		let b;
		try {
			b = await requireBot(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const botPlayer = await db.query.roomPlayer.findFirst({
			where: and(eq(roomPlayer.roomId, params.roomId), eq(roomPlayer.botId, b.id))
		});
		if (!botPlayer) {
			set.status = 404;
			return { error: 'Player not found in room' };
		}

		try {
			const snapshot = createSnapshot(params.roomId, botPlayer.userId, { allowSpectator: false });
			const availableActions = getValidActionsForUser(params.roomId, botPlayer.userId);
			return { ...snapshot, availableActions };
		} catch (error) {
			set.status = 404;
			return { error: error instanceof Error ? error.message : 'Game not found' };
		}
	})

	// ── Bot action submission ─────────────────────────────────────────────────

	.post('/api/bot/games/:roomId/action', async ({ params, request, set }) => {
		let b;
		try {
			b = await requireBot(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const botPlayer = await db.query.roomPlayer.findFirst({
			where: and(eq(roomPlayer.roomId, params.roomId), eq(roomPlayer.botId, b.id))
		});
		if (!botPlayer) {
			set.status = 404;
			return { error: 'Player not found in room' };
		}

		const body = (await request.json()) as {
			type: string;
			text?: string;
			card?: string;
			targetId?: string;
		};

		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			applyGameAction(params.roomId, botPlayer.userId, body as any);
			resolveExternalBotTurn(params.roomId);
			await broadcastGameState(params.roomId);
			return { accepted: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid action';
			set.status = message === 'Game not found.' ? 404 : 400;
			return { error: message };
		}
	});
