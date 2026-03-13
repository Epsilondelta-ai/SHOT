import { redirect } from '@sveltejs/kit';
import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const sessionRes = await fetch(`${BACKEND_URL}/api/auth/get-session`, { credentials: 'include' });
	if (!sessionRes.ok) redirect(303, '/login');
	const session = await sessionRes.json();
	if (!session?.user) redirect(303, '/login');

	const [botsRes, meRes] = await Promise.all([
		fetch(`${BACKEND_URL}/api/bots`, { credentials: 'include' }),
		fetch(`${BACKEND_URL}/api/me`, { credentials: 'include' })
	]);

	const bots = await botsRes.json();
	let meData;
	try {
		meData = await meRes.json();
	} catch {
		meData = { name: session.user.name, image: '', role: 'user' };
	}

	return {
		bots,
		username: meData.name ?? '',
		avatarSrc: meData.image ?? '',
		isAdmin: meData.role === 'admin'
	};
};
