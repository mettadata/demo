<script lang="ts">
	import type { Todo } from '$lib/stores/todos.js';

	let { todo, columnId, columnTitle }: { todo: Todo; columnId: string; columnTitle: string } = $props();

	let dragging = $state(false);

	function handleDragStart(event: DragEvent) {
		if (!event.dataTransfer) return;
		event.dataTransfer.setData('text/plain', todo.id);
		event.dataTransfer.effectAllowed = 'move';
		dragging = true;
	}

	function handleDragEnd() {
		dragging = false;
	}
</script>

<div
	draggable="true"
	role="listitem"
	tabindex="0"
	aria-label="{todo.text} in {columnTitle}"
	aria-grabbed={dragging}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	class="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 cursor-grab {todo.completed ? 'border-l-4 border-l-green-400' : ''} {dragging ? 'opacity-50' : ''}"
>
	<div class="flex items-center gap-2">
		<span class="w-2 h-2 rounded-full flex-shrink-0 {todo.completed ? 'bg-green-400' : 'bg-blue-400'}"></span>
		<span class={todo.completed ? 'line-through text-gray-400' : 'dark:text-white'}>
			{todo.text}
		</span>
	</div>
</div>
