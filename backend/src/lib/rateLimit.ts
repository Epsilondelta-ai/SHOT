interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export function createRateLimit(options: { windowMs: number; max: number }) {
  const { windowMs, max } = options;
  return {
    check(key: string): { allowed: boolean; retryAfter?: number } {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }
      entry.count++;
      if (entry.count > max) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
      }
      return { allowed: true };
    },
  };
}

export function createWsRateLimit(options: { windowMs: number; max: number }) {
  const wsStore = new Map<string, WindowEntry>();
  const { windowMs, max } = options;
  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = wsStore.get(key);
      if (!entry || now > entry.resetAt) {
        wsStore.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      entry.count++;
      return entry.count <= max;
    },
  };
}

const defaultLimit = createRateLimit({ windowMs: 60_000, max: 100 });

export const rateLimitMiddleware = {
  derive({ request }: { request: Request }) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    return { rateLimit: defaultLimit.check(ip) };
  },
};
