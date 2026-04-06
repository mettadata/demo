<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
	<div class="w-full max-w-sm mx-auto p-6">
		<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-6">
			<h1 class="text-2xl font-bold text-center dark:text-white mb-6">Log In</h1>

			{#if form?.error}
				<div class="mb-4 p-3 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm" role="alert">
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance class="flex flex-col gap-4">
				<div>
					<label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Username
					</label>
					<input
						id="username"
						name="username"
						type="text"
						required
						autocomplete="username"
						class="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						autocomplete="current-password"
						class="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<button
					type="submit"
					class="w-full py-2 px-4 bg-blue-500 text-white font-medium rounded hover:bg-blue-600 transition-colors"
				>
					Log In
				</button>
			</form>

			<p class="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
				Don't have an account?
				<a href="/register" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Register</a>
			</p>
		</div>
	</div>
</div>
