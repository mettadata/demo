# Research: add-board-templates-with-preset-columns-and-sample-cards-for

## Decision: Inline store extension — add BOARD_TEMPLATES, applyTemplate, and isBoardPristine directly in kanban.ts, with a modal overlay for the selector UI

### Approaches Considered

1. **Inline store extension in kanban.ts** (selected) — All template data and logic live alongside the existing kanban store. Consistent with how the file already defines DEFAULT_COLUMNS, addColumn, moveCard, and related helpers. No new module boundary to maintain for a small, tightly coupled feature.
2. **Separate templates module (src/lib/stores/templates.ts)** — Template data and applyTemplate extracted to a dedicated file. Not selected because templates.ts would immediately import kanbanState and todos, creating a dependency on both stores while neither store imports templates — the module split adds a file and an import edge without reducing coupling or enabling reuse elsewhere.

### Rationale

**Template data structure.** kanban.ts already owns DEFAULT_COLUMNS and KanbanState. BOARD_TEMPLATES belongs in the same file for the same reason DEFAULT_COLUMNS does: it is authoritative configuration for the board's initial shape. A `BoardTemplate` interface with `columns: Array<{ title: string; cards: string[] }>` captures the statically-known structure without any `any`. Using `as const` on the literal ensures column names and card titles are narrowed to string literals, which is useful for type-checked template name lookup.

**applyTemplate implementation.** The function must atomically replace both stores. Calling addColumn in a loop would trigger syncWithTodos on each iteration, which would immediately slot newly created todos into the first column before subsequent columns are ready — breaking the desired column-to-card assignment. The correct approach is to build the full next KanbanState in memory (new columns with pre-assigned cardIds) and then call `kanbanState.set(newState)` once, and call `todos.update` once to prepend the new Todo objects while filtering out any prior todos that were referenced only as card IDs. A single atomic update per store eliminates any intermediate state where orphaned IDs could appear. The existing syncWithTodos subscription will fire after `todos.update` completes, but because every new todo ID is already present in the new kanbanState's cardIds at that point, syncWithTodos will detect zero new IDs and zero orphans and return the state unchanged.

**Creating Todo objects.** addTodo cannot be used inside applyTemplate because it calls `snapshot()` (undo machinery) for each card independently and emits individual store updates. Instead, applyTemplate should construct `Todo` objects inline using the same field shape that `addTodo` uses — `crypto.randomUUID()` for id, `completed: false`, `archived: false`, `priority: 'none'`, `dueDate: null`, empty arrays for labelIds/attachments/comments, and an activityLog with a single `{ type: 'created', timestamp: now }` entry. This is the identical shape loadTodos normalizes persisted records to, so round-tripping through localStorage is safe.

**Pristine detection.** isBoardPristine compares the current store value against the three hardcoded default column IDs (`col-todo`, `col-in-progress`, `col-done`) and requires all cardIds to be empty. It uses `get(kanbanState)` to read synchronously and returns a plain boolean — no derived store needed. The comparison is order-sensitive because DEFAULT_COLUMNS defines a fixed order and the spec explicitly requires the IDs to appear in that order.

**UI approach — modal overlay.** KanbanBoard.svelte checks isBoardPristine() in an `$effect` on mount and sets a local boolean `showTemplateSelector`. A `BoardTemplateSelector.svelte` component renders as a fixed-position modal overlay (not an inline panel) for two reasons: (1) it does not displace column layout, so the user can see the blank board behind it and understand what they are starting from; (2) a modal's dismiss semantics (Escape key, backdrop click, explicit "Skip" button) map naturally to the "do not apply" path without requiring the board to allocate permanent header space. Dismissal sets a second local boolean `selectorDismissed = true`, which prevents the effect from re-showing the selector on subsequent reactive re-renders within the same session. A page reload with a still-pristine board will call isBoardPristine() fresh and show the selector again, matching the spec requirement.

**"Change template" header control.** The spec requires this control to always be visible when the kanban view is active. It sits in the KanbanBoard header alongside the existing "+ Add Column" trigger. Clicking it shows a `window.confirm` dialog warning that all columns and cards will be replaced. If the user confirms, `showTemplateSelector` is set to true and `selectorDismissed` is reset to false so the selector renders. If the user cancels, nothing changes. This keeps the warning entirely in the parent component, with no confirmation state leaked into BoardTemplateSelector itself.

**No changes to existing interfaces or sync logic.** KanbanColumn, KanbanState, and Todo remain unchanged. syncWithTodos fires after applyTemplate completes and is a no-op in the normal success path. All existing mutation functions (addColumn, moveCard, deleteColumn, etc.) continue to work unchanged on the template-populated board.

### Artifacts Produced

- [API Contract: kanban store template exports](contracts/kanban-template-api.md)
- [Data Model: BoardTemplate and BOARD_TEMPLATES](schemas/board-template-schema.md)
- [Flow: applyTemplate atomic update sequence](diagrams/apply-template-flow.md)
