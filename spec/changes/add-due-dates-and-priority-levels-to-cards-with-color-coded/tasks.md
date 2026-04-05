# Tasks for add-due-dates-and-priority-levels-to-cards-with-color-coded

## Batch 1 (no dependencies)

### Task 1.1: Extend Todo data model and store
- **Files**: `src/lib/stores/todos.ts`
- **Action**: Add `Priority` type and extend `Todo` interface with `priority` and `dueDate` fields. Add migration function for legacy localStorage data. Add `updateTodo(id, fields)` mutation. Add `sortByDueDate` writable store (persisted to localStorage). Add `sortedFilteredTodos` derived store that applies sort when enabled. Update `addTodo()` to include default values.
- **Verify**: Unit tests for migration, updateTodo, and sort logic
- **Done**: Todo type has new fields, store exports new functions, legacy data migrates cleanly

### Task 1.2: Create PriorityBadge component
- **Files**: `src/lib/components/PriorityBadge.svelte`
- **Action**: Create shared component that accepts `priority` prop. Renders colored badge with text label for low/medium/high. Hidden when 'none'. Dark mode support. `aria-label` attribute.
- **Verify**: Visual check, aria-label present
- **Done**: Badge renders correct color/text for each priority level

### Task 1.3: Create DueDateDisplay component
- **Files**: `src/lib/components/DueDateDisplay.svelte`
- **Action**: Create shared component that accepts `dueDate` prop. Formats as short date (e.g., "Apr 10"). Detects overdue (before today) and applies red styling. Hidden when null.
- **Verify**: Visual check with past/future/null dates
- **Done**: Correct formatting, red overdue indicator, hidden when null

### Task 1.4: Create SortToggle component
- **Files**: `src/lib/components/SortToggle.svelte`
- **Action**: Create button component that toggles `sortByDueDate` store. Shows active/inactive state. Accessible label.
- **Verify**: Toggle changes store value, visual state updates
- **Done**: Button toggles sort, persists preference

## Batch 2 (depends on Batch 1)

### Task 2.1: Update KanbanCard with priority, due date, and inline editing
- **Depends on**: Task 1.1, 1.2, 1.3
- **Files**: `src/lib/components/KanbanCard.svelte`
- **Action**: Add PriorityBadge and DueDateDisplay to card rendering. Add inline priority `<select>` and date `<input type="date">` controls (shown on hover/focus or always visible). Call `updateTodo()` on change.
- **Verify**: Cards show badges, controls update todo, persists
- **Done**: Kanban cards display and edit priority/due date

### Task 2.2: Update TodoItem with priority, due date, and inline editing
- **Depends on**: Task 1.1, 1.2, 1.3
- **Files**: `src/lib/components/TodoItem.svelte`
- **Action**: Same as Task 2.1 but for list view. Add PriorityBadge, DueDateDisplay, and inline edit controls.
- **Verify**: List items show badges and controls
- **Done**: List view items display and edit priority/due date

### Task 2.3: Apply sort ordering to views
- **Depends on**: Task 1.1, 1.4
- **Files**: `src/lib/components/KanbanColumn.svelte`, `src/lib/components/TodoList.svelte`, `src/lib/components/KanbanBoard.svelte`
- **Action**: When `sortByDueDate` is enabled, apply sort function to card/todo lists. Add SortToggle to the view header area (near ViewToggle). In kanban, sort cards within each column.
- **Verify**: Toggle sort, verify order changes in both views
- **Done**: Sort toggle works in both views, preference persists

## Batch 3 (depends on Batch 2)

### Task 3.1: Write tests
- **Depends on**: Task 2.1, 2.2, 2.3
- **Files**: `src/lib/stores/todos.test.ts` (update), new test files as needed
- **Action**: Add tests for: migration of legacy todos, updateTodo mutation, sort logic (null handling, ascending order), priority/dueDate defaults on new todos
- **Verify**: `npm run test` passes
- **Done**: Core logic covered by tests
