import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	return {
		username: event.locals.user?.name ?? '',
		avatarSrc: event.locals.user?.image ?? ''
	};
};
