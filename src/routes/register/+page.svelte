<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
	<div class="w-full max-w-sm mx-auto p-6">
		<h1 class="text-3xl font-bold dark:text-white text-center mb-6">Create Account</h1>

		{#if form?.error}
			<div
				class="mb-4 p-3 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm"
				role="alert"
			>
				{form.error}
			</div>
		{/if}

		<form method="POST" use:enhance class="flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Username</span>
				<input
					type="text"
					name="username"
					required
					autocomplete="username"
					class="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
				<input
					type="password"
					name="password"
					required
					minlength="8"
					autocomplete="new-password"
					class="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</label>

			<button
				type="submit"
				class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium transition-colors"
			>
				Register
			</button>
		</form>

		<p class="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
			Already have an account?
			<a href="/login" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Log in</a>
		</p>
	</div>
</div>
