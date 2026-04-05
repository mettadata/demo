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

// Mock crypto.randomUUID
let uuidCounter = 0;
vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`)
});

describe('todo store', () => {
	let todos: typeof import('./todos').todos;
	let filter: typeof import('./todos').filter;
	let filteredTodos: typeof import('./todos').filteredTodos;
	let addTodo: typeof import('./todos').addTodo;
	let toggleTodo: typeof import('./todos').toggleTodo;
	let removeTodo: typeof import('./todos').removeTodo;
	let updateTodo: typeof import('./todos').updateTodo;
	let sortTodosByDueDate: typeof import('./todos').sortTodosByDueDate;
	let sortedFilteredTodos: typeof import('./todos').sortedFilteredTodos;
	let sortByDueDate: typeof import('./todos').sortByDueDate;
	let searchQuery: typeof import('./todos').searchQuery;
	let STORAGE_KEY: string;
	let SORT_STORAGE_KEY: string;

	beforeEach(async () => {
		vi.resetModules();
		localStorageMock.clear();
		vi.mocked(localStorageMock.getItem).mockClear();
		vi.mocked(localStorageMock.setItem).mockClear();
		uuidCounter = 0;

		const mod = await import('./todos');
		todos = mod.todos;
		filter = mod.filter;
		filteredTodos = mod.filteredTodos;
		addTodo = mod.addTodo;
		toggleTodo = mod.toggleTodo;
		removeTodo = mod.removeTodo;
		updateTodo = mod.updateTodo;
		sortTodosByDueDate = mod.sortTodosByDueDate;
		sortedFilteredTodos = mod.sortedFilteredTodos;
		sortByDueDate = mod.sortByDueDate;
		searchQuery = mod.searchQuery;
		STORAGE_KEY = mod.STORAGE_KEY;
		SORT_STORAGE_KEY = mod.SORT_STORAGE_KEY;

		// Reset store to empty
		todos.set([]);
		filter.set('all');
		sortByDueDate.set(false);
		searchQuery.set('');
	});

	it('addTodo creates todo with correct fields', () => {
		addTodo('Buy milk');
		const items = get(todos);
		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			id: 'test-uuid-1',
			text: 'Buy milk',
			completed: false
		});
		expect(items[0].createdAt).toBeTruthy();
		// Verify it's a valid ISO string
		expect(new Date(items[0].createdAt).toISOString()).toBe(items[0].createdAt);
	});

	it('addTodo rejects empty and whitespace-only strings', () => {
		addTodo('');
		expect(get(todos)).toHaveLength(0);

		addTodo('   ');
		expect(get(todos)).toHaveLength(0);

		addTodo('\t\n');
		expect(get(todos)).toHaveLength(0);
	});

	it('addTodo trims whitespace from text', () => {
		addTodo('  Buy milk  ');
		expect(get(todos)[0].text).toBe('Buy milk');
	});

	it('toggleTodo flips completed', () => {
		addTodo('Buy milk');
		const id = get(todos)[0].id;

		expect(get(todos)[0].completed).toBe(false);
		toggleTodo(id);
		expect(get(todos)[0].completed).toBe(true);
		toggleTodo(id);
		expect(get(todos)[0].completed).toBe(false);
	});

	it('removeTodo removes correct todo and leaves others', () => {
		addTodo('First');
		addTodo('Second');
		addTodo('Third');

		const items = get(todos);
		expect(items).toHaveLength(3);

		removeTodo(items[1].id);

		const remaining = get(todos);
		expect(remaining).toHaveLength(2);
		expect(remaining[0].text).toBe('First');
		expect(remaining[1].text).toBe('Third');
	});

	it('filteredTodos returns only active when filter is active', () => {
		addTodo('Active todo');
		addTodo('Completed todo');
		toggleTodo(get(todos)[1].id);

		filter.set('active');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Active todo');
		expect(result[0].completed).toBe(false);
	});

	it('filteredTodos returns only completed when filter is completed', () => {
		addTodo('Active todo');
		addTodo('Completed todo');
		toggleTodo(get(todos)[1].id);

		filter.set('completed');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Completed todo');
		expect(result[0].completed).toBe(true);
	});

	it('filteredTodos returns all when filter is all', () => {
		addTodo('Active todo');
		addTodo('Completed todo');
		toggleTodo(get(todos)[1].id);

		filter.set('all');
		const result = get(filteredTodos);
		expect(result).toHaveLength(2);
	});

	it('localStorage round-trip persists and rehydrates', async () => {
		addTodo('Persisted todo');
		toggleTodo(get(todos)[0].id);

		// Verify localStorage was written
		const stored = localStorageMock.getItem(STORAGE_KEY);
		expect(stored).toBeTruthy();
		const parsed = JSON.parse(stored!);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].text).toBe('Persisted todo');
		expect(parsed[0].completed).toBe(true);

		// Re-import module to test rehydration from localStorage
		vi.resetModules();
		const mod2 = await import('./todos');
		const rehydrated = get(mod2.todos);
		expect(rehydrated).toHaveLength(1);
		expect(rehydrated[0].text).toBe('Persisted todo');
		expect(rehydrated[0].completed).toBe(true);
	});

	it('loadTodos returns empty array on corrupt localStorage data', async () => {
		localStorageMock.setItem(STORAGE_KEY, 'not valid json{{{');

		vi.resetModules();
		const mod2 = await import('./todos');
		expect(get(mod2.todos)).toEqual([]);
	});

	it('addTodo includes priority and dueDate defaults', () => {
		addTodo('Test todo');
		const items = get(todos);
		expect(items).toHaveLength(1);
		expect(items[0].priority).toBe('none');
		expect(items[0].dueDate).toBeNull();
	});

	it('addTodo includes empty description default', () => {
		addTodo('Test todo');
		const items = get(todos);
		expect(items).toHaveLength(1);
		expect(items[0].description).toBe('');
	});

	it('legacy migration defaults missing priority and dueDate', async () => {
		const legacyTodo = {
			id: 'legacy-1',
			text: 'Old todo',
			completed: false,
			createdAt: '2024-01-01T00:00:00.000Z'
		};
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([legacyTodo]));

		vi.resetModules();
		const mod2 = await import('./todos');
		const items = get(mod2.todos);
		expect(items).toHaveLength(1);
		expect(items[0].priority).toBe('none');
		expect(items[0].dueDate).toBeNull();
	});

	it('legacy migration defaults missing description to empty string', async () => {
		const legacyTodo = {
			id: 'legacy-2',
			text: 'Old todo no desc',
			completed: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			priority: 'low',
			dueDate: null
		};
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([legacyTodo]));

		vi.resetModules();
		const mod2 = await import('./todos');
		const items = get(mod2.todos);
		expect(items).toHaveLength(1);
		expect(items[0].description).toBe('');
	});

	it('updateTodo sets priority', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { priority: 'high' });
		expect(get(todos)[0].priority).toBe('high');
	});

	it('updateTodo sets dueDate', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { dueDate: '2025-06-15' });
		expect(get(todos)[0].dueDate).toBe('2025-06-15');
	});

	it('updateTodo sets description', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { description: '**bold** description' });
		expect(get(todos)[0].description).toBe('**bold** description');
	});

	it('updateTodo clears dueDate', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { dueDate: '2025-06-15' });
		expect(get(todos)[0].dueDate).toBe('2025-06-15');
		updateTodo(id, { dueDate: null });
		expect(get(todos)[0].dueDate).toBeNull();
	});

	it('sortTodosByDueDate sorts ascending with nulls last', () => {
		const input = [
			{ id: '1', text: 'C', description: '', completed: false, createdAt: '', priority: 'none' as const, dueDate: '2025-12-01' },
			{ id: '2', text: 'A', description: '', completed: false, createdAt: '', priority: 'none' as const, dueDate: null },
			{ id: '3', text: 'B', description: '', completed: false, createdAt: '', priority: 'none' as const, dueDate: '2025-06-01' }
		];
		const sorted = sortTodosByDueDate(input);
		expect(sorted[0].dueDate).toBe('2025-06-01');
		expect(sorted[1].dueDate).toBe('2025-12-01');
		expect(sorted[2].dueDate).toBeNull();
	});

	it('sortedFilteredTodos applies sort when enabled', () => {
		addTodo('Later');
		updateTodo(get(todos)[0].id, { dueDate: '2025-12-01' });
		addTodo('Sooner');
		updateTodo(get(todos)[1].id, { dueDate: '2025-06-01' });
		addTodo('No date');

		sortByDueDate.set(true);
		const result = get(sortedFilteredTodos);
		expect(result[0].text).toBe('Sooner');
		expect(result[1].text).toBe('Later');
		expect(result[2].text).toBe('No date');
	});

	it('sortedFilteredTodos passes through when disabled', () => {
		addTodo('Later');
		updateTodo(get(todos)[0].id, { dueDate: '2025-12-01' });
		addTodo('Sooner');
		updateTodo(get(todos)[1].id, { dueDate: '2025-06-01' });

		sortByDueDate.set(false);
		const result = get(sortedFilteredTodos);
		expect(result[0].text).toBe('Later');
		expect(result[1].text).toBe('Sooner');
	});

	it('sortByDueDate persists to localStorage', () => {
		sortByDueDate.set(true);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(SORT_STORAGE_KEY, 'true');
	});

	it('searchQuery filters todos by text (case-insensitive)', () => {
		addTodo('Buy milk');
		addTodo('Walk the dog');
		addTodo('Buy eggs');

		searchQuery.set('buy');
		const result = get(filteredTodos);
		expect(result).toHaveLength(2);
		expect(result[0].text).toBe('Buy milk');
		expect(result[1].text).toBe('Buy eggs');
	});

	it('searchQuery matches description text', () => {
		addTodo('Buy milk');
		addTodo('Walk the dog');
		const id = get(todos)[1].id;
		updateTodo(id, { description: 'Remember to bring treats' });

		searchQuery.set('treats');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Walk the dog');
	});

	it('searchQuery with empty string shows all todos', () => {
		addTodo('Buy milk');
		addTodo('Walk the dog');

		searchQuery.set('');
		expect(get(filteredTodos)).toHaveLength(2);

		searchQuery.set('   ');
		expect(get(filteredTodos)).toHaveLength(2);
	});

	it('searchQuery works alongside status filter', () => {
		addTodo('Buy milk');
		addTodo('Buy eggs');
		toggleTodo(get(todos)[0].id); // complete "Buy milk"

		filter.set('active');
		searchQuery.set('buy');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Buy eggs');
	});
});
