# Design: add-board-templates-with-preset-columns-and-sample-cards-for

## Approach

Extend `kanban.ts` inline with all template data and logic. The existing file already owns `DEFAULT_COLUMNS`, `KanbanState`, and every board mutation function — template support is a natural extension of that ownership boundary, not a reason to introduce a new module. A new `BoardTemplateSelector.svelte` component handles the UI as a modal overlay, keeping selection UI cleanly separated from the board layout without adding a new store dependency chain.

The critical constraint driving the implementation is atomicity. The `todos` store subscription fires `syncWithTodos` on every `todos.update` call. If sample cards were added one at a time via `addTodo`, each iteration would trigger `syncWithTodos`, which would slot freshly created IDs into the first column before subsequent columns are ready, breaking the intended column-to-card assignment. The solution is to build the full next `KanbanState` in memory — with new column IDs and pre-assigned `cardIds` — then call `kanbanState.set(newState)` once and `todos.update` once. After `todos.update` completes, `syncWithTodos` fires but finds zero new IDs and zero orphans, making it a no-op.

Dismissal state is tracked in a component-local boolean in `KanbanBoard.svelte`, never persisted to `localStorage`. This satisfies the spec requirement that a page reload of a pristine board re-shows the selector.

The "Change template" confirmation uses `window.confirm` so no additional dialog component is needed. Confirmation state lives entirely in `KanbanBoard.svelte` and is never passed into `BoardTemplateSelector`.

## Components

**`src/lib/stores/kanban.ts` (modified)**

Gains three new exports alongside the existing mutation functions:

- `BOARD_TEMPLATES` — readonly constant mapping template name to column definitions and sample card titles. Authoritative configuration for all three presets.
- `isBoardPristine(): boolean` — synchronous read of `kanbanState` via `get()`. Returns `true` only when the board holds exactly the three default column IDs in order with all `cardIds` empty. Used on mount and after any board mutation to gate auto-display of the selector.
- `applyTemplate(templateName: string): void` — validates the name, builds the full replacement `KanbanState` in memory with `crypto.randomUUID()` column IDs, constructs `Todo` objects inline (same field shape as `addTodo` produces, no `snapshot()` call), sets both stores in a single pass. Throws on unknown template name without touching any store.

No changes to `KanbanColumn`, `KanbanState`, `Todo`, `ResolvedColumn`, `syncWithTodos`, or any existing mutation function. The existing subscription-based localStorage persistence for `kanbanState` and `todos` handles durability automatically after each atomic set.

**`src/lib/components/BoardTemplateSelector.svelte` (new)**

A fixed-position modal overlay. Renders three template cards, each showing:

- Template name as a heading
- Short description of the workflow it targets
- Ordered list of column titles the template provides

Exposes a `select` event carrying the chosen template name and a `dismiss` event carrying no payload. Does not import `applyTemplate` directly — the parent handles the store call so this component has no store dependency of its own, keeping it fully testable in isolation.

Includes a "Skip" button and backdrop click handler that fire `dismiss`. Escape key support closes the modal without selecting. ARIA role `dialog` with `aria-modal="true"` and a visible focus trap on open.

**`src/lib/components/KanbanBoard.svelte` (modified)**

Gains two component-local state booleans: `showTemplateSelector` and `selectorDismissed`.

On mount, a `$effect` calls `isBoardPristine()`. If it returns `true` and `selectorDismissed` is `false`, `showTemplateSelector` is set to `true`. This effect does not re-run reactively on store changes after mount — pristine detection on mount is sufficient for the auto-show path.

The board header gains a "Change template" button rendered unconditionally whenever the kanban view is active. Clicking it calls `window.confirm` with the destructive-action warning. On confirmation, `selectorDismissed` is reset to `false` and `showTemplateSelector` is set to `true`. On cancellation, nothing changes.

When `BoardTemplateSelector` fires `select`, `KanbanBoard` calls `applyTemplate(name)` and sets `showTemplateSelector = false`. When it fires `dismiss`, `KanbanBoard` sets `showTemplateSelector = false` and `selectorDismissed = true`.

All existing functionality — column management, card drag-and-drop, keyboard navigation, dark mode, view switching — is unaffected. The modal overlay renders conditionally after the board DOM so it does not interfere with the column layout.

## Data Model

No new persistent interfaces. All new types are internal to `kanban.ts` and do not touch `localStorage` beyond the existing `KanbanState` and `Todo` persistence.

```typescript
interface BoardTemplate {
  name: string;
  description: string;
  columns: Array<{ title: string; sampleCards: string[] }>;
}

const BOARD_TEMPLATES: Record<'kanban' | 'scrum' | 'personal', BoardTemplate>
```

The `BOARD_TEMPLATES` constant uses `as const` on the literal so column names and card titles are narrowed to string literals, enabling exhaustive type checking on template name lookups without `any`.

Template definitions:

- **kanban**: columns Backlog, To Do, In Progress, Review, Done. Sample cards include items like "Define acceptance criteria", "Implement feature", "Request peer review", "Update documentation", "Deploy to production".
- **scrum**: columns Sprint Backlog, In Progress, In Review, Testing, Done. Sample cards include "Refine user stories", "Write unit tests", "Deploy to staging", "Review pull request", "Conduct sprint retrospective".
- **personal**: columns Ideas, Today, This Week, Completed. Sample cards include "Read for 20 minutes", "Respond to emails", "Plan weekend", "Exercise", "Review weekly goals".

When `applyTemplate` runs, it constructs `Todo` objects with the same field shape that `addTodo` produces and that `loadTodos` normalizes on load:

```typescript
{
  id: crypto.randomUUID(),
  text: sampleCardTitle,
  description: '',
  completed: false,
  createdAt: now,
  priority: 'none',
  dueDate: null,
  labelIds: [],
  attachments: [],
  comments: [],
  archived: false,
  activityLog: [{ type: 'created', timestamp: now }]
}
```

This shape round-trips safely through `localStorage` and is normalized correctly by the existing `loadTodos` path on page reload.

## API Design

New exports from `src/lib/stores/kanban.ts`:

```typescript
export const BOARD_TEMPLATES: Record<'kanban' | 'scrum' | 'personal', BoardTemplate>;

export function isBoardPristine(): boolean;

export function applyTemplate(templateName: string): void;
```

`isBoardPristine` uses `get(kanbanState)` for a synchronous snapshot read. It performs an order-sensitive comparison against the three hardcoded default column IDs and requires all `cardIds` arrays to be empty. Returns a plain `boolean` — no derived store, no subscription.

`applyTemplate` execution sequence:

1. Validate `templateName` against `BOARD_TEMPLATES` keys. If not found, throw `new Error(`Unknown template: "${templateName}"`)` immediately, before touching any store.
2. Capture the current timestamp once (`const now = new Date().toISOString()`).
3. For each column definition in the chosen template, generate a UUID for the column and generate UUIDs for each sample card todo.
4. Construct the complete array of `Todo` objects.
5. Construct the complete `KanbanState` with the new columns and their pre-populated `cardIds`.
6. Call `todos.update(() => newTodos)` — replaces the entire todos array with only the template todos. Any prior todos referencing the old board are dropped here.
7. Call `kanbanState.set(newKanbanState)` — replaces columns atomically.

Steps 6 and 7 each trigger one localStorage write through their respective subscriptions. `syncWithTodos` fires after step 6 and is a no-op because every new todo ID is already assigned to a column in the state that step 7 will set — and after step 7 it fires again, finds zero new IDs and zero orphans, and returns state unchanged.

`BoardTemplateSelector` component events:

- `select` — `CustomEvent<{ name: string }>` dispatched when user confirms a template choice
- `dismiss` — `CustomEvent<void>` dispatched when user skips or closes the modal

The parent (`KanbanBoard.svelte`) owns the call to `applyTemplate`. `BoardTemplateSelector` has no direct store imports.

## Dependencies

**Internal dependencies:**

- `src/lib/stores/kanban.ts` imports from `src/lib/stores/todos.ts` (already present via the `todos` import). No new cross-module import edges are introduced.
- `src/lib/components/KanbanBoard.svelte` gains imports for `isBoardPristine`, `applyTemplate` from `$lib/stores/kanban.js` and `BoardTemplateSelector` from `$lib/components/BoardTemplateSelector.svelte`.
- `BoardTemplateSelector.svelte` imports only `BOARD_TEMPLATES` from `$lib/stores/kanban.js` to read template display data. It does not import `applyTemplate` or any writable store.

**External dependencies:**

- `crypto.randomUUID()` — available in Node.js >= 19 and all modern browsers. The project targets Node.js >= 22, so no polyfill is required. This is already used by `addTodo` and `addColumn`, so the runtime assumption is already established.
- `window.confirm` — used for the destructive-action confirmation on "Change template". This is a browser native API with no framework dependency. It is synchronous and requires no state management. The trade-off is that it cannot be styled consistently with the app's Tailwind design; however, it is sufficient for the spec requirement and eliminates a new dialog component. This is a deliberate simplicity choice consistent with the project's no-external-database, no-external-state-library stance.
- `svelte/store` `get` — already used in `KanbanBoard.svelte` and `kanban.ts`. `isBoardPristine` uses `get(kanbanState)` in the same pattern as `moveCard` already does.

No new npm packages are required. No vendor lock-in is introduced.

## Risks & Mitigations

**Risk: `syncWithTodos` fires between the `todos.update` and `kanbanState.set` calls in `applyTemplate`, producing a state where new todo IDs are not yet in any column.**

Mitigation: Svelte store subscriptions are synchronous. `todos.update` triggers `syncWithTodos` synchronously before the call returns. At that moment, `kanbanState` still holds the old state (pre-`set`). `syncWithTodos` will find the new todo IDs absent from any column and attempt to slot them into column index 0. This would produce a transient dirty state in `kanbanState` before the subsequent `kanbanState.set` call corrects it.

To avoid this, the order of operations is inverted: call `kanbanState.set(newKanbanState)` first (step 7 before step 6 in the sequence above), then call `todos.update`. After `kanbanState.set`, the new columns with pre-populated `cardIds` are live. When `todos.update` fires `syncWithTodos`, it finds every new todo ID already present in `kanbanState.cardIds` and returns the state unchanged. This ordering eliminates the transient orphan window entirely.

**Risk: Applying a template overwrites localStorage including any user-created cards not yet backed up elsewhere.**

Mitigation: The "Change template" action requires `window.confirm` with an explicit warning that all columns and cards will be permanently replaced. The auto-show path (pristine board on mount) does not require confirmation because a pristine board has zero user-created content to lose. The spec marks custom template saving and undo as out of scope, so no rollback mechanism is provided beyond the confirmation gate.

**Risk: `isBoardPristine` returns `true` for a board loaded from localStorage that happens to match the default shape but was intentionally set up by the user (e.g., user deleted all cards and the board returned to default column IDs).**

Mitigation: This is an acceptable edge case as specified. The spec requires that a page reload with a pristine board shows the selector again — the user can dismiss it without applying a template in one click. The selector does not apply any template on dismiss, so the user's board state is preserved.

**Risk: `BoardTemplateSelector` displaying stale template data if `BOARD_TEMPLATES` is updated in a future change.**

Mitigation: `BoardTemplateSelector` imports `BOARD_TEMPLATES` directly from the store module. It derives all display data (names, column lists, descriptions) from the constant at render time, so there is no duplication. Any update to `BOARD_TEMPLATES` is immediately reflected without changes to the component.

**Risk: Focus management in the modal does not trap focus, causing keyboard users to tab outside the overlay while it is open.**

Mitigation: `BoardTemplateSelector` must implement a focus trap on mount using `$effect` to constrain Tab/Shift+Tab to focusable elements within the modal. Initial focus is set to the first template card or the "Skip" button on open. On close, focus is returned to the "Change template" button in the board header. This is a WCAG 2.1 requirement for modal dialogs and is captured here as a required implementation detail, not an optional enhancement.
