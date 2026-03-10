import { describe, it, expect, vi } from 'vitest';

// config.ts uses import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'
// In test environment, VITE_ env vars are not set, so ?? falls through to defaults.

describe('config', () => {
	it('exports BACKEND_URL as a string', async () => {
		const { BACKEND_URL } = await vi.importActual<typeof import('./config')>('./config');
		expect(typeof BACKEND_URL).toBe('string');
		expect(BACKEND_URL.length).toBeGreaterThan(0);
		// In test env without VITE_ vars, defaults to localhost
		expect(BACKEND_URL).toBe('http://localhost:3001');
	});

	it('exports WS_BACKEND_URL as a string', async () => {
		const { WS_BACKEND_URL } = await vi.importActual<typeof import('./config')>('./config');
		expect(typeof WS_BACKEND_URL).toBe('string');
		expect(WS_BACKEND_URL).toBe('ws://localhost:3001');
	});
});
