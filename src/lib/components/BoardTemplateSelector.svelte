<script lang="ts">
	import { BOARD_TEMPLATES } from '$lib/stores/kanban.js';

	let { onselect, ondismiss }: { onselect: (name: string) => void; ondismiss: () => void } = $props();

	let dialogEl: HTMLDivElement | undefined = $state();
	let previousFocus: HTMLElement | null = null;

	const templateKeys = Object.keys(BOARD_TEMPLATES) as Array<keyof typeof BOARD_TEMPLATES>;

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			ondismiss();
		}
		// Focus trap
		if (e.key === 'Tab' && dialogEl) {
			const focusable = dialogEl.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			if (focusable.length === 0) {
				e.preventDefault();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		}
	}

	$effect(() => {
		previousFocus = document.activeElement as HTMLElement | null;
		requestAnimationFrame(() => {
			if (dialogEl) {
				const firstBtn = dialogEl.querySelector<HTMLElement>('button');
				if (firstBtn) firstBtn.focus();
			}
		});

		return () => {
			if (previousFocus) {
				previousFocus.focus();
			}
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
	onclick={ondismiss}
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		bind:this={dialogEl}
		role="dialog"
		aria-modal="true"
		aria-label="Choose a board template"
		class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="mb-6">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Choose a Board Template</h2>
			<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Start with a pre-configured board layout, or skip to use the default columns.</p>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
			{#each templateKeys as key}
				{@const template = BOARD_TEMPLATES[key]}
				<div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex flex-col">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">{template.name}</h3>
					<p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{template.description}</p>
					<ul class="text-xs text-gray-600 dark:text-gray-300 space-y-1 mb-4 flex-1">
						{#each template.columns as col}
							<li class="flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 inline-block flex-shrink-0"></span>
								{col.title}
							</li>
						{/each}
					</ul>
					<button
						class="w-full px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 cursor-pointer"
						onclick={() => onselect(key)}
					>
						Use this template
					</button>
				</div>
			{/each}
		</div>

		<div class="flex justify-center">
			<button
				class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
				onclick={ondismiss}
			>
				Skip for now
			</button>
		</div>
	</div>
</div>
