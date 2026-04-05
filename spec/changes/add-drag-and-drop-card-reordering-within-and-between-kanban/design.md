# Design: add-drag-and-drop-card-reordering-within-and-between-kanban

## Approach

Layer three interaction modes onto the existing HTML5 DnD implementation without changing the store API. The existing `moveCard(todoId, targetColumnId, targetIndex)` in `src/lib/stores/kanban.ts` is the single mutation entry point for all three modes:

1. **Mouse DnD (existing, enhanced)** -- Keep the HTML5 DnD handlers in `KanbanCard.svelte` and `KanbanColumn.svelte`. Add a drop indicator DOM element at `dropIndex`, improve drag preview styling, and fix the same-column off-by-one bug in `handleDrop`.

2. **Keyboard reordering (new)** -- `KanbanBoard.svelte` owns a `setContext`-based keyboard drag state. Cards enter "picked up" mode on Enter/Space, move with Arrow keys (Up/Down within column, Left/Right across columns), confirm with Enter, cancel with Escape. Each Arrow press calls `moveCard` immediately (optimistic updates).

3. **Touch drag (new)** -- A Pointer Events layer on `KanbanCard.svelte` activates only for `pointerType === 'touch'`. Long-press (200ms) initiates drag, `setPointerCapture` locks input, `elementFromPoint` + midpoint calculation determines drop target. `pointermove` suppresses scrolling via `event.preventDefault()`.

All three modes converge on the same `moveCard` call and share the same drop indicator rendering in `KanbanColumn.svelte`. Card position animations use Svelte `animate:flip` on the keyed `{#each}` block.

## Components

### KanbanCard.svelte
**File**: `src/lib/components/KanbanCard.svelte`
**Current props**: `{ todo: Todo, columnId: string, columnTitle: string }`
**New props**: `{ todo: Todo, columnId: string, columnTitle: string, index: number }`

Responsibilities:
- **Drag preview styling**: On `dragstart`, apply `opacity-50 scale-95` classes. On `dragend`, revert. The existing `dragging` state variable drives this.
- **Source column tracking**: Store `columnId` in `dataTransfer` alongside `todoId` so the drop handler can detect same-column drags. Format: `dataTransfer.setData('application/x-kanban-source', columnId)`.
- **Keyboard pickup**: On `keydown` (Enter or Space), toggle the keyboard drag context from `getContext('keyboard-drag')`. While picked up, handle Arrow Up/Down by calling `moveCard` to shift position within the column. Arrow Left/Right are handled by the board via context.
- **Touch initiation**: On `pointerdown` with `pointerType === 'touch'`, start a 200ms timer. If the pointer moves > 10px before the timer fires, cancel (user is scrolling). If the timer fires, call `setPointerCapture(pointerId)`, set a `touchDragging` state, and begin tracking pointer position.
- **Touch drag tracking**: On `pointermove` while `touchDragging`, call `event.preventDefault()` to suppress scrolling. Use `document.elementFromPoint(event.clientX, event.clientY)` to find the column under the finger. Compute `dropIndex` from clientY vs card midpoints (same logic as `handleDragOver`). Update the target column's drop indicator via a shared callback from context.
- **Touch drop**: On `pointerup` while `touchDragging`, call `moveCard` with the computed target column and index.

### KanbanColumn.svelte
**File**: `src/lib/components/KanbanColumn.svelte`
**Current props**: `{ column: ResolvedColumn }`
**Props unchanged.**

Responsibilities:
- **Drop indicator rendering**: Inside the `{#each column.cards as todo (todo.id)}` block, conditionally render a `<div class="drop-indicator">` element at `dropIndex`. Implementation: iterate cards and insert the indicator before the card whose index matches `dropIndex`. If `dropIndex === cards.length`, render the indicator after the last card. The indicator is a 2px-tall `bg-blue-400 rounded-full mx-2 my-1` bar.
- **Same-column off-by-one fix**: In `handleDrop`, read `sourceColumnId` from `dataTransfer.getData('application/x-kanban-source')`. If `sourceColumnId === column.id`, find the dragged card's current index in `column.cards`. If `dropIndex > sourceCardIndex`, decrement `dropIndex` by 1 before calling `moveCard`.
- **Indicator cleanup**: Set `dropIndex = -1` on `dragleave` (when `dragOverCounter` reaches 0) and on `drop`. The indicator only renders when `dropIndex >= 0` and `dragOverCounter > 0`.
- **Keyboard drop target**: Read keyboard drag context. When context indicates a card is being keyboard-moved into this column, render the drop indicator at the context's `currentIndex`.
- **`animate:flip`**: Add `animate:flip={{ duration: 200 }}` to each card wrapper element inside the `{#each}` block to animate positional changes after drops.
- **Touch drop target**: Expose a method (via `bind:this` or context callback) for `KanbanCard`'s touch handler to set `dropIndex` and `dragOverCounter` on this column during touch drags.

### KanbanBoard.svelte
**File**: `src/lib/components/KanbanBoard.svelte`
**No prop changes.**

Responsibilities:
- **Keyboard drag context provider**: Call `setContext('keyboard-drag', keyboardDragState)` where `keyboardDragState` is a reactive object (Svelte 5 `$state`) containing `{ cardId: string | null, cardText: string, originalColumnId: string, originalIndex: number, currentColumnId: string, currentIndex: number }`.
- **Cross-column keyboard movement**: Listen for `keydown` at the board level. When a card is picked up (context `cardId !== null`) and Arrow Left/Right is pressed, find the adjacent column, call `moveCard(cardId, adjacentColumnId, clampedIndex)`, and update the context's `currentColumnId` and `currentIndex`.
- **ARIA live region**: Render a `<div aria-live="polite" class="sr-only">` that announces position changes. Updated by the keyboard drag handlers with messages like "Moved to position 2 of 3 in In Progress" or "Reorder cancelled".
- **Touch column lookup**: Provide column DOM references or a `getColumnAtPoint(x, y)` utility via context so the card's touch handler can determine which column is under the finger.

## Data Model

The `kanban.ts` store is **unchanged**. `KanbanState`, `KanbanColumn`, `ResolvedColumn`, and `moveCard` remain as-is. No new persisted state is introduced.

The only new data structure is the **transient keyboard drag context**, managed entirely in `KanbanBoard.svelte` via `setContext`:

```typescript
interface KeyboardDragState {
  cardId: string | null;       // ID of the card being keyboard-dragged, null when idle
  cardText: string;            // Text of the card, used for ARIA announcements
  originalColumnId: string;    // Column the card was in when picked up
  originalIndex: number;       // Index in the original column when picked up
  currentColumnId: string;     // Column the card is currently in
  currentIndex: number;        // Current index in the current column
}
```

This state is reactive (`$state` in Svelte 5) and is never persisted to localStorage. It resets to `{ cardId: null, ... }` on drop confirmation, cancellation, or component destruction. The context key is `'keyboard-drag'`.

Additionally, each component maintains local transient state for its interaction mode:
- `KanbanCard.svelte`: `touchDragging: boolean`, `longPressTimer: ReturnType<typeof setTimeout> | null`, `pointerStartX/Y: number`
- `KanbanColumn.svelte`: `dropIndex: number` (already exists, reused), `dragOverCounter: number` (already exists, reused)

## API Design

### Component Interface Changes

**KanbanCard.svelte** -- new `index` prop:
```svelte
let { todo, columnId, columnTitle, index }: {
  todo: Todo;
  columnId: string;
  columnTitle: string;
  index: number;  // NEW: card's position in the column, used for keyboard reorder
} = $props();
```

The `index` prop is passed from `KanbanColumn.svelte`'s `{#each}` loop. It enables the card to register its position in the keyboard drag context on pickup and to compute same-column moves on Arrow Up/Down without querying the DOM.

**KanbanColumn.svelte** -- call site change in template:
```svelte
{#each column.cards as todo, i (todo.id)}
  <KanbanCard {todo} columnId={column.id} columnTitle={column.title} index={i} />
{/each}
```

**KanbanBoard.svelte** -- no external API changes. Internally adds `setContext`.

### Context Shape

Set by `KanbanBoard.svelte`, consumed by `KanbanCard.svelte` and `KanbanColumn.svelte`:

```typescript
// Context key: 'keyboard-drag'
interface KeyboardDragContext {
  state: KeyboardDragState;                    // reactive $state object
  pickup(cardId: string, cardText: string, columnId: string, index: number): void;
  drop(): void;                                // confirm placement
  cancel(): void;                              // revert to original position
  announce(message: string): void;             // set ARIA live region text
}
```

`pickup()` stores the original position and sets `cardId`. `drop()` clears `cardId` and announces completion. `cancel()` calls `moveCard` with `originalColumnId` and `originalIndex` to revert, then clears `cardId`.

### DataTransfer Contract

Mouse DnD passes two values via `dataTransfer`:
- `text/plain`: the `todo.id` string (existing, unchanged)
- `application/x-kanban-source`: the `columnId` string (new, used for same-column detection)

### Touch Drag Coordination

`KanbanBoard.svelte` sets a second context for touch coordination:

```typescript
// Context key: 'touch-drag'
interface TouchDragContext {
  setDropTarget(columnId: string, dropIndex: number): void;  // card reports current target
  clearDropTarget(): void;                                     // card reports drag ended
  getColumnElements(): Map<string, HTMLElement>;               // for elementFromPoint lookup
}
```

Column components register their root DOM elements with the board on mount. The card's `pointermove` handler uses `elementFromPoint` to find the column element, looks up the column ID from the registered map, and calls `setDropTarget` to update the target column's `dropIndex`.

## Dependencies

### External
- **None added.** No new npm packages. The implementation uses only browser-native APIs (HTML5 Drag and Drop, Pointer Events, `setPointerCapture`, `elementFromPoint`) and built-in Svelte features.

### Internal (existing, consumed)
- `moveCard(todoId, targetColumnId, targetIndex)` from `$lib/stores/kanban.ts` -- sole mutation function for all drag modes
- `kanbanBoard` derived store from `$lib/stores/kanban.ts` -- provides `ResolvedColumn[]` for rendering
- `Todo` type from `$lib/stores/todos.ts` -- card data shape
- `ResolvedColumn` type from `$lib/stores/kanban.ts` -- column data shape with resolved `Todo` objects

### Svelte Features Used
- `animate:flip` from `svelte/animate` -- card position animations in keyed `{#each}` blocks
- `setContext` / `getContext` from `svelte` -- keyboard drag state and touch coordination shared across board, columns, and cards
- `$state` from Svelte 5 runes -- reactive local and context state

### Browser APIs
- `DragEvent` / `dataTransfer` -- existing HTML5 DnD (already in use)
- `PointerEvent` / `setPointerCapture` / `releasePointerCapture` -- touch drag layer
- `document.elementFromPoint(x, y)` -- touch target detection
- `Element.getBoundingClientRect()` -- midpoint calculation for drop index (already in use)

## Risks & Mitigations

### 1. Touch drag conflicts with page scrolling
**Risk**: Calling `event.preventDefault()` on `pointermove` during touch drag suppresses scrolling, but if the long-press detection fails or is too sensitive, users may be unable to scroll the board.
**Mitigation**: The 200ms long-press threshold with a 10px movement dead zone ensures scrolling gestures (immediate movement) are never captured. Only stationary holds activate drag. If the hold is cancelled by movement, pointer events proceed normally and scrolling works. Additionally, `setPointerCapture` is only called after the long-press timer fires, so premature captures are impossible.

### 2. Same-column off-by-one regression
**Risk**: The decrement logic (`if sourceColumnId === column.id && dropIndex > sourceCardIndex, dropIndex--`) could produce incorrect results if the drop index calculation changes.
**Mitigation**: Write targeted unit tests for `dropIndex` correction: test dragging card 0 to position 2 in a 3-card column, dragging card 2 to position 0, dragging card 1 to position 1 (no-op), and dragging to the same position. Tests exercise the boundary conditions directly.

### 3. `animate:flip` interfering with drag operations
**Risk**: FLIP animations run when the DOM updates after `moveCard`. If a new drag starts while a FLIP animation is in progress, the animating card's `getBoundingClientRect()` returns an intermediate position, causing incorrect `dropIndex` calculations.
**Mitigation**: Use a short animation duration (200ms) to minimize the window. The `dropIndex` calculation in `handleDragOver` reads positions from DOM elements that have already settled at their final layout position -- CSS transforms from FLIP do not affect `getBoundingClientRect()` layout values, only visual position. If issues arise, add `will-change: transform` to animated cards so the browser separates their rendering layer.

### 4. Keyboard drag context stale state
**Risk**: If a user picks up a card via keyboard and then the underlying store changes (e.g., another user or sync event modifies the board), the context's `originalColumnId` and `originalIndex` may point to an invalid position, causing cancel/revert to produce incorrect results.
**Mitigation**: On cancel, validate that `originalColumnId` still exists and `originalIndex` is within bounds. Clamp `originalIndex` to `column.cards.length`. If the column no longer exists, drop the card in the first column at index 0. This is a defensive fallback for an unlikely scenario in a local-only app.

### 5. `elementFromPoint` returning null during touch drag
**Risk**: When the user's finger moves outside the board area or over a gap between columns, `elementFromPoint` returns an element that is not a column, or returns null.
**Mitigation**: Walk up the DOM tree from the returned element using `closest('[role="list"]')` to find the nearest column container. If no column is found, call `clearDropTarget()` to hide the indicator. The previous valid `dropIndex` is not persisted -- the indicator simply disappears until the finger re-enters a column.

### 6. Accessibility announcements overwhelming screen readers
**Risk**: Rapid Arrow key presses during keyboard reorder produce a burst of ARIA live region updates, which screen readers may queue or skip unpredictably.
**Mitigation**: Debounce the `announce()` function with a 150ms delay. Only the most recent announcement within the window is spoken. This matches the approach used by established accessible drag-and-drop implementations (e.g., react-beautiful-dnd, which debounces at 200ms).
