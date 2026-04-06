# API Contract: BroadcastSync Module

**File:** `src/lib/sync/broadcastSync.ts`  
**Channel name:** `"metta-todo-sync"`

---

## Message Types

All messages sent over BroadcastChannel conform to a discriminated union:

```ts
type SyncMessage =
  | { type: 'todos-updated'; payload: Todo[] }
  | { type: 'kanban-updated'; payload: KanbanState }
  | { type: 'presence-heartbeat'; payload: HeartbeatPayload };

interface HeartbeatPayload {
  id: string;
  name: string;
  color: string;
  lastSeen: number; // Unix epoch ms — set by sender to Date.now()
}
```

Unknown `type` values MUST be silently ignored.

---

## Exports

### `broadcastTodos(todos: Todo[]): void`

Posts a `todos-updated` message with the full `Todo[]` payload. Calling this does NOT update the local store; it is the caller's responsibility to have already committed the mutation to the local store before broadcasting.

### `broadcastKanban(state: KanbanState): void`

Posts a `kanban-updated` message with the full `KanbanState` payload. Same single-direction contract as above.

### `broadcastHeartbeat(collaborator: { id: string; name: string; color: string }): void`

Posts a `presence-heartbeat` message with `lastSeen` set to `Date.now()`. Called internally by `collaborators.ts` — not intended for direct use from store mutation functions.

### `listenForRemoteUpdates(onTodos: (t: Todo[]) => void, onKanban: (s: KanbanState) => void, onHeartbeat: (p: HeartbeatPayload) => void): () => void`

Attaches a `message` listener on the shared channel. Each incoming message is routed to the appropriate callback by `type`. Returns an unsubscribe function that removes the listener; callers MUST invoke it on teardown.

**Echo-loop prevention:** The BroadcastChannel API does not deliver messages to the originating tab on the same page context. This is a browser guarantee for same-tab BroadcastChannel instances. No additional deduplication guard is required, but the implementation MUST use a single shared channel instance (module-level singleton) so that the sender and listener share the same object reference.

---

## Invariants

- The channel instance is created once at module initialization and reused. It is closed only when `destroyPresence()` is called from `collaborators.ts`.
- `broadcastTodos` and `broadcastKanban` MUST NOT be called from within a `listenForRemoteUpdates` callback (to preserve the no-echo guarantee).
- The `payload` field on each message is the serialized final state, not a delta. Receivers apply it wholesale via `store.set(payload)` — no merge logic.

---

## Error Handling

- If `BroadcastChannel` is unavailable (SSR, older Safari pre-15.4), all functions degrade gracefully: `broadcast*` functions are no-ops, `listenForRemoteUpdates` returns a no-op unsubscribe. The store continues to function as a single-tab app.
- `JSON.stringify` / `JSON.parse` errors are caught and logged; the offending message is dropped.
