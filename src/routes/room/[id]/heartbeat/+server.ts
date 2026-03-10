import type { RequestHandler } from './$types';
import { updateHeartbeat } from '$lib/server/roomStore';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return new Response(null, { status: 204 });
	}

	updateHeartbeat(event.params.id, event.locals.user.id);
	return new Response(null, { status: 204 });
};
