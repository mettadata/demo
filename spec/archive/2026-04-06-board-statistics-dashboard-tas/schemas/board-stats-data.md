# Data Model: BoardStats

## Computed Shape (not persisted)

All values are derived at render time from the existing `kanbanBoard` and `todos` stores. No new store or persisted state is introduced.

```typescript
interface ColumnStat {
  id: string;       // ResolvedColumn.id
  title: string;    // ResolvedColumn.title
  count: number;    // ResolvedColumn.cards.length (archived cards already excluded by kanbanBoard derived store)
}

interface BoardStats {
  columnStats: ColumnStat[];
  total: number;         // todos where !archived
  completed: number;     // todos where !archived && completed
  completionPct: number; // Math.round(completed / total * 100), 0 when total === 0
  overdueCount: number;  // todos where !archived && !completed && dueDate !== null && dueDate < today
}
```

## Source Fields from Existing Interfaces

From `Todo` (todos.ts):
- `archived: boolean` — exclude archived from all counts
- `completed: boolean` — drives completion percentage and overdue exclusion
- `dueDate: string | null` — ISO date string `YYYY-MM-DD`, compared lexicographically against today

From `ResolvedColumn` (kanban.ts):
- `id: string`
- `title: string`
- `cards: Todo[]` — already filtered to `!archived` by the `kanbanBoard` derived store

## No New Zod Schema Required

The computed values are ephemeral UI state. All input data is already validated by the existing store loading paths in `kanban.ts` and `todos.ts`.
