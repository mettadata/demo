# board-statistics-dashboard-tas

## Problem
Users working with the kanban board have no way to assess the state of their work at a glance. To understand how many tasks are in each column, what percentage of work is complete, or how many items are past their due date, they must manually scan every column and count cards. This is slow and error-prone, especially as the board grows. Team leads and individual contributors are equally affected: neither can quickly answer "how much is left?" or "what's overdue?" without reading every card.

## Proposal
Add a statistics dashboard panel rendered above the kanban board columns. The panel is always visible when the kanban view is active. It derives all data reactively from the existing `kanbanBoard` derived store (which resolves `ResolvedColumn[]`) and the `todos` store.

The dashboard displays three categories of metrics:

1. **Task counts per column** — For each column in `KanbanState.columns`, show the column title and the count of non-archived cards currently in that column. The count reflects the live `cards` array from `ResolvedColumn` (archived items are already excluded by the `kanbanBoard` derived store).

2. **Overall completion percentage** — The percentage of non-archived todos where `completed === true`, calculated as `Math.round((completedCount / totalCount) * 100)`. When `totalCount` is zero, display 0%. Render this as both a numeric label ("42% complete") and a filled progress bar.

3. **Overdue item count** — The count of non-archived, non-completed todos where `dueDate` is a non-null ISO date string that, when compared as a date-only value, is strictly before today's date. Display a count badge; show zero when there are no overdue items.

The dashboard MUST update automatically whenever the underlying stores change. No new persistent state, no new store writes, and no changes to `KanbanState` or `Todo` are introduced.

## Impact
- `KanbanBoard.svelte` gains a statistics bar rendered above the columns `<div>`.
- A new `BoardStatsDashboard.svelte` component is added under `src/lib/components/` to keep the panel self-contained and independently testable.
- The `kanbanBoard` and `todos` stores are consumed as read-only subscriptions; no store mutations are added.
- Existing column layout, drag-and-drop, keyboard navigation, and template selector behavior are unaffected.
- Dark mode styling must be consistent with existing Tailwind dark-mode classes used throughout the board.
- No changes to `localStorage` schema, `KanbanState`, or `Todo` interfaces.

## Out of Scope
- Per-column completion percentages or per-column overdue counts.
- Priority-based breakdowns (e.g., high-priority overdue items).
- Historical or time-series metrics (e.g., burndown charts, throughput over time).
- Filtering the board by clicking a statistic (e.g., clicking "3 overdue" to filter cards).
- Statistics in the list view — the dashboard is kanban-view-only.
- Exporting or sharing statistics.
- Configuring which metrics are shown or hidden.
- Archived task counts or statistics about archived items.
