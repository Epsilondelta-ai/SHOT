import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData, apiPutFormData } from './api';

// Mock $lib/config
vi.mock('$lib/config', () => ({
	BACKEND_URL: 'http://test-backend'
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOkResponse(data: unknown) {
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => data
	});
}

function mockErrorResponse(status: number) {
	mockFetch.mockResolvedValueOnce({
		ok: false,
		status
	});
}

beforeEach(() => {
	mockFetch.mockClear();
});

describe('apiGet', () => {
	it('sends GET request to backend URL', async () => {
		mockOkResponse({ id: 1 });
		const result = await apiGet<{ id: number }>('/api/test');
		expect(mockFetch).toHaveBeenCalledWith(
			'http://test-backend/api/test',
			expect.objectContaining({ credentials: 'include' })
		);
		expect(result).toEqual({ id: 1 });
	});

	it('throws on non-ok response', async () => {
		mockErrorResponse(404);
		await expect(apiGet('/api/missing')).rejects.toThrow('API error: 404');
	});
});

describe('apiPost', () => {
	it('sends POST with JSON body', async () => {
		mockOkResponse({ success: true });
		await apiPost('/api/rooms', { name: 'Test Room' });
		expect(mockFetch).toHaveBeenCalledWith(
			'http://test-backend/api/rooms',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Test Room' }),
				credentials: 'include'
			})
		);
	});

	it('sends POST without body when not provided', async () => {
		mockOkResponse({ success: true });
		await apiPost('/api/logout');
		const call = mockFetch.mock.calls[0][1];
		expect(call.body).toBeUndefined();
	});

	it('throws on error response', async () => {
		mockErrorResponse(401);
		await expect(apiPost('/api/rooms')).rejects.toThrow('API error: 401');
	});
});

describe('apiPut', () => {
	it('sends PUT with JSON body', async () => {
		mockOkResponse({ updated: true });
		await apiPut('/api/me', { name: 'New Name' });
		expect(mockFetch).toHaveBeenCalledWith(
			'http://test-backend/api/me',
			expect.objectContaining({
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'New Name' })
			})
		);
	});

	it('sends PUT without body when not provided', async () => {
		mockOkResponse({});
		await apiPut('/api/me');
		const call = mockFetch.mock.calls[0][1];
		expect(call.body).toBeUndefined();
	});
});

describe('apiDelete', () => {
	it('sends DELETE request', async () => {
		mockOkResponse({ deleted: true });
		await apiDelete('/api/bots/123');
		expect(mockFetch).toHaveBeenCalledWith(
			'http://test-backend/api/bots/123',
			expect.objectContaining({ method: 'DELETE', credentials: 'include' })
		);
	});

	it('throws on error response', async () => {
		mockErrorResponse(403);
		await expect(apiDelete('/api/bots/123')).rejects.toThrow('API error: 403');
	});
});

describe('apiPostFormData', () => {
	it('sends POST with FormData body (no Content-Type header)', async () => {
		mockOkResponse({ ok: true });
		const formData = new FormData();
		formData.append('file', 'data');
		await apiPostFormData('/api/upload', formData);
		const call = mockFetch.mock.calls[0][1];
		expect(call.method).toBe('POST');
		expect(call.body).toBe(formData);
		expect(call.headers).toBeUndefined();
	});
});

describe('apiPutFormData', () => {
	it('sends PUT with FormData body', async () => {
		mockOkResponse({ ok: true });
		const formData = new FormData();
		formData.append('name', 'test');
		await apiPutFormData('/api/me', formData);
		const call = mockFetch.mock.calls[0][1];
		expect(call.method).toBe('PUT');
		expect(call.body).toBe(formData);
	});
});
