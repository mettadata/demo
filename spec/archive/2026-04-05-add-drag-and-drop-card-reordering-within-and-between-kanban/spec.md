# add-drag-and-drop-card-reordering-within-and-between-kanban

## ADDED: Requirement: drop_position_indicator

KanbanColumn MUST render a visible horizontal line or gap element at the computed `dropIndex` position during a dragover event. The indicator MUST appear between the two cards surrounding the insertion point, or at the top/bottom of the card list when inserting at the first or last position. The indicator MUST update its position in real time as the user moves the pointer vertically within the column. The indicator MUST disappear when the drag leaves the column or the drop completes.

### Scenario: indicator_appears_between_cards
- GIVEN a column contains 3 cards and the user is dragging a card from another column
- WHEN the user drags over the vertical midpoint between the 1st and 2nd cards
- THEN a visible horizontal indicator element MUST appear between the 1st and 2nd cards at `dropIndex` 1

### Scenario: indicator_at_end_of_column
- GIVEN a column contains 2 cards and the user is dragging a card
- WHEN the user drags below the midpoint of the last card in the column
- THEN the indicator MUST appear after the last card at `dropIndex` 2

### Scenario: indicator_in_empty_column
- GIVEN a column contains 0 cards
- WHEN the user drags a card over the empty column area
- THEN the indicator MUST appear at the top of the card list area at `dropIndex` 0

### Scenario: indicator_disappears_on_drag_leave
- GIVEN the drop indicator is visible in a column
- WHEN the user drags the pointer out of the column boundaries
- THEN the indicator MUST disappear and the column MUST return to its default visual state

## MODIFIED: Requirement: drag_preview_styling

KanbanCard MUST apply a distinct visual treatment to the card being dragged so the user can identify which card is in flight. The dragged card MUST have reduced opacity (no greater than 0.5) and SHOULD apply a slight scale reduction or elevation change. The visual treatment MUST be applied on `dragstart` and removed on `dragend`. The card MUST use `cursor: grabbing` while being dragged.

### Scenario: card_becomes_visually_distinct_on_drag
- GIVEN a card is at rest in a column with full opacity
- WHEN the user initiates a drag on that card
- THEN the card in its original slot MUST display with reduced opacity (no greater than 0.5) and SHOULD show a scale or shadow change distinguishing it from non-dragged cards

### Scenario: card_restores_appearance_on_drag_end
- GIVEN a card is being dragged and is displaying with reduced opacity
- WHEN the user releases the card (drop or cancel)
- THEN the card MUST return to full opacity and its default visual styling

### Scenario: card_cursor_changes_during_drag
- GIVEN a card has `cursor: grab` at rest
- WHEN the user starts dragging the card
- THEN the card element MUST reflect a `cursor: grabbing` style for the duration of the drag

## ADDED: Requirement: same_column_reorder_accuracy

When a card is dragged within its own column, the drop index calculation MUST account for the dragged card's original position to avoid off-by-one errors. Specifically, if the card is dragged downward past its original slot, the visual `dropIndex` MUST be decremented by one before calling `moveCard` because the dragged card's removal shifts subsequent cards up. The dragged card SHOULD visually collapse or ghost out of its original slot so the remaining cards close the gap during the drag.

### Scenario: reorder_card_downward_within_column
- GIVEN a column has cards [A, B, C] and the user starts dragging card A
- WHEN the user drags card A below the midpoint of card C (raw dropIndex = 3)
- THEN `moveCard` MUST be called with a corrected `targetIndex` of 2, and card A MUST end up after card C in the order [B, C, A]

### Scenario: reorder_card_upward_within_column
- GIVEN a column has cards [A, B, C] and the user starts dragging card C
- WHEN the user drags card C above the midpoint of card A (raw dropIndex = 0)
- THEN `moveCard` MUST be called with `targetIndex` 0, and card C MUST end up before card A in the order [C, A, B]

### Scenario: dragged_card_ghosts_in_original_slot
- GIVEN a column has cards [A, B, C]
- WHEN the user starts dragging card B within the same column
- THEN card B's original slot SHOULD visually collapse or show as a ghost (reduced opacity and/or height) so cards A and C appear adjacent

## MODIFIED: Requirement: column_hover_feedback

The target column SHOULD show a subtle background color change when a dragged card is over it, distinct from the drop position indicator. The background change MUST apply when `dragenter` fires and MUST revert when `dragleave` fires (accounting for child element enter/leave via the existing `dragOverCounter`). The hover background MUST NOT obscure the drop position indicator.

### Scenario: column_background_changes_on_dragover
- GIVEN a card is being dragged and the pointer enters a target column
- WHEN the `dragOverCounter` increments above 0
- THEN the column background SHOULD change to a subtle highlight color (e.g., light blue tint) to confirm it will receive the card

### Scenario: column_background_reverts_on_dragleave
- GIVEN a column is showing the drag-hover background highlight
- WHEN the pointer leaves the column and `dragOverCounter` returns to 0
- THEN the column background MUST revert to its default color

## ADDED: Requirement: transition_animations

Card list changes SHOULD use CSS transitions or Svelte transition directives so that cards animate smoothly into their new positions after a drop rather than snapping instantly. The transition duration SHOULD be between 150ms and 300ms. Transitions MUST NOT block subsequent user interactions or prevent rapid consecutive reorders.

### Scenario: cards_animate_after_drop
- GIVEN a column has cards [A, B, C] and the user drops a card D between A and B
- WHEN the drop completes and the store updates
- THEN cards B and C SHOULD animate downward to their new positions over a duration between 150ms and 300ms

### Scenario: rapid_consecutive_reorders
- GIVEN the user performs a drop and the transition animation is in progress
- WHEN the user immediately initiates another drag-and-drop operation
- THEN the new operation MUST NOT be blocked by the in-progress animation and the card list MUST reach the correct final state

## ADDED: Requirement: keyboard_accessible_reordering

Cards MUST be operable via keyboard without requiring a mouse or pointer device. A focused card MUST enter a "picked up" state when the user presses Enter or Space. While picked up, Arrow Up and Arrow Down MUST move the card within the current column, and Arrow Left and Arrow Right MUST move the card to the adjacent column (preserving the card's relative index or clamping to the target column's length). Pressing Enter MUST confirm the placement. Pressing Escape MUST cancel and return the card to its original position. ARIA live regions SHOULD announce each position change to assistive technologies. The `aria-grabbed` attribute MUST reflect the current keyboard drag state.

### Scenario: pick_up_card_with_keyboard
- GIVEN a card is focused via Tab navigation and is not in "picked up" state
- WHEN the user presses Enter or Space
- THEN the card MUST enter "picked up" state, `aria-grabbed` MUST be set to "true", and an ARIA live region SHOULD announce "Card [name] picked up, use arrow keys to move"

### Scenario: move_card_within_column_via_keyboard
- GIVEN a card is in "picked up" state in a column with cards [A, B, C] and the picked-up card is B at index 1
- WHEN the user presses Arrow Down
- THEN the card MUST move to index 2 (order becomes [A, C, B]), and an ARIA live region SHOULD announce "Moved to position 3 of 3 in [column name]"

### Scenario: move_card_between_columns_via_keyboard
- GIVEN a card is in "picked up" state in the "To Do" column and an "In Progress" column exists to the right
- WHEN the user presses Arrow Right
- THEN the card MUST move to the "In Progress" column at a clamped index, and an ARIA live region SHOULD announce "Moved to [target column name], position [index] of [total]"

### Scenario: cancel_keyboard_reorder
- GIVEN a card is in "picked up" state and has been moved from its original position
- WHEN the user presses Escape
- THEN the card MUST return to its original column and original index, `aria-grabbed` MUST be set to "false", and an ARIA live region SHOULD announce "Reorder cancelled"

### Scenario: confirm_keyboard_reorder
- GIVEN a card is in "picked up" state at a new position
- WHEN the user presses Enter
- THEN the card MUST remain at its current position, `aria-grabbed` MUST be set to "false", and an ARIA live region SHOULD announce "Card [name] dropped in [column name] at position [index]"

## ADDED: Requirement: touch_support

Drag-and-drop SHOULD work on touch devices using `touchstart`, `touchmove`, and `touchend` event handlers, or via a unified pointer events abstraction. A long press (minimum 200ms hold) SHOULD initiate the drag to distinguish from scroll gestures. During a touch drag, the page MUST NOT scroll. The touch drag SHOULD calculate `dropIndex` using the same clientY-vs-midpoint logic as mouse dragover. Touch drag MUST invoke the same `moveCard` store function on completion.

### Scenario: long_press_initiates_touch_drag
- GIVEN a user is on a touch device and touches a card
- WHEN the user holds the touch for at least 200ms without moving beyond a 10px threshold
- THEN the card SHOULD enter the dragged state with the same visual treatment as mouse drag (reduced opacity, scale change)

### Scenario: touch_move_shows_drop_indicator
- GIVEN a card is in the touch-dragged state
- WHEN the user moves their finger over a target column
- THEN the drop position indicator SHOULD appear at the calculated `dropIndex` based on the touch point's clientY relative to card midpoints

### Scenario: touch_drop_completes_move
- GIVEN a card is in the touch-dragged state and a drop indicator is visible at index 1 in a target column
- WHEN the user lifts their finger (touchend)
- THEN `moveCard` MUST be called with the correct todoId, target column ID, and the computed `dropIndex`, and the card MUST appear at the new position

### Scenario: scroll_prevention_during_touch_drag
- GIVEN a card is in the touch-dragged state
- WHEN the user moves their finger vertically
- THEN the page MUST NOT scroll and the touch movement MUST only affect the drag operation
