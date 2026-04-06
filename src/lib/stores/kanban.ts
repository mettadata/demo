import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { todos } from './todos.js';
import type { Todo, ActivityEvent } from './todos.js';

export interface KanbanColumn {
	id: string;
	title: string;
	cardIds: string[];
}

export interface KanbanState {
	columns: KanbanColumn[];
}

export interface ResolvedColumn {
	id: string;
	title: string;
	cards: Todo[];
}

export type ViewPreference = 'list' | 'kanban';

export const KANBAN_STORAGE_KEY = 'kanban-state';
export const VIEW_PREF_STORAGE_KEY = 'view-preference';

const DEFAULT_COLUMNS: KanbanColumn[] = [
	{ id: 'col-todo', title: 'To Do', cardIds: [] },
	{ id: 'col-in-progress', title: 'In Progress', cardIds: [] },
	{ id: 'col-done', title: 'Done', cardIds: [] }
];

export interface BoardTemplate {
	name: string;
	description: string;
	columns: Array<{ title: string; sampleCards: string[] }>;
}

export const BOARD_TEMPLATES: Record<'kanban' | 'scrum' | 'personal', BoardTemplate> = {
	kanban: {
		name: 'Kanban',
		description: 'Classic workflow for continuous delivery',
		columns: [
			{ title: 'Backlog', sampleCards: ['Define acceptance criteria', 'Research competitor features'] },
			{ title: 'To Do', sampleCards: ['Implement feature', 'Update documentation'] },
			{ title: 'In Progress', sampleCards: ['Build login page', 'Write API tests'] },
			{ title: 'Review', sampleCards: ['Request peer review', 'Address feedback'] },
			{ title: 'Done', sampleCards: ['Deploy to production', 'Send release notes'] }
		]
	},
	scrum: {
		name: 'Scrum',
		description: 'Sprint-based agile development workflow',
		columns: [
			{ title: 'Sprint Backlog', sampleCards: ['Refine user stories', 'Estimate story points'] },
			{ title: 'In Progress', sampleCards: ['Build search component', 'Implement caching'] },
			{ title: 'In Review', sampleCards: ['Review pull request', 'Check accessibility'] },
			{ title: 'Testing', sampleCards: ['Write unit tests', 'Deploy to staging'] },
			{ title: 'Done', sampleCards: ['Conduct sprint retrospective', 'Update project board'] }
		]
	},
	personal: {
		name: 'Personal',
		description: 'Daily planning and personal task management',
		columns: [
			{ title: 'Ideas', sampleCards: ['Learn a new recipe', 'Start a side project'] },
			{ title: 'Today', sampleCards: ['Read for 20 minutes', 'Respond to emails'] },
			{ title: 'This Week', sampleCards: ['Plan weekend', 'Exercise three times'] },
			{ title: 'Completed', sampleCards: ['Review weekly goals', 'Organize workspace'] }
		]
	}
};

function loadKanbanState(existingTodoIds: string[]): KanbanState {
	if (typeof window === 'undefined') return { columns: structuredClone(DEFAULT_COLUMNS) };
	try {
		const raw = localStorage.getItem(KANBAN_STORAGE_KEY);
		if (raw !== null) {
			const parsed = JSON.parse(raw);
			if (parsed && Array.isArray(parsed.columns)) {
				return parsed as KanbanState;
			}
		}
	} catch {
		// fall through to default
	}
	const columns = structuredClone(DEFAULT_COLUMNS);
	columns[0].cardIds = [...existingTodoIds];
	return { columns };
}

function loadViewPreference(): ViewPreference {
	if (typeof window === 'undefined') return 'list';
	try {
		const raw = localStorage.getItem(VIEW_PREF_STORAGE_KEY);
		if (raw === 'list' || raw === 'kanban') return raw;
	} catch {
		// fall through
	}
	return 'list';
}

function getInitialTodoIds(): string[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem('todos');
		if (raw === null) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map((t: Todo) => t.id);
	} catch {
		return [];
	}
}

const initialTodoIds = getInitialTodoIds();

export const kanbanState: Writable<KanbanState> = writable<KanbanState>(loadKanbanState(initialTodoIds));
export const viewPreference: Writable<ViewPreference> = writable<ViewPreference>(loadViewPreference());

// Persist kanbanState to localStorage
kanbanState.subscribe((value) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(KANBAN_STORAGE_KEY, JSON.stringify(value));
	} catch {
		console.warn('Failed to persist kanban state to localStorage');
	}
});

// Persist viewPreference to localStorage
viewPreference.subscribe((value) => {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(VIEW_PREF_STORAGE_KEY, value);
	} catch {
		console.warn('Failed to persist view preference to localStorage');
	}
});

// Derived store: resolve cardIds to full Todo objects
export const kanbanBoard: Readable<ResolvedColumn[]> = derived(
	[kanbanState, todos],
	([$kanbanState, $todos]) => {
		const todoMap = new Map<string, Todo>();
		for (const todo of $todos) {
			todoMap.set(todo.id, todo);
		}
		return $kanbanState.columns.map((col) => ({
			id: col.id,
			title: col.title,
			cards: col.cardIds
				.map((id) => todoMap.get(id))
				.filter((t): t is Todo => t !== undefined && !t.archived)
		}));
	}
);

// Sync kanban columns with todo changes
function syncWithTodos(currentTodos: Todo[]): void {
	const todoIds = new Set(currentTodos.map((t) => t.id));

	kanbanState.update((state) => {
		const allCardIds = new Set<string>();
		for (const col of state.columns) {
			for (const id of col.cardIds) {
				allCardIds.add(id);
			}
		}

		// Find new todo IDs not in any column
		const newIds = currentTodos
			.map((t) => t.id)
			.filter((id) => !allCardIds.has(id));

		// Find orphaned IDs in columns but not in todos
		const orphanedIds = new Set<string>();
		for (const id of allCardIds) {
			if (!todoIds.has(id)) {
				orphanedIds.add(id);
			}
		}

		if (newIds.length === 0 && orphanedIds.size === 0) {
			return state;
		}

		const newColumns = state.columns.map((col, index) => ({
			...col,
			cardIds: [
				...col.cardIds.filter((id) => !orphanedIds.has(id)),
				...(index === 0 ? newIds : [])
			]
		}));

		return { columns: newColumns };
	});
}

todos.subscribe((currentTodos) => {
	syncWithTodos(currentTodos);
});

// --- Template functions ---

export function isBoardPristine(): boolean {
	const state = get(kanbanState);
	if (state.columns.length !== 3) return false;
	const expectedIds = ['col-todo', 'col-in-progress', 'col-done'];
	for (let i = 0; i < 3; i++) {
		if (state.columns[i].id !== expectedIds[i]) return false;
		if (state.columns[i].cardIds.length !== 0) return false;
	}
	return true;
}

export function applyTemplate(templateName: string): void {
	const template = BOARD_TEMPLATES[templateName as keyof typeof BOARD_TEMPLATES];
	if (!template) {
		throw new Error(`Unknown template: "${templateName}"`);
	}

	const now = new Date().toISOString();
	const newTodos: Todo[] = [];
	const newColumns: KanbanColumn[] = [];

	for (const colDef of template.columns) {
		const colId = crypto.randomUUID();
		const cardIds: string[] = [];

		for (const cardTitle of colDef.sampleCards) {
			const todoId = crypto.randomUUID();
			cardIds.push(todoId);
			newTodos.push({
				id: todoId,
				text: cardTitle,
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
			});
		}

		newColumns.push({ id: colId, title: colDef.title, cardIds });
	}

	// Set kanbanState FIRST so syncWithTodos finds all new IDs already in columns
	kanbanState.set({ columns: newColumns });
	todos.update(() => newTodos);
}

// --- Mutation functions ---

export function addColumn(title: string): void {
	const trimmed = title.trim();
	if (trimmed === '') return;
	kanbanState.update((state) => ({
		columns: [
			...state.columns,
			{ id: crypto.randomUUID(), title: trimmed, cardIds: [] }
		]
	}));
}

export function renameColumn(columnId: string, title: string): void {
	const trimmed = title.trim();
	if (trimmed === '') return;
	kanbanState.update((state) => ({
		columns: state.columns.map((col) =>
			col.id === columnId ? { ...col, title: trimmed } : col
		)
	}));
}

export function deleteColumn(columnId: string): void {
	kanbanState.update((state) => {
		if (state.columns.length <= 1) {
			throw new Error('Cannot delete the last column');
		}
		const colIndex = state.columns.findIndex((c) => c.id === columnId);
		if (colIndex === -1) return state;

		const deletedCol = state.columns[colIndex];
		const remaining = state.columns.filter((c) => c.id !== columnId);

		// Move cards from deleted column to first remaining column
		remaining[0] = {
			...remaining[0],
			cardIds: [...remaining[0].cardIds, ...deletedCol.cardIds]
		};

		return { columns: remaining };
	});
}

export function moveColumn(columnId: string, newIndex: number): void {
	kanbanState.update((state) => {
		const colIndex = state.columns.findIndex((c) => c.id === columnId);
		if (colIndex === -1) return state;

		const columns = [...state.columns];
		const [removed] = columns.splice(colIndex, 1);
		columns.splice(newIndex, 0, removed);
		return { columns };
	});
}

export function moveCard(todoId: string, targetColumnId: string, targetIndex: number): void {
	let fromColumnTitle = '';
	let toColumnTitle = '';
	let moved = false;

	kanbanState.update((state) => {
		const columns = state.columns.map((col) => ({ ...col, cardIds: [...col.cardIds] }));

		// Remove card from current column
		let sourceColIndex = -1;
		for (let i = 0; i < columns.length; i++) {
			const cardIndex = columns[i].cardIds.indexOf(todoId);
			if (cardIndex !== -1) {
				sourceColIndex = i;
				columns[i].cardIds.splice(cardIndex, 1);
				break;
			}
		}

		if (sourceColIndex === -1) return state;

		// Insert into target column at target index
		const targetCol = columns.find((c) => c.id === targetColumnId);
		if (!targetCol) return state;

		targetCol.cardIds.splice(targetIndex, 0, todoId);

		// Track column titles for activity log (only for cross-column moves)
		if (columns[sourceColIndex].id !== targetColumnId) {
			fromColumnTitle = columns[sourceColIndex].title;
			toColumnTitle = targetCol.title;
			moved = true;
		}

		return { columns };
	});

	// Append move event to the todo's activity log (only if todo exists)
	if (moved) {
		const currentTodos = get(todos);
		const todoExists = currentTodos.some((t) => t.id === todoId);
		if (todoExists) {
			const now = new Date().toISOString();
			const event: ActivityEvent = {
				type: 'moved',
				timestamp: now,
				detail: { fromColumn: fromColumnTitle, toColumn: toColumnTitle }
			};
			todos.update((current) =>
				current.map((t) =>
					t.id === todoId
						? { ...t, activityLog: [...t.activityLog, event] }
						: t
				)
			);
		}
	}
}
