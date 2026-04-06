# Card Archive Feature

## What was implemented

Added the ability to archive completed cards, hiding them from default views without permanently deleting them. Users can later unarchive cards to restore them to their original position.

## Changes

### Store layer (`src/lib/stores/todos.ts`)
- Added `archived: boolean` field to the `Todo` interface
- Added `'archived'` and `'unarchived'` variants to `ActivityEventType`
- Added `'archived'` option to the `Filter` type
- Added `archiveTodo(id)` and `unarchiveTodo(id)` store functions with activity logging
- Updated `filteredTodos` derived store to exclude archived cards by default, and show only archived cards when filter is `'archived'`
- Back-filled `archived: false` in `loadTodos` for legacy records (follows existing migration pattern)
- Updated `addTodo` to include `archived: false` in new card defaults

### Kanban store (`src/lib/stores/kanban.ts`)
- Updated `kanbanBoard` derived store to filter out archived cards from column resolution
- Cards remain in column `cardIds` arrays so unarchiving restores their original position

### UI components
- **KanbanCard.svelte**: Added archive button (box emoji) on completed cards, unarchive button on archived cards
- **TodoItem.svelte**: Added Archive/Unarchive text buttons alongside the Delete button
- **TodoFilter.svelte**: Added "Archived" filter option to the filter bar
- **ActivityLog.svelte**: Added icons for `archived` and `unarchived` event types

### Utilities (`src/lib/utils/relativeTime.ts`)
- Added `'Archived'` and `'Unarchived'` descriptions to `formatActivityDescription`

## Tests

- 8 new tests in `todos.test.ts` covering: default value, legacy migration, archive/unarchive functions with activity logging, filtered views hiding archived cards, and archived filter mode
- 2 new tests in `relativeTime.test.ts` for the new activity description formatting
- Updated existing test data to include `archived` field
- All 145 tests pass
