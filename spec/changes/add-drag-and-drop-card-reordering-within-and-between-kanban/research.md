# Research: add-drag-and-drop-card-reordering-within-and-between-kanban

## Decision: Pointer Events API with HTML5 DnD fallback, CSS transitions, Svelte context for keyboard state, DOM element drop indicators

### Approaches Considered

#### 1. Mouse/Touch Unification Strategy

1. **Pointer Events API as primary, HTML5 DnD retained for desktop** (selected) — Pointer Events (`pointerdown`, `pointermove`, `pointerup`) natively unify mouse and touch input with a single code path. We keep the existing HTML5 DnD handlers in `KanbanCard.svelte` (`ondragstart`, `ondragend`) and `KanbanColumn.svelte` (`ondragover`, `ondragenter`, `ondragleave`, `ondrop`) for desktop mouse users because they already work and provide native drag images. We add a parallel Pointer Events layer that activates only on touch (`pointerType === 'touch'`). The touch path uses a long-press timer (200ms) to distinguish drag from scroll, calls `setPointerCapture()` to lock input, and manually computes `dropIndex` via the same clientY-vs-midpoint logic already in `handleDragOver`. Both paths converge on the existing `moveCard(todoId, targetColumnId, targetIndex)` call.

2. **Replace HTML5 DnD entirely with Pointer Events for all input types** — This would simplify to one code path, but we lose native drag image rendering on desktop (we would need to manually create and position a drag preview element, adding complexity). The existing HTML5 DnD in `KanbanColumn.svelte` lines 46-85 works correctly for mouse; replacing it introduces regression risk for zero gain on desktop.

3. **Touch Events (`touchstart`/`touchmove`/`touchend`) alongside HTML5 DnD** — Touch Events are older and lack `setPointerCapture`, requiring manual touch tracking. Pointer Events are supported in all modern browsers and are the W3C successor to Touch Events. No reason to use the older API.

#### 2. Card Animation Strategy

1. **CSS transitions on card elements** (selected) — Apply `transition: transform 200ms ease, opacity 200ms ease` to `.kanban-card` elements. When the store updates after a drop and Svelte re-renders the `{#each}` block, cards naturally reflow. CSS transitions on `transform` are GPU-accelerated and do not block the main thread, so rapid consecutive reorders work without interruption. This is simpler than Svelte transitions for position-based animation because Svelte's `animate:flip` directive handles exactly this case within keyed `{#each}` blocks.

2. **Svelte `animate:flip` directive** — Svelte's built-in `animate:flip` on the `{#each column.cards as todo (todo.id)}` block in `KanbanColumn.svelte` line 133 would automatically animate positional changes using FLIP (First, Last, Invert, Play). This is actually the strongest approach for animating reorder within a keyed each block. After further analysis, this is the recommended sub-approach within the CSS transitions category: use `animate:flip={{ duration: 200 }}` on the card wrapper. It handles the transform calculation automatically and is non-blocking.

3. **Svelte `transition:` directives (fly, slide)** — These are designed for enter/leave transitions, not positional reordering. Using `in:fly`/`out:fly` would animate cards appearing and disappearing, not sliding between positions. Wrong tool for this job.

**Revised selection: `animate:flip` on the keyed each block.** This is the idiomatic Svelte approach and requires the least custom code. The `{#each column.cards as todo (todo.id)}` in `KanbanColumn.svelte` already uses a keyed block, so adding `animate:flip` is a one-line change per card element.

#### 3. Keyboard DnD State Management

1. **Svelte context via `setContext`/`getContext` in KanbanBoard** (selected) — `KanbanBoard.svelte` sets a shared context object containing `{ pickedUpCardId, originalColumnId, originalIndex, currentColumnId, currentIndex }`. `KanbanCard.svelte` reads the context to know if it is the picked-up card. `KanbanColumn.svelte` reads it to render the drop indicator during keyboard moves. Context is the right scope: it is per-component-tree (the board and its children), not global. It avoids polluting the `kanban.ts` store with transient UI state that has no business being persisted to localStorage.

2. **Svelte writable store in `kanban.ts`** — Adding a `keyboardDragState` writable store would work but mixes transient interaction state with persistent data state. The `kanbanState` store subscribes to localStorage writes; a keyboard drag store would need to be kept separate or the subscription logic would need filtering. Muddies the store's single responsibility.

3. **DOM event-based (custom events bubbling up)** — `KanbanCard` dispatches `card-pickup`, `card-move`, `card-drop` custom events. `KanbanBoard` listens and coordinates. This works but is verbose, harder to type in TypeScript, and requires manual event wiring. Context is cleaner in Svelte 5's runes model.

#### 4. Drop Indicator Implementation

1. **Actual DOM element conditionally rendered in the each block** (selected) — In `KanbanColumn.svelte`, render a `<div class="drop-indicator">` element inside the card list at the `dropIndex` position. This is done by splitting the `{#each}` rendering: iterate over cards and conditionally insert the indicator element before the card at `dropIndex`. The indicator is a 2px-tall colored bar with horizontal padding matching the card margins. Using a real DOM element means it participates in normal document flow, pushing cards apart naturally and giving accurate visual feedback of exactly where the card will land.

2. **CSS pseudo-element (`::before`/`::after`) on the card at `dropIndex`** — Apply a class to the card at the drop position and use `::before` to render a line. This is lighter (no extra DOM node) but has drawbacks: the pseudo-element cannot be easily animated independently, it does not push cards apart (it overlaps), and targeting the correct card requires passing `dropIndex` down to each `KanbanCard` and comparing. More coupling, worse visual result.

3. **CSS border or box-shadow on adjacent cards** — Apply a thick top-border to the card at `dropIndex`. Even simpler, but causes layout shift (border changes element size) unless using `outline` which cannot be limited to one side. Box-shadow does not push content apart. Both feel like hacks.

### Rationale

The selected combination optimizes for:

- **Minimal disruption to existing code**: The HTML5 DnD handlers in `KanbanColumn.svelte` (lines 46-85) and `KanbanCard.svelte` (lines 8-17) stay intact. Touch support layers alongside them rather than replacing them.
- **Store contract preservation**: All paths call `moveCard(todoId, targetColumnId, targetIndex)` from `kanban.ts` line 219. No store changes needed.
- **Idiomatic Svelte**: `animate:flip` for card animations, `setContext`/`getContext` for keyboard drag state, conditional rendering for the drop indicator -- all standard Svelte patterns.
- **Accessibility**: The keyboard implementation uses context to track the picked-up card across components, allowing `KanbanBoard` to handle Arrow Left/Right (cross-column movement) while individual cards handle Arrow Up/Down (within-column). ARIA live regions are added as a `<div aria-live="polite">` in `KanbanBoard.svelte`.
- **Off-by-one fix**: The same-column reorder correction (decrement `dropIndex` when dragging below the original position) is applied in `handleDrop` in `KanbanColumn.svelte` before calling `moveCard`. The source card's `todoId` is already in `dataTransfer`; we additionally store the source column ID so the drop handler can detect same-column drags and adjust.

### Key Implementation Details

**Drop indicator positioning**: The current `handleDragOver` in `KanbanColumn.svelte` (lines 46-65) already computes `dropIndex` by iterating `[role="listitem"]` elements and comparing `event.clientY` to each card's vertical midpoint. This logic is reused as-is. The `dropIndex` state variable (line 11) drives conditional rendering of the indicator element in the template.

**Same-column off-by-one fix**: In `handleDrop`, after reading `todoId` from `dataTransfer`, look up which column currently contains that card. If `sourceColumnId === column.id` and `dropIndex > sourceCardIndex`, decrement `dropIndex` by 1 before calling `moveCard`. This accounts for the dragged card being removed from the array before insertion.

**Touch long-press**: On `pointerdown` with `pointerType === 'touch'`, start a 200ms timer. If `pointermove` exceeds 10px displacement before the timer fires, cancel (it is a scroll). If the timer fires, call `setPointerCapture(pointerId)` and `event.preventDefault()` on subsequent moves to suppress scrolling. Use `elementFromPoint(clientX, clientY)` on each `pointermove` to determine which column is under the touch point and compute `dropIndex`.

**Keyboard flow**: `KanbanCard.svelte` handles `keydown` on Enter/Space to toggle picked-up state. While picked up, Arrow Up/Down calls `moveCard` immediately (optimistic, same as mouse DnD). Arrow Left/Right are handled by `KanbanBoard.svelte` via context, moving the card to the adjacent column. Escape reverts by calling `moveCard` with the stored original position. The context stores `{ cardId, cardText, originalColumnId, originalIndex }` so cancellation can restore state.

### Artifacts Produced

No separate contract, schema, or diagram files are needed. This is a UI-only change touching three Svelte components (`KanbanCard.svelte`, `KanbanColumn.svelte`, `KanbanBoard.svelte`) with no store API changes and no new data models. All implementation details are captured in this research document and the existing spec.
