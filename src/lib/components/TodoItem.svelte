<script lang="ts">
	import { toggleTodo, removeTodo } from '$lib/stores/todos.js';
	import type { Todo } from '$lib/stores/todos.js';

	let { todo }: { todo: Todo } = $props();
</script>

<div class="flex items-center gap-3">
	<input
		type="checkbox"
		checked={todo.completed}
		onchange={() => toggleTodo(todo.id)}
		aria-label="Toggle {todo.text}"
	/>
	<span class={todo.completed ? 'line-through text-gray-400 flex-1' : 'flex-1'}>
		{todo.text}
	</span>
	<button
		onclick={() => removeTodo(todo.id)}
		aria-label="Delete {todo.text}"
		class="text-red-500 hover:text-red-700 px-2 py-1"
	>
		Delete
	</button>
</div>
