<script lang="ts">
	import { getContext } from 'svelte';
	import type { Todo } from '$lib/stores/todos.js';
	import { moveCard } from '$lib/stores/kanban.js';
	import { kanbanBoard } from '$lib/stores/kanban.js';
	import { get } from 'svelte/store';

	let { todo, columnId, columnTitle, index }: { todo: Todo; columnId: string; columnTitle: string; index: number } = $props();

	let dragging = $state(false);

	const keyboardDrag = getContext<{
		state: {
			cardId: string | null;
			cardText: string;
			originalColumnId: string;
			originalIndex: number;
			currentColumnId: string;
			currentIndex: number;
		};
		pickup: (cardId: string, cardText: string, columnId: string, index: number) => void;
		drop: () => void;
		cancel: () => void;
		announce: (msg: string) => void;
	}>('keyboard-drag');

	let pickedUp = $derived(keyboardDrag.state.cardId === todo.id);

	function handleDragStart(event: DragEvent) {
		if (!event.dataTransfer) return;
		event.dataTransfer.setData('text/plain', todo.id);
		event.dataTransfer.setData('application/x-kanban-source', columnId);
		event.dataTransfer.effectAllowed = 'move';
		dragging = true;
	}

	function handleDragEnd() {
		dragging = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.key === 'Enter' || event.key === ' ') && !pickedUp) {
			event.preventDefault();
			keyboardDrag.pickup(todo.id, todo.text, columnId, index);
			keyboardDrag.announce(`${todo.text} picked up`);
			return;
		}

		if (!pickedUp) return;

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (keyboardDrag.state.currentIndex > 0) {
				const newIndex = keyboardDrag.state.currentIndex - 1;
				moveCard(todo.id, keyboardDrag.state.currentColumnId, newIndex);
				keyboardDrag.state.currentIndex = newIndex;
				keyboardDrag.announce(`${todo.text} moved to position ${newIndex + 1}`);
			}
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			const board = get(kanbanBoard);
			const col = board.find(c => c.id === keyboardDrag.state.currentColumnId);
			if (col && keyboardDrag.state.currentIndex < col.cards.length - 1) {
				const newIndex = keyboardDrag.state.currentIndex + 1;
				moveCard(todo.id, keyboardDrag.state.currentColumnId, newIndex);
				keyboardDrag.state.currentIndex = newIndex;
				keyboardDrag.announce(`${todo.text} moved to position ${newIndex + 1}`);
			}
		} else if (event.key === 'Enter') {
			event.preventDefault();
			keyboardDrag.drop();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			keyboardDrag.cancel();
		}
	}
</script>

<div
	draggable="true"
	role="listitem"
	tabindex="0"
	aria-label="{todo.text} in {columnTitle}"
	aria-grabbed={dragging || pickedUp}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	onkeydown={handleKeydown}
	class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-200 {todo.completed ? 'border-l-4 border-l-green-400' : ''} {dragging ? 'opacity-50 scale-95 shadow-lg cursor-grabbing' : 'cursor-grab'} {pickedUp ? 'ring-2 ring-blue-400' : ''}"
>
	<div class="flex items-center gap-2">
		<span class="w-2 h-2 rounded-full flex-shrink-0 {todo.completed ? 'bg-green-400' : 'bg-blue-400'}"></span>
		<span class={todo.completed ? 'line-through text-gray-400' : 'dark:text-white'}>
			{todo.text}
		</span>
	</div>
</div>
