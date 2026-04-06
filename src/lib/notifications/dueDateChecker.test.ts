import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writable } from 'svelte/store';
import type { Todo } from '$lib/stores/todos.js';

// Controlled writable for the todos store
const mockTodosStore = writable<Todo[]>([]);

vi.mock('$lib/stores/todos.js', () => ({
	todos: mockTodosStore
}));

// Track push calls
const mockPush = vi.fn();
vi.mock('$lib/stores/notifications.js', () => ({
	push: (...args: unknown[]) => mockPush(...args)
}));

function makeTodo(overrides: Partial<Todo> = {}): Todo {
	return {
		id: crypto.randomUUID(),
		text: 'Test card',
		description: '',
		completed: false,
		createdAt: new Date().toISOString(),
		priority: 'none',
		dueDate: null,
		labelIds: [],
		activityLog: [],
		attachments: [],
		comments: [],
		archived: false,
		ownerId: '',
		...overrides
	};
}

function yesterday(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return d.toISOString().split('T')[0];
}

function today(): string {
	return new Date().toISOString().split('T')[0];
}

function tomorrow(): string {
	const d = new Date();
	d.setDate(d.getDate() + 1);
	return d.toISOString().split('T')[0];
}

describe('dueDateChecker', () => {
	let startDueDateChecker: typeof import('./dueDateChecker.js').startDueDateChecker;

	beforeEach(async () => {
		vi.useFakeTimers();
		vi.resetModules();
		mockPush.mockClear();
		mockTodosStore.set([]);

		const mod = await import('./dueDateChecker.js');
		startDueDateChecker = mod.startDueDateChecker;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('overdue card triggers exactly one push on first cycle', () => {
		const todo = makeTodo({ dueDate: yesterday(), text: 'Fix login bug' });
		mockTodosStore.set([todo]);

		startDueDateChecker();

		expect(mockPush).toHaveBeenCalledTimes(1);
	});

	it('already-notified card does NOT trigger push on second call', () => {
		const todo = makeTodo({ dueDate: yesterday(), text: 'Fix login bug' });
		mockTodosStore.set([todo]);

		startDueDateChecker();
		expect(mockPush).toHaveBeenCalledTimes(1);

		// Advance to next interval tick
		vi.advanceTimersByTime(60_000);
		expect(mockPush).toHaveBeenCalledTimes(1);
	});

	it('card due today is NOT treated as overdue', () => {
		const todo = makeTodo({ dueDate: today(), text: 'Due today' });
		mockTodosStore.set([todo]);

		startDueDateChecker();

		expect(mockPush).not.toHaveBeenCalled();
	});

	it('card due tomorrow is NOT treated as overdue', () => {
		const todo = makeTodo({ dueDate: tomorrow(), text: 'Due tomorrow' });
		mockTodosStore.set([todo]);

		startDueDateChecker();

		expect(mockPush).not.toHaveBeenCalled();
	});

	it('completed overdue card is skipped', () => {
		const todo = makeTodo({ dueDate: yesterday(), completed: true, text: 'Done card' });
		mockTodosStore.set([todo]);

		startDueDateChecker();

		expect(mockPush).not.toHaveBeenCalled();
	});

	it('archived overdue card is skipped', () => {
		const todo = makeTodo({ dueDate: yesterday(), archived: true, text: 'Archived card' });
		mockTodosStore.set([todo]);

		startDueDateChecker();

		expect(mockPush).not.toHaveBeenCalled();
	});

	it('two overdue cards produce two pushes', () => {
		const todo1 = makeTodo({ dueDate: yesterday(), text: 'Card A' });
		const todo2 = makeTodo({ dueDate: yesterday(), text: 'Card B' });
		mockTodosStore.set([todo1, todo2]);

		startDueDateChecker();

		expect(mockPush).toHaveBeenCalledTimes(2);
	});

	it('cleanup function stops subsequent interval ticks', () => {
		const todo = makeTodo({ dueDate: yesterday(), text: 'Overdue card' });
		mockTodosStore.set([todo]);

		const cleanup = startDueDateChecker();
		expect(mockPush).toHaveBeenCalledTimes(1);

		cleanup();

		// Add a new overdue card that would be detected on the next cycle
		const todo2 = makeTodo({ dueDate: yesterday(), text: 'New overdue' });
		mockTodosStore.set([todo, todo2]);

		vi.advanceTimersByTime(60_000);
		vi.advanceTimersByTime(60_000);

		// Should still be 1 from the initial cycle, no further calls
		expect(mockPush).toHaveBeenCalledTimes(1);
	});

	it('push receives correct shape: { type, title, message }', () => {
		const todo = makeTodo({ dueDate: yesterday(), text: 'Fix login bug' });
		mockTodosStore.set([todo]);

		startDueDateChecker();

		expect(mockPush).toHaveBeenCalledWith({
			type: 'overdue',
			title: 'Card Overdue',
			message: 'Fix login bug'
		});
	});
});
