# Card Comments with Threaded Replies and Timestamps

## What was implemented

- Extended the `Todo` interface with a `comments` field containing `Comment` objects (id, body, createdAt, replies)
- Added `Reply` and `Comment` TypeScript interfaces to the store
- Implemented six mutation functions: `addComment`, `editComment`, `deleteComment`, `addReply`, `editReply`, `deleteReply` -- all with snapshot support for undo/redo
- Updated `loadTodos()` to hydrate `comments: []` as a default for legacy data
- Updated `addTodo()` to initialize `comments: []`
- Created `CardComments.svelte` component with:
  - Chronological comment listing with relative timestamps
  - Expandable threaded replies (one level deep)
  - Reply count indicators
  - Textarea + submit for new comments and replies (Ctrl/Cmd+Enter shortcut)
  - Inline edit and delete controls on comments and replies
- Mounted `CardComments` in `KanbanCard.svelte` below `CardAttachments`
- Added 12 unit tests covering all comment/reply CRUD operations and legacy migration
- All data persists via existing localStorage mechanism

## Files changed

- `src/lib/stores/todos.ts` -- types, hydration, mutation functions
- `src/lib/components/CardComments.svelte` -- new component
- `src/lib/components/KanbanCard.svelte` -- mount CardComments
- `src/lib/stores/todos.test.ts` -- comment/reply tests
- `src/lib/stores/kanban.test.ts` -- updated test fixtures for new `comments` field
