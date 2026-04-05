<script lang="ts">
	import type { Priority } from '$lib/stores/todos.js';

	const { priority }: { priority: Priority } = $props();

	const styles: Record<Exclude<Priority, 'none'>, string> = {
		low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
		medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
		high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
	};

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}
</script>

{#if priority !== 'none'}
	<span
		class="text-xs font-medium px-1.5 py-0.5 rounded {styles[priority]}"
		aria-label="Priority: {priority}"
	>
		{capitalize(priority)}
	</span>
{/if}
