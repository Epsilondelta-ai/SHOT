import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		redirect(303, '/lobby');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: '이메일과 비밀번호를 입력해주세요.' });
		}

		const response = await auth.api.signInEmail({
			body: { email, password },
			asResponse: true
		});

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			return fail(response.status, { error: body?.message ?? '로그인에 실패했습니다.' });
		}

		redirect(303, '/lobby');
	}
};
