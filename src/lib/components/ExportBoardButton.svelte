<script lang="ts">
	import { kanbanBoard } from '$lib/stores/kanban.js';
	import { labels } from '$lib/stores/labels.js';

	function exportBoard() {
		const columns = $kanbanBoard.map(col => ({
			id: col.id,
			title: col.title,
			cardIds: col.cards.map(c => c.id)
		}));

		const cards = $kanbanBoard.flatMap(col => col.cards);

		// Collect only labels referenced by exported cards
		const referencedLabelIds = new Set(cards.flatMap(c => c.labelIds));
		const exportedLabels = $labels.filter(l => referencedLabelIds.has(l.id));

		const payload = {
			version: '1',
			exportedAt: new Date().toISOString(),
			columns,
			cards,
			labels: exportedLabels
		};

		const json = JSON.stringify(payload, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const date = new Date().toISOString().split('T')[0];
		const a = document.createElement('a');
		a.href = url;
		a.download = `board-export-${date}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<button
	class="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
	onclick={exportBoard}
	aria-label="Export board as JSON"
>
	Export
</button>
