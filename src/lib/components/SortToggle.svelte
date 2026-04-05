<script lang="ts">
	import { sortByDueDate } from '$lib/stores/todos.js';

	function toggle() {
		sortByDueDate.update((v) => !v);
	}
</script>

<button
	onclick={toggle}
	aria-label="Sort by due date"
	aria-pressed={$sortByDueDate}
	class={$sortByDueDate
		? 'bg-blue-500 text-white rounded px-2 py-1'
		: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded px-2 py-1'}
>
	Sort by date
</button>
