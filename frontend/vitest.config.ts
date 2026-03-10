import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/routes/**/*.server.ts', 'src/lib/server/**/*.ts'],
			exclude: ['src/lib/server/db/auth.schema.ts', 'src/lib/server/db/schema.ts']
		}
	}
});
