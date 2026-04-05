# Verification: add-due-dates-and-priority-levels-to-cards-with-color-coded

## Spec Scenarios

- [x] Legacy todo loaded from localStorage — `loadTodos()` maps missing `priority`/`dueDate` with nullish coalescing defaults (`'none'` and `null`). Dedicated test confirms.
- [x] New todo created — `addTodo()` explicitly sets `priority: 'none'` and `dueDate: null`. Test covers this.
- [x] Card with high priority — `PriorityBadge` renders red badge (`bg-red-100 text-red-700`) with capitalized text "High" when priority is `'high'`.
- [x] Card with no priority — `PriorityBadge` renders nothing when priority is `'none'` (guarded by `{#if priority !== 'none'}`).
- [x] Overdue card — `DueDateDisplay` compares `dueDate` against today; overdue dates render with `text-red-600` and "Overdue:" prefix.
- [x] Card with future due date — `DueDateDisplay` renders in neutral gray styling (`text-gray-500`) with short date format (e.g., "Apr 10").
- [x] Set priority on existing card — `updateTodo()` accepts `{ priority }` partial, persists via store subscription to localStorage. Select control in both `TodoItem` and `KanbanCard`.
- [x] Set due date on card — `updateTodo()` accepts `{ dueDate }`, date input in both views triggers update. Test confirms.
- [x] Clear due date — Setting input value to empty string maps to `null` via `value || null`. Test confirms round-trip set then clear.
- [x] Toggle sort in kanban view — `KanbanColumn` derives `sortedCards` from `$sortByDueDate` and `sortTodosByDueDate()`. Nulls sort last.
- [x] Sort in list view — `TodoList` uses `sortedFilteredTodos` derived store which applies sort when enabled. Test confirms ordering.
- [x] Priority badge in dark mode — All three priority levels have `dark:` variants (`dark:bg-green-900`, `dark:bg-amber-900`, `dark:bg-red-900` with matching text colors). `DueDateDisplay`, `SortToggle`, and edit controls also have dark variants.
- [x] Keyboard priority selection — Priority `<select>` elements are native HTML selects which are keyboard-navigable by default. Both views include `aria-label` attributes.

## Gate Results

- Tests: PASS (37 tests, 2 files)
- Typecheck: PASS (0 errors)
- Lint: PASS (0 errors, 1 warning — pre-existing a11y tabindex on KanbanCard)

## Summary

The implementation fully covers all spec requirements. The `Todo` data model includes `priority` and `dueDate` fields with proper defaults and legacy migration. `PriorityBadge` and `DueDateDisplay` are reusable components used in both list (`TodoItem`) and kanban (`KanbanCard`) views. Editing controls (select for priority, date input for due date) are present in both views with proper `aria-label` attributes. Sort-by-due-date is implemented as a persisted toggle affecting both views via derived stores. Dark mode support is complete across all new UI elements. All 37 tests pass including 9 tests specifically covering the new feature (defaults, legacy migration, updateTodo, sort logic, persistence).
