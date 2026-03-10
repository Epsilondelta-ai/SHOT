import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { addChat, emitRoomEvent } from '$lib/server/roomStore';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const { id } = event.params;
	const data = await event.request.formData();
	const text = (data.get('text') as string)?.trim();

	if (!text) {
		return new Response('Bad Request', { status: 400 });
	}

	const [userData] = await db
		.select({ name: user.name })
		.from(user)
		.where(eq(user.id, event.locals.user.id));

	const entry = {
		id: crypto.randomUUID(),
		userId: event.locals.user.id,
		userName: userData?.name ?? 'Unknown',
		text,
		ts: Date.now()
	};
	addChat(id, entry);
	emitRoomEvent(id, { type: 'chat', messages: [entry] });

	return new Response(null, { status: 204 });
};
