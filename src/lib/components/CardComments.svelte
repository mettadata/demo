<script lang="ts">
	import type { Comment } from '$lib/stores/todos.js';
	import { addComment, editComment, deleteComment, addReply, editReply, deleteReply } from '$lib/stores/todos.js';
	import { formatRelativeTime } from '$lib/utils/relativeTime.js';

	let { todoId, comments }: { todoId: string; comments: Comment[] } = $props();

	let newCommentBody = $state('');
	let editingCommentId = $state<string | null>(null);
	let editingCommentBody = $state('');
	let editingReplyId = $state<string | null>(null);
	let editingReplyBody = $state('');
	let replyingToCommentId = $state<string | null>(null);
	let newReplyBody = $state('');
	let expandedCommentIds = $state<Set<string>>(new Set());

	function handleAddComment() {
		if (newCommentBody.trim() === '') return;
		addComment(todoId, newCommentBody);
		newCommentBody = '';
	}

	function handleStartEditComment(comment: Comment) {
		editingCommentId = comment.id;
		editingCommentBody = comment.body;
		editingReplyId = null;
		replyingToCommentId = null;
	}

	function handleSaveEditComment(commentId: string) {
		if (editingCommentBody.trim() === '') return;
		editComment(todoId, commentId, editingCommentBody);
		editingCommentId = null;
		editingCommentBody = '';
	}

	function handleCancelEditComment() {
		editingCommentId = null;
		editingCommentBody = '';
	}

	function handleDeleteComment(commentId: string) {
		deleteComment(todoId, commentId);
	}

	function handleToggleReplies(commentId: string) {
		const next = new Set(expandedCommentIds);
		if (next.has(commentId)) {
			next.delete(commentId);
		} else {
			next.add(commentId);
		}
		expandedCommentIds = next;
	}

	function handleStartReply(commentId: string) {
		replyingToCommentId = commentId;
		newReplyBody = '';
		editingCommentId = null;
		editingReplyId = null;
		// Expand replies when starting a reply
		if (!expandedCommentIds.has(commentId)) {
			const next = new Set(expandedCommentIds);
			next.add(commentId);
			expandedCommentIds = next;
		}
	}

	function handleAddReply(commentId: string) {
		if (newReplyBody.trim() === '') return;
		addReply(todoId, commentId, newReplyBody);
		newReplyBody = '';
		replyingToCommentId = null;
	}

	function handleCancelReply() {
		replyingToCommentId = null;
		newReplyBody = '';
	}

	function handleStartEditReply(commentId: string, reply: { id: string; body: string }) {
		editingReplyId = reply.id;
		editingReplyBody = reply.body;
		editingCommentId = null;
		replyingToCommentId = null;
		// Store parent comment id for save
		_editReplyParentCommentId = commentId;
	}

	let _editReplyParentCommentId = $state('');

	function handleSaveEditReply(replyId: string) {
		if (editingReplyBody.trim() === '') return;
		editReply(todoId, _editReplyParentCommentId, replyId, editingReplyBody);
		editingReplyId = null;
		editingReplyBody = '';
	}

	function handleCancelEditReply() {
		editingReplyId = null;
		editingReplyBody = '';
	}

	function handleDeleteReply(commentId: string, replyId: string) {
		deleteReply(todoId, commentId, replyId);
	}

	function handleCommentKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			handleAddComment();
		}
	}

	function handleReplyKeydown(event: KeyboardEvent, commentId: string) {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			handleAddReply(commentId);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="mt-2 space-y-2" onclick={(e) => e.stopPropagation()} onpointerdown={(e) => e.stopPropagation()}>
	<div class="text-xs font-medium text-gray-600 dark:text-gray-300">Comments</div>

	{#if comments.length > 0}
		<div class="space-y-2">
			{#each comments as comment (comment.id)}
				<div class="border border-gray-200 dark:border-gray-600 rounded-md p-2 bg-gray-50 dark:bg-gray-800">
					{#if editingCommentId === comment.id}
						<textarea
							class="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white resize-none"
							rows="2"
							bind:value={editingCommentBody}
							aria-label="Edit comment"
						></textarea>
						<div class="flex gap-1 mt-1">
							<button
								type="button"
								class="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
								onclick={() => handleSaveEditComment(comment.id)}
							>Save</button>
							<button
								type="button"
								class="text-[10px] px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
								onclick={handleCancelEditComment}
							>Cancel</button>
						</div>
					{:else}
						<p class="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{comment.body}</p>
						<div class="flex items-center gap-2 mt-1">
							<span class="text-[10px] text-gray-400 dark:text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
							<button
								type="button"
								class="text-[10px] text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
								onclick={() => handleStartEditComment(comment)}
								aria-label="Edit comment"
							>Edit</button>
							<button
								type="button"
								class="text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400"
								onclick={() => handleDeleteComment(comment.id)}
								aria-label="Delete comment"
							>Delete</button>
							<button
								type="button"
								class="text-[10px] text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
								onclick={() => handleStartReply(comment.id)}
								aria-label="Reply to comment"
							>Reply</button>
							{#if comment.replies.length > 0}
								<button
									type="button"
									class="text-[10px] text-blue-500 dark:text-blue-400 hover:underline"
									onclick={() => handleToggleReplies(comment.id)}
									aria-label="{expandedCommentIds.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}"
								>
									{expandedCommentIds.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
								</button>
							{/if}
						</div>
					{/if}

					{#if expandedCommentIds.has(comment.id) && comment.replies.length > 0}
						<div class="ml-3 mt-2 space-y-1.5 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
							{#each comment.replies as reply (reply.id)}
								{#if editingReplyId === reply.id}
									<div>
										<textarea
											class="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white resize-none"
											rows="2"
											bind:value={editingReplyBody}
											aria-label="Edit reply"
										></textarea>
										<div class="flex gap-1 mt-1">
											<button
												type="button"
												class="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
												onclick={() => handleSaveEditReply(reply.id)}
											>Save</button>
											<button
												type="button"
												class="text-[10px] px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
												onclick={handleCancelEditReply}
											>Cancel</button>
										</div>
									</div>
								{:else}
									<div>
										<p class="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{reply.body}</p>
										<div class="flex items-center gap-2 mt-0.5">
											<span class="text-[10px] text-gray-400 dark:text-gray-500">{formatRelativeTime(reply.createdAt)}</span>
											<button
												type="button"
												class="text-[10px] text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
												onclick={() => handleStartEditReply(comment.id, reply)}
												aria-label="Edit reply"
											>Edit</button>
											<button
												type="button"
												class="text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400"
												onclick={() => handleDeleteReply(comment.id, reply.id)}
												aria-label="Delete reply"
											>Delete</button>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/if}

					{#if replyingToCommentId === comment.id}
						<div class="ml-3 mt-2 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
							<textarea
								class="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white resize-none"
								rows="2"
								placeholder="Write a reply..."
								bind:value={newReplyBody}
								onkeydown={(e) => handleReplyKeydown(e, comment.id)}
								aria-label="New reply"
							></textarea>
							<div class="flex gap-1 mt-1">
								<button
									type="button"
									class="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
									onclick={() => handleAddReply(comment.id)}
									disabled={newReplyBody.trim() === ''}
								>Reply</button>
								<button
									type="button"
									class="text-[10px] px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
									onclick={handleCancelReply}
								>Cancel</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div>
		<textarea
			class="w-full text-xs p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white resize-none"
			rows="2"
			placeholder="Add a comment..."
			bind:value={newCommentBody}
			onkeydown={handleCommentKeydown}
			aria-label="New comment"
		></textarea>
		<button
			type="button"
			class="mt-1 text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
			onclick={handleAddComment}
			disabled={newCommentBody.trim() === ''}
		>Add Comment</button>
	</div>
</div>
