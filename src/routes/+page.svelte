<script lang="ts">
	import { onMount } from 'svelte';
	import TodoInput from '$lib/components/TodoInput.svelte';
	import TodoFilter from '$lib/components/TodoFilter.svelte';
	import TodoList from '$lib/components/TodoList.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';
	import KanbanBoard from '$lib/components/KanbanBoard.svelte';
	import BoardStatsDashboard from '$lib/components/BoardStatsDashboard.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import SortToggle from '$lib/components/SortToggle.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import UndoRedoButtons from '$lib/components/UndoRedoButtons.svelte';
	import LabelManager from '$lib/components/LabelManager.svelte';
	import ShortcutsHelpModal from '$lib/components/ShortcutsHelpModal.svelte';
	import { viewPreference } from '$lib/stores/kanban.js';
	import { undo, redo } from '$lib/stores/history.js';

	let showLabelManager = $state(false);
	let showShortcutsHelp = $state(false);

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
			} else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
				e.preventDefault();
				showShortcutsHelp = true;
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
			<button
				class="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
				onclick={() => { showLabelManager = true; }}
				aria-label="Manage labels"
			>
				Labels
			</button>
			<button
				class="p-2 rounded-lg text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
				onclick={() => { showShortcutsHelp = true; }}
				aria-label="Keyboard shortcuts help"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
				</svg>
			</button>
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
		<BoardStatsDashboard />
		<KanbanBoard />
	{/if}
</div>
</div>
<LabelManager bind:open={showLabelManager} />
<ShortcutsHelpModal bind:open={showShortcutsHelp} />
