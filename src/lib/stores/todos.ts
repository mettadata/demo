import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

export interface Todo {
	id: string;
	text: string;
	completed: boolean;
	createdAt: string;
}

export type Filter = 'all' | 'active' | 'completed';

export const STORAGE_KEY = 'todos';

function loadTodos(): Todo[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed;
	} catch {
		return [];
	}
}

export const todos: Writable<Todo[]> = writable<Todo[]>(loadTodos());

todos.subscribe((value) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} catch {
		console.warn('Failed to persist todos to localStorage');
	}
});

export const filter: Writable<Filter> = writable<Filter>('all');

export const filteredTodos: Readable<Todo[]> = derived(
	[todos, filter],
	([$todos, $filter]) => {
		switch ($filter) {
			case 'active':
				return $todos.filter((t) => !t.completed);
			case 'completed':
				return $todos.filter((t) => t.completed);
			default:
				return $todos;
		}
	}
);

export function addTodo(text: string): void {
	const trimmed = text.trim();
	if (trimmed === '') return;
	todos.update((current) => [
		...current,
		{
			id: crypto.randomUUID(),
			text: trimmed,
			completed: false,
			createdAt: new Date().toISOString()
		}
	]);
}

export function toggleTodo(id: string): void {
	todos.update((current) =>
		current.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
	);
}

export function removeTodo(id: string): void {
	todos.update((current) => current.filter((t) => t.id !== id));
}
