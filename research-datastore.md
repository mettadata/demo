# Research: Migrating SvelteKit Todo App to Server-Side Storage with Per-User Isolation

## Current State

All four stores (`todos`, `kanban`, `labels`, `collaborators`) are pure client-side Writable stores that:
- Initialize by reading directly from `localStorage` on mount (SSR guard: `typeof window === 'undefined'`)
- Persist every mutation via `.subscribe()` back to `localStorage`
- Expose imperative mutation functions (`addTodo`, `moveCard`, etc.) called directly from components
- Cross-communicate: `kanban.ts` subscribes to `todos` to sync cardIds; `todos.ts` imports `collaborators` for mention detection
- Use `broadcastSync.ts` (BroadcastChannel API) for multi-tab presence and state propagation

No `+page.server.ts` exists. The single route (`+page.svelte`) mounts all stores via `onMount`. No form actions or load functions are in use today.

---

## Option 1: Full Server Migration

Move all state to a server-side `Map<userId, UserData>` in a module like `src/lib/server/store.ts`. SvelteKit `load` functions return the user's data as `PageData`. Every mutation goes through a form action or API route that updates the server map and returns refreshed data. Client Svelte stores become derived (read-only) from `$page.data`.

**Store code changes:**
- All `load*()` + `localStorage.setItem` blocks deleted — ~60 lines across four files
- All mutation functions rewritten as `fetch` calls to form actions or API routes
- `derived` stores and filtering logic (`filteredTodos`, `kanbanBoard`) can remain client-side, seeded from `$page.data`
- `broadcastSync.ts` becomes redundant for data; presence heartbeats could stay or move to SSE
- `collaborators.ts` `initSelf()` replaced by session cookie lookup
- `kanban.ts` `syncWithTodos` subscription logic must move server-side or be replicated as a post-action step

**Data consistency:** Strongest — single source of truth, no divergence across tabs.

**Migration complexity:** High. Every mutation needs a server route; `applyTemplate` (which writes both todos and kanban atomically) needs a transaction-equivalent action; the `addAttachment` quota-exceeded rollback pattern needs server-side handling. The tight coupling between `kanban` and `todos` subscriptions must be untangled.

**UX:** Page reload (or `invalidate()`) required after each mutation unless optimistic updates are layered on top. No offline support. Initial load requires a round-trip; SSR renders with real data so no flash of empty content.

---

## Option 2: Hybrid — Server Authoritative, Client Optimistic

Server store is the source of truth (same `Map<userId, UserData>` as Option 1). Client stores shadow server state and apply optimistic updates immediately, then reconcile on `load` function return via `invalidate()`. localStorage is kept as a fallback cache for offline reads only.

**Store code changes:**
- Mutation functions remain in stores but immediately call a form action in the background and update local state optimistically
- `load` functions seed initial state; subsequent mutations call `invalidate('app:todos')` after form action completes
- `localStorage` write-back remains for offline resilience but is no longer the source of truth on next page load
- About 40% of existing store logic is reusable; mutation functions need a dual-write pattern added

**Data consistency:** Strong for online use. Offline edits can diverge and require merge/overwrite logic on reconnect — adds complexity disproportionate to a demo app.

**Migration complexity:** High-medium. Optimistic update logic duplicates server logic (risk of drift). The `snapshot`/`undo`/`redo` history system in `history.ts` would need to track both local and server state.

**UX:** Instant response (optimistic), no flash. Offline works. Best end-user experience but most moving parts.

---

## Option 3: Thin Server Layer — Auth Only, userId-Namespaced localStorage

Server handles only authentication (session cookie → userId). All data stays in localStorage but keys are namespaced: `todos_${userId}`, `kanban-state_${userId}`, etc. On login/logout, the active namespace switches.

**Store code changes:**
- Minimal: replace bare key constants (`STORAGE_KEY = 'todos'`) with a getter that reads the active userId from a lightweight client-side session store
- `collaborators.ts` `initSelf()` reads userId from the session cookie value (passed via `+page.server.ts` load) instead of generating a random one
- `+page.server.ts` added only to validate the session and pass `userId` as page data
- All mutation functions, `derived` stores, `broadcastSync`, `undo/redo` — unchanged

**Data consistency:** Weak — per-device only. Two browsers for the same user see different data. No server record of any todo. Acceptable only if per-user isolation means "don't mix users on the same device."

**Migration complexity:** Low. ~10 lines changed across store files. One new `+page.server.ts` with a session check.

**UX:** Identical to today. No offline degradation. No load round-trips.

---

## Comparison Matrix

| Criterion | Option 1 (Full Server) | Option 2 (Hybrid) | Option 3 (Thin Layer) |
|---|---|---|---|
| Store code to rewrite | ~80% | ~50% | ~5% |
| Data consistency | Cross-device, strong | Cross-device, strong | Single-device only |
| Migration effort | High (3–5 days) | High (4–6 days) | Low (0.5–1 day) |
| UX / offline | No offline, SSR advantage | Best (optimistic + offline) | Identical to today |
| Risk of regression | High (broadcast, undo/redo) | High (dual-write drift) | Minimal |
| Fits demo app scope | Over-engineered | Over-engineered | Appropriate |

---

## Recommendation: Option 3 (Thin Server Layer)

For a demo todo app explicitly constrained to "no external database — local/in-memory storage" (per CLAUDE.md), Option 3 achieves the stated goal — per-user isolation — at a fraction of the cost and risk. The requirement is that User A's todos don't appear for User B on the same device, not cross-device sync.

The migration path:
1. Add `+page.server.ts` that reads/sets a session cookie and returns `{ userId }` as page data.
2. In each store, replace the bare `STORAGE_KEY` constant with a function `storageKey(userId)` returning `${BASE_KEY}_${userId}`.
3. Pass `userId` from `$page.data` into store initializers at mount time in `+page.svelte`.

If the requirement genuinely calls for cross-device consistency, prefer **Option 1** — the clean server-authoritative model — over Option 2, because the hybrid's optimistic/reconcile complexity is only justified when offline support is a hard requirement. Option 1 is the right foundation even if it means rewriting the mutation layer.
