// NOTE: push will be available once notifications.ts is created in Task 1.1
import { get } from 'svelte/store';
import { todos } from '$lib/stores/todos.js';
import { push } from '$lib/stores/notifications.js';

const notifiedIds = new Set<string>();

export function startDueDateChecker(): () => void {
	function runCycle(): void {
		const allTodos = get(todos);
		const today = new Date().toISOString().split('T')[0];

		for (const todo of allTodos) {
			if (todo.archived) continue;
			if (todo.completed) continue;
			if (todo.dueDate === null) continue;
			if (todo.dueDate >= today) continue;
			if (notifiedIds.has(todo.id)) continue;

			push({ type: 'overdue', title: 'Card Overdue', message: todo.text });
			notifiedIds.add(todo.id);
		}
	}

	runCycle();

	let intervalId: ReturnType<typeof setInterval> | null = null;

	if (typeof window !== 'undefined') {
		intervalId = setInterval(runCycle, 60_000);
	}

	return () => {
		if (intervalId !== null) {
			clearInterval(intervalId);
		}
	};
}
