<script lang="ts">
	const { dueDate }: { dueDate: string | null } = $props();

	const today = new Date().toISOString().split('T')[0];
	const isOverdue = $derived(dueDate !== null && dueDate < today);
	const formatted = $derived(
		dueDate !== null
			? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric'
				})
			: ''
	);
</script>

{#if dueDate !== null}
	<span
		class="text-xs {isOverdue
			? 'text-red-600 dark:text-red-400'
			: 'text-gray-500 dark:text-gray-400'}"
	>
		{#if isOverdue}Overdue: {/if}{formatted}
	</span>
{/if}
