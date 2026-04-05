# Verification: add-drag-and-drop-card-reordering-within-and-between-kanban

## Spec Scenarios

### Requirement: drop_position_indicator

- [x] PASS: indicator_appears_between_cards — KanbanColumn.svelte:47-66 computes `dropIndex` from card midpoints via `handleDragOver`; template renders a blue indicator div at line 152-154 when `i === dropIndex`
- [x] PASS: indicator_at_end_of_column — KanbanColumn.svelte:158-160 renders trailing indicator when `dropIndex === column.cards.length`
- [x] PASS: indicator_in_empty_column — When 0 cards exist, `handleDragOver` sets `dropIndex = 0`; trailing indicator renders because `dropIndex === column.cards.length` (both 0)
- [x] PASS: indicator_disappears_on_drag_leave — KanbanColumn.svelte:73-79 `handleDragLeave` decrements `dragOverCounter` and resets `dropIndex = -1` when counter reaches 0; template guards on `dropIndex >= 0`

### Requirement: drag_preview_styling

- [x] PASS: card_becomes_visually_distinct_on_drag — KanbanCard.svelte:179 applies `opacity-50 scale-95 shadow-lg` when `dragging || touchDragging` is true (opacity 0.5 satisfies "no greater than 0.5")
- [x] PASS: card_restores_appearance_on_drag_end — KanbanCard.svelte:45-47 `handleDragEnd` sets `dragging = false`, removing the opacity/scale classes
- [x] PASS: card_cursor_changes_during_drag — KanbanCard.svelte:179 applies `cursor-grabbing` when dragging, `cursor-grab` at rest

### Requirement: same_column_reorder_accuracy

- [x] PASS: reorder_card_downward_within_column — KanbanColumn.svelte:92-97 adjusts `dropIndex` by decrementing when `adjustedIndex > sourceCardIndex` within same column before calling `moveCard`
- [x] PASS: reorder_card_upward_within_column — When dragging upward, `adjustedIndex <= sourceCardIndex` so no decrement needed; `moveCard` called with raw `dropIndex` which is correct
- [x] PASS: dragged_card_ghosts_in_original_slot — KanbanCard.svelte:179 applies `opacity-50 scale-95` to the dragged card in its original slot (SHOULD requirement)

### Requirement: column_hover_feedback

- [x] PASS: column_background_changes_on_dragover — KanbanColumn.svelte:105 applies `bg-blue-50 border-2 border-blue-300` (with dark mode variants) when `dragOverCounter > 0`
- [x] PASS: column_background_reverts_on_dragleave — KanbanColumn.svelte:73-79 resets `dragOverCounter` to 0 on full leave, removing the highlight classes

### Requirement: transition_animations

- [x] PASS: cards_animate_after_drop — KanbanColumn.svelte:151 uses `animate:flip={{ duration: 200 }}` (200ms is within the 150-300ms range)
- [x] PASS: rapid_consecutive_reorders — Svelte's `animate:flip` is non-blocking; new drag operations proceed immediately since animations are CSS-driven and do not block store updates or event handlers

### Requirement: keyboard_accessible_reordering

- [x] PASS: pick_up_card_with_keyboard — KanbanCard.svelte:50-54 handles Enter/Space, calls `keyboardDrag.pickup()`, sets `aria-grabbed` at line 172
- [x] PASS: move_card_within_column_via_keyboard — KanbanCard.svelte:59-76 handles ArrowUp/ArrowDown, calls `moveCard` and updates `currentIndex`
- [x] PASS: move_card_between_columns_via_keyboard — KanbanBoard.svelte:74-95 handles ArrowLeft/ArrowRight, moves card to adjacent column with index clamped to target column length
- [x] PASS: cancel_keyboard_reorder — KanbanCard.svelte:82-83 handles Escape, calls `keyboardDrag.cancel()`; KanbanBoard.svelte:47-57 restores card to original position via `moveCard` and resets state
- [x] PASS: confirm_keyboard_reorder — KanbanCard.svelte:77-79 handles Enter (when picked up), calls `keyboardDrag.drop()`; KanbanBoard.svelte:36-44 resets state, card stays at current position

### Requirement: touch_support

- [x] PASS: long_press_initiates_touch_drag — KanbanCard.svelte:86-98 `handlePointerDown` starts a 200ms timer; sets `touchDragging = true` after timer fires
- [x] PASS: touch_move_shows_drop_indicator — KanbanCard.svelte:100-143 `handlePointerMove` computes `dropIndex` from `clientY` vs card midpoints (same logic as mouse dragover)
- [x] PASS: touch_drop_completes_move — KanbanCard.svelte:145-163 `handlePointerUp` calls `moveCard` with `touchTargetColumnId` and adjusted index
- [x] PASS: scroll_prevention_during_touch_drag — KanbanCard.svelte:116 calls `event.preventDefault()` during touch move; line 179 applies `touch-none` CSS class

## Gate Results

| Gate | Result | Details |
|------|--------|---------|
| Tests | PASS | 28/28 tests passing (2 test files) |
| Typecheck | PASS | 0 errors, 1 warning (non-blocking a11y tabindex on listitem) |

## Summary

All 20 spec scenarios pass verification. The implementation covers the full drag-and-drop feature set:

- **Mouse drag**: Drop position indicator renders correctly between cards, at column ends, and in empty columns. Off-by-one correction for same-column reorder is implemented in `handleDrop`. Column hover feedback uses `dragOverCounter` pattern.
- **Keyboard reorder**: Full keyboard flow (pickup via Enter/Space, move via arrows, confirm via Enter, cancel via Escape) with ARIA live announcements and `aria-grabbed` attribute. Cross-column movement handled at the board level.
- **Touch support**: Long-press (200ms) initiates drag via pointer events. Drop index computed from touch point vs card midpoints. Scroll prevention via `touch-none` class and `preventDefault()`.
- **Animations**: Svelte `animate:flip` with 200ms duration provides smooth card transitions without blocking interactions.
- **Visual feedback**: Dragged cards show `opacity-50 scale-95 shadow-lg cursor-grabbing`. Target columns highlight with blue background.

ARIA announcement text is less detailed than spec examples (e.g., "picked up" vs "picked up, use arrow keys to move") but these are SHOULD-level requirements and the core accessibility semantics (live region, aria-grabbed, keyboard operability) are all present.
