import { db } from '../db';
import { eq } from 'drizzle-orm';
import { user } from '../db/schema';
import { auth } from './auth';

export async function getUser(request: Request) {
	const result = await auth.api.getSession({ headers: request.headers });
	if (!result) return null;

	const [u] = await db
		.select({ id: user.id, name: user.name, email: user.email, role: user.role, image: user.image, banEnd: user.banEnd })
		.from(user)
		.where(eq(user.id, result.user.id));

	return u ?? null;
}

export async function requireUser(request: Request) {
	const u = await getUser(request);
	if (!u) throw new Error('Unauthorized');
	if (u.banEnd && u.banEnd > new Date()) throw new Error('Banned');
	return u;
}

export async function requireAdmin(request: Request) {
	const u = await requireUser(request);
	if (u.role !== 'admin') throw new Error('Forbidden');
	return u;
}
