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

	// Touch drag state
	let touchDragging = $state(false);
	let touchStartX = $state(0);
	let touchStartY = $state(0);
	let touchTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let touchTargetColumnId = $state('');
	let touchDropIndex = $state(0);

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

	function handlePointerDown(event: PointerEvent) {
		if (event.pointerType !== 'touch') return;

		touchStartX = event.clientX;
		touchStartY = event.clientY;
		touchTargetColumnId = columnId;
		touchDropIndex = index;

		touchTimer = setTimeout(() => {
			touchDragging = true;
			touchTimer = null;
		}, 200);
	}

	function handlePointerMove(event: PointerEvent) {
		if (event.pointerType !== 'touch') return;

		const dx = event.clientX - touchStartX;
		const dy = event.clientY - touchStartY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// If timer is still pending and moved too far, cancel (user is scrolling)
		if (touchTimer && distance > 10) {
			clearTimeout(touchTimer);
			touchTimer = null;
			return;
		}

		if (!touchDragging) return;

		event.preventDefault();

		// Find which column the touch point is over
		const el = document.elementFromPoint(event.clientX, event.clientY);
		if (!el) return;

		const columnEl = el.closest('[role="list"]') as HTMLElement | null;
		if (!columnEl) return;

		const colId = columnEl.dataset.columnId;
		if (!colId) return;

		touchTargetColumnId = colId;

		// Compute drop index from card midpoints
		const cards = columnEl.querySelectorAll('[role="listitem"]');
		let idx = cards.length;
		for (let i = 0; i < cards.length; i++) {
			const rect = cards[i].getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			if (event.clientY < midY) {
				idx = i;
				break;
			}
		}

		touchDropIndex = idx;
	}

	function handlePointerUp(event: PointerEvent) {
		if (event.pointerType !== 'touch') return;

		if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}

		if (touchDragging) {
			let adjustedIndex = touchDropIndex;
			if (touchTargetColumnId === columnId) {
				if (adjustedIndex > index) {
					adjustedIndex--;
				}
			}
			moveCard(todo.id, touchTargetColumnId, adjustedIndex);
			touchDragging = false;
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	draggable="true"
	role="listitem"
	tabindex="0"
	aria-label="{todo.text} in {columnTitle}"
	aria-grabbed={dragging || pickedUp}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	onkeydown={handleKeydown}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-200 touch-none {todo.completed ? 'border-l-4 border-l-green-400' : ''} {dragging || touchDragging ? 'opacity-50 scale-95 shadow-lg cursor-grabbing' : 'cursor-grab'} {pickedUp ? 'ring-2 ring-blue-400' : ''}"
>
	<div class="flex items-center gap-2">
		<span class="w-2 h-2 rounded-full flex-shrink-0 {todo.completed ? 'bg-green-400' : 'bg-blue-400'}"></span>
		<span class={todo.completed ? 'line-through text-gray-400' : 'dark:text-white'}>
			{todo.text}
		</span>
	</div>
</div>
