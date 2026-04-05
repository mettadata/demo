<script lang="ts">
	import { searchQuery } from '$lib/stores/todos.js';

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery.set(target.value);
	}

	function handleClear() {
		searchQuery.set('');
	}
</script>

<div class="relative">
	<input
		type="text"
		value={$searchQuery}
		oninput={handleInput}
		placeholder="Search todos..."
		aria-label="Search todos"
		class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
	/>
	{#if $searchQuery}
		<button
			onclick={handleClear}
			aria-label="Clear search"
			class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
		>
			✕
		</button>
	{/if}
</div>
