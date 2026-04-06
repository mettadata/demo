# Research: multi-user-collaboration-real

## Decision: Full-state snapshot broadcast over BroadcastChannel with explicit wrapper broadcast calls, predefined palette color derivation, CSS initials avatars, and interval-based presence polling

---

### Approaches Considered

1. **BroadcastChannel as sole transport** (selected) — Same-origin same-machine guarantee, zero infrastructure, browser-native API, synchronous post, no worker thread overhead. Spec explicitly mandates it.
2. **localStorage `storage` events** — Works across same-origin tabs but fires only in _other_ tabs from the writer; no same-tab delivery issue. However, the `storage` event payload contains only the changed key and old/new string values, making it harder to type correctly. BroadcastChannel delivers structured data natively and is semantically cleaner. Not selected.
3. **SharedWorker** — Enables fan-out to multiple tabs via a persistent worker, would support cross-tab conflict detection and message ordering. Adds a separate worker module, requires Vite/SvelteKit worker config, and is meaningfully more complex. Overkill for same-machine LWW semantics with two stores. Not selected.

4. **Full-state snapshot per broadcast** (selected) — Simple, stateless, and eliminates the need to reconcile partial updates. The spec mandates it (`"received payload replaces store state wholesale"`). Todo array and KanbanState are small JSON objects in a localStorage-backed app with no server.
5. **Delta / patch messages** — Reduces message size for large lists, but requires tracking sequence numbers or vector clocks to detect out-of-order delivery and gaps. Implementing even a naive delta on top of `Todo[]` (which contains nested comments, attachments, activityLog) would require deep diffing. Complexity far outweighs any bandwidth savings for this use case. Not selected.

6. **Predefined palette hash for color derivation** (selected) — Pure synchronous function with no async overhead, no Web Crypto dependency, deterministic across environments, produces colors from a curated set with adequate contrast. Palette of 12 entries is sufficient to visually distinguish a small number of simultaneous collaborators.
7. **`crypto.subtle.digest` SHA-1 hash** — Async, requires `await` or `.then()` in a context (store initialization) that runs synchronously. Would require deferring avatar render until the promise resolves, adding a flash of missing color on load. The spec says "SHA-1-style hash" as an example, not a requirement. Not selected.
8. **Simple modulo on charCode sum** (variant of palette hash) — Functionally equivalent to the chosen approach but prone to clustering (many UUIDs share similar character distributions). A multiplicative 32-bit hash (`hash * 31 + charCode`) is a standard improvement with better distribution. Incorporated into the selected approach.

9. **Interval-based presence polling** (selected) — `setInterval` at 10 s for expiry checks and 30 s for heartbeat send. Matches the spec's explicit interval and expiry values. No Svelte store subscriber can observe "time since last update" reactively without an interval anyway.
10. **Reactive expiry via derived store** — A `derived` store computing the filtered collaborators list would need to be recomputed on every tick to notice a 90-second silence, which effectively requires the same interval. The derived approach adds indirection without eliminating the need for a timer. Not selected.

11. **CSS initials avatars** (selected) — A single `<span>` with `border-radius: 9999px`, inline `background-color`, and text content. Zero SVG parsing overhead, trivially styled with Tailwind classes, keyboard-accessible via `aria-label`. Consistent with the existing Tailwind CSS stack.
12. **SVG or canvas avatars** — Would enable gradients, shadows, and precise text positioning, but introduce unnecessary complexity. The spec requires only initials on a colored background. Not selected.

13. **Explicit broadcast calls inside mutation functions** (selected) — Each named export in `todos.ts` and `kanban.ts` calls `broadcastTodos()` / `broadcastKanban()` at the end of its body. This is the direct integration pattern. It integrates exactly where the spec says: "after each successful write to the store." It is easy to trace in code review and to test (mock the broadcast function, call the mutation, assert the mock was called with the correct payload).
14. **Subscribe-based broadcast hook** — Attaching a `todos.subscribe(broadcastTodos)` at the module level would broadcast on every `todos.set`/`todos.update`, including remote-induced writes from `listenForRemoteUpdates`. This would create an echo loop: Tab B receives a message, calls `todos.set(payload)`, the subscriber fires, and broadcasts back to Tab A. Preventing this would require a boolean guard (`isApplyingRemote`), which adds hidden mutable state. The explicit-call pattern avoids this entirely. Not selected.

---

### Rationale

**Sync transport: BroadcastChannel.** The spec mandates it. BroadcastChannel is the correct primitive for same-origin same-machine tab communication: it delivers structured data, does not trigger same-tab message re-delivery to the originating context (spec behavior), and requires no polyfill for the target browser range (Chrome 54+, Firefox 38+, Safari 15.4+). The SvelteKit SSR guard (`typeof window === 'undefined'`) already present throughout the stores is sufficient to handle server-side rendering safely.

**Full-state snapshot.** The stores are small. The entire `Todo[]` with all nested comments, attachments, and activity logs for a typical board is well under 1 MB even after aggressive use. BroadcastChannel has no meaningful message-size penalty for in-process IPC. Delta patching would add hundreds of lines of code and testing surface for zero user-perceivable benefit in this context.

**Palette hash color.** The async nature of `crypto.subtle.digest` is a genuine constraint in synchronous store initialization. The spec's exact wording ("e.g., the first six hex characters of a SHA-1-style hash") uses "e.g." and treats the hash as an example of a determinism mechanism, not a requirement for cryptographic hashing. A multiplicative hash into a 12-color palette is strictly simpler, synchronous, and produces results that are visually at least as good as truncated SHA hex (which can produce muted, low-contrast colors).

**Explicit broadcast calls vs. subscribe hook.** The echo-loop risk with the subscribe pattern is not theoretical — it is a direct consequence of BroadcastChannel's same-origin multi-tab delivery. The existing `todos.subscribe` already persists to `localStorage`; adding a second broadcast subscriber there would make the data flow harder to audit. The explicit call pattern is consistent with how existing mutations are structured (each function already calls `snapshot()` explicitly before mutating, rather than relying on a store subscriber to detect mutations).

**History isolation.** `history.ts` registers a `_snapshotFn` via `registerSnapshotFn(saveSnapshot)` and `todos.ts` calls it through the `snapshot()` wrapper. Remote payloads arrive via `todos.set(payload)` called inside the `listenForRemoteUpdates` callback — a direct store write that bypasses all mutation functions. Since `snapshot()` is only called inside mutation functions, and remote writes never go through mutation functions, undo stack isolation is structurally guaranteed without any additional flag or guard.

**Presence design.** The 30 s / 90 s / 10 s values are taken directly from the spec. The three-to-one ratio (heartbeat interval to expiry threshold) ensures a tab must miss three consecutive heartbeats before being considered gone — a reasonable tolerance for background tab throttling, which Chrome applies to `setInterval` timers in hidden tabs (minimum 1 s interval, not 30 s, so throttling is not a practical concern at this cadence).

**Avatar rendering.** The spec renders avatars as "initials on colored background" in all requirements. A Tailwind `rounded-full` span with `style="background-color: {color}"` and an `aria-label` matches the pattern already used for the color dot in existing `KanbanCard.svelte` (the `w-2 h-2 rounded-full` status indicator). Using the same styling vocabulary keeps the component coherent.

---

### Artifacts Produced

- [API Contract: BroadcastSync Module](contracts/broadcast-sync-api.md)
- [Data Model: Collaborator](schemas/collaborator-data-model.md)
- [Flow: Sync and Presence](diagrams/sync-and-presence-flow.md)
