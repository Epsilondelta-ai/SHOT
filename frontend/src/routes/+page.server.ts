import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Redirect to lobby if user is logged in
	if (event.locals.user) {
		redirect(303, '/lobby');
	}
};
