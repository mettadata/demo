# Design: board-statistics-dashboard-tas

## Approach

Add a single new display-only component, `BoardStatsDashboard.svelte`, that subscribes to the existing `kanbanBoard` derived store and `todos` writable store. All metric computation happens inline using Svelte 5 `$derived` runes, following the same pattern established by `KanbanColumn.svelte` (`$derived.by()` over store subscriptions) and `DueDateDisplay.svelte` (inline overdue comparison via `$derived`).

The component is mounted in `+page.svelte` immediately above `<KanbanBoard />` inside the `{:else}` branch of the `{#if $viewPreference === 'list'}` conditional. This placement means the dashboard is scoped to kanban view without any internal guard logic in the component itself.

No new stores, no new Zod schemas, no new exported symbols, and no mutations to `KanbanState` or `Todo` are introduced. The change is additive: two files modified (`+page.svelte`, nothing else in the component tree), one file created.

## Components

### `BoardStatsDashboard.svelte` (new)

Location: `src/lib/components/BoardStatsDashboard.svelte`

Responsibilities:
- Subscribe to `$kanbanBoard` (column titles and per-column card arrays) and `$todos` (raw todo list for completion and overdue metrics).
- Derive all display values inline: `columnStats`, `activeTodos`, `completionPct`, `overdueCount`.
- Render three metric sections in a horizontal bar above the board columns: column counts, a completion percentage with progress bar, and an overdue badge.
- Apply Tailwind dark-mode classes throughout — no hardcoded colors, no inline styles for theme-sensitive properties.
- Expose ARIA attributes on the progress bar (`role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`) and descriptive labels on overdue and per-column count entries.
- Accept no props and emit no events.

### `+page.svelte` (modified)

Change: import `BoardStatsDashboard` and add `<BoardStatsDashboard />` as the first child of the `{:else}` kanban branch, directly before `<KanbanBoard />`.

Before:
```svelte
{:else}
  <KanbanBoard />
{/if}
```

After:
```svelte
{:else}
  <BoardStatsDashboard />
  <KanbanBoard />
{/if}
```

No other files require modification. `KanbanBoard.svelte` itself is not touched.

## Data Model

All values are ephemeral and computed at render time. Nothing is persisted or stored.

```typescript
// Intermediate: per-column display entry
interface ColumnStat {
  id: string;      // ResolvedColumn.id — used as {#each} key
  title: string;   // ResolvedColumn.title
  count: number;   // ResolvedColumn.cards.length (already !archived, per kanbanBoard derived store)
}

// Aggregate: all three dashboard metric groups
interface BoardStats {
  columnStats: ColumnStat[];
  total: number;         // todos where !archived
  completed: number;     // todos where !archived && completed
  completionPct: number; // Math.round(completed / total * 100); 0 when total === 0
  overdueCount: number;  // todos where !archived && !completed && dueDate !== null && dueDate < today
}
```

Source fields consumed from existing interfaces:

| Interface | Field | Usage |
|---|---|---|
| `ResolvedColumn` | `id`, `title`, `cards` | Column identity and per-column count |
| `Todo` | `archived` | Exclude from all counts |
| `Todo` | `completed` | Drive completion percentage; exclude from overdue |
| `Todo` | `dueDate: string \| null` | Lexicographic `<` comparison against today's `YYYY-MM-DD` string |

The `dueDate` overdue comparison follows the exact pattern from `DueDateDisplay.svelte`:

```typescript
const today = new Date().toISOString().split('T')[0];
// overdue when: !archived && !completed && dueDate !== null && dueDate < today
```

`today` is evaluated once at component initialization. It does not need to be reactive for this use case — the dashboard does not need to recalculate at midnight without a page reload, and the spec does not require it.

## API Design

`BoardStatsDashboard.svelte` has no props interface and no emitted events. Its public surface is its import path only:

```svelte
import BoardStatsDashboard from '$lib/components/BoardStatsDashboard.svelte';
```

Internal derived declarations (representative, not exhaustive):

```typescript
const columnStats = $derived(
  $kanbanBoard.map(col => ({ id: col.id, title: col.title, count: col.cards.length }))
);

const activeTodos = $derived($todos.filter(t => !t.archived));
const total = $derived(activeTodos.length);
const completedCount = $derived(activeTodos.filter(t => t.completed).length);
const completionPct = $derived(total === 0 ? 0 : Math.round((completedCount / total) * 100));

const overdueCount = $derived(
  activeTodos.filter(t => !t.completed && t.dueDate !== null && t.dueDate < today).length
);
```

Progress bar ARIA contract:

```svelte
<div
  role="progressbar"
  aria-valuenow={completionPct}
  aria-valuemin="0"
  aria-valuemax="100"
  style="width: {completionPct}%"
>
```

`style` is acceptable here because `completionPct` is a computed numeric value driving geometry, not a theme-sensitive color. All color classes remain in Tailwind utilities.

## Dependencies

### Internal (existing, read-only)

| Symbol | Module | How used |
|---|---|---|
| `kanbanBoard` | `$lib/stores/kanban.js` | `Readable<ResolvedColumn[]>` — column titles and card arrays |
| `todos` | `$lib/stores/todos.js` | `Writable<Todo[]>` — raw todo list for completion and overdue metrics |
| `ResolvedColumn` | `$lib/stores/kanban.js` | Type import only |
| `Todo` | `$lib/stores/todos.js` | Type import only |

No mutation functions (`addColumn`, `renameColumn`, `deleteColumn`, `moveCard`, `moveColumn`, `applyTemplate`, `todos.set`, `todos.update`) are imported or called.

### External

None. The component relies exclusively on Svelte's reactivity primitives (`$derived`, store auto-subscription syntax) and Tailwind CSS classes already in the project. No new `package.json` dependencies are required.

## Risks & Mitigations

**Risk: `today` becomes stale across a midnight boundary.**
The `today` constant is evaluated once at component mount. A user with the page open at 23:59 who reloads at 00:01 will see the correct date after reload, but a long-lived session crossing midnight would show yesterday's date until the page is refreshed. This is acceptable: the spec does not require midnight recalculation, and the pattern is identical to `DueDateDisplay.svelte`, which also fixes `today` at mount. If this becomes a requirement, a `setInterval`-based `$state` can replace the constant in a future iteration without changes to surrounding components.

**Risk: `kanbanBoard` and `todos` subscriptions fire in separate microtasks, causing a transient intermediate render.**
The `kanbanBoard` derived store in `kanban.ts` already takes both `kanbanState` and `todos` as inputs via Svelte's `derived([kanbanState, todos], ...)`. When `todos` updates, `kanbanBoard` will re-derive before the component re-renders. Because `BoardStatsDashboard` reads from both `$kanbanBoard` and `$todos`, and Svelte 5 batches `$derived` re-evaluations within a single flush, the three metric groups update atomically within one render cycle. No visual flicker between an updated `completionPct` and an out-of-date `columnStats` is expected.

**Risk: Performance degradation on very large todo lists.**
All three derivations iterate over `$todos` (O(n) each). For the scale of a personal todo app this is negligible. If the list grows to thousands of entries, the `activeTodos` intermediate derivation avoids re-filtering for archived items on each subsequent computation. No memoization beyond Svelte's built-in `$derived` caching is needed at this scale.

**Risk: Empty board edge case causes a render error.**
When `$kanbanBoard` is `[]`, the `{#each columnStats ...}` block renders nothing and `total === 0` short-circuits `completionPct` to 0. The `overdueCount` filter over an empty array returns 0. No defensive null-checks beyond the `total === 0` guard are required.

**Risk: `dueDate` comparison correctness depends on ISO format.**
The spec requires `dueDate` to be a `YYYY-MM-DD` ISO date string or `null`. `todos.ts` loads `dueDate` with `(t.dueDate as string | null) ?? null`, and all mutation functions that set `dueDate` (e.g., `updateTodo`) receive it from date pickers that produce ISO strings. The lexicographic `<` comparison is only correct for zero-padded `YYYY-MM-DD` format. This invariant is already relied upon by `DueDateDisplay.svelte` and is safe to reuse here without additional validation.
