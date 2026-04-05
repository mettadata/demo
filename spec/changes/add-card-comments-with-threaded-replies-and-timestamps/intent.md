# add-card-comments-with-threaded-replies-and-timestamps

## Problem

Users working with kanban cards have no way to record discussions, decisions, or contextual notes tied to a card. Currently, the `description` field holds static text and the `activityLog` records system-generated events only — neither supports freeform human communication. Teams lose context when intent and rationale live in external chat tools instead of on the card itself.

Affected users: anyone using the kanban board collaboratively or revisiting cards after time has passed.

## Proposal

Add a comments section to each kanban card, rendered inside the existing card detail panel (the `showEdit` section in `KanbanCard.svelte`) alongside `DescriptionEditor`, `CardAttachments`, and `ActivityLog`.

Specifically:

- Extend the `Todo` interface in `src/lib/stores/todos.ts` with a `comments` field: an array of `Comment` objects. Each `Comment` has `id` (UUID), `body` (string), `createdAt` (ISO 8601 string), and `replies` (array of `Reply` objects). Each `Reply` has the same shape minus `replies`.
- Add `addComment`, `editComment`, `deleteComment`, `addReply`, `editReply`, and `deleteReply` mutation functions to `todos.ts`, each calling `snapshot()` for undo/redo compatibility.
- Create `CardComments.svelte` in `src/lib/components/` that:
  - Lists existing top-level comments in chronological order, each showing body text and a relative timestamp using the existing `formatRelativeTime` utility.
  - Shows a reply count indicator on each top-level comment and allows expanding to view and add replies (one level deep only).
  - Provides a textarea + submit button to post a new top-level comment.
  - Provides inline edit and delete controls on each comment and reply.
- Mount `<CardComments>` in `KanbanCard.svelte` below `CardAttachments` inside the `showEdit` block, passing `todoId` and `comments`.
- Persist comments inside the existing `todos` localStorage key — no new storage keys.
- Update `loadTodos()` to hydrate `comments: []` as the default for cards that lack the field (backward-compatible migration).

## Impact

- `Todo` interface gains a `comments` field — all existing todo-reading code continues to work because the field is optional on read and defaulted on hydration.
- `addTodo` must initialize `comments: []` alongside the existing fields.
- `updateTodo` signature is unchanged; comments are mutated through dedicated functions.
- The `history.ts` undo/redo store already snapshots the full `todos` array via the registered `snapshot()` hook, so comment mutations are automatically undoable at the whole-card level.
- `KanbanCard.svelte` grows one additional child component in the detail panel; layout and drag behavior are unaffected.
- The `TodoItem.svelte` list-view component is not modified; comments are kanban-only in this iteration.
- localStorage payload size increases proportionally to comment volume; no new quota handling is needed beyond what `addAttachment` already does.

## Out of Scope

- Usernames or author identity — there is no auth system; comments are anonymous.
- More than one level of reply nesting — replies to replies are not supported.
- Comment mentions, notifications, or reactions.
- Rendering comment body as Markdown — plain text only.
- Displaying a comment count badge on the collapsed card face.
- Surfacing comments in the list-view (`TodoItem.svelte`).
- Search indexing of comment content via the existing `SearchBar`.
- Any backend, API, or real-time sync — in-memory/localStorage only.
- Pagination or lazy-loading of comments.
