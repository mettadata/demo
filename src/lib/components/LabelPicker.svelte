<script lang="ts">
	import { labels } from '$lib/stores/labels.js';
	import { LABEL_COLOR_CLASSES } from '$lib/stores/labels.js';
	import { updateTodo } from '$lib/stores/todos.js';

	let { todoId, labelIds }: { todoId: string; labelIds: string[] } = $props();

	let open = $state(false);

	function toggle(labelId: string) {
		const newIds = labelIds.includes(labelId)
			? labelIds.filter((id) => id !== labelId)
			: [...labelIds, labelId];
		updateTodo(todoId, { labelIds: newIds });
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative inline-block" onclick={(e) => e.stopPropagation()} onpointerdown={(e) => e.stopPropagation()}>
	<button
		class="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-500"
		onclick={() => { open = !open; }}
		aria-label="Labels for todo"
	>
		Labels
	</button>
	{#if open}
		<div class="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2">
			{#if $labels.length === 0}
				<p class="text-xs text-gray-500 dark:text-gray-400 p-1">No labels yet. Create one in the label manager.</p>
			{:else}
				{#each $labels as label (label.id)}
					<label class="flex items-center gap-2 px-1 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
						<input
							type="checkbox"
							checked={labelIds.includes(label.id)}
							onchange={() => toggle(label.id)}
							class="rounded"
						/>
						<span
							class="w-3 h-3 rounded-full flex-shrink-0 {LABEL_COLOR_CLASSES[label.color].bg} {LABEL_COLOR_CLASSES[label.color].darkBg}"
						></span>
						<span class="text-xs dark:text-white truncate">{label.name}</span>
					</label>
				{/each}
			{/if}
		</div>
	{/if}
</div>
