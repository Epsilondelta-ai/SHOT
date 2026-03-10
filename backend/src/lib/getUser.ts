import { db } from '../db';
import { eq } from 'drizzle-orm';
import { session, user } from '../db/schema';

export async function getUser(request: Request) {
	const rawCookie = request.headers.get('cookie') ?? '';
	const tokenMatch = rawCookie.match(/better-auth\.session_token=([^;]+)/);
	if (!tokenMatch) return null;

	const sess = await db.query.session.findFirst({
		where: eq(session.token, decodeURIComponent(tokenMatch[1]))
	});
	if (!sess) return null;

	const [u] = await db
		.select({ id: user.id, name: user.name, email: user.email, role: user.role, image: user.image })
		.from(user)
		.where(eq(user.id, sess.userId));

	return u ?? null;
}

export async function requireUser(request: Request) {
	const u = await getUser(request);
	if (!u) throw new Error('Unauthorized');
	return u;
}

export async function requireAdmin(request: Request) {
	const u = await requireUser(request);
	if (u.role !== 'admin') throw new Error('Forbidden');
	return u;
}
