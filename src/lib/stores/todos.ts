import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

export type Priority = 'none' | 'low' | 'medium' | 'high';

export interface Todo {
	id: string;
	text: string;
	description: string;
	completed: boolean;
	createdAt: string;
	priority: Priority;
	dueDate: string | null;
}

export type Filter = 'all' | 'active' | 'completed';

export const STORAGE_KEY = 'todos';
export const SORT_STORAGE_KEY = 'sort-by-due-date';

function loadTodos(): Todo[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map((t: Record<string, unknown>) => ({
			...t,
			priority: (t.priority as Priority) ?? 'none',
			dueDate: (t.dueDate as string | null) ?? null,
			description: (t.description as string) ?? ''
		})) as Todo[];
	} catch {
		return [];
	}
}

function loadSortByDueDate(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		const raw = localStorage.getItem(SORT_STORAGE_KEY);
		return raw === 'true';
	} catch {
		return false;
	}
}

let _snapshotFn: (() => void) | null = null;
export function registerSnapshotFn(fn: () => void): void {
	_snapshotFn = fn;
}
function snapshot(): void {
	if (_snapshotFn) _snapshotFn();
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
export const searchQuery: Writable<string> = writable<string>('');

export const filteredTodos: Readable<Todo[]> = derived(
	[todos, filter, searchQuery],
	([$todos, $filter, $searchQuery]) => {
		let result = $todos;
		switch ($filter) {
			case 'active':
				result = result.filter((t) => !t.completed);
				break;
			case 'completed':
				result = result.filter((t) => t.completed);
				break;
		}
		if ($searchQuery.trim() !== '') {
			const query = $searchQuery.trim().toLowerCase();
			result = result.filter((t) => t.text.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
		}
		return result;
	}
);

export const sortByDueDate: Writable<boolean> = writable<boolean>(loadSortByDueDate());

sortByDueDate.subscribe((value) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(SORT_STORAGE_KEY, String(value));
	} catch {
		console.warn('Failed to persist sort preference to localStorage');
	}
});

export function sortTodosByDueDate(todos: Todo[]): Todo[] {
	return [...todos].sort((a, b) => {
		if (a.dueDate === null && b.dueDate === null) return 0;
		if (a.dueDate === null) return 1;
		if (b.dueDate === null) return -1;
		return a.dueDate.localeCompare(b.dueDate);
	});
}

export const sortedFilteredTodos: Readable<Todo[]> = derived(
	[filteredTodos, sortByDueDate],
	([$filteredTodos, $sortByDueDate]) => {
		if (!$sortByDueDate) return $filteredTodos;
		return sortTodosByDueDate($filteredTodos);
	}
);

export function addTodo(text: string): void {
	const trimmed = text.trim();
	if (trimmed === '') return;
	snapshot();
	todos.update((current) => [
		...current,
		{
			id: crypto.randomUUID(),
			text: trimmed,
			description: '',
			completed: false,
			createdAt: new Date().toISOString(),
			priority: 'none',
			dueDate: null
		}
	]);
}

export function toggleTodo(id: string): void {
	snapshot();
	todos.update((current) =>
		current.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
	);
}

export function removeTodo(id: string): void {
	snapshot();
	todos.update((current) => current.filter((t) => t.id !== id));
}

export function updateTodo(id: string, fields: Partial<Pick<Todo, 'priority' | 'dueDate' | 'description'>>): void {
	snapshot();
	todos.update((current) =>
		current.map((t) => (t.id === id ? { ...t, ...fields } : t))
	);
}
