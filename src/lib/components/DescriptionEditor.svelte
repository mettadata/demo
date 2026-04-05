<script lang="ts">
	import { renderMarkdown } from '$lib/utils/markdown.js';
	import { updateTodo } from '$lib/stores/todos.js';

	let { description, todoId }: { description: string; todoId: string } = $props();

	let editing = $state(false);
	let draft = $state('');

	function startEditing() {
		draft = description;
		editing = true;
	}

	function save() {
		updateTodo(todoId, { description: draft });
		editing = false;
	}

	function cancel() {
		editing = false;
	}

	let previewHtml = $derived(renderMarkdown(draft));
</script>

{#if editing}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="mt-2 space-y-2"
		onclick={(e) => e.stopPropagation()}
		onpointerdown={(e) => e.stopPropagation()}
	>
		<textarea
			class="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 dark:text-white resize-y min-h-[60px]"
			bind:value={draft}
			placeholder="Write markdown here..."
			aria-label="Description editor for {todoId}"
			rows="3"
		></textarea>
		{#if draft.trim()}
			<div class="text-xs p-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-200 prose-sm prose-headings:my-1 prose-p:my-0 prose-ul:my-1">
				{@html previewHtml}
			</div>
		{/if}
		<div class="flex gap-2">
			<button
				class="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
				onclick={save}
				onpointerdown={(e) => e.stopPropagation()}
			>
				Save
			</button>
			<button
				class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500"
				onclick={cancel}
				onpointerdown={(e) => e.stopPropagation()}
			>
				Cancel
			</button>
		</div>
	</div>
{:else}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="mt-1 cursor-pointer"
		onclick={(e) => { e.stopPropagation(); startEditing(); }}
		onpointerdown={(e) => e.stopPropagation()}
	>
		{#if description}
			<div class="text-xs p-2 rounded bg-gray-50 dark:bg-gray-800 dark:text-gray-200 prose-sm prose-headings:my-1 prose-p:my-0 prose-ul:my-1">
				{@html renderMarkdown(description)}
			</div>
		{:else}
			<span class="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">Add description...</span>
		{/if}
	</div>
{/if}
