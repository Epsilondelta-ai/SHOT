import { redirect } from '@sveltejs/kit';
import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const sessionRes = await fetch(`${BACKEND_URL}/api/auth/get-session`, { credentials: 'include' });
	if (!sessionRes.ok) redirect(303, '/login');

	const session = await sessionRes.json();
	if (!session?.user) redirect(303, '/login');

	const gameRes = await fetch(`${BACKEND_URL}/api/games/${params.id}`, { credentials: 'include' });
	if (!gameRes.ok) redirect(303, `/room/${params.id}`);

	return {
		game: await gameRes.json()
	};
};
