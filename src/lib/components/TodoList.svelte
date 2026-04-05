<script lang="ts">
	import { filteredTodos } from '$lib/stores/todos.js';
	import TodoItem from './TodoItem.svelte';
</script>

<div class="flex flex-col gap-2">
	{#each $filteredTodos as todo (todo.id)}
		<TodoItem {todo} />
	{/each}
</div>
