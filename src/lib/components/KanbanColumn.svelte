<script lang="ts">
	import type { ResolvedColumn } from '$lib/stores/kanban.js';
	import { renameColumn, deleteColumn, moveCard } from '$lib/stores/kanban.js';
	import KanbanCard from './KanbanCard.svelte';

	let { column }: { column: ResolvedColumn } = $props();

	let editing = $state(false);
	let editTitle = $state('');
	let dragOverCounter = $state(0);
	let dropIndex = $state(0);

	function startEditing() {
		editing = true;
		editTitle = column.title;
	}

	function confirmEdit() {
		const trimmed = editTitle.trim();
		if (trimmed !== '') {
			renameColumn(column.id, trimmed);
		}
		editing = false;
	}

	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			confirmEdit();
		} else if (event.key === 'Escape') {
			editing = false;
		}
	}

	function handleDelete() {
		try {
			deleteColumn(column.id);
		} catch (error) {
			// Cannot delete last column — silently ignore
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!event.dataTransfer) return;
		event.dataTransfer.dropEffect = 'move';

		const columnEl = (event.currentTarget as HTMLElement);
		const cards = columnEl.querySelectorAll('[role="listitem"]');
		let index = cards.length;

		for (let i = 0; i < cards.length; i++) {
			const rect = cards[i].getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			if (event.clientY < midY) {
				index = i;
				break;
			}
		}

		dropIndex = index;
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragOverCounter++;
	}

	function handleDragLeave() {
		dragOverCounter--;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOverCounter = 0;

		if (!event.dataTransfer) return;
		const todoId = event.dataTransfer.getData('text/plain');
		if (!todoId) return;

		moveCard(todoId, column.id, dropIndex);
	}
</script>

<div
	class="bg-gray-100 rounded-lg p-3 flex flex-col gap-2 min-h-[200px] w-72 flex-shrink-0 {dragOverCounter > 0 ? 'bg-blue-50 border-2 border-blue-300' : ''}"
	role="list"
	aria-label="{column.title} column"
	ondragover={handleDragOver}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<div class="flex items-center justify-between mb-1">
		{#if editing}
			<input
				type="text"
				bind:value={editTitle}
				onblur={confirmEdit}
				onkeydown={handleEditKeydown}
				class="font-semibold text-sm bg-white border border-gray-300 rounded px-1 py-0.5 flex-1 mr-2"
			/>
		{:else}
			<h3
				class="font-semibold text-sm text-gray-700 cursor-pointer"
				ondblclick={startEditing}
			>
				{column.title}
			</h3>
		{/if}
		<div class="flex items-center gap-1">
			<span class="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
				{column.cards.length}
			</span>
			<button
				onclick={handleDelete}
				aria-label="Delete {column.title} column"
				class="text-gray-400 hover:text-red-500 text-sm px-1"
			>
				✕
			</button>
		</div>
	</div>

	{#each column.cards as todo (todo.id)}
		<KanbanCard {todo} columnId={column.id} columnTitle={column.title} />
	{/each}
</div>
