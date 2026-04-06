/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage before any Svelte imports
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
		removeItem: vi.fn((key: string) => { delete store[key]; }),
		clear: vi.fn(() => { store = {}; }),
		get length() { return Object.keys(store).length; },
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
	};
})();
vi.stubGlobal('localStorage', localStorageMock);

vi.stubGlobal('matchMedia', vi.fn(() => ({
	matches: false,
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	addListener: vi.fn(),
	removeListener: vi.fn(),
	dispatchEvent: vi.fn(),
	media: '',
	onchange: null,
})));

import { render, screen, cleanup } from '@testing-library/svelte';
import BoardStatsDashboard from '../BoardStatsDashboard.svelte';
import { kanbanState } from '$lib/stores/kanban.js';
import { todos } from '$lib/stores/todos.js';
import type { Todo } from '$lib/stores/todos.js';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
	return {
		id: crypto.randomUUID(),
		text: 'test',
		description: '',
		completed: false,
		createdAt: new Date().toISOString(),
		priority: 'none',
		dueDate: null,
		labelIds: [],
		attachments: [],
		comments: [],
		archived: false,
		ownerId: '',
		activityLog: [{ type: 'created', timestamp: new Date().toISOString() }],
		...overrides
	};
}

beforeEach(() => {
	localStorageMock.clear();
	todos.set([]);
	kanbanState.set({ columns: [
		{ id: 'col-todo', title: 'To Do', cardIds: [] },
		{ id: 'col-in-progress', title: 'In Progress', cardIds: [] },
		{ id: 'col-done', title: 'Done', cardIds: [] }
	]});
});

afterEach(() => {
	cleanup();
});

describe('BoardStatsDashboard', () => {
	it('shows 0% complete and 0 overdue with empty stores', () => {
		render(BoardStatsDashboard);

		expect(screen.getByText('0% complete')).toBeTruthy();
		expect(screen.getByText('0 overdue')).toBeTruthy();
	});

	it('displays column counts correctly', () => {
		const t1 = makeTodo({ id: 'a' });
		const t2 = makeTodo({ id: 'b' });
		const t3 = makeTodo({ id: 'c' });
		todos.set([t1, t2, t3]);
		kanbanState.set({ columns: [
			{ id: 'col-1', title: 'Backlog', cardIds: ['a', 'b'] },
			{ id: 'col-2', title: 'Done', cardIds: ['c'] }
		]});

		render(BoardStatsDashboard);

		expect(screen.getByText('Backlog: 2')).toBeTruthy();
		expect(screen.getByText('Done: 1')).toBeTruthy();
	});

	it('shows count 0 for column with no cards', () => {
		kanbanState.set({ columns: [
			{ id: 'col-1', title: 'Empty Col', cardIds: [] }
		]});

		render(BoardStatsDashboard);

		expect(screen.getByText('Empty Col: 0')).toBeTruthy();
	});

	it('rounds completion correctly (3/7 = 43%)', () => {
		const items = Array.from({ length: 7 }, (_, i) =>
			makeTodo({ id: `t${i}`, completed: i < 3 })
		);
		todos.set(items);

		render(BoardStatsDashboard);

		expect(screen.getByText('43% complete')).toBeTruthy();
	});

	it('shows 100% when all todos are completed', () => {
		const items = [
			makeTodo({ id: 'x', completed: true }),
			makeTodo({ id: 'y', completed: true })
		];
		todos.set(items);

		render(BoardStatsDashboard);

		expect(screen.getByText('100% complete')).toBeTruthy();
	});

	it('excludes archived todos from completion calculation', () => {
		const items = [
			makeTodo({ id: 'a', completed: true }),
			makeTodo({ id: 'b', completed: false }),
			makeTodo({ id: 'c', completed: false }),
			makeTodo({ id: 'd', completed: true, archived: true })
		];
		todos.set(items);

		render(BoardStatsDashboard);

		// 1 completed out of 3 non-archived = 33%
		expect(screen.getByText('33% complete')).toBeTruthy();
	});

	describe('overdue calculations', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-04-06T12:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('counts past-due incomplete todos as overdue', () => {
			const items = [
				makeTodo({ id: 'a', dueDate: '2026-04-05', completed: false }),
				makeTodo({ id: 'b', dueDate: '2026-04-03', completed: false }),
				makeTodo({ id: 'c', dueDate: '2026-04-10', completed: false })
			];
			todos.set(items);

			render(BoardStatsDashboard);

			expect(screen.getByText('2 overdue')).toBeTruthy();
		});

		it('does not count due-today as overdue', () => {
			const items = [
				makeTodo({ id: 'a', dueDate: '2026-04-06', completed: false })
			];
			todos.set(items);

			render(BoardStatsDashboard);

			expect(screen.getByText('0 overdue')).toBeTruthy();
		});

		it('does not count completed past-due todos as overdue', () => {
			const items = [
				makeTodo({ id: 'a', dueDate: '2026-04-01', completed: true })
			];
			todos.set(items);

			render(BoardStatsDashboard);

			expect(screen.getByText('0 overdue')).toBeTruthy();
		});

		it('does not count archived past-due todos as overdue', () => {
			const items = [
				makeTodo({ id: 'a', dueDate: '2026-04-01', completed: false, archived: true })
			];
			todos.set(items);

			render(BoardStatsDashboard);

			expect(screen.getByText('0 overdue')).toBeTruthy();
		});
	});

	it('has correct ARIA attributes on progress bar', () => {
		const items = [
			makeTodo({ id: 'a', completed: true }),
			makeTodo({ id: 'b', completed: false })
		];
		todos.set(items);

		render(BoardStatsDashboard);

		const progressbar = screen.getByRole('progressbar');
		expect(progressbar).toBeTruthy();
		expect(progressbar.getAttribute('aria-valuenow')).toBe('50');
		expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
		expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
	});

	it('has accessible label on overdue badge', () => {
		const items = [
			makeTodo({ id: 'a', dueDate: '2020-01-01', completed: false })
		];
		todos.set(items);

		render(BoardStatsDashboard);

		const badge = screen.getByLabelText('1 overdue');
		expect(badge).toBeTruthy();
	});
});
