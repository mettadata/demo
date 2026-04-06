import { describe, it, expect } from 'vitest';
import { formatDisplayDate, formatIsoDate, formatShortDate } from './dateFormat.js';

describe('formatDisplayDate', () => {
	const ref = new Date('2026-04-06T12:00:00');

	it('returns "Today" for the same date', () => {
		expect(formatDisplayDate('2026-04-06', ref)).toBe('Today');
	});

	it('returns "Yesterday" for the previous day', () => {
		expect(formatDisplayDate('2026-04-05', ref)).toBe('Yesterday');
	});

	it('returns "Tomorrow" for the next day', () => {
		expect(formatDisplayDate('2026-04-07', ref)).toBe('Tomorrow');
	});

	it('returns a formatted date for older dates', () => {
		expect(formatDisplayDate('2026-03-15', ref)).toBe('Mar 15, 2026');
	});

	it('returns a formatted date for future dates beyond tomorrow', () => {
		expect(formatDisplayDate('2026-04-10', ref)).toBe('Apr 10, 2026');
	});
});

describe('formatIsoDate', () => {
	it('returns YYYY-MM-DD for a valid date string', () => {
		expect(formatIsoDate('2026-04-06')).toBe('2026-04-06');
	});

	it('extracts date from a full ISO timestamp', () => {
		expect(formatIsoDate('2026-04-06T14:30:00.000Z')).toBe('2026-04-06');
	});

	it('throws for an invalid date string', () => {
		expect(() => formatIsoDate('not-a-date')).toThrow(TypeError);
		expect(() => formatIsoDate('not-a-date')).toThrow('Invalid ISO date');
	});

	it('throws for an empty string', () => {
		expect(() => formatIsoDate('')).toThrow(TypeError);
	});
});

describe('formatShortDate', () => {
	it('returns short format like "Apr 6"', () => {
		expect(formatShortDate('2026-04-06')).toBe('Apr 6');
	});

	it('returns short format for a different month', () => {
		expect(formatShortDate('2026-12-25')).toBe('Dec 25');
	});
});
