<script lang="ts">
	import { kanbanBoard } from '$lib/stores/kanban.js';
	import { todos } from '$lib/stores/todos.js';
	import type { ResolvedColumn } from '$lib/stores/kanban.js';
	import type { Todo } from '$lib/stores/todos.js';

	const today = new Date().toISOString().split('T')[0];

	const columnStats = $derived($kanbanBoard.map(col => ({ id: col.id, title: col.title, count: col.cards.length })));
	const activeTodos = $derived($todos.filter(t => !t.archived));
	const total = $derived(activeTodos.length);
	const completedCount = $derived(activeTodos.filter(t => t.completed).length);
	const completionPct = $derived(total === 0 ? 0 : Math.round((completedCount / total) * 100));
	const overdueCount = $derived(activeTodos.filter(t => !t.completed && t.dueDate !== null && t.dueDate < today).length);
</script>

<section aria-label="Board statistics" class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
	<div class="flex flex-wrap items-center gap-4">
		<div class="flex flex-wrap items-center gap-3">
			{#each columnStats as col (col.id)}
				<span
					class="text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1"
					aria-label="{col.title}: {col.count} tasks"
				>
					{col.title}: {col.count}
				</span>
			{/each}
		</div>

		<div class="flex items-center gap-2 ml-auto">
			<span class="text-sm text-gray-700 dark:text-gray-200">{completionPct}% complete</span>
			<div
				role="progressbar"
				aria-valuenow={completionPct}
				aria-valuemin={0}
				aria-valuemax={100}
				class="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden"
			>
				<div
					class="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
					style="width: {completionPct}%"
				></div>
			</div>
		</div>

		<span
			class="text-sm {overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}"
			aria-label="{overdueCount} overdue"
		>
			{overdueCount} overdue
		</span>
	</div>
</section>
