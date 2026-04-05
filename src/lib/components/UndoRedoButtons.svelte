<script lang="ts">
	import { undo, redo, canUndo, canRedo } from '$lib/stores/history.js';
</script>

<div class="flex items-center gap-1">
	<button
		onclick={undo}
		disabled={!$canUndo}
		aria-label="Undo"
		class="rounded px-2 py-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed
			bg-gray-200 text-gray-600 hover:bg-gray-300
			dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
	>
		&#x21B6; Undo
	</button>
	<button
		onclick={redo}
		disabled={!$canRedo}
		aria-label="Redo"
		class="rounded px-2 py-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed
			bg-gray-200 text-gray-600 hover:bg-gray-300
			dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
	>
		&#x21B7; Redo
	</button>
</div>
