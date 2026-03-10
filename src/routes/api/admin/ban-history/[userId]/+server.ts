import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, banHistory } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const [adminUser] = await db
		.select({ role: user.role })
		.from(user)
		.where(eq(user.id, locals.user.id));

	if (!adminUser || adminUser.role !== 'admin') error(403, 'Forbidden');

	const history = await db
		.select()
		.from(banHistory)
		.where(eq(banHistory.userId, params.userId))
		.orderBy(desc(banHistory.createdAt));

	return json(
		history.map((h) => ({
			id: h.id,
			banStart: h.banStart?.toISOString().split('T')[0] ?? null,
			banEnd: h.banEnd.toISOString().split('T')[0],
			banReason: h.banReason ?? '',
			unbannedAt: h.unbannedAt?.toISOString().split('T')[0] ?? null,
			unbanReason: h.unbanReason ?? null,
			createdAt: h.createdAt.toISOString().split('T')[0]
		}))
	);
};
