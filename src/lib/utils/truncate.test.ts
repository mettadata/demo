import { describe, it, expect } from 'vitest';
import { truncate, truncateWords } from './truncate.js';

describe('truncate', () => {
	it('returns short text unchanged', () => {
		expect(truncate('hello', 10)).toBe('hello');
	});

	it('returns text unchanged when exactly at maxLength', () => {
		expect(truncate('hello', 5)).toBe('hello');
	});

	it('truncates long text with ellipsis', () => {
		expect(truncate('hello world', 8)).toBe('hello...');
	});

	it('truncates at word boundary when requested', () => {
		expect(truncate('hello beautiful world', 16, { wordBoundary: true })).toBe('hello...');
	});

	it('uses a custom suffix', () => {
		expect(truncate('hello world', 9, { suffix: '--' })).toBe('hello w--');
	});

	it('handles maxLength smaller than suffix length', () => {
		expect(truncate('hello world', 2)).toBe('..');
	});

	it('handles maxLength equal to suffix length', () => {
		expect(truncate('hello world', 3)).toBe('...');
	});
});

describe('truncateWords', () => {
	it('returns short text unchanged', () => {
		expect(truncateWords('hello world', 5)).toBe('hello world');
	});

	it('truncates at word count', () => {
		expect(truncateWords('one two three four five', 3)).toBe('one two three...');
	});

	it('uses a custom suffix', () => {
		expect(truncateWords('one two three four', 2, ' [more]')).toBe('one two [more]');
	});
});
