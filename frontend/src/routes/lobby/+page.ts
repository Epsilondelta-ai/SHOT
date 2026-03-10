import { redirect } from '@sveltejs/kit';
import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const sessionRes = await fetch(`${BACKEND_URL}/api/auth/get-session`, { credentials: 'include' });
	if (!sessionRes.ok) redirect(303, '/login');
	const session = await sessionRes.json();
	if (!session?.user) redirect(303, '/login');

	const roomsRes = await fetch(`${BACKEND_URL}/api/rooms`, { credentials: 'include' });
	const lobbies = await roomsRes.json();

	// Get user info for layout
	let meData;
	try {
		const meRes = await fetch(`${BACKEND_URL}/api/me`, { credentials: 'include' });
		meData = await meRes.json();
	} catch {
		meData = { name: session.user.name, image: '', role: 'user' };
	}

	return {
		lobbies,
		username: meData.name ?? '',
		avatarSrc: meData.image ?? '',
		isAdmin: meData.role === 'admin'
	};
};
