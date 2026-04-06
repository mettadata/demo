# Research: board-statistics-dashboard-tas

## Decision: Pure component computation in BoardStatsDashboard.svelte

### Approaches Considered

1. **Pure component computation** (selected) — Subscribe to `$kanbanBoard` and `$todos` directly inside `BoardStatsDashboard.svelte` and compute all three stats (`columnStats`, `completionPct`, `overdueCount`) using Svelte 5 `$derived` runes. No new store or exported symbol is introduced.

2. **New derived store** — Export a `boardStats` derived store from `kanban.ts` (or a new `stats.ts`) that consumes `[kanbanBoard, todos]` and emits a `BoardStats` object. The component then subscribes to this single store with `$boardStats`.

### Rationale

**Existing component patterns confirm inline derivation is the established approach.**

Every component in the codebase that needs cross-store data derives it locally. `KanbanColumn.svelte` computes `visibleCards` with `$derived.by()` by reading `$searchQuery` and `$sortByDueDate` inline rather than exporting a combined derived store. `DueDateDisplay.svelte` computes `isOverdue` with `$derived` directly from a prop. No component in the repo delegates its display-specific computations to a shared store.

**The stats are display-only and have no other consumers.**

A derived store is the right tool when two or more consumers need the same expensive computation, or when the derived value is needed in business logic (mutations, sync side-effects). Board statistics are rendered in one place and trigger no mutations. Creating a store export purely for one component adds an unnecessary public API surface to `kanban.ts` and couples the stats' definition to the store layer rather than the feature that uses them.

**Component-local derivation aligns with Svelte 5 rune semantics already in use.**

The codebase has already migrated component-local state to Svelte 5 runes (`$state`, `$derived`, `$props`) while keeping stores as Svelte 4 `derived()`. `BoardStatsDashboard` subscribes to stores with the `$storeName` auto-subscription syntax (as `KanbanBoard.svelte` does with `$kanbanBoard`) and computes display values with `$derived` (as `KanbanColumn.svelte` does). This is exactly the pattern the rest of the codebase follows.

**Testing remains straightforward.** Component tests (following the `BoardTemplateSelector.test.ts` and `ShortcutsHelpModal.test.ts` patterns) can prime `todos` and `kanbanState` stores directly with known values and assert rendered text. Store-layer tests (`kanban.test.ts`) do not need to be touched at all.

**The derived-store approach is not wrong, but premature.** It would be appropriate if `boardStats` were consumed in, for example, a future activity-log entry, a server-side load function, or a second dashboard component. At this point there is one consumer and no such plans, so the added indirection carries cost without benefit.

**Overdue date comparison follows the established pattern from `DueDateDisplay.svelte`**, which uses `new Date().toISOString().split('T')[0]` for today's string and a lexicographic `<` comparison against `dueDate`. `BoardStatsDashboard` replicates this exactly.

### Artifacts Produced

- [API Contract: BoardStatsDashboard Props](contracts/board-stats-props.md)
- [Data Model: BoardStats](schemas/board-stats-data.md)
- [Flow: Stats Data Flow](diagrams/stats-data-flow.md)
