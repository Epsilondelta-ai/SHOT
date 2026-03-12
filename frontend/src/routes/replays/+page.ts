import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const res = await fetch(`${BACKEND_URL}/api/replays`);
	if (!res.ok) return { records: [] };
	const data = await res.json();
	return { records: data.records ?? [] };
};
