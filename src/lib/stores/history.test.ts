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

describe('history store', () => {
	let todos: typeof import('./todos.js').todos;
	let addTodo: typeof import('./todos.js').addTodo;
	let toggleTodo: typeof import('./todos.js').toggleTodo;
	let removeTodo: typeof import('./todos.js').removeTodo;
	let updateTodo: typeof import('./todos.js').updateTodo;
	let saveSnapshot: typeof import('./history.js').saveSnapshot;
	let undo: typeof import('./history.js').undo;
	let redo: typeof import('./history.js').redo;
	let canUndo: typeof import('./history.js').canUndo;
	let canRedo: typeof import('./history.js').canRedo;

	beforeEach(async () => {
		vi.resetModules();
		localStorageMock.clear();
		vi.mocked(localStorageMock.getItem).mockClear();
		vi.mocked(localStorageMock.setItem).mockClear();
		uuidCounter = 0;

		// Import todos first, then history (which registers the snapshot fn)
		const todosMod = await import('./todos.js');
		todos = todosMod.todos;
		addTodo = todosMod.addTodo;
		toggleTodo = todosMod.toggleTodo;
		removeTodo = todosMod.removeTodo;
		updateTodo = todosMod.updateTodo;

		const historyMod = await import('./history.js');
		saveSnapshot = historyMod.saveSnapshot;
		undo = historyMod.undo;
		redo = historyMod.redo;
		canUndo = historyMod.canUndo;
		canRedo = historyMod.canRedo;

		// Reset store to empty
		todos.set([]);
	});

	it('saveSnapshot stores current state on undo stack', () => {
		addTodo('First');
		// addTodo already calls saveSnapshot internally, so canUndo should be true
		expect(get(canUndo)).toBe(true);
	});

	it('undo restores previous state', () => {
		addTodo('First');
		expect(get(todos)).toHaveLength(1);

		undo();
		expect(get(todos)).toHaveLength(0);
	});

	it('redo restores after undo', () => {
		addTodo('First');
		expect(get(todos)).toHaveLength(1);

		undo();
		expect(get(todos)).toHaveLength(0);

		redo();
		expect(get(todos)).toHaveLength(1);
		expect(get(todos)[0].text).toBe('First');
	});

	it('new action clears redo stack', () => {
		addTodo('First');
		undo();
		expect(get(canRedo)).toBe(true);

		addTodo('Second');
		expect(get(canRedo)).toBe(false);
	});

	it('undo on empty stack does nothing', () => {
		expect(get(todos)).toHaveLength(0);
		undo();
		expect(get(todos)).toHaveLength(0);
	});

	it('redo on empty stack does nothing', () => {
		expect(get(todos)).toHaveLength(0);
		redo();
		expect(get(todos)).toHaveLength(0);
	});

	it('history limited to MAX_HISTORY (50) entries', () => {
		for (let i = 0; i < 55; i++) {
			addTodo(`Todo ${i}`);
		}

		// We should have 50 undo entries (the max), not 55
		let undoCount = 0;
		while (get(canUndo)) {
			undo();
			undoCount++;
		}
		expect(undoCount).toBe(50);
	});

	it('canUndo and canRedo derived stores reflect stack state', () => {
		expect(get(canUndo)).toBe(false);
		expect(get(canRedo)).toBe(false);

		addTodo('First');
		expect(get(canUndo)).toBe(true);
		expect(get(canRedo)).toBe(false);

		undo();
		expect(get(canUndo)).toBe(false);
		expect(get(canRedo)).toBe(true);

		redo();
		expect(get(canUndo)).toBe(true);
		expect(get(canRedo)).toBe(false);
	});

	it('addTodo auto-snapshots via registerSnapshotFn', () => {
		addTodo('First');
		addTodo('Second');
		expect(get(todos)).toHaveLength(2);

		undo();
		expect(get(todos)).toHaveLength(1);
		expect(get(todos)[0].text).toBe('First');
	});

	it('toggleTodo auto-snapshots via registerSnapshotFn', () => {
		addTodo('First');
		const id = get(todos)[0].id;
		toggleTodo(id);
		expect(get(todos)[0].completed).toBe(true);

		undo();
		expect(get(todos)[0].completed).toBe(false);
	});

	it('removeTodo auto-snapshots via registerSnapshotFn', () => {
		addTodo('First');
		const id = get(todos)[0].id;
		removeTodo(id);
		expect(get(todos)).toHaveLength(0);

		undo();
		expect(get(todos)).toHaveLength(1);
		expect(get(todos)[0].text).toBe('First');
	});

	it('updateTodo auto-snapshots via registerSnapshotFn', () => {
		addTodo('First');
		const id = get(todos)[0].id;
		updateTodo(id, { priority: 'high' });
		expect(get(todos)[0].priority).toBe('high');

		undo();
		expect(get(todos)[0].priority).toBe('none');
	});
});
