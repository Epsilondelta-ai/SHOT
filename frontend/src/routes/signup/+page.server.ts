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
		const name = data.get('name') as string;
		const email = data.get('email') as string;
		const password = data.get('password') as string;
		const confirmPassword = data.get('confirmPassword') as string;

		if (!name || !email || !password || !confirmPassword) {
			return fail(400, { error: '모든 항목을 입력해주세요.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: '비밀번호가 일치하지 않습니다.' });
		}

		const response = await auth.api.signUpEmail({
			body: { name, email, password },
			asResponse: true
		});

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			return fail(response.status, { error: body?.message ?? '회원가입에 실패했습니다.' });
		}

		redirect(303, '/lobby');
	}
};
