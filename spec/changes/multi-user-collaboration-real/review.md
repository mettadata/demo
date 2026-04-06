# Code Review: multi-user-collaboration-real

## Summary
The multi-user collaboration implementation is well-structured and follows the spec closely. BroadcastChannel sync, presence heartbeats, actor attribution, and UI avatars are all implemented. The main concerns are missing test coverage for several explicit spec scenarios (presence expiry, moveCard actorId, heartbeat filtering), duplicated test boilerplate, dead/unused parameters, and a few accessibility gaps in Svelte components.

## Issues Found

### Critical (must fix)

- **src/lib/stores/collaborators.test.ts** -- Three explicit spec scenarios under "presence_heartbeat" have no corresponding test cases: (1) "stale collaborator is evicted after 90 seconds" -- no test advances fake timers past 90s and checks expiry; (2) "self is not added to activeCollaborators" -- no test that receiving a heartbeat with own `self.id` is filtered out; (3) "heartbeat on page load registers self in another tab" -- no test that `broadcastHeartbeat` is called during module initialization. The test file already uses `vi.useFakeTimers()` but never exercises the heartbeat/expiry intervals.

- **No kanban.test.ts file exists** -- The spec scenario "moveCard with actorId embeds it in the moved event" (spec.md line 103) requires testing that `moveCard("t-1", "col-in-progress", 0, "user-3")` produces an `ActivityEvent` with `detail.actorId === "user-3"`. There is no test file for the kanban store and no test anywhere that covers this scenario.

### Warnings (should fix)

- **src/lib/stores/todos.ts:226** -- `removeTodo(id: string, actorId?: string)` accepts `actorId` but never references it. The parameter is pure dead code. The function body on line 228 only filters by `id`. The spec says functions without activity events MAY accept actorId, but an unused parameter is misleading. Either remove it or add a comment explaining it is accepted for API uniformity.

- **src/lib/stores/collaborators.ts:95-118** -- `initPresence()` registers a second `listenForRemoteUpdates` listener with two no-op callbacks (`() => {}`) for onTodos and onKanban. The page already registers its own listener in `+page.svelte:59-63` that handles those message types. This means every incoming `todos-updated` and `kanban-updated` message is dispatched twice -- once to the real handler and once to a no-op. This is wasteful and creates a maintenance trap if someone later adds logic to the no-ops.

- **src/lib/sync/broadcastSync.ts:68** -- `event.data as SyncMessage` is an unsafe type assertion. The guard on line 69 only checks `typeof msg.type !== 'string'`, but `msg.payload` is never validated. A malformed payload (e.g., `{ type: "todos-updated", payload: "not-an-array" }`) would be passed directly to `onTodos`, which calls `todos.set()`, corrupting the store state.

- **src/lib/stores/collaborators.ts:77-79** -- Race condition in `sendHeartbeat()`: `get(self)` captures `s` with the old `lastSeen`, then `self.update()` sets a new `lastSeen`, then `broadcastHeartbeat` uses the stale `s` object. The broadcast itself calls `Date.now()` internally so the wire payload is correct, but the local `self.lastSeen` and the broadcast `lastSeen` will differ by microseconds. Minor inconsistency.

- **src/lib/stores/todos.test.ts** -- Missing test for `updateTodo` with `actorId`. The spec requires all mutation functions that append ActivityEvents to embed actorId when provided. `updateTodo` does append `edited` events (line 243) with actorId in the detail (line 243), but no test verifies this.

- **src/lib/components/KanbanBoard.svelte:156** -- The board container div suppresses `a11y_no_static_element_interactions` with a svelte-ignore comment rather than adding proper ARIA attributes. Since this div handles `onkeydown` for keyboard drag-and-drop of cards across columns, it should have `role="application"` or `role="group"` and a `tabindex` to be properly accessible.

- **src/lib/components/KanbanCard.svelte:261-278** -- Two separate div blocks suppress `a11y_click_events_have_key_events` and `a11y_no_static_element_interactions` warnings. These divs with `onclick` handlers should be `<button>` elements or have `role="button"` with `tabindex="0"` and an `onkeydown` handler for Enter/Space. The current implementation is not keyboard-accessible.

- **src/lib/stores/collaborators.ts:122** -- `initPresence()` is called as a module-level side effect, which means every test import triggers interval creation. This forces every test to call `destroyPresence()` in cleanup (visible in collaborators.test.ts). Consider making initialization explicit via an exported function called from `onMount`.

### Suggestions (nice to have)

- **src/lib/sync/broadcastSync.test.ts:7-26, collaborators.test.ts:6-26, todos.test.ts:14-32** -- All three test files duplicate a ~20-line `MockBroadcastChannel` class and a ~15-line localStorage mock. Extract these to a shared test utility (e.g., `src/lib/test-utils/mocks.ts`) to reduce duplication and ensure consistency.

- **src/lib/stores/todos.ts:330,348,359,384,408** -- `editComment`, `deleteComment`, `addReply`, `editReply`, `deleteReply` all accept `actorId?: string` but never use it (they do not produce activity events). Same situation as `removeTodo`. Consider adding an inline comment or removing the unused parameters.

- **src/lib/components/KanbanCard.svelte:3-4** -- `Todo` and `Priority` are imported on separate lines from the same module `$lib/stores/todos.js`. Combine into one import statement.

- **src/lib/components/KanbanCard.svelte:6-7** -- `moveCard` and `kanbanBoard` are imported on separate lines from `$lib/stores/kanban.js`. Combine into one import statement.

- **src/routes/+page.svelte:169** -- The first-visit name prompt has `aria-modal="false"` (correct for a non-blocking banner), but there is no auto-focus on the input when the prompt appears. The user must manually click or tab into the input field.

- **src/routes/+page.svelte:60** -- Remote payloads are applied via `todos.set(t)` which correctly bypasses the snapshot/undo mechanism. However this is fragile -- if someone later changes it to call a mutation function like `addTodo`, it would break the spec requirement "history_remote_bypass". A comment documenting this design decision would prevent regressions.

- **src/lib/stores/kanban.ts:4** -- `ActivityEvent` type is imported from `todos.ts` only for use inside `moveCard`. This creates tight coupling between the kanban and todos modules. The activity event construction could be delegated to a dedicated function in `todos.ts`.

## Verdict
PASS_WITH_WARNINGS

The implementation covers the spec requirements functionally, but missing test coverage for presence heartbeat/expiry scenarios and moveCard actorId attribution are significant gaps. The three presence spec scenarios without tests, the absent kanban store tests, and the accessibility suppressions should be addressed before this change is considered complete.
