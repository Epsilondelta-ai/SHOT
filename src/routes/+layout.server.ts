import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	let isAdmin = false;

	if (event.locals.user) {
		const [dbUser] = await db
			.select({ role: user.role })
			.from(user)
			.where(eq(user.id, event.locals.user.id));
		isAdmin = dbUser?.role === 'admin';
	}

	return {
		username: event.locals.user?.name ?? '',
		avatarSrc: event.locals.user?.image ?? '',
		isAdmin
	};
};
