import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { type Handle, redirect } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const handleBanCheck: Handle = async ({ event, resolve }) => {
	if (event.locals.user) {
		const pathname = event.url.pathname;
		const isExempt =
			pathname.startsWith('/banned') ||
			pathname.startsWith('/api/auth') ||
			pathname.startsWith('/login');
		if (!isExempt) {
			const [dbUser] = await db
				.select({ banEnd: user.banEnd })
				.from(user)
				.where(eq(user.id, event.locals.user.id));
			if (dbUser?.banEnd && dbUser.banEnd > new Date()) {
				redirect(302, '/banned');
			}
		}
	}
	return resolve(event);
};

const handleNotFound: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	if (response.status === 404) {
		throw redirect(302, '/');
	}
	return response;
};

export const handle: Handle = sequence(
	handleParaglide,
	handleBetterAuth,
	handleBanCheck,
	handleNotFound
);
