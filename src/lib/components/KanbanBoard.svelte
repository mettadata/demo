<script lang="ts">
	import { kanbanBoard, addColumn } from '$lib/stores/kanban.js';
	import KanbanColumn from './KanbanColumn.svelte';

	let showInput = $state(false);
	let newColumnTitle = $state('');

	function handleAddClick() {
		showInput = true;
	}

	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			const trimmed = newColumnTitle.trim();
			if (trimmed !== '') {
				addColumn(trimmed);
			}
			newColumnTitle = '';
			showInput = false;
		} else if (event.key === 'Escape') {
			newColumnTitle = '';
			showInput = false;
		}
	}

	function handleInputBlur() {
		const trimmed = newColumnTitle.trim();
		if (trimmed !== '') {
			addColumn(trimmed);
		}
		newColumnTitle = '';
		showInput = false;
	}
</script>

<div class="flex gap-4 overflow-x-auto pb-4 min-h-[300px]">
	{#each $kanbanBoard as column (column.id)}
		<KanbanColumn {column} />
	{/each}

	<div class="w-72 flex-shrink-0">
		{#if showInput}
			<input
				type="text"
				bind:value={newColumnTitle}
				onkeydown={handleInputKeydown}
				onblur={handleInputBlur}
				placeholder="Column title..."
				class="w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
			/>
		{:else}
			<button
				onclick={handleAddClick}
				class="w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 cursor-pointer"
			>
				+ Add Column
			</button>
		{/if}
	</div>
</div>
