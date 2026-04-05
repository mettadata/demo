<script lang="ts">
	import { addTodo } from '$lib/stores/todos.js';

	let text = $state('');

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			const trimmed = text.trim();
			if (trimmed !== '') {
				addTodo(trimmed);
				text = '';
			}
		}
	}
</script>

<input
	type="text"
	bind:value={text}
	onkeydown={handleKeydown}
	placeholder="What needs to be done?"
	aria-label="New todo text"
	class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
