import { writable, derived, get } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { todos, registerSnapshotFn } from './todos.js';
import type { Todo } from './todos.js';

const MAX_HISTORY = 50;

// Internal state
const undoStack = writable<Todo[][]>([]);
const redoStack = writable<Todo[][]>([]);

// Save current state to undo stack before a mutation
export function saveSnapshot(): void {
	const current = get(todos);
	undoStack.update((stack) => {
		const newStack = [...stack, current.map((t) => ({ ...t }))];
		if (newStack.length > MAX_HISTORY) newStack.shift();
		return newStack;
	});
	// Clear redo stack on new action
	redoStack.set([]);
}

export function undo(): void {
	const stack = get(undoStack);
	if (stack.length === 0) return;

	const current = get(todos);
	const previous = stack[stack.length - 1];

	undoStack.update((s) => s.slice(0, -1));
	redoStack.update((s) => [...s, current.map((t) => ({ ...t }))]);

	todos.set(previous);
}

export function redo(): void {
	const stack = get(redoStack);
	if (stack.length === 0) return;

	const current = get(todos);
	const next = stack[stack.length - 1];

	redoStack.update((s) => s.slice(0, -1));
	undoStack.update((s) => [...s, current.map((t) => ({ ...t }))]);

	todos.set(next);
}

export const canUndo: Readable<boolean> = derived(undoStack, ($stack) => $stack.length > 0);
export const canRedo: Readable<boolean> = derived(redoStack, ($stack) => $stack.length > 0);

// Register snapshot function with todos store to avoid circular dependency
registerSnapshotFn(saveSnapshot);
