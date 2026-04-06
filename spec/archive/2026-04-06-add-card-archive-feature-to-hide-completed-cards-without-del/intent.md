# add-card-archive-feature-to-hide-completed-cards-without-del

## Problem

Users who complete cards on the kanban board have only one non-reversible option for removing them from view: permanent deletion via `removeTodo`. This is destructive — it discards the card's full history including comments, attachments, activity log, and metadata. Users who want a cleaner board view without losing their work history have no safe path. The board accumulates completed cards indefinitely, cluttering the "Done" column and making it harder to focus on active work.

## Proposal

Add an `archived` boolean field to the `Todo` interface in `src/lib/stores/todos.ts`. Archived cards are excluded from the active board and list views by default but remain in localStorage and are fully retrievable.

Specific changes:

- Extend `Todo` with `archived: boolean` (defaults to `false` on load and creation).
- Add `archiveTodo(id: string)` and `unarchiveTodo(id: string)` store functions alongside the existing `removeTodo`.
- Add an `'archived'` and `'unarchived'` variant to `ActivityEventType` so the activity log tracks archive actions.
- Filter archived cards out of `filteredTodos` and the `kanbanBoard` derived store by default.
- Add an "Archive" button to `KanbanCard.svelte` and `TodoItem.svelte`, visible only when the card is completed.
- Add an "Archived" view toggle (alongside the existing All / Active / Completed filters) that shows only archived cards with an "Unarchive" action on each.
- Persist `archived` in the existing `todos` localStorage key — no new storage keys needed.

## Impact

- `Todo` interface gains one new required field; the `loadTodos` hydration function must supply a default of `false` for existing stored records that lack the field.
- `filteredTodos` and `kanbanBoard` derived stores change behavior: archived cards are excluded from all existing filter modes (`all`, `active`, `completed`). Any component consuming these stores will no longer see archived cards in the default flow, which is the intended outcome.
- The `syncWithTodos` function in `kanban.ts` will treat archived card IDs as valid todos (they still exist), so they remain registered in column `cardIds` but will be invisible via `kanbanBoard` because the derived store filters them. On unarchive, they reappear in their last column without any special handling.
- Undo/redo history (via the snapshot mechanism) will capture archive and unarchive operations consistently with other mutations.

## Out of Scope

- Bulk archive (archiving all completed cards at once).
- Automatic archival on completion (cards are not archived implicitly when toggled to completed).
- Export or permanent deletion of archived cards from an archive view.
- Server-side or cross-device persistence of archive state.
- Archive action on cards that are not yet completed.
- Any changes to the kanban column structure (archived cards do not get their own column).
