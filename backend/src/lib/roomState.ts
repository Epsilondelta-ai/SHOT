import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { room, roomPlayer } from '../db/schema';

export const MIN_ROOM_PLAYERS = 5;
export const MAX_ROOM_PLAYERS = 8;

export function parseRoomCapacity(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < MIN_ROOM_PLAYERS || parsed > MAX_ROOM_PLAYERS) {
		return null;
	}

	return parsed;
}

export async function getRoomById(roomId: string) {
	const [roomData] = await db.select().from(room).where(eq(room.id, roomId));
	return roomData ?? null;
}

export async function getHumanRoomPlayer(roomId: string, userId: string) {
	const [member] = await db
		.select()
		.from(roomPlayer)
		.where(
			and(
				eq(roomPlayer.roomId, roomId),
				eq(roomPlayer.userId, userId),
				eq(roomPlayer.playerType, 'human')
			)
		);

	return member ?? null;
}

export async function syncRoomAfterHumanDeparture(roomId: string) {
	const roomData = await getRoomById(roomId);
	if (!roomData) {
		return { deleted: true, hostUserId: null as string | null };
	}

	const remainingPlayers = await db.query.roomPlayer.findMany({
		where: eq(roomPlayer.roomId, roomId)
	});
	const remainingHumans = remainingPlayers.filter((player) => player.playerType === 'human');

	if (remainingHumans.length === 0) {
		await db.delete(room).where(eq(room.id, roomId));
		return { deleted: true, hostUserId: null as string | null };
	}

	if (!remainingHumans.some((player) => player.userId === roomData.hostUserId)) {
		const nextHost = remainingHumans[0];
		await db.update(room).set({ hostUserId: nextHost.userId }).where(eq(room.id, roomId));
		await db
			.update(roomPlayer)
			.set({ canManageBots: true })
			.where(
				and(
					eq(roomPlayer.roomId, roomId),
					eq(roomPlayer.userId, nextHost.userId),
					eq(roomPlayer.playerType, 'human')
				)
			);

		return { deleted: false, hostUserId: nextHost.userId };
	}

	return { deleted: false, hostUserId: roomData.hostUserId };
}
