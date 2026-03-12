import { describe, it, expect } from 'bun:test';
import { createRateLimit } from './rateLimit';

describe('createRateLimit', () => {
	it('allows requests within the limit', () => {
		const limiter = createRateLimit({ windowMs: 60_000, max: 3 });
		expect(limiter.check('key1').allowed).toBe(true);
		expect(limiter.check('key1').allowed).toBe(true);
		expect(limiter.check('key1').allowed).toBe(true);
	});

	it('blocks requests exceeding the limit', () => {
		const limiter = createRateLimit({ windowMs: 60_000, max: 2 });
		limiter.check('key2'); // 1
		limiter.check('key2'); // 2
		const result = limiter.check('key2'); // 3 — over limit
		expect(result.allowed).toBe(false);
		expect(result.retryAfter).toBeGreaterThan(0);
	});

	it('resets after the time window passes', async () => {
		const limiter = createRateLimit({ windowMs: 50, max: 1 });
		limiter.check('key3'); // 1
		const blocked = limiter.check('key3'); // 2 — over limit
		expect(blocked.allowed).toBe(false);

		await new Promise((resolve) => setTimeout(resolve, 60));

		const after = limiter.check('key3'); // new window
		expect(after.allowed).toBe(true);
	});

	it('tracks different keys independently', () => {
		const limiter = createRateLimit({ windowMs: 60_000, max: 1 });
		limiter.check('keyA'); // 1 for A
		const blockedA = limiter.check('keyA'); // 2 for A — over limit
		expect(blockedA.allowed).toBe(false);

		const firstB = limiter.check('keyB'); // 1 for B — should be allowed
		expect(firstB.allowed).toBe(true);
	});
});
