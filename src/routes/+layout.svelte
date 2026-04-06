<script>
	import '../app.css';
	import '$lib/stores/theme.js';
	import { enhance } from '$app/forms';

	let { data, children } = $props();
</script>

{#if data.user}
	<header class="flex items-center justify-end gap-4 p-4">
		<span class="text-sm text-gray-600 dark:text-gray-400">{data.user.username}</span>
		<form method="POST" action="/?/logout" use:enhance>
			<button type="submit" class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Logout</button>
		</form>
	</header>
{/if}

{@render children()}
