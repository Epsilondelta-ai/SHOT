import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { count, eq } from 'drizzle-orm';
import { user } from '../db/schema';

const ORIGIN = process.env.ORIGIN;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;

if (!ORIGIN) throw new Error('ORIGIN is not set');
if (!BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is not set');

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
	rateLimit: {
		enabled: false,
	},
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
	},
	databaseHooks: {
		user: {
			create: {
				after: async (newUser) => {
					const [{ total }] = await db.select({ total: count() }).from(user);
					if (total === 1) {
						await db.update(user).set({ role: 'admin' }).where(eq(user.id, newUser.id));
					}
				}
			}
		}
	}
});
