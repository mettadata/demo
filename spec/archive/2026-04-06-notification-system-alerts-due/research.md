# Research: notification-system-alerts-due

## Decision: Svelte writable store + fixed-position Toaster + setInterval polling + simple regex mention parser + snapshot diff on BroadcastChannel receive + extend existing SyncMessage union

---

### Approaches Considered

#### 1. Toast rendering: fixed-position Toaster component (selected)

The app already renders overlapping modals (`LabelManager`, `ShortcutsHelpModal`, the name-prompt banner) as fixed-position elements placed near the bottom of `+page.svelte`. A `Toaster.svelte` component mounted at the root with `position: fixed; bottom: 1.5rem; right: 1.5rem` is the direct analogue of what already exists.

Svelte's built-in `fly` transition from `svelte/transition` handles the slide-in/out behavior with zero dependencies and works correctly with `{#each ... (key)}` keyed blocks and `onDestroy`. The z-index sits above the existing z-50 dialogs (use z-[9999] or a dedicated layer).

**Why not a Svelte portal (teleport)?** Svelte 5 does not ship a native portal primitive in the stable API. Achieving a true DOM portal requires a third-party library or a custom action that moves DOM nodes into `document.body`. This adds complexity and a dependency for a problem that does not actually exist here: `+page.svelte` is a single-level wrapper and there are no ancestor `overflow: hidden` or `transform` elements that would trap a fixed-position child. Portal solves a CSS stacking context problem that this codebase does not have.

**Why not an action-based approach?** A Svelte action (e.g., `use:toast`) would require calling the action on a host element and programmatically creating/inserting DOM nodes from TypeScript. This breaks the reactive store–component data flow the rest of the app uses, makes transitions harder to drive declaratively, and moves rendering logic outside the component tree where Svelte's lifecycle hooks (`onDestroy`, `onMount`) do not apply cleanly.

#### 2. Toast rendering (not selected): Svelte portal via `document.body` insertion

Provides guaranteed escape from any stacking context, is the React/Vue pattern many developers expect. Rejected because: no stacking context problem exists in this app's layout; Svelte 5 lacks a first-class portal; requires external library or bespoke action; inconsistent with how other overlays (`ShortcutsHelpModal`, `LabelManager`) are handled.

---

#### 3. Notification store: Svelte writable with `push`/`dismiss` closures (selected)

The existing stores (`todos`, `kanbanState`, `filter`, `viewPreference`) are all plain Svelte `writable` stores with module-level mutation functions (`addTodo`, `moveCard`, `addColumn`). The `notifications` store follows the identical pattern: a `writable<Notification[]>` plus exported `push`, `dismiss`, and `clearAll` functions that call `notifications.update(...)` internally.

This is the dominant convention in the codebase. It is consistent, testable (Vitest can import and call the functions directly without a component), and requires no abstraction beyond what Svelte already provides. The capped-queue behavior (evict oldest when length reaches 5) is a two-line guard inside `push`.

#### 4. Notification store (not selected): Event emitter or pub/sub bus

An `EventTarget`-based emitter or a custom pub/sub system would decouple producers from consumers, which matters when many unrelated parts of an app need to react. In this codebase the consumer is always `Toaster.svelte` — a single, static component. A Svelte store is already a reactive pub/sub system. Adding a separate emitter layer introduces an extra abstraction with no benefit.

#### 5. Notification store (not selected): Reactive `derived` store

A derived store cannot be imperatively updated (producers cannot `push` into it). The notification system is event-driven, not continuously derived from existing state. A derived store that watches every Todo for overdue status would fire on every store update, not just on the 60-second polling boundary, making deduplication and session-scoped "already notified" tracking awkward to implement correctly.

---

#### 6. Overdue detection: `setInterval` polling at 60 seconds (selected)

The spec explicitly mandates a 60 000 ms `setInterval` with a first cycle on page load. The module-level `Set<string>` deduplification is simple, correct, and testable in isolation. The `startDueDateChecker()` / cleanup-fn pattern mirrors `initPresence()` / `destroyPresence()` in `collaborators.ts`, which already uses this exact lifecycle structure with `setInterval` and `clearInterval`.

Reading `get(todos)` at each poll tick (rather than subscribing reactively) avoids the risk of the checker firing once per todo mutation, which would bypass the 60-second cadence guarantee.

#### 7. Overdue detection (not selected): Reactive `derived` store

A `derived([todos], ...)` that computes overdue todos reactively would fire every time any todo is modified. The spec requires the checker to run on a clock boundary (every 60 s), not on store mutations. A derived store cannot produce side effects (pushing a notification) without coupling to a subscriber, which would also fire on every store write. Deduplication across re-renders would require external state that the derived approach makes messy to manage.

#### 8. Overdue detection (not selected): `requestIdleCallback`

`requestIdleCallback` is designed for background work during idle browser frames, not periodic polling. It provides no timing guarantee. The spec requires exactly 60 000 ms intervals, which `setInterval` guarantees in intent (with normal browser throttling caveats). `requestIdleCallback` is also not widely supported in Safari without a polyfill.

---

#### 9. @mention parsing: simple per-name regex with word boundary (selected)

The spec prescribes the exact regex form: `/(?<!\w)@(name)(?!\w)/gi` per collaborator name. The set of collaborators is small (typically 2–10 people in a local multi-tab session). Iterating once per name and building a result set is O(n * m) where n is names and m is body length — negligible for this scale.

The app already has a hand-rolled `renderMarkdown` and `truncateDescription` in `src/lib/utils/markdown.ts`. Both are regex-based. The existing markdown util is intentionally zero-dependency and simple. The mention parser fits the same pattern: a pure function, no imports, directly testable.

The `parseMentions` function is exported from `todos.ts` as a pure function (no store access), making it unit-testable with `describe`/`it`/`expect` in Vitest without any store setup.

#### 10. @mention parsing (not selected): Tokenizer

A tokenizer (splitting the body into tokens by whitespace or punctuation) would require handling edge cases like punctuation attached to the mention (`@Alice,` `@Alice.`), multi-word names (not supported by the spec — names are single tokens in this app), and Unicode word boundaries. The regex approach with the lookbehind/lookahead handles the spec's cases directly and produces deterministic output.

#### 11. @mention parsing (not selected): markdown-it plugin

The existing `markdown.ts` does not use `markdown-it`; it is a custom renderer. Adding `markdown-it` as a dependency to support mention parsing would be disproportionate — mention detection is a string-processing concern, not a rendering concern. The spec requires mention detection at comment submission time in `todos.ts`, not at render time in a component. A markdown-it plugin would need to be invoked at submission, not rendering, which makes it the wrong abstraction layer.

---

#### 12. Board activity diff: snapshot comparison on BroadcastChannel receive (selected)

When a `kanban-updated` message arrives, the handler reads the current `kanbanState` (before applying the incoming payload) as a previous snapshot, then computes the diff. This is the natural point to detect changes: the message carries the new full state, the local store holds the old state, and the diff function has everything it needs in one place.

The `KanbanState` structure is already fully available (`columns[].id`, `columns[].title`, `columns[].cardIds`). Building a reverse index (cardId → columnId) from both snapshots and comparing is a straightforward O(total cards) traversal.

`broadcastSync.ts` already imports `KanbanState` and calls `get(kanbanState)` nowhere today, but the module already imports `Todo` and `KanbanState` types. Adding `import { kanbanState } from '../stores/kanban.js'` and `import { todos } from '../stores/todos.js'` is consistent with existing import style.

#### 13. Board activity diff (not selected): Event-type matching from BroadcastChannel messages

This approach would require extending every kanban mutation function (`moveCard`, `addColumn`, `renameColumn`) to include a structured `event` field in the broadcast payload (e.g., `{ type: 'kanban-updated', payload: state, events: ['card-moved:cardId:targetColId'] }`). This changes the `SyncMessage` schema more invasively, requires all senders to annotate their mutations, and breaks backward compatibility with any tab that hasn't reloaded to get the new message format. The snapshot diff approach keeps the sender unchanged and puts all intelligence in the receiver.

---

#### 14. Cross-tab notification sync: extend existing SyncMessage union (selected)

`SyncMessage` in `broadcastSync.ts` is a discriminated union. Adding two new variants (`notification-pushed` and `notification-dismissed`) follows the exact pattern already used for `todos-updated`, `kanban-updated`, and `presence-heartbeat`. The `switch` in `listenForRemoteUpdates` already has a `default: // silently ignore` branch, so old tabs receiving new message types do not crash.

`notifications.ts` accesses the `channel` reference by importing it from `broadcastSync.ts`. The channel is a module-level variable, so it is initialized once and shared. The `notifications.ts` listener is registered at module init time (guarded by `typeof window !== 'undefined'`), mirroring how `listenForRemoteUpdates` works.

The anti-echo-loop mechanism is the `_fromChannel` boolean parameter on `push` and `dismiss`: local calls set it to `false` (or omit it) and broadcast; channel-received calls set it to `true` and skip the broadcast. This is simpler and more explicit than an "in-flight message" set or a "last sender ID" comparison.

#### 15. Cross-tab notification sync (not selected): Separate BroadcastChannel

Using a second channel (e.g., `metta-notifications`) would avoid extending the `SyncMessage` union and isolate concerns. However, it means two channel registrations per tab, two listeners to set up and tear down, and a new channel name to document. The existing pattern already handles three orthogonal message types on one channel cleanly. A fourth and fifth type add negligible complexity to the switch statement and keep all cross-tab communication consolidated in one place.

---

### Rationale

Every decision above maps to the existing conventions in this codebase:

- **Store pattern:** All state is plain Svelte `writable` stores with module-level mutation functions. `notifications` joins `todos`, `kanbanState`, `filter`, `labels`, etc.
- **Polling lifecycle:** `startDueDateChecker()` returning a cleanup function mirrors `initPresence()` / `destroyPresence()` in `collaborators.ts`, which uses the same `setInterval`/`clearInterval` structure and is called from `onMount`/`onDestroy` in `+page.svelte`.
- **Pure utility functions:** `parseMentions` joins `renderMarkdown`, `truncateDescription`, `formatRelativeTime`, `sortTodosByDueDate` — small, pure, zero-dependency functions that live in or near their domain module and are independently testable.
- **BroadcastChannel conventions:** All cross-tab messages flow through `metta-todo-sync`. Adding new variants to the `SyncMessage` union is the established extension point.
- **Fixed overlays:** All modal/overlay UI in this app uses `position: fixed` components mounted at `+page.svelte` root. `Toaster.svelte` fits the same pattern.
- **No external dependencies added:** No new npm packages are required. Svelte's `fly` transition is part of the framework. `crypto.randomUUID()` is a native browser API. The mention regex is a language primitive.

The one architectural decision that merits note is the mutual import between `broadcastSync.ts` and `notifications.ts`. This is safe because both modules only reference imported values inside function bodies, not at module initialization time, but it should be documented clearly for future maintainers. If the circular import becomes a concern, the `channel` reference can be moved to a shared `src/lib/sync/channel.ts` singleton that both modules import from.

---

### Artifacts Produced

- [API Contract: Notifications Store](contracts/notifications-store-api.md)
- [API Contract: Due Date Checker](contracts/due-date-checker-api.md)
- [API Contract: Mention Parser](contracts/mention-parser-api.md)
- [API Contract: Board Activity Diff](contracts/board-activity-diff-api.md)
- [Data Model: Notification Record](schemas/notification-record.md)
- [Data Model: Toast Component Props](schemas/toast-component-props.md)
- [Flow: End-to-End Notification Lifecycle](diagrams/notification-flow.md)
