<script lang="ts">
	import { setContext, onMount } from 'svelte';
	import { kanbanBoard, addColumn, moveCard, isBoardPristine, applyTemplate } from '$lib/stores/kanban.js';
	import { get } from 'svelte/store';
	import KanbanColumn from './KanbanColumn.svelte';
	import BoardTemplateSelector from './BoardTemplateSelector.svelte';
	import { self, activeCollaborators, getInitials } from '$lib/stores/collaborators.js';

	let showInput = $state(false);
	let newColumnTitle = $state('');
	let announceText = $state('');
	let showTemplateSelector = $state(false);
	let selectorDismissed = $state(false);

	onMount(() => {
		if (isBoardPristine() && !selectorDismissed) {
			showTemplateSelector = true;
		}
	});

	let keyboardDragState = $state<{
		cardId: string | null;
		cardText: string;
		originalColumnId: string;
		originalIndex: number;
		currentColumnId: string;
		currentIndex: number;
	}>({
		cardId: null,
		cardText: '',
		originalColumnId: '',
		originalIndex: -1,
		currentColumnId: '',
		currentIndex: -1
	});

	function pickup(cardId: string, cardText: string, columnId: string, index: number) {
		keyboardDragState.cardId = cardId;
		keyboardDragState.cardText = cardText;
		keyboardDragState.originalColumnId = columnId;
		keyboardDragState.originalIndex = index;
		keyboardDragState.currentColumnId = columnId;
		keyboardDragState.currentIndex = index;
	}

	function drop() {
		announce(`${keyboardDragState.cardText} placed`);
		keyboardDragState.cardId = null;
		keyboardDragState.cardText = '';
		keyboardDragState.originalColumnId = '';
		keyboardDragState.originalIndex = -1;
		keyboardDragState.currentColumnId = '';
		keyboardDragState.currentIndex = -1;
	}

	function cancel() {
		if (keyboardDragState.cardId) {
			moveCard(keyboardDragState.cardId, keyboardDragState.originalColumnId, keyboardDragState.originalIndex);
		}
		announce(`${keyboardDragState.cardText} cancelled`);
		keyboardDragState.cardId = null;
		keyboardDragState.cardText = '';
		keyboardDragState.originalColumnId = '';
		keyboardDragState.originalIndex = -1;
		keyboardDragState.currentColumnId = '';
		keyboardDragState.currentIndex = -1;
	}

	function announce(msg: string) {
		announceText = '';
		// Force re-announce by clearing first, then setting on next tick
		setTimeout(() => { announceText = msg; }, 50);
	}

	setContext('keyboard-drag', { state: keyboardDragState, pickup, drop, cancel, announce });

	function handleBoardKeydown(event: KeyboardEvent) {
		if (keyboardDragState.cardId === null) return;

		const board = get(kanbanBoard);
		const currentColIndex = board.findIndex(c => c.id === keyboardDragState.currentColumnId);
		if (currentColIndex === -1) return;

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			if (currentColIndex > 0) {
				const prevCol = board[currentColIndex - 1];
				const targetIndex = prevCol.cards.length;
				moveCard(keyboardDragState.cardId, prevCol.id, targetIndex);
				keyboardDragState.currentColumnId = prevCol.id;
				keyboardDragState.currentIndex = targetIndex;
				announce(`${keyboardDragState.cardText} moved to ${prevCol.title}`);
			}
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			if (currentColIndex < board.length - 1) {
				const nextCol = board[currentColIndex + 1];
				const targetIndex = nextCol.cards.length;
				moveCard(keyboardDragState.cardId, nextCol.id, targetIndex);
				keyboardDragState.currentColumnId = nextCol.id;
				keyboardDragState.currentIndex = targetIndex;
				announce(`${keyboardDragState.cardText} moved to ${nextCol.title}`);
			}
		}
	}

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

<div aria-live="polite" class="sr-only">{announceText}</div>

<div class="flex items-center gap-2 mb-2" aria-label="Active collaborators">
	<span class="text-xs text-gray-500 dark:text-gray-400 mr-1">Here:</span>
	<span
		class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white dark:ring-gray-900 flex-shrink-0"
		style="background-color: {$self.color}"
		aria-label={$self.name}
		title="{$self.name} (you)"
	>{getInitials($self.name)}</span>
	{#each $activeCollaborators as collaborator (collaborator.id)}
		<span
			class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
			style="background-color: {collaborator.color}"
			aria-label={collaborator.name}
			title={collaborator.name}
		>{getInitials(collaborator.name)}</span>
	{/each}
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex gap-4 overflow-x-auto pb-4 min-h-[300px]" onkeydown={handleBoardKeydown}>
	{#each $kanbanBoard as column (column.id)}
		<KanbanColumn {column} />
	{/each}

	<div class="w-72 flex-shrink-0 space-y-2">
		{#if showInput}
			<input
				type="text"
				bind:value={newColumnTitle}
				onkeydown={handleInputKeydown}
				onblur={handleInputBlur}
				placeholder="Column title..."
				class="w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
			/>
		{:else}
			<button
				onclick={handleAddClick}
				class="w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 cursor-pointer dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
			>
				+ Add Column
			</button>
		{/if}
		<button
			onclick={() => {
				if (window.confirm('Applying a new template will replace all current columns and cards. Continue?')) {
					selectorDismissed = false;
					showTemplateSelector = true;
				}
			}}
			class="w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 cursor-pointer dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
		>
			Change template
		</button>
	</div>
</div>

{#if showTemplateSelector}
	<BoardTemplateSelector
		onselect={(name) => { applyTemplate(name); showTemplateSelector = false; }}
		ondismiss={() => { showTemplateSelector = false; selectorDismissed = true; }}
	/>
{/if}
