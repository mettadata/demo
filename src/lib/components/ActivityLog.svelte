<script lang="ts">
	import type { ActivityEvent } from '$lib/stores/todos.js';
	import { formatRelativeTime, formatActivityDescription } from '$lib/utils/relativeTime.js';

	let { activityLog }: { activityLog: ActivityEvent[] } = $props();

	let expanded = $state(false);

	let sortedEvents = $derived([...activityLog].reverse());

	const eventIcons: Record<string, string> = {
		created: '+',
		completed: '\u2713',
		uncompleted: '\u21BA',
		moved: '\u2192',
		edited: '\u270E'
	};
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="mt-2" onclick={(e) => e.stopPropagation()} onpointerdown={(e) => e.stopPropagation()}>
	<button
		class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
		onclick={() => expanded = !expanded}
		aria-expanded={expanded}
		aria-label="Toggle activity log"
	>
		<span class="transition-transform duration-200 {expanded ? 'rotate-90' : ''}">&triangleright;</span>
		Activity ({activityLog.length})
	</button>
	{#if expanded}
		<div class="mt-1 ml-2 border-l-2 border-gray-200 dark:border-gray-600 pl-3 space-y-1.5">
			{#each sortedEvents as event, i (i)}
				<div class="flex items-start gap-2 text-xs">
					<span class="flex-shrink-0 w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-300 mt-0.5">
						{eventIcons[event.type] ?? '?'}
					</span>
					<div class="flex-1 min-w-0">
						<span class="text-gray-700 dark:text-gray-200">
							{formatActivityDescription(event.type, event.detail)}
						</span>
						<span class="text-gray-400 dark:text-gray-500 ml-1">
							{formatRelativeTime(event.timestamp)}
						</span>
					</div>
				</div>
			{/each}
			{#if sortedEvents.length === 0}
				<p class="text-xs text-gray-400 dark:text-gray-500 italic">No activity recorded</p>
			{/if}
		</div>
	{/if}
</div>
