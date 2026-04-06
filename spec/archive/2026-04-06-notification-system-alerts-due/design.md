# Design: notification-system-alerts-due

## Approach

The notification system is built on three principles established by the existing codebase: plain Svelte writable stores with module-level mutation functions, fixed-position components mounted at the `+page.svelte` root, and all cross-tab communication through the single `metta-todo-sync` BroadcastChannel.

The system introduces four new modules (`notifications.ts`, `dueDateChecker.ts`, `mentionParser` exported from `todos.ts`, and `boardActivityDiff` as an internal function in `broadcastSync.ts`) and two new components (`Toaster.svelte`, `Toast.svelte`). Three existing files are modified: `broadcastSync.ts` gains the diff logic and two new `SyncMessage` variants; `todos.ts` gains `parseMentions` and post-write mention hooks in `addComment`/`addReply`; `+page.svelte` mounts `Toaster` and starts the due-date checker.

Notifications flow unidirectionally: trigger sources (`dueDateChecker`, `todos.ts`, `broadcastSync.ts`) call `push()` on the `notifications` store; the store appends to its queue and broadcasts to other tabs via BroadcastChannel; `Toaster.svelte` reactively renders one `Toast.svelte` per queue entry; each `Toast.svelte` manages its own auto-dismiss timer.

The one structural constraint to manage is the mutual import between `notifications.ts` and `broadcastSync.ts`. The resolution is directional: `broadcastSync.ts` imports `push` from `notifications.ts`, and `notifications.ts` imports the `channel` reference that `broadcastSync.ts` exports. Because both values are only accessed inside function bodies (never at module initialization time), the ESM circular reference is safe under Node16 module resolution. This is documented as an ADR below.

**ADR-001: Circular import between notifications.ts and broadcastSync.ts is safe at runtime.**
Both modules only reference the other's exports inside function bodies. `notifications.ts` reads `channel` only when `push` or `dismiss` is called; `broadcastSync.ts` reads `push` only when a BroadcastChannel message is handled. Neither is evaluated at module initialization time. If future refactoring makes this brittle, the mitigation is to extract `channel` into `src/lib/sync/channel.ts` as a shared singleton that both modules import independently, eliminating the cycle entirely.

**ADR-002: No new npm dependencies.**
Svelte's built-in `fly` transition handles slide-in/out. `crypto.randomUUID()` is a native browser API. The mention regex is a language primitive. This is consistent with the zero-external-dependency philosophy already applied to `src/lib/utils/markdown.ts`.

**ADR-003: Board activity notifications only fire in receiving tabs.**
`BroadcastChannel` does not deliver messages to the originating tab, so the `diffKanbanStates` call in the `kanban-updated` handler inherently runs only in tabs that did not initiate the mutation. No explicit "am I the sender?" guard is needed, and the spec scenario "current tab must not toast its own action" is satisfied for free.

## Components

### New files

**`src/lib/stores/notifications.ts`**
Owns the toast queue. Exports the `notifications` writable store (type `Writable<Notification[]>`) and the three mutation functions `push`, `dismiss`, and `clearAll`. Also registers a BroadcastChannel listener at module initialization (SSR-guarded) to handle incoming `notification-pushed` and `notification-dismissed` messages from other tabs. Imports `channel` from `broadcastSync.ts` to post outbound messages. The `_fromChannel` flag on `push` and `dismiss` prevents re-broadcasting received messages.

**`src/lib/notifications/dueDateChecker.ts`**
Stateless polling module. Exports only `startDueDateChecker(): () => void`. Holds a module-level `notifiedIds: Set<string>` that persists for the page session. Reads the `todos` store snapshot via `get(todos)` on each 60-second tick rather than subscribing reactively, ensuring the poll cadence is clock-driven, not mutation-driven. Mirrors the `initPresence` / `destroyPresence` lifecycle pattern from `collaborators.ts`.

**`src/lib/components/Toaster.svelte`**
Stateless container component. Reads `$notifications` directly. Renders a `role="status" aria-live="polite"` fixed-position wrapper at `bottom: 1.5rem; right: 1.5rem; z-index: 9999`. Displays one `Toast.svelte` per entry in `[...$notifications].reverse()` inside a keyed `{#each}` block. Mounted once at the `+page.svelte` root, parallel to `<LabelManager>` and `<ShortcutsHelpModal>`.

**`src/lib/components/Toast.svelte`**
Stateful per-toast component. Accepts `id`, `type`, `title`, `message` as props. Manages its own auto-dismiss timer using `setTimeout`/`clearTimeout` with pause-on-hover logic tracked via `remaining`, `startedAt`, and `timer` local state. Uses Svelte's `fly` transition (`in:fly="{{ x: 64, duration: 250 }}" out:fly="{{ x: 64, duration: 200 }}"`) for the slide-in/out animation. Renders a colored left-border accent, an `sr-only` combined text element for screen readers, visible title/message paragraphs with `aria-hidden="true"`, and a close button with `aria-label="Dismiss notification"`.

### Modified files

**`src/lib/sync/broadcastSync.ts`**
Three changes: (1) the `SyncMessage` union gains two new variants; (2) `channel` is exported so `notifications.ts` can import it; (3) the `kanban-updated` case in `listenForRemoteUpdates` is extended to snapshot the local `kanbanState` before calling `onKanban`, run `diffKanbanStates`, and call `push` for each detected change. Also adds the `notification-pushed` and `notification-dismissed` cases to the switch (these are handled inside `notifications.ts`'s own listener, so the cases in `broadcastSync.ts`'s switch can be `default`-fallthrough — but it is cleaner to add explicit no-op cases so new message types do not silently collide with the default branch).

**`src/lib/stores/todos.ts`**
Two changes: (1) exports the new pure function `parseMentions`; (2) `addComment` and `addReply` each gain a post-write mention detection block that calls `parseMentions`, checks for a self-match, and calls `push` at most once per invocation. `editComment` and `editReply` are not touched.

**`src/routes/+page.svelte`**
Three changes: (1) imports and mounts `<Toaster />`; (2) imports `startDueDateChecker` and calls it inside `onMount`, storing the cleanup function; (3) calls the cleanup function alongside the existing `unsubscribe()` and `destroyPresence()` in the `onMount` return cleanup. The `listenForRemoteUpdates` call in `+page.svelte` is also updated — its `onKanban` callback currently calls `kanbanState.set(s)` directly, but after the change `broadcastSync.ts` handles the diff internally, so the callback remains `(s) => kanbanState.set(s)` but the diff runs before the set inside `listenForRemoteUpdates` itself.

## Data Model

### Notification

```ts
export type NotificationType = 'overdue' | 'mention' | 'activity';

export interface Notification {
  id: string;          // crypto.randomUUID() — stable across tabs, used for cross-tab dismiss
  type: NotificationType;
  title: string;       // "Card Overdue" | "You were mentioned" | "Board Updated"
  message: string;     // human-readable body; max ~120 chars in practice
  createdAt: string;   // new Date().toISOString() at push time; used for eviction ordering
}
```

The `notifications` store holds `Notification[]` ordered ascending by `createdAt` (oldest at index 0). The array length is capped at 5: when a sixth item would be pushed, `queue[0]` (the oldest) is removed first.

### ActivityChange (internal to broadcastSync.ts)

```ts
type ActivityChange =
  | { kind: 'card-moved';     cardId: string; cardTitle: string; toColumnTitle: string }
  | { kind: 'column-added';   columnTitle: string }
  | { kind: 'column-renamed'; newTitle: string };
```

This type is not exported. It is only used inside `diffKanbanStates` and its caller in `listenForRemoteUpdates`.

### Type-to-accent mapping

| `type`     | Tailwind left-border class | Semantic meaning       |
|------------|---------------------------|------------------------|
| `overdue`  | `border-red-500`          | Time-critical alert    |
| `mention`  | `border-blue-500`         | Direct address         |
| `activity` | `border-yellow-400`       | Ambient board change   |

### SyncMessage extension

```ts
export type SyncMessage =
  | { type: 'todos-updated';           payload: Todo[] }
  | { type: 'kanban-updated';          payload: KanbanState }
  | { type: 'presence-heartbeat';      payload: HeartbeatPayload }
  | { type: 'notification-pushed';     payload: Notification }
  | { type: 'notification-dismissed';  payload: { id: string } };
```

The `id` in a `notification-dismissed` payload is the UUID generated by the originating tab's `push()` call. Because the same `id` is synced via `notification-pushed` to all other tabs, every tab can dismiss the same record by id.

### Known message strings

| Trigger        | `title`              | `message` format                                    |
|----------------|----------------------|-----------------------------------------------------|
| Overdue card   | `"Card Overdue"`     | `todo.text`                                         |
| Mention        | `"You were mentioned"` | `"Mentioned in <card text> by <commenter name>"` |
| Card moved     | `"Board Updated"`    | `"'<card title>' moved to <column title>"`          |
| Column added   | `"Board Updated"`    | `"New column '<title>' added"`                      |
| Column renamed | `"Board Updated"`    | `"Column renamed to '<title>'"`                     |

## API Design

### notifications.ts

```ts
// Store
export const notifications: Writable<Notification[]>;

// Push a new notification. Returns the generated id.
// _fromChannel = true suppresses the BroadcastChannel postMessage (anti-echo).
export function push(
  notification: Omit<Notification, 'id' | 'createdAt'>,
  _fromChannel?: boolean
): string;

// Remove a notification by id. No-op if id not found.
// _fromChannel = true suppresses the BroadcastChannel postMessage.
export function dismiss(id: string, _fromChannel?: boolean): void;

// Empty the store. Does not broadcast.
export function clearAll(): void;
```

Capacity rule: if `queue.length >= 5` when `push` is called, `queue[0]` is removed before appending the new record.

SSR guard: the BroadcastChannel listener setup is wrapped in `if (typeof window !== 'undefined')` so the module is safe to import during SvelteKit SSR.

### dueDateChecker.ts

```ts
// Starts the polling loop. Returns a cleanup function that calls clearInterval.
// First detection cycle runs synchronously before setInterval is registered.
export function startDueDateChecker(): () => void;
```

Internal state: `const notifiedIds = new Set<string>()` — module-level, never exported, lives for the page session.

Detection predicate per todo: `!todo.archived && !todo.completed && todo.dueDate !== null && todo.dueDate < today` where `today = new Date().toISOString().split('T')[0]`.

### todos.ts (new export)

```ts
// Pure function. Returns deduplicated lowercased collaborator names matched
// in body as @name tokens with whole-word boundary guards.
// Regex per name: /(?<!\w)@(escapedName)(?!\w)/gi
export function parseMentions(
  body: string,
  collaboratorNames: string[]
): string[];
```

Integration in `addComment` and `addReply` (pseudocode for the block added after the existing `broadcastTodos` call):

```ts
const allNames = [get(self).name, ...get(activeCollaborators).map(c => c.name)];
const matched = parseMentions(trimmed, allNames);
const selfName = get(self).name.toLowerCase();
if (matched.includes(selfName)) {
  const actor = get(activeCollaborators).find(c => c.id === actorId);
  const commenterName = actor?.name ?? get(self).name;
  const todo = get(todos).find(t => t.id === todoId);
  push({
    type: 'mention',
    title: 'You were mentioned',
    message: `Mentioned in ${todo?.text ?? 'a card'} by ${commenterName}`
  });
}
```

`editComment` and `editReply` do not call `parseMentions` and are otherwise unchanged.

### broadcastSync.ts (internal additions)

```ts
// Not exported. Computes structural changes between two KanbanState snapshots.
// todoMap maps todoId -> todo.text for card-title lookup.
function diffKanbanStates(
  previous: KanbanState,
  incoming: KanbanState,
  todoMap: Map<string, string>
): ActivityChange[];
```

Detection logic:
1. Build `previousCardColumn: Map<cardId, columnId>` from `previous.columns`.
2. Build `incomingCardColumn: Map<cardId, columnId>` from `incoming.columns`.
3. For each cardId present in both maps: if the column differs, emit `card-moved`.
4. Build `previousColumnIds: Set<string>` from `previous.columns`.
5. For each column in `incoming.columns`: if its `id` is not in `previousColumnIds`, emit `column-added`; else if its `title` differs from the matching previous column, emit `column-renamed`.

`listenForRemoteUpdates` signature is unchanged. The new logic is added inside the `kanban-updated` case:

```ts
case 'kanban-updated': {
  if (!msg.payload || typeof msg.payload !== 'object' || !('columns' in msg.payload)) return;
  const previous = get(kanbanState);       // snapshot before update
  onKanban(msg.payload);                    // existing callback: kanbanState.set(msg.payload)
  const todoMap = new Map(get(todos).map(t => [t.id, t.text]));
  const changes = diffKanbanStates(previous, msg.payload, todoMap);
  for (const change of changes) { /* push(...) per change kind */ }
  break;
}
```

`channel` is exported so `notifications.ts` can import it:

```ts
export { channel };
```

### Toast.svelte props

```ts
let {
  id,       // string
  type,     // 'overdue' | 'mention' | 'activity'
  title,    // string
  message,  // string
}: ToastProps = $props();
```

### Component event flow

```
push() called
  ↓
notifications store updates
  ↓
Toaster.svelte reactive block re-evaluates $notifications
  ↓
{#each [...$notifications].reverse() as n (n.id)}
  ↓
new Toast.svelte mounts → in:fly transition fires → onMount starts 5000ms timer
  ↓
timer expires OR close button clicked → dismiss(id)
  ↓
notifications store removes record
  ↓
Toaster.svelte removes the keyed Toast → out:fly transition fires
  ↓
(if local dismiss) notifications.ts posts notification-dismissed to BroadcastChannel
  ↓
other tabs call dismiss(id, true) on their local store → same removal
```

## Dependencies

### Internal dependencies (new import edges)

| Importer | Imported symbol | From |
|----------|-----------------|------|
| `notifications.ts` | `channel` | `broadcastSync.ts` |
| `broadcastSync.ts` | `push` | `notifications.ts` |
| `broadcastSync.ts` | `get(kanbanState)` | `kanban.ts` (already imported via type) |
| `broadcastSync.ts` | `get(todos)` | `todos.ts` (new import) |
| `dueDateChecker.ts` | `todos` store, `get` | `todos.ts`, `svelte/store` |
| `dueDateChecker.ts` | `push` | `notifications.ts` |
| `todos.ts` | `self`, `activeCollaborators` | `collaborators.ts` (new import) |
| `todos.ts` | `push` | `notifications.ts` (new import) |
| `+page.svelte` | `startDueDateChecker` | `notifications/dueDateChecker.ts` |
| `+page.svelte` | `Toaster` | `components/Toaster.svelte` |
| `Toaster.svelte` | `notifications`, `dismiss` | `stores/notifications.ts` |
| `Toast.svelte` | `dismiss` | `stores/notifications.ts` |

### Circular import pair (documented in ADR-001)

`notifications.ts` ↔ `broadcastSync.ts`: safe because both references are read only inside function bodies, never at module init time. The dependency graph is otherwise a DAG.

### External dependencies

None. All primitives used — `crypto.randomUUID()`, `BroadcastChannel`, `setInterval`, `clearTimeout`, Svelte `fly` transition, Svelte `writable` — are already available in the runtime environment (Node.js >= 22, modern browser). No new entries in `package.json`.

### Runtime environment constraints

`BroadcastChannel` requires a browser context. All access is guarded by `typeof window !== 'undefined'` checks in `broadcastSync.ts` (already present), `notifications.ts` (new guard on listener registration), and `dueDateChecker.ts` (implicitly safe — `startDueDateChecker` is only called from `onMount` which never runs in SSR). `crypto.randomUUID()` is available in Node.js 14.17+ and all modern browsers; the project targets Node.js >= 22, so no polyfill is needed.

## Risks & Mitigations

### Risk 1: Circular import causes initialization-time ReferenceError

**Probability:** Low. **Impact:** High — would crash on page load.

The mutual import between `notifications.ts` and `broadcastSync.ts` is safe as long as neither module uses the other's exports at the top level during initialization. If a future maintainer adds a top-level call (e.g., calls `push(...)` outside a function in `broadcastSync.ts`), it would fail because `notifications.ts` may not be fully initialized yet.

**Mitigation:** Document the invariant explicitly in both files with a comment: `// NOTE: channel is only accessed inside function bodies to avoid circular-init issues.` If the constraint ever becomes inconvenient, extract `channel` into `src/lib/sync/channel.ts` as a standalone module with no imports from either file, eliminating the cycle.

### Risk 2: Duplicate activity toasts from rapid board state broadcasts

**Probability:** Medium. **Impact:** Low — visual noise only.

If tab A makes two rapid mutations (e.g., moves a card and immediately renames a column before tab B processes the first message), tab B may receive two `kanban-updated` messages in quick succession. Each diff runs against the local state after the previous `onKanban` call, so the diffs should be independent and correct. However, under very high message frequency the snapshot taken before `onKanban` may already reflect an intermediate state if Svelte's store updates are batched.

**Mitigation:** The spec's requirements are met because each message is diffed against the state immediately before `onKanban` is called. No deduplication beyond what is natural to the diff is needed. If toast flooding becomes a UX issue in practice, a short debounce (e.g., 300 ms) on the `kanban-updated` diff handler can be added without changing the public API.

### Risk 3: notifiedIds Set grows unboundedly in long-running sessions

**Probability:** Low. **Impact:** Very low — only memory growth.

The module-level `notifiedIds` Set accumulates todo IDs for the lifetime of the page session. A board with thousands of cards would accumulate thousands of strings. Each string is a 36-character UUID (~36 bytes). Ten thousand entries ≈ 360 KB — negligible for a browser tab.

**Mitigation:** No action required for the current scale of this application. If the board ever supports tens of thousands of cards, the Set can be bounded by removing IDs whose corresponding todos no longer exist in the store.

### Risk 4: Self-dismissal echo loop if _fromChannel flag is misused

**Probability:** Low. **Impact:** High — infinite message loop would flood all tabs.

If `push` or `dismiss` is called with `_fromChannel = false` from a BroadcastChannel receive handler, the message would be re-broadcast, received by all tabs (including the originator), and trigger infinite re-broadcasts.

**Mitigation:** The `_fromChannel` flag is explicitly set to `true` in the two BroadcastChannel receive paths inside `notifications.ts`'s own listener. These are the only two call sites that receive from the channel. The flag is typed as optional boolean (`_fromChannel?: boolean`) so callers who do not pass it default to `false` (local origin), which is the safe default for all trigger sources. Tests must cover both `_fromChannel = true` and `_fromChannel = false` paths.

### Risk 5: SSR rendering crashes when window-dependent code runs server-side

**Probability:** Low (SvelteKit SSR is active). **Impact:** Medium — build-time or request-time error.

`broadcastSync.ts` already has an `if (typeof window !== 'undefined')` guard around the `BroadcastChannel` constructor. `notifications.ts` must apply the same guard around its BroadcastChannel listener registration. `dueDateChecker.ts` is only called from `onMount` (which SvelteKit skips during SSR) so no guard is needed there. `crypto.randomUUID()` is available in Node.js >= 14.17.

**Mitigation:** Every module that accesses `window`, `localStorage`, `BroadcastChannel`, or `crypto.randomUUID()` at module initialization time must wrap those accesses in `typeof window !== 'undefined'` checks. This is the established pattern in `todos.ts`, `kanban.ts`, and `collaborators.ts` and must be followed in `notifications.ts`.

### Risk 6: Mention false-positives from partial regex escaping

**Probability:** Low. **Impact:** Low — spurious mention notification.

If a collaborator's name contains regex special characters (e.g., `"C++"` or `"alice.bob"`), an unescaped regex would either throw or match incorrectly.

**Mitigation:** `parseMentions` escapes each name before embedding it in the regex: `name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. This is specified in the mention-parser contract and must be implemented exactly. A Vitest unit test with a name containing special characters is required.

### Risk 7: Toast timer leaks if component is destroyed while paused

**Probability:** Low. **Impact:** Low — a stale `dismiss` call on an already-removed id.

If a notification is removed from the store externally (e.g., by `clearAll()` or a cross-tab `notification-dismissed` message) while the corresponding `Toast.svelte` has its timer paused (during a hover), the `onDestroy` callback must still clear the timer. The timer variable is `null` when paused, so `clearTimeout(null)` is a no-op. The `onDestroy` guard `if (timer !== null) clearTimeout(timer)` handles the running case; the paused case (`timer === null`) is already safe because `setTimeout` was never re-set.

**Mitigation:** The `onDestroy` guard is specified in the `toast-component-props.md` schema and must be implemented. The `dismiss` function is a no-op when called with an id not in the store, so any stale `dismiss(id)` call from a lingering timer is harmless.
