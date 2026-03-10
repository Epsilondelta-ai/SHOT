import { redirect } from '@sveltejs/kit';
import { BACKEND_URL } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch(`${BACKEND_URL}/api/auth/get-session`, { credentials: 'include' });
		if (res.ok) {
			const session = await res.json();
			if (session?.user) {
				redirect(303, '/lobby');
			}
		}
	} catch {
		// not logged in, stay on signup page
	}
};
