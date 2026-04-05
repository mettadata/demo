<script lang="ts">
	import { viewPreference } from '$lib/stores/kanban.js';

	function setView(view: 'list' | 'kanban') {
		viewPreference.set(view);
	}
</script>

<div class="flex flex-row gap-1">
	<button
		onclick={() => setView('list')}
		aria-label="List view"
		aria-pressed={$viewPreference === 'list'}
		class={$viewPreference === 'list' ? 'bg-blue-500 text-white rounded px-2 py-1' : 'bg-gray-200 text-gray-600 rounded px-2 py-1'}
	>
		☰
	</button>
	<button
		onclick={() => setView('kanban')}
		aria-label="Board view"
		aria-pressed={$viewPreference === 'kanban'}
		class={$viewPreference === 'kanban' ? 'bg-blue-500 text-white rounded px-2 py-1' : 'bg-gray-200 text-gray-600 rounded px-2 py-1'}
	>
		▦
	</button>
</div>
