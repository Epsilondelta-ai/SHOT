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
		redirect(302, '/lobby');
	}

	if (!meData.banned) {
		redirect(302, '/lobby');
	}

	return {
		banStart: meData.banStart,
		banEnd: meData.banEnd,
		banReason: meData.banReason ?? ''
	};
};
