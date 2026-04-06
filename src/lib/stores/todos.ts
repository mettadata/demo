import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { labels, getLabelsByIds } from './labels.js';

export type Priority = 'none' | 'low' | 'medium' | 'high';

export type ActivityEventType = 'created' | 'edited' | 'moved' | 'completed' | 'uncompleted' | 'attachment_added' | 'attachment_removed' | 'archived' | 'unarchived';

export interface ActivityEvent {
	type: ActivityEventType;
	timestamp: string; // ISO 8601
	detail?: Record<string, unknown>;
}

export interface Attachment {
	id: string;
	name: string;
	mimeType: string;
	dataUrl: string;
	size: number;
	createdAt: string;
}

export interface Reply {
	id: string;
	body: string;
	createdAt: string;
}

export interface Comment {
	id: string;
	body: string;
	createdAt: string;
	replies: Reply[];
}

export interface Todo {
	id: string;
	text: string;
	description: string;
	completed: boolean;
	createdAt: string;
	priority: Priority;
	dueDate: string | null;
	labelIds: string[];
	activityLog: ActivityEvent[];
	attachments: Attachment[];
	comments: Comment[];
	archived: boolean;
}

export type Filter = 'all' | 'active' | 'completed' | 'archived';

export const STORAGE_KEY = 'todos';
export const SORT_STORAGE_KEY = 'sort-by-due-date';

let currentUserId = '';

function todosKey(): string {
	return currentUserId ? `todos_${currentUserId}` : STORAGE_KEY;
}

function sortKey(): string {
	return currentUserId ? `sort-by-due-date_${currentUserId}` : SORT_STORAGE_KEY;
}

function loadTodos(): Todo[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(todosKey());
		if (raw === null) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map((t: Record<string, unknown>) => ({
			...t,
			priority: (t.priority as Priority) ?? 'none',
			dueDate: (t.dueDate as string | null) ?? null,
			description: (t.description as string) ?? '',
			labelIds: Array.isArray(t.labelIds) ? (t.labelIds as string[]) : [],
			attachments: Array.isArray(t.attachments) ? (t.attachments as Attachment[]) : [],
			comments: Array.isArray(t.comments) ? (t.comments as Comment[]) : [],
			activityLog: Array.isArray(t.activityLog)
				? (t.activityLog as ActivityEvent[])
				: [{ type: 'created' as const, timestamp: (t.createdAt as string) ?? new Date().toISOString() }],
			archived: (t.archived as boolean) ?? false
		})) as Todo[];
	} catch {
		return [];
	}
}

function loadSortByDueDate(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		const raw = localStorage.getItem(sortKey());
		return raw === 'true';
	} catch {
		return false;
	}
}

let _lastPersistError: string | null = null;
export function getLastPersistError(): string | null {
	const err = _lastPersistError;
	_lastPersistError = null;
	return err;
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
		localStorage.setItem(todosKey(), JSON.stringify(value));
		_lastPersistError = null;
	} catch {
		_lastPersistError = 'Storage quota exceeded. Attachment not saved.';
		console.warn('Failed to persist todos to localStorage');
	}
});

export const filter: Writable<Filter> = writable<Filter>('all');
export const searchQuery: Writable<string> = writable<string>('');

export const filteredTodos: Readable<Todo[]> = derived(
	[todos, filter, searchQuery, labels],
	([$todos, $filter, $searchQuery, $labels]) => {
		let result = $todos;
		// Show archived cards only when explicitly filtering for them
		if ($filter === 'archived') {
			result = result.filter((t) => t.archived);
		} else {
			result = result.filter((t) => !t.archived);
			switch ($filter) {
				case 'active':
					result = result.filter((t) => !t.completed);
					break;
				case 'completed':
					result = result.filter((t) => t.completed);
					break;
			}
		}
		if ($searchQuery.trim() !== '') {
			const query = $searchQuery.trim().toLowerCase();
			result = result.filter((t) =>
				t.text.toLowerCase().includes(query) ||
				t.description.toLowerCase().includes(query) ||
				getLabelsByIds($labels, t.labelIds).some(l => l.name.toLowerCase().includes(query))
			);
		}
		return result;
	}
);

export const sortByDueDate: Writable<boolean> = writable<boolean>(loadSortByDueDate());

sortByDueDate.subscribe((value) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(sortKey(), String(value));
	} catch {
		console.warn('Failed to persist sort preference to localStorage');
	}
});

export function initTodos(userId: string): void {
	currentUserId = userId;
	todos.set(loadTodos());
	sortByDueDate.set(loadSortByDueDate());
}

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
	const now = new Date().toISOString();
	todos.update((current) => [
		...current,
		{
			id: crypto.randomUUID(),
			text: trimmed,
			description: '',
			completed: false,
			createdAt: now,
			priority: 'none',
			dueDate: null,
			labelIds: [],
			attachments: [],
			comments: [],
			archived: false,
			activityLog: [{ type: 'created', timestamp: now }]
		}
	]);
}

export function toggleTodo(id: string): void {
	snapshot();
	const now = new Date().toISOString();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== id) return t;
			const eventType: ActivityEventType = t.completed ? 'uncompleted' : 'completed';
			return {
				...t,
				completed: !t.completed,
				activityLog: [...t.activityLog, { type: eventType, timestamp: now }]
			};
		})
	);
}

export function removeTodo(id: string): void {
	snapshot();
	todos.update((current) => current.filter((t) => t.id !== id));
}

export function updateTodo(id: string, fields: Partial<Pick<Todo, 'priority' | 'dueDate' | 'description' | 'labelIds'>>): void {
	snapshot();
	const now = new Date().toISOString();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== id) return t;
			const events: ActivityEvent[] = [];
			for (const key of Object.keys(fields) as Array<keyof typeof fields>) {
				const from = t[key];
				const to = fields[key];
				if (JSON.stringify(from) !== JSON.stringify(to)) {
					events.push({ type: 'edited', timestamp: now, detail: { field: key, from, to } });
				}
			}
			return {
				...t,
				...fields,
				activityLog: events.length > 0 ? [...t.activityLog, ...events] : t.activityLog
			};
		})
	);
}

export function addAttachment(todoId: string, attachment: Attachment): boolean {
	snapshot();
	const now = new Date().toISOString();
	let previousTodos: Todo[] = [];
	todos.subscribe((v) => (previousTodos = v))();

	todos.update((current) =>
		current.map((t) => {
			if (t.id !== todoId) return t;
			return {
				...t,
				attachments: [...t.attachments, attachment],
				activityLog: [
					...t.activityLog,
					{ type: 'attachment_added' as const, timestamp: now, detail: { name: attachment.name } }
				]
			};
		})
	);

	const err = getLastPersistError();
	if (err) {
		// Revert: quota exceeded
		todos.set(previousTodos);
		return false;
	}
	return true;
}

export function removeAttachment(todoId: string, attachmentId: string): void {
	snapshot();
	const now = new Date().toISOString();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== todoId) return t;
			const attachment = t.attachments.find((a) => a.id === attachmentId);
			return {
				...t,
				attachments: t.attachments.filter((a) => a.id !== attachmentId),
				activityLog: [
					...t.activityLog,
					{
						type: 'attachment_removed' as const,
						timestamp: now,
						detail: { name: attachment?.name ?? 'unknown' }
					}
				]
			};
		})
	);
}

export function addComment(todoId: string, body: string): void {
	const trimmed = body.trim();
	if (trimmed === '') return;
	snapshot();
	const now = new Date().toISOString();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== todoId) return t;
			const comment: Comment = {
				id: crypto.randomUUID(),
				body: trimmed,
				createdAt: now,
				replies: []
			};
			return { ...t, comments: [...t.comments, comment] };
		})
	);
}

export function editComment(todoId: string, commentId: string, body: string): void {
	const trimmed = body.trim();
	if (trimmed === '') return;
	snapshot();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== todoId) return t;
			return {
				...t,
				comments: t.comments.map((c) =>
					c.id === commentId ? { ...c, body: trimmed } : c
				)
			};
		})
	);
}

export function deleteComment(todoId: string, commentId: string): void {
	snapshot();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== todoId) return t;
			return { ...t, comments: t.comments.filter((c) => c.id !== commentId) };
		})
	);
}

export function addReply(todoId: string, commentId: string, body: string): void {
	const trimmed = body.trim();
	if (trimmed === '') return;
	snapshot();
	const now = new Date().toISOString();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== todoId) return t;
			return {
				...t,
				comments: t.comments.map((c) => {
					if (c.id !== commentId) return c;
					const reply: Reply = {
						id: crypto.randomUUID(),
						body: trimmed,
						createdAt: now
					};
					return { ...c, replies: [...c.replies, reply] };
				})
			};
		})
	);
}

export function editReply(todoId: string, commentId: string, replyId: string, body: string): void {
	const trimmed = body.trim();
	if (trimmed === '') return;
	snapshot();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== todoId) return t;
			return {
				...t,
				comments: t.comments.map((c) => {
					if (c.id !== commentId) return c;
					return {
						...c,
						replies: c.replies.map((r) =>
							r.id === replyId ? { ...r, body: trimmed } : r
						)
					};
				})
			};
		})
	);
}

export function deleteReply(todoId: string, commentId: string, replyId: string): void {
	snapshot();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== todoId) return t;
			return {
				...t,
				comments: t.comments.map((c) => {
					if (c.id !== commentId) return c;
					return { ...c, replies: c.replies.filter((r) => r.id !== replyId) };
				})
			};
		})
	);
}

export function archiveTodo(id: string): void {
	snapshot();
	const now = new Date().toISOString();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== id) return t;
			return {
				...t,
				archived: true,
				activityLog: [...t.activityLog, { type: 'archived' as const, timestamp: now }]
			};
		})
	);
}

export function unarchiveTodo(id: string): void {
	snapshot();
	const now = new Date().toISOString();
	todos.update((current) =>
		current.map((t) => {
			if (t.id !== id) return t;
			return {
				...t,
				archived: false,
				activityLog: [...t.activityLog, { type: 'unarchived' as const, timestamp: now }]
			};
		})
	);
}
