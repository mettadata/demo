<script lang="ts">
	import { onMount } from 'svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	interface Shortcut {
		keys: string[];
		description: string;
	}

	interface ShortcutGroup {
		title: string;
		shortcuts: Shortcut[];
	}

	const shortcutGroups: ShortcutGroup[] = [
		{
			title: 'Global',
			shortcuts: [
				{ keys: ['Ctrl+Z', 'Cmd+Z'], description: 'Undo' },
				{ keys: ['Ctrl+Shift+Z', 'Cmd+Shift+Z'], description: 'Redo' },
				{ keys: ['?'], description: 'Open shortcuts help' }
			]
		},
		{
			title: 'Todo Input',
			shortcuts: [
				{ keys: ['Enter'], description: 'Add new todo' }
			]
		},
		{
			title: 'Kanban Card',
			shortcuts: [
				{ keys: ['Enter', 'Space'], description: 'Pick up card' },
				{ keys: ['\u2191', '\u2193'], description: 'Move within column' },
				{ keys: ['\u2190', '\u2192'], description: 'Move between columns' },
				{ keys: ['Enter'], description: 'Drop card' },
				{ keys: ['Escape'], description: 'Cancel move' }
			]
		},
		{
			title: 'Column Title Edit',
			shortcuts: [
				{ keys: ['Enter'], description: 'Save' },
				{ keys: ['Escape'], description: 'Cancel' }
			]
		},
		{
			title: 'Label Editing',
			shortcuts: [
				{ keys: ['Enter'], description: 'Save' },
				{ keys: ['Escape'], description: 'Cancel' }
			]
		},
		{
			title: 'Add Column Input',
			shortcuts: [
				{ keys: ['Enter'], description: 'Create' },
				{ keys: ['Escape'], description: 'Cancel' }
			]
		}
	];

	let dialogEl: HTMLDivElement | undefined = $state();
	let previousFocus: HTMLElement | null = null;

	function close() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
		// Focus trap: Tab/Shift+Tab stays within the dialog
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
		if (open) {
			previousFocus = document.activeElement as HTMLElement | null;
			// Focus the dialog on next tick
			requestAnimationFrame(() => {
				if (dialogEl) {
					const closeBtn = dialogEl.querySelector<HTMLElement>('button');
					if (closeBtn) closeBtn.focus();
				}
			});
		} else if (previousFocus) {
			previousFocus.focus();
			previousFocus = null;
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/30 z-40 flex items-center justify-center"
		onclick={close}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			bind:this={dialogEl}
			role="dialog"
			aria-label="Keyboard shortcuts"
			aria-modal="true"
			class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-5 max-h-[80vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold dark:text-white">Keyboard Shortcuts</h2>
				<button
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
					onclick={close}
					aria-label="Close shortcuts help"
				>
					&times;
				</button>
			</div>

			<div class="space-y-5">
				{#each shortcutGroups as group}
					<div>
						<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
							{group.title}
						</h3>
						<div class="space-y-1.5">
							{#each group.shortcuts as shortcut}
								<div class="flex items-center justify-between py-1">
									<span class="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
									<div class="flex items-center gap-1">
										{#each shortcut.keys as key, i}
											{#if i > 0}
												<span class="text-xs text-gray-400 dark:text-gray-500">/</span>
											{/if}
											<kbd class="px-2 py-0.5 text-xs font-mono rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
												{key}
											</kbd>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
