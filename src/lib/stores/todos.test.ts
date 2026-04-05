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
	let STORAGE_KEY: string;

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
		STORAGE_KEY = mod.STORAGE_KEY;

		// Reset store to empty
		todos.set([]);
		filter.set('all');
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
});
