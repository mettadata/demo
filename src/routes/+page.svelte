<script lang="ts">
	import { onMount } from 'svelte';
	import TodoInput from '$lib/components/TodoInput.svelte';
	import TodoFilter from '$lib/components/TodoFilter.svelte';
	import TodoList from '$lib/components/TodoList.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import SortToggle from '$lib/components/SortToggle.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import UndoRedoButtons from '$lib/components/UndoRedoButtons.svelte';
	import { viewPreference } from '$lib/stores/kanban.js';
	import { undo, redo } from '$lib/stores/history.js';

	onMount(() => {
		function handleKeydown(e: KeyboardEvent) {
			const target = e.target as HTMLElement;
			const tag = target.tagName.toLowerCase();
			if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

			const mod = e.metaKey || e.ctrlKey;
			if (mod && e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				undo();
			} else if (mod && e.key === 'z' && e.shiftKey) {
				e.preventDefault();
				redo();
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="min-h-screen bg-white dark:bg-gray-900 transition-colors">
<div class="{$viewPreference === 'kanban' ? 'max-w-6xl' : 'max-w-lg'} mx-auto p-4 flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold dark:text-white">Todos</h1>
		<div class="flex items-center gap-2">
			<UndoRedoButtons />
			<SortToggle />
			<ThemeToggle />
			<ViewToggle />
		</div>
	</div>
	<TodoInput />
	<SearchBar />
	{#if $viewPreference === 'list'}
		<TodoFilter />
		<TodoList />
	{:else}
		<KanbanBoard />
	{/if}
</div>
</div>
