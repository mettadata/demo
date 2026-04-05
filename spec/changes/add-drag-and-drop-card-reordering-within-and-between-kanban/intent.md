# add-drag-and-drop-card-reordering-within-and-between-kanban

## Problem

Users cannot see where a card will land when dragging it within or between kanban columns. The current HTML5 drag-and-drop implementation in KanbanColumn.svelte highlights the entire column on dragover but provides no positional feedback -- there is no visual indicator between cards showing the precise insertion point. Reordering cards within the same column is especially disorienting because the column highlight gives no sense of relative position. This makes the kanban board feel rough and unreliable for anyone organizing their todos spatially.

## Proposal

Polish the existing drag-and-drop system across KanbanCard.svelte, KanbanColumn.svelte, and KanbanBoard.svelte to deliver clear, responsive reordering. The store layer (`kanban.ts` and its `moveCard` function) already supports positional moves and MUST NOT be rewritten.

Specific changes:

1. **Drop position indicator**: KanbanColumn MUST render a visible horizontal line (or gap) between cards at the computed `dropIndex` during dragover. The indicator MUST appear at the exact insertion point calculated from `event.clientY` vs. card midpoints.

2. **Drag preview styling**: KanbanCard MUST apply a distinct visual treatment to the card being dragged (reduced opacity, slight scale, or elevation change) so the user knows which card is in flight.

3. **Smooth reordering within a column**: When dragging a card within its own column, the drop indicator MUST correctly account for the dragged card's original position so the index is not off-by-one. The dragged card SHOULD visually collapse or ghost out of its original slot.

4. **Column hover feedback**: The target column SHOULD show a subtle background change on dragover, distinct from the drop indicator, to confirm which column will receive the card.

5. **Transition animations**: Card list changes SHOULD use CSS transitions or Svelte transitions so cards animate into their new positions after a drop rather than snapping instantly.

6. **Keyboard-accessible reordering**: Cards MUST be operable via keyboard. Users MUST be able to pick up a focused card (Enter or Space), move it with Arrow keys, and confirm placement (Enter) or cancel (Escape). ARIA live regions SHOULD announce position changes.

7. **Touch support**: Drag-and-drop SHOULD work on touch devices via `touchstart`/`touchmove`/`touchend` handlers or a pointer events abstraction that unifies mouse and touch input.

## Impact

- **KanbanCard.svelte** -- gains drag preview styles, keyboard interaction handlers, and touch event listeners. The existing `draggable`, `dragstart`, and `dragend` bindings are extended, not replaced.
- **KanbanColumn.svelte** -- gains a drop indicator element rendered at `dropIndex`, refined dragover styling, and keyboard drop-target logic. The existing dragover index calculation is reused.
- **KanbanBoard.svelte** -- MAY need to coordinate keyboard drag state across columns (e.g., Arrow Left/Right to move between columns during keyboard reorder).
- **kanban.ts** -- no changes to the store interface. `moveCard(todoId, targetColumnId, targetIndex)` already handles all positional logic.
- **Accessibility** -- the board currently uses `aria-grabbed` and `aria-dropeffect`. These MUST be updated to stay accurate during keyboard-driven moves and SHOULD be supplemented with `aria-live` announcements.
- **Existing tests** -- `kanban.test.ts` covers store mutations and MUST continue to pass. New tests SHOULD cover drop index calculation edge cases (empty column, single card, same-column reorder).

## Out of Scope

- Column reordering (dragging columns themselves to change their order)
- Multi-card selection or batch drag
- Drag-and-drop from external sources (files, other apps)
- Persisting card order to a backend or database (localStorage persistence already exists)
- Changing the store API or data model in `kanban.ts`
- Adding a third-party drag-and-drop library (e.g., dnd-kit, SortableJS) -- this MUST use native browser APIs
- Mobile-specific layout changes or responsive breakpoints for the kanban board
