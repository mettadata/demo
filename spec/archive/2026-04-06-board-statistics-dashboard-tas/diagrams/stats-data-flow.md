# Flow: Stats Data Flow

## Data Flow Diagram

```
localStorage (todos key)
        |
        v
  todos: Writable<Todo[]>   <── addTodo / toggleTodo / archiveTodo / etc.
        |
        +──────────────────────────────────────────────────────────+
        |                                                          |
        v                                                          v
  kanbanBoard: derived(                                  BoardStatsDashboard.svelte
    [kanbanState, todos],                                  $todos ──► filter(!archived)
    → ResolvedColumn[]                                              ├─ total count
      (cards already !archived)                                    ├─ completed count
  )                                                                ├─ completionPct
        |                                                          └─ overdueCount
        v                                                                (dueDate < today
  BoardStatsDashboard.svelte                                             && !completed)
    $kanbanBoard ──► columnStats[]
      (id, title, count per column)
```

## Reactivity Chain

1. A card is toggled completed → `todos` store emits a new value.
2. `kanbanBoard` derived store re-evaluates (cards array changes).
3. `BoardStatsDashboard` template re-renders because both `$kanbanBoard` and `$todos` subscriptions fire.
4. All three stat blocks (column counts, completion percentage, overdue count) update atomically within the same microtask tick.

## Placement in +page.svelte

`BoardStatsDashboard` is rendered conditionally inside the `{:else}` branch (kanban view), directly above `<KanbanBoard />`:

```svelte
{:else}
  <BoardStatsDashboard />
  <KanbanBoard />
{/if}
```

This mirrors the existing pattern where kanban-only UI (the board itself) is scoped to the kanban branch of the view toggle.
