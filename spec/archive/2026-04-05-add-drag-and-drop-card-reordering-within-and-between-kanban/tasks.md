# Tasks for add-drag-and-drop-card-reordering-within-and-between-kanban

## Batch 1 (no dependencies)

### Task 1.1: Drag preview styling on KanbanCard
- **Files**: `src/lib/components/KanbanCard.svelte`
- **Action**: Enhance the existing `dragging` state visual treatment. Replace the current `opacity-50` class with `opacity-50 scale-95 shadow-lg cursor-grabbing` when `dragging` is true. Add `cursor-grab` to the default (non-dragging) class list. This provides clear visual feedback for which card is in flight.
- **Verify**: Run the dev server (`npm run dev`), drag a card, and confirm it shows reduced opacity, slight scale-down, elevated shadow, and a grabbing cursor. Confirm the card returns to normal appearance on drag end.
- **Done**: Dragged card displays with opacity 0.5, scale 0.95, shadow elevation, and `cursor: grabbing`. Non-dragged cards show `cursor: grab`. Appearance reverts on `dragend`.

### Task 1.2: Store source column in dataTransfer
- **Files**: `src/lib/components/KanbanCard.svelte`
- **Action**: In `handleDragStart`, add `event.dataTransfer.setData('application/x-kanban-source', columnId)` after the existing `setData('text/plain', todo.id)` call. This enables the drop handler to detect same-column drags for the off-by-one fix.
- **Verify**: In browser dev tools, set a breakpoint in `handleDrop` in `KanbanColumn.svelte` and confirm `event.dataTransfer.getData('application/x-kanban-source')` returns the correct source column ID.
- **Done**: `dataTransfer` carries both `text/plain` (todoId) and `application/x-kanban-source` (columnId) on every drag operation.

### Task 1.3: Add `index` prop to KanbanCard
- **Files**: `src/lib/components/KanbanCard.svelte`, `src/lib/components/KanbanColumn.svelte`
- **Action**: Add an `index: number` prop to `KanbanCard.svelte`'s `$props()` destructure. In `KanbanColumn.svelte`, update the `{#each}` loop to `{#each column.cards as todo, i (todo.id)}` and pass `index={i}` to `<KanbanCard>`. The index prop is needed by keyboard reorder (Batch 3) to register position on pickup.
- **Verify**: Run `npm run dev` and confirm the kanban board renders without errors. Inspect a card component in Svelte DevTools and confirm the `index` prop is present with the correct value.
- **Done**: `KanbanCard` accepts and receives an `index` prop. `KanbanColumn` passes the loop index. No visual regressions.

## Batch 2 (depends on Batch 1)

### Task 2.1: Drop position indicator in KanbanColumn
- **Files**: `src/lib/components/KanbanColumn.svelte`
- **Action**: Render a drop indicator `<div>` at the `dropIndex` position inside the card list. Replace the `{#each column.cards as todo, i (todo.id)}` block with logic that conditionally inserts a `<div class="h-0.5 bg-blue-400 rounded-full mx-2 my-1 transition-all duration-150"></div>` before the card at `dropIndex` when `dragOverCounter > 0`. If `dropIndex === column.cards.length`, render the indicator after the last card. Set `dropIndex = -1` in `handleDragLeave` (when `dragOverCounter` reaches 0) and in `handleDrop` so the indicator disappears on leave/drop. Only render the indicator when `dropIndex >= 0 && dragOverCounter > 0`.
- **Verify**: Drag a card over a column and observe a blue horizontal line appearing between cards at the exact insertion point. Move the cursor up/down and confirm the line updates position in real time. Leave the column and confirm the line disappears. Drop and confirm the line disappears.
- **Done**: A visible 2px blue bar renders at the computed `dropIndex` during dragover. It updates position in real time, disappears on drag leave, and disappears on drop.

### Task 2.2: Same-column off-by-one fix in handleDrop
- **Files**: `src/lib/components/KanbanColumn.svelte`
- **Action**: In `handleDrop`, after reading `todoId` from `dataTransfer`, also read `sourceColumnId` via `event.dataTransfer.getData('application/x-kanban-source')`. If `sourceColumnId === column.id`, find the dragged card's current index in `column.cards` using `column.cards.findIndex(c => c.id === todoId)`. If `dropIndex > sourceCardIndex`, decrement `dropIndex` by 1 before calling `moveCard`. This compensates for the dragged card being removed from the array before insertion.
- **Verify**: In a column with cards [A, B, C], drag card A below card C. Confirm the result is [B, C, A] (not [B, A, C]). Drag card C above card A. Confirm the result is [C, A, B]. Drag card B to the same position and confirm no change.
- **Done**: Same-column reorders produce the correct final order regardless of drag direction. Dragging down past the original position does not produce an off-by-one error.

### Task 2.3: Animate card positions with animate:flip
- **Files**: `src/lib/components/KanbanColumn.svelte`
- **Action**: Import `flip` from `svelte/animate`. Add `animate:flip={{ duration: 200 }}` to the card wrapper element inside the `{#each}` block (the `<KanbanCard>` wrapper or a wrapping `<div>` if needed since `animate:` must be on a direct child of `{#each}`). If `<KanbanCard>` is the direct child, wrap it in a keyed `<div>` with the animate directive.
- **Verify**: Drop a card and observe that surrounding cards smoothly animate to their new positions over ~200ms rather than snapping. Perform two rapid consecutive drops and confirm neither is blocked or glitchy.
- **Done**: Cards animate into new positions after a drop with a 200ms FLIP transition. Rapid consecutive reorders work without animation blocking.

## Batch 3 (depends on Batch 2)

### Task 3.1: Keyboard drag context in KanbanBoard
- **Files**: `src/lib/components/KanbanBoard.svelte`
- **Action**: Import `setContext` from `svelte`. Create a reactive `$state` object `keyboardDragState` with shape `{ cardId: string | null, cardText: string, originalColumnId: string, originalIndex: number, currentColumnId: string, currentIndex: number }`, initialized to `{ cardId: null, cardText: '', originalColumnId: '', originalIndex: -1, currentColumnId: '', currentIndex: -1 }`. Create helper functions: `pickup(cardId, cardText, columnId, index)`, `drop()`, `cancel()`, and `announce(message)`. `cancel()` calls `moveCard` with `originalColumnId` and `originalIndex` to revert. Call `setContext('keyboard-drag', { state: keyboardDragState, pickup, drop, cancel, announce })`. Add an ARIA live region: `<div aria-live="polite" class="sr-only" />` whose text content is set by `announce()`.
- **Verify**: Import `getContext('keyboard-drag')` in `KanbanCard.svelte` (next task) and confirm the context object is accessible. Confirm the ARIA live region element exists in the DOM via browser inspector.
- **Done**: `KanbanBoard` provides a `keyboard-drag` context with reactive state and `pickup`/`drop`/`cancel`/`announce` methods. An `aria-live="polite"` region exists in the board DOM.

### Task 3.2: Keyboard pickup and within-column movement on KanbanCard
- **Files**: `src/lib/components/KanbanCard.svelte`
- **Action**: Import `getContext` from `svelte` and retrieve `keyboard-drag` context. Add a `keydown` handler to the card element. On Enter or Space (when `context.state.cardId === null`): call `context.pickup(todo.id, todo.text, columnId, index)`, call `context.announce('Card ' + todo.text + ' picked up, use arrow keys to move')`. On Arrow Up (when this card is picked up): if `context.state.currentIndex > 0`, call `moveCard(todo.id, context.state.currentColumnId, context.state.currentIndex - 1)` and update `context.state.currentIndex`. On Arrow Down: if `currentIndex < columnLength - 1`, move down by 1. On Enter (when picked up): call `context.drop()` and announce placement. On Escape: call `context.cancel()` and announce cancellation. Update `aria-grabbed` to reflect `context.state.cardId === todo.id`.
- **Verify**: Tab to a card, press Enter, confirm `aria-grabbed="true"`. Press Arrow Down, confirm the card moves down in the column. Press Enter to confirm. Press Escape during a move and confirm the card returns to its original position.
- **Done**: Cards can be picked up with Enter/Space, moved up/down with Arrow keys, confirmed with Enter, and cancelled with Escape. `aria-grabbed` reflects state accurately.

### Task 3.3: Cross-column keyboard movement in KanbanBoard
- **Files**: `src/lib/components/KanbanBoard.svelte`
- **Action**: Add a `keydown` handler on the board's root `<div>`. When `keyboardDragState.cardId !== null` and Arrow Left is pressed: find the column to the left of `currentColumnId` in `$kanbanBoard`. If one exists, call `moveCard(cardId, leftColumn.id, Math.min(currentIndex, leftColumn.cards.length))` and update `currentColumnId` and `currentIndex`. Same for Arrow Right with the column to the right. Call `announce('Moved to ' + targetColumn.title + ', position ' + (newIndex + 1) + ' of ' + targetColumn.cards.length)`. Prevent default on arrow keys during keyboard drag to stop page scrolling.
- **Verify**: Pick up a card with keyboard in the first column. Press Arrow Right and confirm the card moves to the second column. Press Arrow Left and confirm it returns. The ARIA live region announces each move.
- **Done**: Arrow Left/Right moves the picked-up card between adjacent columns. Index is clamped to the target column's length. ARIA announcements fire on each cross-column move.

## Batch 4 (depends on Batch 3)

### Task 4.1: Touch drag support via Pointer Events on KanbanCard
- **Files**: `src/lib/components/KanbanCard.svelte`, `src/lib/components/KanbanBoard.svelte`
- **Action**: On `KanbanCard.svelte`, add `pointerdown`, `pointermove`, and `pointerup` handlers. On `pointerdown` with `event.pointerType === 'touch'`: record `pointerStartX/Y`, start a 200ms `longPressTimer`. On `pointermove`: if timer is pending and displacement > 10px, clear timer (scroll gesture). If `touchDragging` is true, call `event.preventDefault()` to suppress scroll, use `document.elementFromPoint(event.clientX, event.clientY)` with `.closest('[role="list"]')` to find the target column, compute `dropIndex` from card midpoints, and update the target column's indicator via a `touch-drag` context. On `pointerup`: if `touchDragging`, call `moveCard` with computed target and index, clear state. On `KanbanBoard.svelte`: add a `touch-drag` context via `setContext('touch-drag', { setDropTarget, clearDropTarget, getColumnElements })` where columns register their DOM elements on mount.
- **Verify**: On a touch device or using Chrome DevTools touch simulation: long-press a card for 200ms, confirm it enters drag state. Drag over a column and confirm the drop indicator appears. Release and confirm the card moves. Quick taps and scrolls must not trigger drag.
- **Done**: Long-press (200ms) on touch initiates drag. Touch movement shows the drop indicator in target columns. Lift completes the move. Scrolling is suppressed during drag but works normally otherwise. Quick taps do not trigger drag.

### Task 4.2: Tests for drop index calculation and keyboard flow
- **Files**: `src/lib/stores/kanban.test.ts`
- **Action**: Add a new `describe('moveCard drop index edge cases')` block with these tests: (1) Move card to index 0 in an empty column (after moving all cards out first). (2) Same-column reorder: 3 cards [A, B, C], move A to index 2, expect [B, C, A]. (3) Same-column reorder: 3 cards [A, B, C], move C to index 0, expect [C, A, B]. (4) Same-column no-op: move B to index 1 in [A, B, C], expect [A, B, C]. (5) Cross-column move preserving order: move middle card from col-0 to col-1 at index 0. These tests exercise the store's `moveCard` directly (the off-by-one fix is in the component layer, but the store behavior must be validated for correctness at the boundary indices).
- **Verify**: Run `npx vitest run src/lib/stores/kanban.test.ts` and confirm all new and existing tests pass.
- **Done**: Five new test cases pass covering empty column insertion, same-column reorder (both directions), same-column no-op, and cross-column boundary indices. All existing tests continue to pass.
