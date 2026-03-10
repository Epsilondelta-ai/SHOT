import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		redirect(303, '/login');
	}

	return {
		username: event.locals.user.name,
		avatarSrc: event.locals.user.image ?? ''
	};
};

export const actions: Actions = {
	updateProfile: async (event) => {
		if (!event.locals.user) {
			return fail(401, { error: '로그인이 필요합니다.' });
		}

		const formData = await event.request.formData();
		const name = formData.get('name') as string;
		const imageFile = formData.get('image') as File | null;

		if (!name?.trim()) {
			return fail(400, { error: '닉네임을 입력해주세요.' });
		}

		const updateData: { name: string; image?: string } = { name: name.trim() };

		if (imageFile && imageFile.size > 0) {
			const buffer = await imageFile.arrayBuffer();
			const base64 = Buffer.from(buffer).toString('base64');
			updateData.image = `data:${imageFile.type};base64,${base64}`;
		}

		await db.update(user).set(updateData).where(eq(user.id, event.locals.user.id));

		return { success: true };
	}
};
