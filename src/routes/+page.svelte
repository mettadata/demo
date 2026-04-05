<script lang="ts">
	import TodoInput from '$lib/components/TodoInput.svelte';
	import TodoFilter from '$lib/components/TodoFilter.svelte';
	import TodoList from '$lib/components/TodoList.svelte';
</script>

<div class="max-w-lg mx-auto p-4 flex flex-col gap-4">
	<h1 class="text-3xl font-bold">Todos</h1>
	<TodoInput />
	<TodoFilter />
	<TodoList />
</div>
