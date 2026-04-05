<script lang="ts">
	import { filter } from '$lib/stores/todos.js';
	import type { Filter } from '$lib/stores/todos.js';

	const options: { label: string; value: Filter }[] = [
		{ label: 'All', value: 'all' },
		{ label: 'Active', value: 'active' },
		{ label: 'Completed', value: 'completed' }
	];
</script>

<div class="flex gap-2">
	{#each options as option}
		<button
			onclick={() => filter.set(option.value)}
			class={$filter === option.value
				? 'px-3 py-1 rounded bg-blue-500 text-white'
				: 'px-3 py-1 rounded bg-gray-200 text-gray-700'}
		>
			{option.label}
		</button>
	{/each}
</div>
