import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	const [dbUser] = await db
		.select({ banStart: user.banStart, banEnd: user.banEnd, banReason: user.banReason })
		.from(user)
		.where(eq(user.id, event.locals.user.id));

	if (!dbUser?.banEnd || dbUser.banEnd <= new Date()) {
		redirect(302, '/lobby');
	}

	return {
		banStart: dbUser.banStart?.toISOString().split('T')[0] ?? null,
		banEnd: dbUser.banEnd.toISOString().split('T')[0],
		banReason: dbUser.banReason ?? ''
	};
};

export const actions: Actions = {
	signout: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		redirect(303, '/login');
	}
};
