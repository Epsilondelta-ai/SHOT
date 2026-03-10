import { redirect } from '@sveltejs/kit';
import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const sessionRes = await fetch(`${BACKEND_URL}/api/auth/get-session`, { credentials: 'include' });
	if (!sessionRes.ok) redirect(303, '/login');
	const session = await sessionRes.json();
	if (!session?.user) redirect(303, '/login');

	const roomRes = await fetch(`${BACKEND_URL}/api/rooms/${params.id}`, { credentials: 'include' });
	if (!roomRes.ok) redirect(303, '/lobby');

	const roomData = await roomRes.json();
	return {
		...roomData,
		chatMessages: [] as { id: string; sender: string; text: string; isSystem?: boolean }[]
	};
};
