<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';
	import { dismiss } from '$lib/stores/notifications.js';
	import type { NotificationType } from '$lib/stores/notifications.js';

	let { id, type, title, message }: { id: string; type: NotificationType; title: string; message: string } = $props();

	let remaining = $state(5000);
	let startedAt = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const accentClass = $derived(
		type === 'overdue' ? 'border-red-500' :
		type === 'mention' ? 'border-blue-500' :
		'border-yellow-400'
	);

	function startTimer() {
		startedAt = Date.now();
		timer = setTimeout(() => dismiss(id), remaining);
	}

	function pauseTimer() {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
			remaining -= Date.now() - startedAt;
			if (remaining <= 0) dismiss(id);
		}
	}

	function resumeTimer() {
		if (timer === null && remaining > 0) {
			startTimer();
		}
	}

	onMount(() => startTimer());
	onDestroy(() => { if (timer !== null) clearTimeout(timer); });
</script>

<div
	in:fly={{ x: 64, duration: 250 }}
	out:fly={{ x: 64, duration: 200 }}
	class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border-l-4 {accentClass} max-w-sm flex items-start gap-2"
	onmouseenter={pauseTimer}
	onmouseleave={resumeTimer}
>
	<div class="flex-1 min-w-0">
		<span class="sr-only">{title}: {message}</span>
		<p class="font-medium text-sm text-gray-900 dark:text-gray-100" aria-hidden="true">{title}</p>
		<p class="text-xs text-gray-600 dark:text-gray-400" aria-hidden="true">{message}</p>
	</div>
	<button
		type="button"
		aria-label="Dismiss notification"
		class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none flex-shrink-0"
		onclick={() => dismiss(id)}
	>&times;</button>
</div>
