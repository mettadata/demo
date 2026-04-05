# Design: add-due-dates-and-priority-levels-to-cards-with-color-coded

## Approach

Extend the existing Todo data model with optional `priority` and `dueDate` fields. Add inline editing controls to card components. Introduce a sort toggle that uses a derived store to reorder items by due date. All new UI elements support dark mode.

## Components

### Modified
- **`src/lib/stores/todos.ts`** — Add `Priority` type, extend `Todo` interface, add `updateTodo()` mutation, add migration logic for legacy data, add `sortByDueDate` writable store, add `sortedTodos` derived store
- **`src/lib/components/KanbanCard.svelte`** — Render priority badge, due date display, inline edit controls (priority select + date input)
- **`src/lib/components/TodoItem.svelte`** — Same additions as KanbanCard: priority badge, due date, inline controls
- **`src/lib/components/KanbanColumn.svelte`** — Apply sort-by-due-date ordering to card list when enabled
- **`src/lib/components/KanbanBoard.svelte`** — Pass sort state to columns
- **`src/lib/components/TodoList.svelte`** — Apply sort ordering when enabled

### New
- **`src/lib/components/PriorityBadge.svelte`** — Shared badge component: maps priority to color classes, renders label text, includes `aria-label`
- **`src/lib/components/DueDateDisplay.svelte`** — Shared display: formats date, detects overdue, applies red styling
- **`src/lib/components/SortToggle.svelte`** — Button to toggle sort-by-due-date, with icon/label indicating state

## Data Model

```typescript
export type Priority = 'none' | 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  priority: Priority;
  dueDate: string | null;  // 'YYYY-MM-DD' or null
}
```

Migration: On store initialization, iterate loaded todos and set missing fields:
```typescript
function migrateTodo(raw: any): Todo {
  return {
    ...raw,
    priority: raw.priority ?? 'none',
    dueDate: raw.dueDate ?? null,
  };
}
```

## Sort Logic

```typescript
function sortByDueDate(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}
```

## Priority Color Mapping

| Priority | Badge BG (light) | Badge BG (dark) | Text |
|----------|-------------------|------------------|------|
| none     | (hidden)          | (hidden)         | —    |
| low      | bg-green-100      | dark:bg-green-900 | text-green-700 / dark:text-green-300 |
| medium   | bg-amber-100      | dark:bg-amber-900 | text-amber-700 / dark:text-amber-300 |
| high     | bg-red-100        | dark:bg-red-900   | text-red-700 / dark:text-red-300 |

## Dependencies

- No new external dependencies
- Native `<input type="date">` for date picker
- Native `<select>` for priority dropdown

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| localStorage schema migration breaks existing data | Migration function applies defaults; existing fields preserved |
| Native date input inconsistent across browsers | Acceptable — all modern browsers support it; Svelte 5 target audience uses modern browsers |
| Sort toggle confusing with drag-and-drop reorder | Sort only applies within columns; drag-and-drop remains for manual reorder. When sort is active, show visual indicator |
| Overdue detection timezone-sensitive | Use date-only string comparison (YYYY-MM-DD) against local date, avoiding timezone math |
