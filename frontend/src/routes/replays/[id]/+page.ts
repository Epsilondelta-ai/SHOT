import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const res = await fetch(`${BACKEND_URL}/api/replays/${params.id}/frames`);
	if (!res.ok) return { frames: [], roomId: params.id };
	const data = await res.json();
	return { frames: data.frames ?? [], roomId: params.id };
};
