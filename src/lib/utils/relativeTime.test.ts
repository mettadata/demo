import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatActivityDescription } from './relativeTime.js';

describe('formatRelativeTime', () => {
	const base = new Date('2025-06-15T12:00:00.000Z');

	it('returns "just now" for timestamps less than 60 seconds ago', () => {
		expect(formatRelativeTime('2025-06-15T11:59:30.000Z', base)).toBe('just now');
		expect(formatRelativeTime('2025-06-15T12:00:00.000Z', base)).toBe('just now');
	});

	it('returns "just now" for future timestamps', () => {
		expect(formatRelativeTime('2025-06-15T12:01:00.000Z', base)).toBe('just now');
	});

	it('returns minutes ago', () => {
		expect(formatRelativeTime('2025-06-15T11:59:00.000Z', base)).toBe('1 minute ago');
		expect(formatRelativeTime('2025-06-15T11:55:00.000Z', base)).toBe('5 minutes ago');
	});

	it('returns hours ago', () => {
		expect(formatRelativeTime('2025-06-15T11:00:00.000Z', base)).toBe('1 hour ago');
		expect(formatRelativeTime('2025-06-15T09:00:00.000Z', base)).toBe('3 hours ago');
	});

	it('returns yesterday for 1 day ago', () => {
		expect(formatRelativeTime('2025-06-14T12:00:00.000Z', base)).toBe('yesterday');
	});

	it('returns days ago', () => {
		expect(formatRelativeTime('2025-06-10T12:00:00.000Z', base)).toBe('5 days ago');
	});

	it('returns months ago', () => {
		expect(formatRelativeTime('2025-04-15T12:00:00.000Z', base)).toBe('2 months ago');
	});

	it('returns years ago', () => {
		expect(formatRelativeTime('2023-06-15T12:00:00.000Z', base)).toBe('2 years ago');
	});
});

describe('formatActivityDescription', () => {
	it('formats created event', () => {
		expect(formatActivityDescription('created')).toBe('Created');
	});

	it('formats completed event', () => {
		expect(formatActivityDescription('completed')).toBe('Completed');
	});

	it('formats uncompleted event', () => {
		expect(formatActivityDescription('uncompleted')).toBe('Reopened');
	});

	it('formats moved event with column names', () => {
		expect(formatActivityDescription('moved', { fromColumn: 'To Do', toColumn: 'In Progress' }))
			.toBe('Moved from To Do to In Progress');
	});

	it('formats priority edit', () => {
		expect(formatActivityDescription('edited', { field: 'priority', from: 'none', to: 'high' }))
			.toBe('Priority changed from none to high');
	});

	it('formats description edit', () => {
		expect(formatActivityDescription('edited', { field: 'description', from: '', to: 'New desc' }))
			.toBe('Description updated');
	});

	it('formats dueDate set', () => {
		expect(formatActivityDescription('edited', { field: 'dueDate', from: null, to: '2025-06-15' }))
			.toBe('Due date set to 2025-06-15');
	});

	it('formats dueDate removed', () => {
		expect(formatActivityDescription('edited', { field: 'dueDate', from: '2025-06-15', to: null }))
			.toBe('Due date removed');
	});

	it('formats labelIds edit', () => {
		expect(formatActivityDescription('edited', { field: 'labelIds' }))
			.toBe('Labels updated');
	});

	it('formats unknown field edit', () => {
		expect(formatActivityDescription('edited', { field: 'text' }))
			.toBe('text updated');
	});

	it('formats edited without field detail', () => {
		expect(formatActivityDescription('edited')).toBe('Edited');
	});

	it('formats archived event type', () => {
		expect(formatActivityDescription('archived')).toBe('Archived');
	});

	it('formats unarchived event type', () => {
		expect(formatActivityDescription('unarchived')).toBe('Unarchived');
	});

	it('returns type string for unknown event type', () => {
		expect(formatActivityDescription('some_unknown_type')).toBe('some_unknown_type');
	});
});
