import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	if (event.locals.user.role !== 'admin') {
		error(403, '접근 권한이 없습니다.');
	}
};
