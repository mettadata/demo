# Design: add-kanban-board-with-draggable-columns-and-cards-like-trell

## Approach

Add a kanban board as a parallel view to the existing todo list, driven by a separate `kanban.ts` store that owns only layout metadata (columns and card positions). The existing `todos.ts` store remains completely untouched and continues to be the sole source of truth for todo data. The kanban store subscribes reactively to the todo store to detect additions and deletions, automatically placing new todos in the first column and pruning orphaned references. A view toggle in the page header switches between list and kanban views, with the preference persisted to localStorage. Drag-and-drop uses the native HTML5 DnD API with no external libraries.

## Components

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/stores/kanban.ts` | Kanban state store, mutation functions, localStorage persistence, todo store sync |
| `src/lib/components/KanbanBoard.svelte` | Top-level board layout, renders columns horizontally, owns the "Add Column" button |
| `src/lib/components/KanbanColumn.svelte` | Single column: header (title, rename, delete), drop zone, renders cards vertically |
| `src/lib/components/KanbanCard.svelte` | Single card: displays todo data, initiates drag, handles keyboard movement |
| `src/lib/components/ViewToggle.svelte` | List/board icon toggle, reads and writes `viewPreference` store |

### Modified Files

| File | Change |
|------|--------|
| `src/routes/+page.svelte` | Import `ViewToggle` and `KanbanBoard`, conditionally render list or kanban based on `viewPreference` |

### Component Props and DnD Event Mapping

**KanbanBoard.svelte**
```typescript
// Props: none (reads from kanbanBoard derived store directly)
// Renders: {#each $kanbanBoard as column} -> <KanbanColumn>
// Actions: dispatches addColumn() on "Add Column" click
```

**KanbanColumn.svelte**
```typescript
interface KanbanColumnProps {
  column: ResolvedColumn;  // column with resolved Todo objects
}
// DnD events:
//   on:dragover   -> preventDefault(), calculate drop index from clientY vs card rects
//   on:dragenter  -> add highlight class, set aria-dropeffect="move"
//   on:dragleave  -> remove highlight class, clear aria-dropeffect
//   on:drop       -> read todoId from dataTransfer, call moveCard(todoId, columnId, dropIndex)
// Column header:
//   on:dblclick   -> enable inline title editing
//   delete button -> call deleteColumn(columnId), guarded by last-column check
```

**KanbanCard.svelte**
```typescript
interface KanbanCardProps {
  todo: Todo;              // full Todo object from todo store
  columnId: string;        // parent column ID for accessibility label
  columnTitle: string;     // parent column title for screen reader announcement
}
// DnD events:
//   draggable="true"
//   on:dragstart  -> set dataTransfer with todoId, set aria-grabbed="true"
//   on:dragend    -> set aria-grabbed="false"
// Keyboard:
//   on:keydown    -> Space/Enter activates move mode, arrow keys select target, Enter confirms
// Accessibility:
//   role="listitem", aria-grabbed, tabindex="0"
//   aria-label="{todo.text} in {columnTitle}"
```

**ViewToggle.svelte**
```typescript
// Props: none (reads/writes viewPreference store directly)
// Renders: two icon buttons (list, board), active state styled distinctly
// on:click -> sets viewPreference to 'list' or 'kanban'
```

## Data Model

### Interfaces

```typescript
// src/lib/stores/kanban.ts

export interface KanbanColumn {
  id: string;          // generated via crypto.randomUUID()
  title: string;       // user-visible column name, must be non-empty
  cardIds: string[];   // ordered array of todo IDs; index = position
}

export interface KanbanState {
  columns: KanbanColumn[];  // ordered array; index = display order
}

export interface ResolvedColumn {
  id: string;
  title: string;
  cards: Todo[];       // cardIds resolved to full Todo objects (missing todos filtered out)
}

export type ViewPreference = 'list' | 'kanban';
```

### Default State

When no persisted state exists, the store initializes with:

```typescript
{
  columns: [
    { id: crypto.randomUUID(), title: "To Do",        cardIds: [...allExistingTodoIds] },
    { id: crypto.randomUUID(), title: "In Progress",  cardIds: [] },
    { id: crypto.randomUUID(), title: "Done",         cardIds: [] }
  ]
}
```

### localStorage Schema

| Key | Value | Written On |
|-----|-------|-----------|
| `kanban-state` | `JSON.stringify(KanbanState)` | Every kanban mutation (column CRUD, card move/reorder, sync) |
| `view-preference` | `"list"` or `"kanban"` | View toggle click |

Position is implicit from array index in `cardIds` (within a column) and `columns` (for column order). No separate sort-order field exists.

## API Design

### Store Exports

```typescript
// src/lib/stores/kanban.ts

import type { Writable, Readable } from 'svelte/store';
import type { Todo } from './todos.js';

// --- Stores ---

/** Raw kanban layout state. */
export const kanbanState: Writable<KanbanState>;

/** Derived store: columns with cardIds resolved to full Todo objects. */
export const kanbanBoard: Readable<ResolvedColumn[]>;

/** Current view mode, persisted to localStorage. */
export const viewPreference: Writable<ViewPreference>;

// --- Column Mutations ---

/** Append a new column with the given title. Rejects empty strings. */
export function addColumn(title: string): void;

/** Update a column's title. Rejects empty strings. No-ops if columnId not found. */
export function renameColumn(columnId: string, title: string): void;

/**
 * Remove a column. Moves its cards to the first remaining column (appended at end).
 * Throws if this is the last column.
 */
export function deleteColumn(columnId: string): void;

/** Move a column to a new index in the columns array. */
export function moveColumn(columnId: string, newIndex: number): void;

// --- Card Mutations ---

/**
 * Move a card from its current column to targetColumnId at targetIndex.
 * Also handles within-column reordering when targetColumnId matches current column.
 */
export function moveCard(todoId: string, targetColumnId: string, targetIndex: number): void;

// --- Internal ---

/**
 * Reconcile kanban state with current todo list.
 * Called reactively inside todos.subscribe().
 * - New todo IDs (in todos but not in any column) -> appended to first column
 * - Orphaned card IDs (in columns but not in todos) -> removed from columns
 */
function syncWithTodos(currentTodos: Todo[]): void;
```

### Mutation Pattern

Every mutation follows the same structure used by the existing `todos.ts`:

1. Call `kanbanState.update(state => { /* mutate and return */ })`.
2. The store's `subscribe` callback writes the new value to `localStorage.setItem('kanban-state', JSON.stringify(value))`.

### Derived Store Logic

`kanbanBoard` is a `derived` store combining `kanbanState` and `todos`:

```typescript
export const kanbanBoard: Readable<ResolvedColumn[]> = derived(
  [kanbanState, todos],
  ([$kanbanState, $todos]) => {
    const todoMap = new Map($todos.map(t => [t.id, t]));
    return $kanbanState.columns.map(col => ({
      id: col.id,
      title: col.title,
      cards: col.cardIds
        .map(id => todoMap.get(id))
        .filter((t): t is Todo => t !== undefined)
    }));
  }
);
```

### Drop Index Calculation

Inside `KanbanColumn.svelte` on `dragover`:

```typescript
function calculateDropIndex(event: DragEvent, cardElements: HTMLElement[]): number {
  for (let i = 0; i < cardElements.length; i++) {
    const rect = cardElements[i].getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (event.clientY < midpoint) return i;
  }
  return cardElements.length; // append at end
}
```

## Dependencies

### External Dependencies

None. The feature uses only APIs already available in the project:

| Dependency | Source | Purpose |
|-----------|--------|---------|
| Svelte stores (`writable`, `derived`, `get`) | Existing SvelteKit install | State management |
| HTML5 Drag and Drop API | Browser native | Card and column drag-and-drop |
| `crypto.randomUUID()` | Browser native (Node 22+) | Column ID generation |
| `localStorage` | Browser native | State and preference persistence |

### Internal Dependencies

| Module | Consumed By | Purpose |
|--------|------------|---------|
| `src/lib/stores/todos.ts` (read-only) | `kanban.ts` | Subscribe to todo list for sync, resolve card IDs to Todo objects |
| `src/lib/stores/kanban.ts` | `KanbanBoard.svelte`, `ViewToggle.svelte`, `+page.svelte` | Board state, mutations, view preference |

The `todos.ts` module is consumed but never modified.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **HTML5 DnD flaky on mobile/touch** | High | Medium | Documented as out of scope in intent. Board is functional on desktop. Add a note in UI that drag requires a pointer device. Keyboard movement provides an alternative. |
| **Sync race between todo and kanban stores** | Low | Medium | `syncWithTodos` runs inside `todos.subscribe`, which fires synchronously on each todo mutation. The kanban store reconciles in the same microtask, so there is no window for stale state. |
| **localStorage quota exceeded** | Very Low | Low | Kanban state is lightweight (column titles + arrays of string IDs). A board with 1000 todos and 10 columns is under 50KB. Wrap `setItem` in try/catch with `console.warn`, matching the existing pattern in `todos.ts`. |
| **Drop index calculation inaccurate with scrolled columns** | Medium | Low | Use `getBoundingClientRect()` which returns viewport-relative coordinates, automatically accounting for scroll position. No adjustment needed. |
| **Column delete loses card positions** | Low | Medium | Cards from a deleted column are appended to the first column's `cardIds` array (not prepended), preserving their relative order. The user can re-sort after. The last column cannot be deleted (guard in `deleteColumn`). |
| **Stale kanban state after localStorage is cleared externally** | Low | Low | On load, `syncWithTodos` runs immediately after initialization. If persisted state is missing or corrupt, the store falls back to default columns with all todos in the first column. JSON parse is wrapped in try/catch. |
| **Keyboard DnD mode complexity** | Medium | Low | Implement a minimal move-mode: Enter activates, arrow keys cycle columns, Enter confirms, Escape cancels. No multi-step reordering within column for v1 -- keyboard users can move a card to a column and it lands at the end. |
