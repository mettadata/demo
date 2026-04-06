# add-card-activity-log-showing-creation-edits-moves-and-compl

## Problem
Users have no visibility into the history of a card. Once a card is edited, moved between kanban columns, or completed, the prior state is gone. There is no way to answer "when was this card moved to In Progress?" or "what changed when it was last edited?". This affects anyone reviewing work history, debugging unexpected states, or auditing completed tasks.

## Proposal
Add a per-card activity log that records a chronological list of events for each todo:

- **ActivityEvent model**: Each event has a `type` (one of `created` | `edited` | `moved` | `completed` | `uncompleted`), a `timestamp` (ISO 8601 string), and an optional `detail` object carrying before/after values for the changed field(s).
- **`Todo` interface extension**: Add `activityLog: ActivityEvent[]` to the existing `Todo` interface. The `createdAt` field already exists and MUST be used to seed the first `created` event on migration/load.
- **Event capture at mutation sites**:
  - `addTodo` MUST append a `created` event with the creation timestamp.
  - `updateTodo` MUST append one `edited` event per call, recording which fields changed and their previous vs. new values (covering `text`, `description`, `priority`, `dueDate`, `labelIds`).
  - `toggleTodo` MUST append a `completed` or `uncompleted` event depending on the resulting state.
  - `moveCard` in the kanban store MUST append a `moved` event recording the source column id/title and target column id/title.
- **Activity log UI**: A collapsible activity section MUST appear on each card's detail view (KanbanCard expanded state and TodoItem detail panel). Entries SHOULD be shown in reverse-chronological order with a human-readable timestamp and a plain-English description of the event (e.g., "Moved from To Do to In Progress", "Priority changed from none to high").
- **Persistence**: The `activityLog` array MUST be persisted in localStorage as part of the todo record. Existing todos loaded from localStorage without an `activityLog` field MUST have the field initialized to `[{ type: 'created', timestamp: createdAt }]`.

## Impact
- `Todo` interface gains `activityLog: ActivityEvent[]` — all code that constructs or clones a `Todo` object is affected.
- `loadTodos()` migration logic must backfill `activityLog` for pre-existing records.
- `addTodo`, `toggleTodo`, and `updateTodo` in `todos.ts` each require an event append before the store write.
- `moveCard` in `kanban.ts` requires access to column titles to record human-readable move events; it currently operates only on column IDs.
- `KanbanCard.svelte` and `TodoItem.svelte` gain a new collapsible activity section.
- Snapshot/undo state managed by the `registerSnapshotFn` mechanism captures the full log — no special handling needed, but log entries are not themselves undoable (undo restores the prior log state as part of the full todo snapshot).

## Out of Scope
- Server-side or cross-device activity log sync
- Exporting or printing the activity log
- Activity log for column-level events (renaming, deleting, reordering columns)
- Filtering or searching within the activity log
- Per-user attribution (there is only one user, no auth)
- Real-time collaboration or conflict resolution
- Deleting or manually editing individual log entries
