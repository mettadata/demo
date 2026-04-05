<script lang="ts">
	import TodoInput from '$lib/components/TodoInput.svelte';
	import TodoFilter from '$lib/components/TodoFilter.svelte';
	import TodoList from '$lib/components/TodoList.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';
	import { viewPreference } from '$lib/stores/kanban.js';
</script>

<div class="{$viewPreference === 'kanban' ? 'max-w-6xl' : 'max-w-lg'} mx-auto p-4 flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Todos</h1>
		<ViewToggle />
	</div>
	<TodoInput />
	{#if $viewPreference === 'list'}
		<TodoFilter />
		<TodoList />
	{:else}
		<KanbanBoard />
	{/if}
</div>
