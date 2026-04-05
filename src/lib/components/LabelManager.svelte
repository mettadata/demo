<script lang="ts">
	import { labels, addLabel, updateLabel, removeLabel, LABEL_COLORS, LABEL_COLOR_CLASSES } from '$lib/stores/labels.js';
	import type { LabelColor } from '$lib/stores/labels.js';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let newName = $state('');
	let newColor = $state<LabelColor>('blue');
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editColor = $state<LabelColor>('blue');

	function handleAdd() {
		const trimmed = newName.trim();
		if (trimmed === '') return;
		addLabel(trimmed, newColor);
		newName = '';
		newColor = 'blue';
	}

	function startEdit(id: string, name: string, color: LabelColor) {
		editingId = id;
		editName = name;
		editColor = color;
	}

	function saveEdit() {
		if (editingId === null) return;
		const trimmed = editName.trim();
		if (trimmed === '') return;
		updateLabel(editingId, { name: trimmed, color: editColor });
		editingId = null;
	}

	function cancelEdit() {
		editingId = null;
	}

	function handleDelete(id: string) {
		removeLabel(id);
		if (editingId === id) editingId = null;
	}

	const colorDotClass: Record<LabelColor, string> = {
		red: 'bg-red-500',
		orange: 'bg-orange-500',
		amber: 'bg-amber-500',
		green: 'bg-green-500',
		teal: 'bg-teal-500',
		blue: 'bg-blue-500',
		purple: 'bg-purple-500',
		pink: 'bg-pink-500',
	};
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/30 z-40 flex items-center justify-center"
		onclick={() => { open = false; }}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-5"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold dark:text-white">Manage Labels</h2>
				<button
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
					onclick={() => { open = false; }}
					aria-label="Close label manager"
				>
					&times;
				</button>
			</div>

			<!-- Add label form -->
			<div class="flex items-center gap-2 mb-4">
				<input
					type="text"
					class="flex-1 text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
					placeholder="New label name"
					bind:value={newName}
					onkeydown={(e) => { if (e.key === 'Enter') handleAdd(); }}
					aria-label="New label name"
				/>
				<div class="flex gap-1">
					{#each LABEL_COLORS as color}
						<button
							class="w-5 h-5 rounded-full {colorDotClass[color]} {newColor === color ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-300' : ''}"
							onclick={() => { newColor = color; }}
							aria-label="Select {color} color"
						></button>
					{/each}
				</div>
				<button
					class="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
					onclick={handleAdd}
				>
					Add
				</button>
			</div>

			<!-- Label list -->
			<div class="space-y-2 max-h-64 overflow-y-auto">
				{#each $labels as label (label.id)}
					{#if editingId === label.id}
						<div class="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-700">
							<input
								type="text"
								class="flex-1 text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white"
								bind:value={editName}
								onkeydown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
								aria-label="Edit label name"
							/>
							<div class="flex gap-1">
								{#each LABEL_COLORS as color}
									<button
										class="w-4 h-4 rounded-full {colorDotClass[color]} {editColor === color ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-300' : ''}"
										onclick={() => { editColor = color; }}
										aria-label="Select {color} color"
									></button>
								{/each}
							</div>
							<button
								class="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
								onclick={saveEdit}
							>
								Save
							</button>
							<button
								class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 dark:text-white hover:bg-gray-300"
								onclick={cancelEdit}
							>
								Cancel
							</button>
						</div>
					{:else}
						<div class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
							<span class="w-3 h-3 rounded-full flex-shrink-0 {colorDotClass[label.color]}"></span>
							<span class="flex-1 text-sm dark:text-white">{label.name}</span>
							<button
								class="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
								onclick={() => startEdit(label.id, label.name, label.color)}
								aria-label="Edit {label.name}"
							>
								Edit
							</button>
							<button
								class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
								onclick={() => handleDelete(label.id)}
								aria-label="Delete {label.name}"
							>
								Delete
							</button>
						</div>
					{/if}
				{/each}
				{#if $labels.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No labels yet. Create one above.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
