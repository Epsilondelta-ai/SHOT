import { redirect } from '@sveltejs/kit';
import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const sessionRes = await fetch(`${BACKEND_URL}/api/auth/get-session`, { credentials: 'include' });
	if (!sessionRes.ok) redirect(303, '/login');
	const session = await sessionRes.json();
	if (!session?.user) redirect(303, '/login');

	const [usersRes, roomsRes, assistantsRes, llmRes, rulebookRes] = await Promise.all([
		fetch(`${BACKEND_URL}/api/admin/users`, { credentials: 'include' }),
		fetch(`${BACKEND_URL}/api/admin/rooms`, { credentials: 'include' }),
		fetch(`${BACKEND_URL}/api/admin/assistants`, { credentials: 'include' }),
		fetch(`${BACKEND_URL}/api/admin/llm-providers`, { credentials: 'include' }),
		fetch(`${BACKEND_URL}/api/admin/rulebook`, { credentials: 'include' })
	]);

	if (!usersRes.ok) redirect(303, '/');

	const users = await usersRes.json();
	const rooms = await roomsRes.json();
	const assistants = await assistantsRes.json();
	const llmData = await llmRes.json();
	const rulebooks = rulebookRes.ok ? await rulebookRes.json() : [];

	return {
		users,
		rooms,
		assistants,
		llmProviders: llmData.llmProviders,
		llmModels: llmData.llmModels,
		rulebooks
	};
};
