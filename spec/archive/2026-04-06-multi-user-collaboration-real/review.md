# Code Review: multi-user-collaboration-real

## Summary

The implementation correctly satisfies all 39 explicit spec scenarios. Broadcast sync, presence heartbeats, history isolation, actorId threading through mutation functions, and UI components are all well-structured. The main correctness concerns are: UI callsites that omit actorId (reducing avatar utility), duplicate BroadcastChannel listener registrations, avatar disappearance for offline-but-known actors, and missing inbound payload validation.

## Issues Found

### Critical (must fix)

(none -- all spec scenarios pass)

### Warnings (should fix)

- **src/lib/components/KanbanCard.svelte:232,241** -- `archiveTodo(todo.id)` and `unarchiveTodo(todo.id)` are called without passing the current user's `actorId`. The spec scenario "archiveTodo with actorId embeds it in the archived event" demonstrates that actorId should be threaded through. Similarly, all `moveCard` calls in KanbanCard.svelte (lines 100, 109, 197) and KanbanBoard.svelte (lines 89, 99, 58) omit `actorId`. This means actions performed via the UI will never produce activity events with actor attribution, making the last-actor avatar feature largely non-functional in practice. All UI callsites should pass `get(self).id` (or the reactive `$self.id`) as the actorId argument.

- **src/lib/components/KanbanCard.svelte:42-46** -- Avatar disappears when a remote collaborator goes offline. When the most recent `actorId` in `activityLog` belongs to a user evicted from `activeCollaborators` (90s expiry), `lastActorAvatar` returns `null` and no avatar renders. The actorId IS present in the event data; only the live presence lookup fails. Consider falling back to a derived-color avatar using `deriveColor(aid)` from collaborators.ts with placeholder initials, rather than returning null.

- **src/lib/stores/collaborators.ts:95-118 + src/routes/+page.svelte:59-63** -- Two separate `listenForRemoteUpdates` registrations exist: one in `collaborators.ts` (called at module load via `initPresence()` on line 122) and one in `+page.svelte` (called in `onMount` on line 59). Both attach `message` handlers to the same `BroadcastChannel` instance. Every incoming message dispatches to both handlers. This is functionally correct because each handler uses no-ops for unneeded types, but it doubles dispatch overhead and creates a maintenance trap -- if a future developer adds real logic to the collaborators listener's `onTodos` no-op, state would be applied twice. Consider registering a single listener in `+page.svelte` that forwards heartbeats to a collaborators handler function.

- **src/lib/sync/broadcastSync.ts:68** -- `event.data as SyncMessage` is an unsafe type assertion. The guard on line 69 only checks `typeof msg.type !== 'string'`, but `msg.payload` is never validated. A malformed payload like `{ type: "todos-updated", payload: "not-an-array" }` would be passed to `todos.set()`, corrupting the store. Add minimal checks: `Array.isArray(msg.payload)` for todos-updated and `msg.payload?.columns` for kanban-updated.

- **src/lib/stores/collaborators.ts:122** -- `initPresence()` runs as a module-level side effect, starting 30s heartbeat and 10s expiry intervals on import. During HMR in development, if the module is re-evaluated, old intervals from the previous instance leak (since `destroyPresence()` is only called on component unmount, not module re-evaluation). This can cause multiple heartbeat intervals accumulating.

### Suggestions (nice to have)

- **src/lib/stores/collaborators.ts:76-79** -- In `sendHeartbeat`, `get(self)` captures `s` before `self.update(...)` runs. The broadcast uses the pre-update `s`. Since `broadcastHeartbeat` independently sets `lastSeen: Date.now()` (broadcastSync.ts:51), the wire payload is correct, but local `self.lastSeen` and broadcast `lastSeen` differ by microseconds. Minor inconsistency that could be tidied by capturing `s` after the update.

- **src/routes/+page.svelte:117** -- When the name editor opens, the input is not auto-focused. The user must click the input field to start typing. Adding `bind:this` + `tick().then(() => el.focus())` would improve usability.

- **src/lib/stores/kanban.ts:218-258** -- `applyTemplate` does not call `snapshot()` before replacing state, so applying a board template cannot be undone. The spec does not require this, but it may surprise users.

- **src/lib/stores/todos.ts:226,330,348,359,384,408** -- `removeTodo`, `editComment`, `deleteComment`, `addReply`, `editReply`, `deleteReply` all accept `actorId?: string` but never use it (they do not produce activity events). The spec permits this, but unused parameters are misleading. Either remove them or add comments noting they exist for API uniformity.

- **src/routes/+page.svelte:60** -- Remote payloads applied via `todos.set(t)` bypass snapshot/undo by construction. This is correct but fragile -- if someone later changes it to call a mutation function, history isolation breaks. A comment documenting this design invariant would prevent regressions.

- **src/lib/stores/collaborators.ts:18-24** -- The `deriveColor` hash function (`hash * 31 + charCodeAt`) may produce clustered results for UUID inputs since UUIDs have predictable hex-and-dash character distributions. Using a portion of the UUID parsed as a hex integer would give better palette distribution.

## Spec Compliance Check

| Requirement / Scenario | Status |
|---|---|
| broadcast_sync_module: add card in tab A, tab B receives | PASS |
| broadcast_sync_module: no echo back | PASS |
| broadcast_sync_module: received payload replaces wholesale | PASS |
| broadcast_sync_module: unsupported type ignored | PASS |
| collaborator_identity_store: UUID gen and persist | PASS |
| collaborator_identity_store: returning user reuses UUID | PASS |
| collaborator_identity_store: deterministic color stable | PASS |
| collaborator_identity_store: name defaults Anonymous | PASS |
| collaborator_identity_store: name update persists | PASS |
| presence_heartbeat: initial heartbeat | PASS |
| presence_heartbeat: 30s heartbeat refresh | PASS |
| presence_heartbeat: 90s expiry with 10s poll | PASS |
| presence_heartbeat: self not in activeCollaborators | PASS |
| todos_mutation_actor_id: addTodo with actorId | PASS |
| todos_mutation_actor_id: toggleTodo with actorId | PASS |
| todos_mutation_actor_id: moveCard with actorId | PASS |
| todos_mutation_actor_id: existing callers without actorId | PASS |
| todos_mutation_actor_id: archiveTodo with actorId | PASS |
| kanban_mutations_broadcast: renameColumn | PASS |
| kanban_mutations_broadcast: addColumn | PASS |
| kanban_mutations_broadcast: deleteColumn | PASS |
| kanban_mutations_broadcast: moveCard broadcasts both | PASS |
| history_remote_bypass: remote does not pollute undo | PASS |
| history_remote_bypass: undo reverts local only | PASS |
| history_remote_bypass: redo unaffected by remote | PASS |
| first_visit_name_prompt: appears on first load | PASS |
| first_visit_name_prompt: not shown when name stored | PASS |
| first_visit_name_prompt: submit closes and persists | PASS |
| first_visit_name_prompt: dismiss sets Anonymous | PASS |
| first_visit_name_prompt: empty submission rejected | PASS |
| editable_name_in_header: control visible | PASS |
| editable_name_in_header: prefilled with current name | PASS |
| editable_name_in_header: submit updates store + localStorage | PASS |
| editable_name_in_header: empty rejected | PASS |
| kanban_card_last_actor_avatar: active collaborator | PASS |
| kanban_card_last_actor_avatar: self shows avatar | PASS |
| kanban_card_last_actor_avatar: no actorId no avatar | PASS |
| kanban_card_last_actor_avatar: multi-word initials | PASS |
| kanban_card_last_actor_avatar: single-word initials | PASS |
| kanban_board_who_is_here: self when alone | PASS |
| kanban_board_who_is_here: remote collaborators | PASS |
| kanban_board_who_is_here: evicted removed | PASS |
| kanban_board_who_is_here: accessible labels | PASS |

## Verdict
PASS_WITH_WARNINGS

All 39 explicit spec scenarios are correctly implemented at the function/module level. The most impactful warning is the missing actorId propagation from UI callsites -- while the mutation functions correctly accept and embed actorId (satisfying the spec), no UI code actually passes it, rendering the last-actor avatar feature effectively dormant in real usage. The duplicate listener registration and missing payload validation should also be addressed for robustness.
