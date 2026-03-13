export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';
export const WS_BACKEND_URL =
	import.meta.env.VITE_WS_BACKEND_URL ?? BACKEND_URL.replace(/^http/, 'ws');
