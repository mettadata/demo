<script lang="ts">
	import { notifications } from '$lib/stores/notifications.js';
	import Toast from './Toast.svelte';
</script>

<div
	role="status"
	aria-live="polite"
	class="fixed bottom-6 right-6 flex flex-col-reverse gap-2 z-[9999] pointer-events-none"
>
	{#each [...$notifications].reverse() as n (n.id)}
		<div class="pointer-events-auto">
			<Toast id={n.id} type={n.type} title={n.title} message={n.message} />
		</div>
	{/each}
</div>
