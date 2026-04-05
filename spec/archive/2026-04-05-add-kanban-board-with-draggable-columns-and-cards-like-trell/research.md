# Research: add-kanban-board-with-draggable-columns-and-cards-like-trell

## Decision: Native HTML5 DnD with a separate column-centric kanban store synced reactively to the todo store

### Approaches Considered

#### 1. DnD Approach

1. **Native HTML5 Drag and Drop API** (selected) — Zero dependencies, matches the intent doc's explicit requirement ("no external library"), sufficient for desktop column/card movement using `dragstart`, `dragover`, `drop` events with `dataTransfer`.
2. **svelte-dnd-action library** — Provides smoother animations, touch support, and simpler Svelte integration via `use:dndzone`, but the intent doc explicitly rules out external DnD libraries. Also adds a dependency to a project that currently has zero runtime deps.
3. **Custom pointer events** — Would enable mobile touch support and finer control over drag visuals, but significantly more implementation effort (manual hit testing, scroll handling, coordinate tracking) for a feature the intent doc explicitly places out of scope (mobile touch gestures).

#### 2. Store Architecture

1. **Separate KanbanStore module** (selected) — A dedicated `src/lib/stores/kanban.ts` that owns column definitions and card-to-column position mappings. Keeps the existing `todos.ts` completely untouched, respects single-responsibility, and makes the kanban feature removable without side effects. The kanban store subscribes to the todo store reactively to detect additions/deletions.
2. **Extend the existing todo store** — Add `columnId` and `position` fields directly to the `Todo` interface. Simpler data flow but violates the spec's requirement that the todo store remains the source of truth for todo data only, and it would break existing tests and localStorage schema. Every todo operation would carry kanban concerns.

#### 3. Data Model

1. **Column-centric model** (selected) — Each column object contains an ordered array of todo IDs (`cardIds: string[]`). Position is implicit from array index. Moving a card means splicing it out of one array and inserting into another. This maps naturally to the UI (iterate columns, then iterate cards), makes reordering a simple array splice, and avoids needing to recalculate sort-order numbers.
2. **Card-centric model (cards have columnId + position)** — Each card record stores `{ todoId, columnId, position }` in a flat map. Requires reindexing all positions in affected columns on every move. Lookup by column requires filtering the full card set. More normalized but more expensive for the operations this feature performs most (render column contents, reorder within column).

#### 4. Sync Strategy

1. **Reactive subscription with derived reconciliation** (selected) — The kanban store subscribes to the `todos` store. On each emission, it compares the set of todo IDs against its known card IDs: new IDs get appended to the first column, missing IDs get their card references removed. This runs automatically and keeps the two stores eventually consistent without coupling their mutation logic. Persistence happens in the kanban store's own subscriber.
2. **Event-bus / callback hooks in todo store** — Modify `addTodo` and `removeTodo` to emit events or accept callbacks that the kanban store listens to. Tighter coupling, requires modifying the existing todo store (which the spec says should remain unaffected), and harder to test in isolation.

### Rationale

The selected combination keeps the existing codebase untouched while adding the kanban feature as a parallel concern. The column-centric data model directly mirrors the visual layout, making the component tree straightforward: `KanbanBoard` reads columns from the store, passes each to `KanbanColumn`, which maps `cardIds` to `KanbanCard` components by looking up todo data from the todo store. Native HTML5 DnD is mandated by the intent and is adequate for the desktop-only scope. The reactive sync approach avoids modifying `todos.ts` and lets the kanban store self-heal (orphan cleanup, new-todo placement) on every todo store change.

### Artifacts Produced

- [Data Model: KanbanState](inline)
- [Store API: KanbanStore](inline)
- [Component Tree: KanbanBoard](inline)

---

#### Data Model: KanbanState

```typescript
interface KanbanColumn {
  id: string;        // crypto.randomUUID()
  title: string;     // "To Do", "In Progress", "Done"
  cardIds: string[]; // ordered array of todo IDs
}

interface KanbanState {
  columns: KanbanColumn[]; // ordered array, index = display order
}

// localStorage key: "kanban-state"
// Serialized as JSON: { columns: [...] }

// Default state (no persisted data):
// columns: [
//   { id: uuid(), title: "To Do",        cardIds: [...allExistingTodoIds] },
//   { id: uuid(), title: "In Progress",  cardIds: [] },
//   { id: uuid(), title: "Done",         cardIds: [] }
// ]
```

Position is implicit: a card's position in its column is its index in the `cardIds` array. No separate position field is needed. Column order is the array index in `columns`. This eliminates sort-order bookkeeping entirely.

---

#### Store API: KanbanStore

```typescript
// src/lib/stores/kanban.ts

import { writable, derived, get } from 'svelte/store';
import { todos } from './todos';

const KANBAN_STORAGE_KEY = 'kanban-state';
const VIEW_PREF_KEY = 'view-preference';

// Core writable store
export const kanbanState: Writable<KanbanState>;

// Derived store: resolves cardIds to full Todo objects per column
export const kanbanBoard: Readable<ResolvedColumn[]>;

// View preference
export const viewPreference: Writable<'list' | 'kanban'>;

// Mutations (each persists to localStorage after updating)
export function addColumn(title: string): void;
export function renameColumn(columnId: string, title: string): void;
export function deleteColumn(columnId: string): void;
export function moveCard(todoId: string, targetColumnId: string, targetIndex: number): void;
export function reorderCard(todoId: string, columnId: string, newIndex: number): void;
export function moveColumn(columnId: string, newIndex: number): void;

// Sync (called reactively via todos.subscribe)
// - Appends new todo IDs to first column
// - Removes card references for deleted todos
function syncWithTodos(currentTodos: Todo[]): void;
```

Every mutation function follows the pattern: (1) call `kanbanState.update(...)`, (2) the store's subscriber writes to `localStorage`. This mirrors how `todos.ts` already works.

The `syncWithTodos` function runs inside a `todos.subscribe` callback. It computes `existingTodoIds = new Set(currentTodos.map(t => t.id))` and `knownCardIds = new Set(allCardIdsAcrossColumns)`, then:
- For each `id` in `existingTodoIds` not in `knownCardIds`: append to `columns[0].cardIds`
- For each `id` in `knownCardIds` not in `existingTodoIds`: remove from its column's `cardIds`

---

#### Component Tree: KanbanBoard

```
+page.svelte
├── ViewToggle.svelte          (list/board icon toggle, reads/writes viewPreference)
├── [if list view]
│   ├── TodoInput.svelte       (existing, unchanged)
│   ├── TodoFilter.svelte      (existing, unchanged)
│   └── TodoList.svelte        (existing, unchanged)
└── [if kanban view]
    └── KanbanBoard.svelte     (reads kanbanBoard derived store)
        ├── KanbanColumn.svelte  (repeated for each column)
        │   ├── Column header    (title, inline rename on dblclick, delete button, add-column)
        │   └── KanbanCard.svelte  (repeated for each cardId)
        │       ├── Todo title
        │       ├── Description preview (truncated)
        │       ├── Priority indicator
        │       └── Completed state visual
        └── AddColumnButton.svelte (appended after last column)
```

**DnD wiring in components:**

- `KanbanCard.svelte`: Sets `draggable="true"`, handles `dragstart` (sets `dataTransfer` with `todoId`), sets `aria-grabbed`.
- `KanbanColumn.svelte`: Handles `dragover` (preventDefault to allow drop, shows visual indicator), `dragenter`/`dragleave` (toggle highlight class), `drop` (reads `todoId` from `dataTransfer`, calculates drop index from mouse Y position relative to existing cards, calls `moveCard`).
- Drop index calculation: On `dragover`, iterate the column's card DOM elements, compare `event.clientY` to each card's `getBoundingClientRect().top + height/2` to find the insertion point. This gives accurate positional drops rather than always appending.

**Accessibility:**

- Columns: `role="list"`, `aria-label={column.title}`
- Cards: `role="listitem"`, `aria-grabbed="true|false"`, `tabindex="0"`
- Keyboard movement: Card focused + Enter/Space activates "move mode", arrow keys select target column/position, Enter confirms. Implemented via keydown handlers on `KanbanCard.svelte`.
- Drop targets: `aria-dropeffect="move"` set on columns during active drag.
