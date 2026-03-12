import { describe, it, expect } from 'bun:test';
import { maskApiKey } from './crypto';

describe('maskApiKey', () => {
	it('shows first 4 + "..." + last 4 for keys longer than 10 chars', () => {
		expect(maskApiKey('abcdefghijk')).toBe('abcd...hijk');
		expect(maskApiKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
	});

	it('returns "**** " for keys shorter than 10 chars', () => {
		expect(maskApiKey('short')).toBe('****');
		expect(maskApiKey('abc')).toBe('****');
		expect(maskApiKey('123456789')).toBe('****');
	});

	it('returns first 4 + "..." + last 4 for exactly 10 chars', () => {
		expect(maskApiKey('abcdefghij')).toBe('abcd...ghij');
	});

	it('returns "**** " for empty string', () => {
		expect(maskApiKey('')).toBe('****');
	});
});
