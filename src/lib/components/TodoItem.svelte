<script lang="ts">
	import { toggleTodo, removeTodo, updateTodo } from '$lib/stores/todos.js';
	import type { Todo, Priority } from '$lib/stores/todos.js';
	import PriorityBadge from './PriorityBadge.svelte';
	import DueDateDisplay from './DueDateDisplay.svelte';

	let { todo }: { todo: Todo } = $props();
</script>

<div class="flex flex-col gap-1 dark:text-white">
	<div class="flex items-center gap-3">
		<input
			type="checkbox"
			checked={todo.completed}
			onchange={() => toggleTodo(todo.id)}
			aria-label="Toggle {todo.text}"
		/>
		<span class={todo.completed ? 'line-through text-gray-400 flex-1' : 'flex-1'}>{todo.text}</span>
		<PriorityBadge priority={todo.priority} />
		<DueDateDisplay dueDate={todo.dueDate} />
		<button
			onclick={() => removeTodo(todo.id)}
			aria-label="Delete {todo.text}"
			class="text-red-500 hover:text-red-700 px-2 py-1"
		>
			Delete
		</button>
	</div>
	<div class="flex items-center gap-2 ml-7">
		<select
			class="text-xs px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
			value={todo.priority}
			onchange={(e) => updateTodo(todo.id, { priority: (e.currentTarget as HTMLSelectElement).value as Priority })}
			aria-label="Priority for {todo.text}"
		>
			<option value="none">No priority</option>
			<option value="low">Low</option>
			<option value="medium">Medium</option>
			<option value="high">High</option>
		</select>
		<input
			type="date"
			class="text-xs px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
			value={todo.dueDate ?? ''}
			onchange={(e) => updateTodo(todo.id, { dueDate: (e.currentTarget as HTMLInputElement).value || null })}
			aria-label="Due date for {todo.text}"
		/>
	</div>
</div>
