import { redirect } from '@sveltejs/kit';
import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const sessionRes = await fetch(`${BACKEND_URL}/api/auth/get-session`, { credentials: 'include' });
	if (!sessionRes.ok) redirect(303, '/login');
	const session = await sessionRes.json();
	if (!session?.user) redirect(303, '/login');

	let meData;
	try {
		const meRes = await fetch(`${BACKEND_URL}/api/me`, { credentials: 'include' });
		meData = await meRes.json();
	} catch {
		meData = {
			name: session.user.name,
			image: '',
			role: 'user',
			stats: { games: 0, wins: 0, streak: 0 },
			recentMatches: []
		};
	}

	let myReplays: unknown[] = [];
	try {
		const replaysRes = await fetch(`${BACKEND_URL}/api/me/replays`, { credentials: 'include' });
		if (replaysRes.ok) {
			const replaysData = await replaysRes.json();
			myReplays = replaysData.replays ?? [];
		}
	} catch { /* ignore */ }

	return {
		username: meData.name ?? '',
		avatarSrc: meData.image ?? '',
		isAdmin: meData.role === 'admin',
		recentMatches: meData.recentMatches ?? [],
		stats: meData.stats ?? { games: 0, wins: 0, streak: 0 },
		myReplays
	};
};
