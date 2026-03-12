import Elysia from 'elysia';
import { db } from '../db';
import { eq, inArray } from 'drizzle-orm';
import { gameParticipant, gameRecord, user } from '../db/schema';
import { requireUser } from '../lib/getUser';

export const meRoutes = new Elysia()
	.get('/api/me', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const [dbUser] = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				role: user.role,
				banStart: user.banStart,
				banEnd: user.banEnd,
				banReason: user.banReason
			})
			.from(user)
			.where(eq(user.id, u.id));

		if (!dbUser) {
			set.status = 404;
			return { error: 'User not found' };
		}

		return {
			id: dbUser.id,
			name: dbUser.name,
			email: dbUser.email,
			image: dbUser.image,
			role: dbUser.role,
			banned: dbUser.banEnd !== null && dbUser.banEnd !== undefined && dbUser.banEnd > new Date(),
			banStart: dbUser.banStart?.toISOString().split('T')[0] ?? null,
			banEnd: dbUser.banEnd?.toISOString().split('T')[0] ?? null,
			banReason: dbUser.banReason ?? null,
			stats: { games: 0, wins: 0, streak: 0 },
			recentMatches: []
		};
	})

	.put('/api/me', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const contentType = request.headers.get('content-type') ?? '';

		let name: string | undefined;
		let imageData: string | undefined;

		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			name = formData.get('name') as string;
			const imageFile = formData.get('image') as File | null;

			if (imageFile && imageFile.size > 0) {
				const buffer = await imageFile.arrayBuffer();
				const base64 = Buffer.from(buffer).toString('base64');
				imageData = `data:${imageFile.type};base64,${base64}`;
			}
		} else {
			const body = (await request.json()) as { name?: string; image?: string };
			name = body.name;
			imageData = body.image;
		}

		if (!name?.trim()) {
			set.status = 400;
			return { error: '닉네임을 입력해주세요.' };
		}

		const updateData: { name: string; image?: string } = { name: name.trim() };
		if (imageData) {
			updateData.image = imageData;
		}

		await db.update(user).set(updateData).where(eq(user.id, u.id));
		return { success: true };
	})

	.get('/api/me/replays', async ({ request, set }) => {
		let u;
		try {
			u = await requireUser(request);
		} catch {
			set.status = 401;
			return { error: 'Unauthorized' };
		}

		const participations = db
			.select({ roomId: gameParticipant.roomId, participationType: gameParticipant.participationType })
			.from(gameParticipant)
			.where(eq(gameParticipant.userId, u.id))
			.all();

		if (participations.length === 0) return { replays: [] };

		const roomIds = [...new Set(participations.map((p) => p.roomId))];
		const typeByRoom = new Map(participations.map((p) => [p.roomId, p.participationType]));

		const records = db
			.select()
			.from(gameRecord)
			.where(inArray(gameRecord.roomId, roomIds))
			.all()
			.filter((r) => r.finishedAt !== null)
			.sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0));

		return {
			replays: records.map((r) => ({
				roomId: r.roomId,
				playerCount: r.playerCount,
				playerNames: JSON.parse(r.playerNames) as string[],
				winnerTeam: r.winnerTeam,
				startedAt: r.startedAt?.getTime() ?? 0,
				finishedAt: r.finishedAt?.getTime() ?? null,
				participationType: typeByRoom.get(r.roomId) ?? 'spectator',
			})),
		};
	});
