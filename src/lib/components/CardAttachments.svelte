<script lang="ts">
	import type { Attachment } from '$lib/stores/todos.js';
	import { addAttachment, removeAttachment } from '$lib/stores/todos.js';
	import { self } from '$lib/stores/collaborators.js';

	const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

	let { todoId, attachments }: { todoId: string; attachments: Attachment[] } = $props();

	let dragOver = $state(false);
	let errorMessage = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function processFiles(files: FileList | null) {
		if (!files) return;
		errorMessage = '';
		for (const file of Array.from(files)) {
			if (file.size > MAX_FILE_SIZE) {
				errorMessage = `"${file.name}" exceeds the 5 MB limit (${formatSize(file.size)}).`;
				continue;
			}
			const reader = new FileReader();
			reader.onload = () => {
				const attachment: Attachment = {
					id: crypto.randomUUID(),
					name: file.name,
					mimeType: file.type || 'application/octet-stream',
					dataUrl: reader.result as string,
					size: file.size,
					createdAt: new Date().toISOString()
				};
				const ok = addAttachment(todoId, attachment, $self.id);
				if (!ok) {
					errorMessage = 'Storage quota exceeded. Could not save attachment.';
				}
			};
			reader.readAsDataURL(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		dragOver = false;
		if (event.dataTransfer?.files.length) {
			processFiles(event.dataTransfer.files);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		// Only show drop zone if files are being dragged (not kanban cards)
		if (event.dataTransfer?.types.includes('Files')) {
			dragOver = true;
		}
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		dragOver = false;
	}

	function handleFileSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		processFiles(input.files);
		input.value = '';
	}

	function handleRemove(attachmentId: string) {
		removeAttachment(todoId, attachmentId, $self.id);
	}

	function isImage(mimeType: string): boolean {
		return mimeType.startsWith('image/');
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="mt-2 space-y-2" onclick={(e) => e.stopPropagation()} onpointerdown={(e) => e.stopPropagation()}>
	<div class="text-xs font-medium text-gray-600 dark:text-gray-300">Attachments</div>

	{#if attachments.length > 0}
		<div class="grid grid-cols-2 gap-2">
			{#each attachments as attachment (attachment.id)}
				<div class="relative group border border-gray-200 dark:border-gray-600 rounded-md p-1.5 bg-gray-50 dark:bg-gray-800">
					{#if isImage(attachment.mimeType)}
						<img
							src={attachment.dataUrl}
							alt={attachment.name}
							class="w-full h-16 object-cover rounded"
						/>
					{:else}
						<div class="w-full h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
							<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
							</svg>
						</div>
					{/if}
					<div class="mt-1 flex items-center justify-between gap-1">
						<a
							href={attachment.dataUrl}
							download={attachment.name}
							class="text-[10px] text-blue-600 dark:text-blue-400 hover:underline truncate flex-1"
							title={attachment.name}
							onclick={(e) => e.stopPropagation()}
						>
							{attachment.name}
						</a>
						<button
							type="button"
							class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
							onclick={() => handleRemove(attachment.id)}
							aria-label="Remove attachment {attachment.name}"
						>
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					<div class="text-[9px] text-gray-400">{formatSize(attachment.size)}</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="border-2 border-dashed rounded-md p-3 text-center text-xs transition-colors {dragOver
			? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
			: 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		role="region"
		aria-label="File drop zone"
	>
		<p>Drop files here or</p>
		<button
			type="button"
			class="mt-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
			onclick={() => fileInput?.click()}
		>
			browse files
		</button>
		<p class="text-[10px] text-gray-400 mt-1">Max 5 MB per file</p>
		<input
			bind:this={fileInput}
			type="file"
			multiple
			class="hidden"
			onchange={handleFileSelect}
			aria-label="Upload attachment"
		/>
	</div>

	{#if errorMessage}
		<p class="text-xs text-red-600 dark:text-red-400" role="alert">{errorMessage}</p>
	{/if}
</div>
