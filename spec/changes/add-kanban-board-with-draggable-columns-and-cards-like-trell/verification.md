# Verification: add-kanban-board-with-draggable-columns-and-cards-like-trell

## Spec Scenarios

### Requirement: kanban-data-model
- [x] store-initializes-with-defaults -- Store creates "To Do", "In Progress", "Done" columns; existing todos placed in first column via `loadKanbanState()` (kanban.ts:46-48, test line 66-72)
- [x] store-initializes-from-persisted-state -- Restores from `kanban-state` localStorage key; new todos appended to first column via sync (kanban.ts:37-48, test line 74-91)
- [x] orphaned-card-cleanup -- `syncWithTodos()` removes card IDs not present in todo store (kanban.ts:136-141, test line 193-206)

### Requirement: column-crud
- [x] add-column -- `addColumn()` appends new column with title and UUID; persisted via subscription (kanban.ts:165-174, KanbanBoard.svelte:13-33, test line 93-99)
- [x] rename-column -- Double-click triggers inline edit; `renameColumn()` updates title (KanbanColumn.svelte:13-30, kanban.ts:176-184, test line 110-113)
- [x] rename-column-empty-title -- `renameColumn()` rejects empty/whitespace strings (kanban.ts:178, test line 116-123)
- [x] delete-column-with-cards -- `deleteColumn()` moves cards to first remaining column (kanban.ts:186-205, test line 125-138)
- [x] delete-last-column-prevented -- Throws error when columns.length <= 1 (kanban.ts:188-190, test line 140-151)
- [ ] delete-last-column-prevented (user message) -- Spec requires user MUST see a message; implementation catches the error silently in `handleDelete()` (KanbanColumn.svelte:35-40) with no visible feedback

### Requirement: card-drag-and-drop-between-columns
- [x] drag-card-to-another-column -- `moveCard()` removes from source, inserts at target index; persisted (kanban.ts:219-243, test line 153-166)
- [x] drag-card-to-empty-column -- Same moveCard logic handles empty columns correctly
- [x] drag-visual-feedback -- Column gets `bg-blue-50 border-2 border-blue-300` classes when dragOverCounter > 0 (KanbanColumn.svelte:85)

### Requirement: card-reordering-within-column
- [x] reorder-card-within-column -- `moveCard()` supports same-column reorder by removing then inserting at new index (kanban.ts:219-243, test line 168-179)
- [x] reorder-single-card-noop -- moveCard with same position results in no visible change

### Requirement: localstorage-persistence
- [x] persist-on-mutation -- `kanbanState.subscribe()` writes to localStorage on every change (kanban.ts:81-88, test line 208-224)
- [x] persist-view-preference -- `viewPreference.subscribe()` writes to localStorage (kanban.ts:91-98)
- [x] restore-view-preference-on-load -- `loadViewPreference()` reads from localStorage on init (kanban.ts:51-60)

### Requirement: view-toggle
- [x] toggle-to-kanban-view -- ViewToggle sets viewPreference to 'kanban'; +page.svelte conditionally renders KanbanBoard (ViewToggle.svelte:4-6, +page.svelte:16-20)
- [x] toggle-to-list-view -- ViewToggle sets viewPreference to 'list'; +page.svelte renders TodoFilter + TodoList (+page.svelte:16-19)

### Requirement: sync-with-todo-store
- [x] new-todo-appears-in-first-column -- `syncWithTodos()` appends new IDs to first column (kanban.ts:131-133, test line 181-189)
- [x] deleted-todo-removed-from-board -- `syncWithTodos()` removes orphaned IDs (kanban.ts:136-141, test line 193-206)
- [x] completing-todo-does-not-move-card -- No auto-move logic on completion; kanban store only holds layout metadata

### Requirement: board-component-structure
- [x] board-renders-all-columns -- KanbanBoard iterates `$kanbanBoard` derived store, renders KanbanColumn per entry (KanbanBoard.svelte:37-39)
- [ ] card-displays-todo-data -- Card displays title and completed styling, but does NOT display priority indicator or description preview (KanbanCard.svelte:27-31). Spec requires priority indicator and truncated description.

### Requirement: accessibility-for-drag-and-drop
- [x] screen-reader-card-announcement -- Cards have `aria-label="{todo.text} in {columnTitle}"` (KanbanCard.svelte:24)
- [ ] keyboard-card-movement -- No keyboard-based card movement implemented (Space/Enter + arrow keys). Spec uses SHOULD, so this is recommended but not mandatory.
- [ ] aria-attributes-during-drag -- Cards lack `aria-grabbed` attribute. Columns lack `aria-dropeffect` attribute. Spec requires these MUST be present.

### Requirement: unit-tests-for-kanban-store
- [x] test-add-column -- Test verifies 4th column with title "Review" (test line 93-99)
- [x] test-move-card -- Test verifies cross-column move (test line 153-166)
- [x] test-delete-column-reassigns-cards -- Test verifies card reassignment to first column (test line 125-138)
- [x] test-persistence-called-on-mutation -- Test verifies localStorage.setItem called with "kanban-state" (test line 208-224)

## Gate Results

| Gate | Status |
|------|--------|
| Unit tests | PASS -- 23/23 tests pass (2 test files) |
| Build | Not verified (test-only gate) |

## Summary

**Overall: Mostly Compliant -- 3 gaps identified out of 30 scenario checks.**

Implemented and passing:
- Full kanban data model with column CRUD and card movement
- HTML5 drag-and-drop between and within columns with visual feedback
- localStorage persistence for board state and view preference
- Bidirectional sync with todo store (new todos, orphan cleanup)
- Three-component architecture (Board, Column, Card)
- View toggle with active state indication
- 12 unit tests covering all store operations

Gaps:
1. **KanbanCard missing priority indicator and description preview** (MUST per spec) -- Card only renders title and completed state
2. **Missing aria-grabbed/aria-dropeffect attributes** (MUST per spec) -- Draggable cards and drop target columns lack required ARIA drag-and-drop attributes
3. **Delete last column shows no user-facing message** (MUST per spec) -- Error is caught silently with no visual feedback
