import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	const [dbUser] = await db
		.select({ role: user.role })
		.from(user)
		.where(eq(user.id, event.locals.user.id));

	if (!dbUser || dbUser.role !== 'admin') {
		error(403, '접근 권한이 없습니다.');
	}
};
