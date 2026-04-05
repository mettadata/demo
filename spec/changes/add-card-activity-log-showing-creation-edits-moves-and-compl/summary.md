# Implementation Summary: Card Activity Log

## What was implemented

Per-card activity log tracking creation, edits, moves, and completion events with timestamps.

## Data model changes

- Added `ActivityEventType` union type and `ActivityEvent` interface to `src/lib/stores/todos.ts`
- Extended `Todo` interface with `activityLog: ActivityEvent[]` field
- Migration in `loadTodos()` backfills existing todos lacking `activityLog` with a `created` event using `todo.createdAt`

## Mutation sites wired up

1. **`addTodo`** -- appends `{ type: 'created', timestamp }` on creation
2. **`updateTodo`** -- appends `{ type: 'edited', timestamp, detail: { field, from, to } }` for each changed field, with diff detection via JSON comparison
3. **`toggleTodo`** -- appends `completed` or `uncompleted` event based on prior state
4. **`moveCard`** in `kanban.ts` -- appends `{ type: 'moved', timestamp, detail: { fromColumn, toColumn } }` for cross-column moves only, with column title lookup; includes guard to skip update when card ID has no matching todo

## New files

- `src/lib/components/ActivityLog.svelte` -- collapsible UI component showing events in reverse-chronological order with icons, human-readable descriptions, and relative timestamps
- `src/lib/utils/relativeTime.ts` -- `formatRelativeTime()` for relative timestamps and `formatActivityDescription()` for human-readable event descriptions
- `src/lib/utils/relativeTime.test.ts` -- 19 tests covering both utility functions

## Integration points

- `KanbanCard.svelte` -- ActivityLog rendered inside the expanded detail view (`showEdit` block)
- `TodoItem.svelte` -- ActivityLog rendered below the description editor

## Test results

All 112 existing tests pass. 19 new tests added for the relativeTime utility. Build completes with no TypeScript errors.
