import { BACKEND_URL } from '$lib/config';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${BACKEND_URL}${path}`, {
		credentials: 'include',
		...options
	});
	if (!res.ok) {
		throw new Error(`API error: ${res.status}`);
	}
	return res.json();
}

export function apiGet<T>(path: string): Promise<T> {
	return api<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
	return api<T>(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
	return api<T>(path, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});
}

export function apiDelete<T>(path: string): Promise<T> {
	return api<T>(path, { method: 'DELETE' });
}

export function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
	return api<T>(path, {
		method: 'POST',
		body: formData
	});
}

export function apiPutFormData<T>(path: string, formData: FormData): Promise<T> {
	return api<T>(path, {
		method: 'PUT',
		body: formData
	});
}
