# Design: multi-user-collaboration-real

## Approach

Add same-origin cross-tab collaboration to the existing SvelteKit/Svelte 5 todo app using the browser-native `BroadcastChannel` API as the sole transport. Two coordinated capabilities are introduced: state synchronization (any store mutation is immediately broadcast as a full-state snapshot to all other open tabs) and lightweight presence (each tab periodically announces itself, and tabs maintain a live roster of visible peers).

The design keeps all new code additive wherever possible. The existing mutation functions in `todos.ts` and `kanban.ts` receive only two modifications: an optional `actorId` parameter and explicit `broadcast*` calls at the end of each function body. No reactive subscriber hooks or decorators are introduced, which preserves the existing call graph and avoids the echo-loop risk that a subscribe-based broadcast would create (see research ADR: "Explicit broadcast calls vs. subscribe hook").

History isolation requires no special guard code. Because the `snapshot()` call lives inside mutation functions and remote payloads arrive via direct `todos.set()` calls inside the BroadcastChannel listener, the undo/redo stacks are structurally isolated from remote mutations by construction.

SSR safety is handled uniformly: every browser-dependent initialization block is guarded by `typeof window === 'undefined'` checks, following the pattern already established in `todos.ts` (`loadTodos`), `kanban.ts` (`loadKanbanState`), and `history.ts`. The `BroadcastChannel` constructor and `localStorage` accesses are only reached in the browser.

## Components

### New: `src/lib/sync/broadcastSync.ts`

Owns the single `BroadcastChannel` instance for the channel name `"metta-todo-sync"`. Exports three send functions (`broadcastTodos`, `broadcastKanban`, `broadcastHeartbeat`) and one listener setup function (`listenForRemoteUpdates`). The channel instance is created once at module load time and reused for all sends and receives. Because BroadcastChannel does not deliver a message back to the originating context, no deduplication guard is needed for the send functions, but callers must never invoke a broadcast function from within the `listenForRemoteUpdates` callbacks to maintain this invariant.

Graceful degradation: if `typeof window === 'undefined'` or the `BroadcastChannel` constructor throws (pre-15.4 Safari fallback), all exported functions become no-ops and the store operates as a single-tab app.

### New: `src/lib/stores/collaborators.ts`

Manages peer identity and presence. Initializes synchronously from `localStorage` on module import. Exports:

- `self: Writable<Collaborator>` — the current user's record, initialized once per browser profile.
- `activeCollaborators: Writable<Collaborator[]>` — live records for remote tabs.
- `updateSelfName(name: string): void` — validates, persists, and updates `self.name`.
- `destroyPresence(): void` — stops intervals, closes the channel; called on page teardown.

Internally owns two `setInterval` timers: one at 30 s to send heartbeats and one at 10 s to evict stale collaborators whose `lastSeen` is older than 90 s.

### Modified: `src/lib/stores/todos.ts`

Fifteen mutation functions each gain an optional `actorId?: string` trailing parameter. When `actorId` is provided and the function appends an `ActivityEvent`, that event's `detail` field is extended with `{ actorId }`. Each function that performs a store write calls `broadcastTodos(get(todos))` as its final statement. Existing callers continue to work without modification because the parameter is optional and `broadcastTodos` is a no-op when the channel is unavailable.

The `todos` store itself is unchanged. The `todos.subscribe` persistence handler is unchanged. `registerSnapshotFn` / `snapshot()` are unchanged. Remote writes arrive via `todos.set(payload)` from the `listenForRemoteUpdates` callback, bypassing all mutation functions and therefore never triggering `snapshot()`.

### Modified: `src/lib/stores/kanban.ts`

`addColumn`, `renameColumn`, `deleteColumn`, `applyTemplate`, `moveCard`, and `moveColumn` each call `broadcastKanban(get(kanbanState))` after their store write. `moveCard` additionally calls `broadcastTodos(get(todos))` because it also mutates the `todos` store when appending the `moved` activity event. `applyTemplate` calls both because it replaces both stores wholesale.

### Modified: `src/lib/components/KanbanCard.svelte`

Imports `self` and `activeCollaborators` from `collaborators.ts`. Adds a reactive derived variable `lastActorAvatar` that scans `todo.activityLog` for the entry with the maximum `timestamp` that has a non-empty `detail.actorId`. If found, it resolves to a `{ initials, color, name }` object by looking up the actorId in `activeCollaborators` or against `self.id`. If not found, `lastActorAvatar` is `null` and no avatar element is rendered.

The avatar is a `<span>` with Tailwind class `w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0`, inline `style="background-color: {color}"`, and `aria-label="{name}"`. It is placed inside the existing flex row at the top of the card alongside the status dot and card text.

### Modified: `src/lib/components/KanbanBoard.svelte`

Imports `self` and `activeCollaborators`. Adds a "who is here" pill row in the board header above the column list. The row renders one avatar for `self` (with a `ring-2 ring-white` border to distinguish it visually) followed by one avatar per entry in `activeCollaborators`. When `activeCollaborators` is empty the row still renders the single self avatar. Each avatar follows the same `<span>` pattern as `KanbanCard.svelte`.

### Modified: `src/routes/+page.svelte`

Imports `self`, `updateSelfName` from `collaborators.ts` and initializes the presence listener on `onMount` (also calling `destroyPresence` in the cleanup callback). Adds two pieces of local state:

- `showNamePrompt: boolean` — set to `true` when `localStorage.getItem('user-name')` is `null` at mount time.
- `showNameEditor: boolean` — controls the inline name-edit popover in the header.

The first-visit name prompt renders as a fixed-bottom dismissible banner containing a text input and a confirm button. Submitting a non-empty trimmed name calls `updateSelfName(name)` and sets `showNamePrompt = false`. Dismissing without a name calls `updateSelfName('Anonymous')` (which writes `'user-name': 'Anonymous'` to `localStorage`) and closes the banner, preventing re-prompt on reload.

The persistent header name-edit control is a pencil icon button adjacent to the existing header controls. Activating it opens an inline `<input>` pre-filled with `$self.name`. Submitting a non-empty name calls `updateSelfName(name)` and closes the editor.

## Data Model

### `Collaborator` interface

```ts
export interface Collaborator {
  id: string;       // crypto.randomUUID(), stored in localStorage "user-id"
  name: string;     // display name, stored in localStorage "user-name", default "Anonymous"
  color: string;    // deterministic hex color from 12-color AVATAR_PALETTE, e.g. "#e57373"
  lastSeen: number; // Unix epoch ms; self: set on each heartbeat send; remotes: from payload
}
```

### `SyncMessage` discriminated union

```ts
type SyncMessage =
  | { type: 'todos-updated';      payload: Todo[] }
  | { type: 'kanban-updated';     payload: KanbanState }
  | { type: 'presence-heartbeat'; payload: HeartbeatPayload };

interface HeartbeatPayload {
  id:       string;
  name:     string;
  color:    string;
  lastSeen: number;
}
```

Unknown `type` values are silently ignored in the listener.

### `ActivityEvent.detail` extension

The existing `detail?: Record<string, unknown>` field on `ActivityEvent` is extended in-band. When a mutation is performed with an `actorId`, the detail object includes `{ actorId: string }` alongside any pre-existing fields (e.g., `{ fromColumn, toColumn, actorId }` for a `moved` event). No schema migration is needed for existing records because the field is optional and the avatar render decision tree simply skips events without `detail.actorId`.

### `localStorage` keys

| Key | Written when | Value |
|---|---|---|
| `"user-id"` | First app load | `crypto.randomUUID()`, never overwritten |
| `"user-name"` | Name prompt dismiss or explicit name save | User-supplied string or `"Anonymous"` |
| `"todos"` | Unchanged — existing subscriber | Serialized `Todo[]` |
| `"kanban-state"` | Unchanged — existing subscriber | Serialized `KanbanState` |

### Color derivation

A multiplicative 32-bit hash of `id` modulo 12 selects from `AVATAR_PALETTE`. This is a pure synchronous function with no external dependencies. The same `id` always produces the same color across reloads and tabs (requirement: `collaborator_identity_store` scenario "deterministic color is stable across reloads").

### Avatar initials algorithm

1. Split `name` on whitespace into words.
2. If more than one word: first character of first word + first character of last word, uppercased.
3. If exactly one word: first two characters of that word, uppercased.
4. If name is empty: `"??"`.

## API Design

### `src/lib/sync/broadcastSync.ts` exports

```ts
export function broadcastTodos(todos: Todo[]): void;
export function broadcastKanban(state: KanbanState): void;
export function broadcastHeartbeat(c: { id: string; name: string; color: string }): void;
export function listenForRemoteUpdates(
  onTodos:     (t: Todo[])        => void,
  onKanban:    (s: KanbanState)   => void,
  onHeartbeat: (p: HeartbeatPayload) => void
): () => void; // returns unsubscribe
```

The listener is registered in `+page.svelte`'s `onMount` and torn down in the returned cleanup function. `collaborators.ts` calls `broadcastHeartbeat` internally; it is not exposed to mutation callers.

### `src/lib/stores/collaborators.ts` exports

```ts
export interface Collaborator { ... }      // see Data Model
export const self: Writable<Collaborator>;
export const activeCollaborators: Writable<Collaborator[]>;
export function updateSelfName(name: string): void;
export function destroyPresence(): void;
```

`collaborators.ts` calls `listenForRemoteUpdates` internally to handle `presence-heartbeat` messages. It does not re-export the sync module.

### Mutation function signature changes

`todos.ts` — representative examples showing the `actorId` addition:

```ts
export function addTodo(text: string, actorId?: string): void;
export function toggleTodo(id: string, actorId?: string): void;
export function removeTodo(id: string, actorId?: string): void;
export function updateTodo(id: string, fields: Partial<Pick<Todo, 'priority' | 'dueDate' | 'description' | 'labelIds'>>, actorId?: string): void;
export function archiveTodo(id: string, actorId?: string): void;
export function unarchiveTodo(id: string, actorId?: string): void;
export function addComment(todoId: string, body: string, actorId?: string): void;
export function editComment(todoId: string, commentId: string, body: string, actorId?: string): void;
export function deleteComment(todoId: string, commentId: string, actorId?: string): void;
export function addAttachment(todoId: string, attachment: Attachment, actorId?: string): boolean;
export function removeAttachment(todoId: string, attachmentId: string, actorId?: string): void;
export function addReply(todoId: string, commentId: string, body: string, actorId?: string): void;
export function editReply(todoId: string, commentId: string, replyId: string, body: string, actorId?: string): void;
export function deleteReply(todoId: string, commentId: string, replyId: string, actorId?: string): void;
```

`kanban.ts` — signatures unchanged externally; broadcast calls are added internally after each store write.

### Component prop changes

No new props are introduced. `KanbanCard.svelte` and `KanbanBoard.svelte` read `self` and `activeCollaborators` directly from the store, following the same pattern as the existing `$labels` and `$kanbanBoard` store subscriptions in those components.

### Presence wiring in `+page.svelte`

```ts
onMount(() => {
  const unsubscribe = listenForRemoteUpdates(
    (t) => todos.set(t),
    (s) => kanbanState.set(s),
    (p) => { /* handled inside collaborators.ts */ }
  );
  return () => {
    unsubscribe();
    destroyPresence();
  };
});
```

The `todos.set` and `kanbanState.set` calls bypass `snapshot()` because they are not going through any mutation function. This is the history isolation guarantee by construction (research ADR: "History isolation").

## Dependencies

### External dependencies — none added

No new npm packages are required. `BroadcastChannel` is a browser-native API available in Chrome 54+, Firefox 38+, and Safari 15.4+, covering the full target browser range stated in the spec. `crypto.randomUUID()` is also browser-native (available since Chrome 92, Firefox 95, Safari 15.4).

This design explicitly avoids creating vendor lock-in. No external real-time service (Firebase, Supabase, Liveblocks, Pusher) or CRDT library (Yjs, Automerge) is introduced. The entire collaboration layer runs in-browser and requires zero infrastructure.

### Internal dependencies

| New/modified file | Depends on |
|---|---|
| `src/lib/sync/broadcastSync.ts` | `src/lib/stores/todos.ts` (types: `Todo`), `src/lib/stores/kanban.ts` (types: `KanbanState`) |
| `src/lib/stores/collaborators.ts` | `src/lib/sync/broadcastSync.ts` (`broadcastHeartbeat`, `listenForRemoteUpdates`) |
| `src/lib/stores/todos.ts` (modified) | `src/lib/sync/broadcastSync.ts` (`broadcastTodos`) |
| `src/lib/stores/kanban.ts` (modified) | `src/lib/sync/broadcastSync.ts` (`broadcastKanban`, `broadcastTodos`) |
| `src/lib/components/KanbanCard.svelte` (modified) | `src/lib/stores/collaborators.ts` (`self`, `activeCollaborators`) |
| `src/lib/components/KanbanBoard.svelte` (modified) | `src/lib/stores/collaborators.ts` (`self`, `activeCollaborators`) |
| `src/routes/+page.svelte` (modified) | `src/lib/stores/collaborators.ts` (`self`, `updateSelfName`, `destroyPresence`), `src/lib/sync/broadcastSync.ts` (`listenForRemoteUpdates`), `src/lib/stores/todos.ts` (store ref for remote set), `src/lib/stores/kanban.ts` (store ref for remote set) |

The `broadcastSync.ts` module is the dependency hub. It imports only types from `todos.ts` and `kanban.ts` (no store references), keeping the module free of circular dependencies: `todos.ts` and `kanban.ts` import from `broadcastSync.ts`, but `broadcastSync.ts` does not import from either store module at runtime.

### Unchanged modules

`src/lib/stores/history.ts`, `src/lib/stores/labels.ts`, `src/lib/stores/theme.ts`, `src/lib/components/KanbanColumn.svelte`, and all other existing components are untouched.

## Risks & Mitigations

### R1: Background tab timer throttling causes missed heartbeats

Modern browsers (Chrome, Firefox) throttle `setInterval` in background tabs to a minimum of 1 second, not 30 seconds. At the 30 s cadence used here, background tab throttling does not prevent heartbeats from firing. The 3:1 ratio between heartbeat interval (30 s) and expiry threshold (90 s) means a tab must miss three consecutive heartbeats before being evicted. This tolerance is sufficient for normal background tab behavior. No mitigation beyond the ratio choice is needed.

### R2: `syncWithTodos` in `kanban.ts` fires on remote `todos.set` calls

`kanban.ts` subscribes to `todos` via `todos.subscribe(syncWithTodos)`. When a remote `"todos-updated"` payload arrives and `todos.set(payload)` is called, `syncWithTodos` will fire and may call `kanbanState.update(...)`. This `kanbanState.update` will then trigger the `kanbanState.subscribe` persistence handler but will NOT trigger another broadcast because the broadcast calls are inside named mutation functions, not inside `syncWithTodos`. The behavior is correct: `syncWithTodos` reconciles orphaned or new card IDs, which is desirable even for remote payloads. No mitigation needed, but this interaction should be explicitly tested.

### R3: Race condition between simultaneous mutations in two tabs

Last-write-wins semantics mean that two concurrent mutations (e.g., tab A moves card X while tab B moves card Y simultaneously) will leave both tabs in the state produced by whichever broadcast arrives last. With `BroadcastChannel`'s same-process delivery order guarantees, both tabs will converge to the same final state, but one of the two moves may be silently discarded. This is an accepted limitation explicitly documented in the spec's out-of-scope section ("Conflict resolution beyond last-write-wins"). No mitigation is in scope for this change. A future CRDT-based approach would address it.

### R4: `addAttachment` quota-exceeded revert path broadcasts stale state

`addAttachment` in `todos.ts` calls `todos.set(previousTodos)` to revert when localStorage quota is exceeded, then returns `false`. If the implementation adds a `broadcastTodos` call at the end of `addAttachment`, the broadcast fires with the updated state (before the revert check). The revert then restores `previousTodos` locally without re-broadcasting. Remote tabs would receive the quota-failed state with the attachment included but the originating tab would not persist it.

Mitigation: place the `broadcastTodos` call after the quota check, only when `addAttachment` returns `true`. Specifically, the broadcast must be conditional on the `err` check passing, not unconditional at function end.

### R5: SSR rendering of BroadcastChannel-dependent code

SvelteKit renders pages server-side during SSR. The `BroadcastChannel` constructor is not available in Node.js. All module-level initialization in `broadcastSync.ts` and `collaborators.ts` must be guarded with `typeof window === 'undefined'` checks. The existing codebase already follows this pattern (`loadTodos`, `loadKanbanState`). The `listenForRemoteUpdates` call in `+page.svelte` is placed inside `onMount`, which only runs in the browser, providing a natural SSR boundary for the listener registration.

### R6: Multiple calls to `listenForRemoteUpdates` leaking listeners

If `+page.svelte` mounts more than once (e.g., during Svelte hot-module replacement in development), the `onMount` cleanup function must reliably remove the listener. The design returns an unsubscribe callback from `listenForRemoteUpdates` which removes the `message` event listener. The `onMount` cleanup pattern in SvelteKit (`return () => unsubscribe()`) ensures this runs correctly on component teardown.

### R7: `collaborators.ts` channel vs. `broadcastSync.ts` channel instance sharing

The design uses a single shared `BroadcastChannel` instance in `broadcastSync.ts` for all message types (state sync and heartbeats). `collaborators.ts` calls into `broadcastSync.ts` rather than opening its own channel. This is intentional: the browser's no-self-echo guarantee applies per-context per-channel-name, and using one instance for all message types ensures both state and presence messages benefit from the same echo prevention. If `collaborators.ts` opened a separate channel with the same name, self-echo prevention would still apply but the code would be fragmented across two module-level singletons. The single instance in `broadcastSync.ts` is the correct ownership point.
