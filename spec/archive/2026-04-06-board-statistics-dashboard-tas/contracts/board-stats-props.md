# API Contract: BoardStatsDashboard Props

## Component Signature

```svelte
<!-- BoardStatsDashboard.svelte -->
<!-- No external props — subscribes directly to kanbanBoard and todos stores -->
```

## Store Dependencies

| Store | Import Path | Type | Usage |
|-------|-------------|------|-------|
| `kanbanBoard` | `$lib/stores/kanban.js` | `Readable<ResolvedColumn[]>` | Column titles + per-column card counts |
| `todos` | `$lib/stores/todos.js` | `Writable<Todo[]>` | Completion percentage + overdue count |

## Derived Values Computed in Component

```typescript
// Today's date string for overdue comparison (same pattern as DueDateDisplay.svelte)
const today = new Date().toISOString().split('T')[0];

// Per-column counts: { id, title, count }[]
const columnStats = $derived(
  $kanbanBoard.map(col => ({ id: col.id, title: col.title, count: col.cards.length }))
);

// Non-archived todos only
const activeTodos = $derived($todos.filter(t => !t.archived));
const total = $derived(activeTodos.length);
const completedCount = $derived(activeTodos.filter(t => t.completed).length);
const completionPct = $derived(total === 0 ? 0 : Math.round((completedCount / total) * 100));

// Overdue: non-archived, non-completed, dueDate before today
const overdueCount = $derived(
  activeTodos.filter(t => !t.completed && t.dueDate !== null && t.dueDate < today).length
);
```

## No Props Emitted / No Callbacks

This is a read-only display component with no user interaction that produces side effects.
