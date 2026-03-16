import { redirect } from '@sveltejs/kit';
import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const sessionRes = await fetch(`${BACKEND_URL}/api/auth/get-session`, { credentials: 'include' });
	if (!sessionRes.ok) redirect(303, '/login');
	const session = await sessionRes.json();
	if (!session?.user) redirect(303, '/login');

	const meRes = await fetch(`${BACKEND_URL}/api/me`, { credentials: 'include' });

	let meData;
	try {
		meData = await meRes.json();
	} catch {
		meData = { name: session.user.name, image: '', role: 'user' };
	}

	const botsRes = await fetch(`${BACKEND_URL}/api/config/bots`, { credentials: 'include' });
	const bots = botsRes.ok ? await botsRes.json() : [];

	return {
		username: meData.name ?? '',
		avatarSrc: meData.image ?? '',
		isAdmin: meData.role === 'admin',
		bots
	};
};
