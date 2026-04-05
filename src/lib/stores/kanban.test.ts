import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock localStorage before importing the store module
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
	};
})();

vi.stubGlobal('localStorage', localStorageMock);

// Mock crypto.randomUUID for deterministic IDs
let uuidCounter = 0;
vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`)
});

describe('kanban store', () => {
	let kanbanState: typeof import('./kanban.js').kanbanState;
	let viewPreference: typeof import('./kanban.js').viewPreference;
	let kanbanBoard: typeof import('./kanban.js').kanbanBoard;
	let addColumn: typeof import('./kanban.js').addColumn;
	let renameColumn: typeof import('./kanban.js').renameColumn;
	let deleteColumn: typeof import('./kanban.js').deleteColumn;
	let moveColumn: typeof import('./kanban.js').moveColumn;
	let moveCard: typeof import('./kanban.js').moveCard;
	let todos: typeof import('./todos.js').todos;

	beforeEach(async () => {
		vi.resetModules();
		localStorageMock.clear();
		vi.mocked(localStorageMock.getItem).mockClear();
		vi.mocked(localStorageMock.setItem).mockClear();
		uuidCounter = 0;

		const todosMod = await import('./todos.js');
		todos = todosMod.todos;
		todos.set([]);

		const mod = await import('./kanban.js');
		kanbanState = mod.kanbanState;
		viewPreference = mod.viewPreference;
		kanbanBoard = mod.kanbanBoard;
		addColumn = mod.addColumn;
		renameColumn = mod.renameColumn;
		deleteColumn = mod.deleteColumn;
		moveColumn = mod.moveColumn;
		moveCard = mod.moveCard;
	});

	it('initializes with 3 default columns when no localStorage', () => {
		const state = get(kanbanState);
		expect(state.columns).toHaveLength(3);
		expect(state.columns[0].title).toBe('To Do');
		expect(state.columns[1].title).toBe('In Progress');
		expect(state.columns[2].title).toBe('Done');
	});

	it('restores from valid localStorage state', async () => {
		const saved = {
			columns: [
				{ id: 'custom-1', title: 'Backlog', cardIds: [] },
				{ id: 'custom-2', title: 'Review', cardIds: [] }
			]
		};
		localStorageMock.setItem('kanban-state', JSON.stringify(saved));

		vi.resetModules();
		const todosMod = await import('./todos.js');
		todosMod.todos.set([]);
		const mod = await import('./kanban.js');
		const state = get(mod.kanbanState);
		expect(state.columns).toHaveLength(2);
		expect(state.columns[0].title).toBe('Backlog');
		expect(state.columns[1].title).toBe('Review');
	});

	it('addColumn("Review") adds a 4th column', () => {
		addColumn('Review');
		const state = get(kanbanState);
		expect(state.columns).toHaveLength(4);
		expect(state.columns[3].title).toBe('Review');
		expect(state.columns[3].id).toBe('test-uuid-1');
		expect(state.columns[3].cardIds).toEqual([]);
	});

	it('addColumn("") is rejected', () => {
		addColumn('');
		expect(get(kanbanState).columns).toHaveLength(3);

		addColumn('   ');
		expect(get(kanbanState).columns).toHaveLength(3);
	});

	it('renameColumn updates title', () => {
		const colId = get(kanbanState).columns[1].id;
		renameColumn(colId, 'Doing');
		expect(get(kanbanState).columns[1].title).toBe('Doing');
	});

	it('renameColumn with empty is rejected', () => {
		const colId = get(kanbanState).columns[0].id;
		renameColumn(colId, '');
		expect(get(kanbanState).columns[0].title).toBe('To Do');

		renameColumn(colId, '   ');
		expect(get(kanbanState).columns[0].title).toBe('To Do');
	});

	it('deleteColumn removes column and moves cards to first column', () => {
		// Put a card in the second column
		kanbanState.update((s) => {
			s.columns[1].cardIds = ['card-a'];
			return { columns: [...s.columns] };
		});

		const colId = get(kanbanState).columns[1].id;
		deleteColumn(colId);

		const state = get(kanbanState);
		expect(state.columns).toHaveLength(2);
		expect(state.columns[0].cardIds).toContain('card-a');
	});

	it('deleteColumn throws when only 1 column remains', () => {
		// Remove two columns first
		const col2Id = get(kanbanState).columns[2].id;
		deleteColumn(col2Id);
		const col1Id = get(kanbanState).columns[1].id;
		deleteColumn(col1Id);

		expect(get(kanbanState).columns).toHaveLength(1);

		const lastId = get(kanbanState).columns[0].id;
		expect(() => deleteColumn(lastId)).toThrow('Cannot delete the last column');
	});

	it('moveCard cross-column', () => {
		kanbanState.update((s) => {
			s.columns[0].cardIds = ['card-1', 'card-2'];
			s.columns[1].cardIds = ['card-3'];
			return { columns: [...s.columns] };
		});

		const targetColId = get(kanbanState).columns[1].id;
		moveCard('card-1', targetColId, 0);

		const state = get(kanbanState);
		expect(state.columns[0].cardIds).toEqual(['card-2']);
		expect(state.columns[1].cardIds).toEqual(['card-1', 'card-3']);
	});

	it('moveCard within-column reorder', () => {
		kanbanState.update((s) => {
			s.columns[0].cardIds = ['card-1', 'card-2', 'card-3'];
			return { columns: [...s.columns] };
		});

		const colId = get(kanbanState).columns[0].id;
		moveCard('card-1', colId, 2);

		const state = get(kanbanState);
		expect(state.columns[0].cardIds).toEqual(['card-2', 'card-3', 'card-1']);
	});

	it('sync adds new todo IDs to first column', () => {
		todos.set([
			{ id: 'new-todo-1', text: 'Task 1', description: '', completed: false, createdAt: new Date().toISOString(), priority: 'none', dueDate: null, labelIds: [] },
			{ id: 'new-todo-2', text: 'Task 2', description: '', completed: false, createdAt: new Date().toISOString(), priority: 'none', dueDate: null, labelIds: [] }
		]);

		const state = get(kanbanState);
		expect(state.columns[0].cardIds).toContain('new-todo-1');
		expect(state.columns[0].cardIds).toContain('new-todo-2');
	});

	it('sync removes orphaned card IDs', () => {
		// Place a card ID that does not correspond to any todo
		kanbanState.update((s) => {
			s.columns[0].cardIds = ['orphan-id'];
			return { columns: [...s.columns] };
		});

		// Trigger sync by setting todos (which has no 'orphan-id')
		todos.set([]);

		const state = get(kanbanState);
		for (const col of state.columns) {
			expect(col.cardIds).not.toContain('orphan-id');
		}
	});

	it('every mutation triggers localStorage.setItem', () => {
		vi.mocked(localStorageMock.setItem).mockClear();

		addColumn('Test');
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'kanban-state',
			expect.any(String)
		);

		vi.mocked(localStorageMock.setItem).mockClear();
		const colId = get(kanbanState).columns[0].id;
		renameColumn(colId, 'Renamed');
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'kanban-state',
			expect.any(String)
		);
	});

	describe('moveCard drop index edge cases', () => {
		it('moves card to index 0 in empty column', () => {
			kanbanState.update((s) => {
				s.columns[0].cardIds = ['card-1'];
				s.columns[1].cardIds = [];
				return { columns: [...s.columns] };
			});

			const targetColId = get(kanbanState).columns[1].id;
			moveCard('card-1', targetColId, 0);

			const state = get(kanbanState);
			expect(state.columns[0].cardIds).toEqual([]);
			expect(state.columns[1].cardIds).toEqual(['card-1']);
		});

		it('same-column: [A, B, C], move A to index 2 → [B, C, A]', () => {
			kanbanState.update((s) => {
				s.columns[0].cardIds = ['card-a', 'card-b', 'card-c'];
				return { columns: [...s.columns] };
			});

			const colId = get(kanbanState).columns[0].id;
			moveCard('card-a', colId, 2);

			expect(get(kanbanState).columns[0].cardIds).toEqual(['card-b', 'card-c', 'card-a']);
		});

		it('same-column: [A, B, C], move C to index 0 → [C, A, B]', () => {
			kanbanState.update((s) => {
				s.columns[0].cardIds = ['card-a', 'card-b', 'card-c'];
				return { columns: [...s.columns] };
			});

			const colId = get(kanbanState).columns[0].id;
			moveCard('card-c', colId, 0);

			expect(get(kanbanState).columns[0].cardIds).toEqual(['card-c', 'card-a', 'card-b']);
		});

		it('same-column: [A, B, C], move B to index 1 → [A, B, C]', () => {
			kanbanState.update((s) => {
				s.columns[0].cardIds = ['card-a', 'card-b', 'card-c'];
				return { columns: [...s.columns] };
			});

			const colId = get(kanbanState).columns[0].id;
			moveCard('card-b', colId, 1);

			expect(get(kanbanState).columns[0].cardIds).toEqual(['card-a', 'card-b', 'card-c']);
		});

		it('cross-column: move middle card from col-0 to col-1 at index 0', () => {
			kanbanState.update((s) => {
				s.columns[0].cardIds = ['card-a', 'card-b', 'card-c'];
				s.columns[1].cardIds = ['card-d', 'card-e'];
				return { columns: [...s.columns] };
			});

			const targetColId = get(kanbanState).columns[1].id;
			moveCard('card-b', targetColId, 0);

			const state = get(kanbanState);
			expect(state.columns[0].cardIds).toEqual(['card-a', 'card-c']);
			expect(state.columns[1].cardIds).toEqual(['card-b', 'card-d', 'card-e']);
		});
	});
});
