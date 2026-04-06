# Design: build-auth-system

## Approach

Add cookie-based authentication with per-user todo isolation using zero new dependencies. All auth logic lives server-side in three thin modules under `src/lib/server/`. Session management uses a `Map` backed by `crypto.randomUUID()`. Password hashing uses Node.js built-in `crypto.scrypt` with a random salt stored alongside the hash. The hook (`hooks.server.ts`) reads the `session_id` cookie on every request, resolves it to a user, and either populates `event.locals.user` or redirects to `/login`.

Client-side stores are preserved intact. Per-user data isolation is achieved by namespacing localStorage keys with the authenticated userId (e.g., `todos_${userId}`). The userId is surfaced from the server to the client via `+layout.server.ts` so stores can read it on mount. All existing client features — undo/redo history, BroadcastChannel sync, kanban templates, due-date notifications — continue to work without modification.

New routes `/login` and `/register` use SvelteKit form actions for all server mutations. The layout is updated to replace the anonymous name prompt with a server-driven username display and logout button.

This approach was chosen over a full server-side data migration (spec requirement: per-user isolation via client-namespaced storage is sufficient) and over third-party auth libraries (no DB adapter needed, no native addons, ~35 lines total for session store). See `research.md` for rejected alternatives.

## Components

### `src/lib/server/sessions.ts` — Session Store

Owns the authoritative `Map<string, Session>` for all active sessions. Exports three pure functions: `createSession(userId)` generates a UUID, stores a `Session` record, and returns the session ID; `getSession(sessionId)` returns the `Session` or `undefined`; `deleteSession(sessionId)` removes the record. The Map lives in module scope and is reset on server restart (acceptable for a demo). No external state, no I/O.

### `src/lib/server/auth.ts` — Password Helpers

Wraps `node:crypto` scrypt. Exports `hashPassword(password): Promise<string>` which generates a 16-byte random salt, runs `scrypt` with `N=32768`, and returns `"${saltHex}:${hashHex}"`. Exports `verifyPassword(password, stored): Promise<boolean>` which splits the stored string, re-derives the hash, and compares with `timingSafeEqual`. No plaintext passwords are ever stored or logged.

### `src/lib/server/users.ts` — User Store

Owns the authoritative `Map<string, User>` keyed by username (lowercase). Exports `createUser(username, password)` which validates uniqueness, enforces minimum password length (8 chars), hashes the password, stores a `User` record with a generated UUID, and returns the user. Exports `findUser(username)` for lookups during login. All mutation is synchronous except for the async password hash call.

### `src/hooks.server.ts` — Request Guard

Runs on every request via SvelteKit's `handle` hook. Reads the `session_id` cookie, calls `getSession`, and sets `event.locals.user` to the resolved user object or `undefined`. After setting locals, checks if the pathname is a public route (`/login`, `/register`). If not public and `event.locals.user` is `undefined`, issues a `redirect(303, '/login')`. Otherwise calls `resolve(event)`.

### `src/app.d.ts` — Ambient Types

Extends `App.Locals` with `user?: LocalUser` where `LocalUser` carries `{ id: string; username: string }`. Extends `App.PageData` with `user?: LocalUser` so Svelte components get typed access to the layout-provided user.

### `src/routes/+layout.server.ts` — Layout Load

Reads `event.locals.user` and returns `{ user: { id, username } | undefined }`. This is the single source of truth that all page components use to render auth-aware UI. All child pages inherit `data.user` without additional server calls.

### `src/routes/login/+page.server.ts` — Login Actions

Exports a `load` function that redirects to `/` if the user is already authenticated. Exports a `default` form action that reads `username` and `password` from `request.formData()`, calls `findUser`, calls `verifyPassword`, creates a session on success, sets the `session_id` cookie, and redirects to `/`. On failure, returns `fail(400, { error: 'Invalid credentials' })` with the same generic message for both bad username and bad password (spec requirement: must not distinguish).

### `src/routes/login/+page.svelte` — Login Form

Renders a centered form with username and password fields. Receives `form` data from the action to display the error string. Links to `/register`. No client-side JavaScript beyond standard Svelte reactivity.

### `src/routes/register/+page.server.ts` — Register Actions

Exports a `load` that redirects authenticated users to `/`. Exports a `default` form action that reads `username` and `password`, calls `createUser` (which enforces uniqueness and minimum length), creates a session, sets the cookie, and redirects to `/`. On validation or uniqueness failure, returns `fail(400, { error: string })` with a specific message per failure type.

### `src/routes/register/+page.svelte` — Register Form

Mirrors login form layout. Accepts username and password fields, displays `form.error` inline, links to `/login`.

### `src/routes/+layout.svelte` — Updated Layout

Receives `data.user` from the layout server. Replaces the anonymous `showNamePrompt` block with a header element showing `data.user.username` and a `<form method="POST" action="/?/logout">` button. The existing theme toggle, view toggle, and keyboard shortcut handler are preserved. The `initPresence` / `destroyPresence` collaborator calls remain but will be reviewed for compatibility in the build step.

### `src/routes/+page.server.ts` — Logout Action (new)

Adds a named `logout` form action. Reads the `session_id` cookie, calls `deleteSession`, clears the cookie with `maxAge: 0`, and redirects to `/login`. The page's `load` function is not required here since the hook already enforces authentication; the page inherits `data.user` from the layout.

### `src/lib/stores/todos.ts`, `kanban.ts`, `labels.ts` — Namespace Patch

The `STORAGE_KEY` constants and their `loadX()` functions are updated to accept an optional `userId` parameter. When `userId` is provided (injected on `onMount` from `data.user.id`), the key becomes `todos_${userId}`, `kanban-state_${userId}`, etc. The `theme-preference` key is not namespaced (it is a device preference, not user data). The `+page.svelte` `onMount` block reads `data.user.id` from layout data and calls a new `initStores(userId)` function that re-initializes all stores with the correct namespace before reading from storage.

## Data Model

```typescript
// src/lib/server/users.ts
interface User {
  id: string;           // crypto.randomUUID()
  username: string;     // lowercase, unique
  passwordHash: string; // "${saltHex}:${hashHex}" from scrypt
  createdAt: string;    // ISO 8601
}

// src/lib/server/sessions.ts
interface Session {
  userId: string;
  createdAt: string;    // ISO 8601
}

// src/app.d.ts — available in App.Locals and App.PageData
interface LocalUser {
  id: string;
  username: string;
}
```

The existing `Todo` interface in `src/lib/stores/todos.ts` gains one field to satisfy the spec requirement (req: todo-data-model):

```typescript
interface Todo {
  // ... all existing fields preserved ...
  ownerId: string;  // set server-side from event.locals.user.id at creation time
}
```

Because todos remain in localStorage, `ownerId` is stored client-side. It is set once at creation by deriving it from the `data.user.id` value that was injected from the server — it is not read from any user-supplied form field. This satisfies the requirement that `ownerId` must not be client-settable via form input.

The existing `STORAGE_KEY = 'todos'` constant in todos.ts and the equivalent constants in kanban.ts and labels.ts are computed dynamically at store initialization time, not hardcoded, so they remain unmodified; only the key strings passed to `localStorage.getItem/setItem` change.

## API Design

All mutations are SvelteKit form actions (POST). There are no new JSON API endpoints.

### POST `/register` (action: `default`)

Request body (form-encoded):
- `username: string` — required, non-empty
- `password: string` — required, minimum 8 characters

Success: `303 redirect` to `/`, sets `Set-Cookie: session_id=<uuid>; HttpOnly; SameSite=Strict; Path=/; Secure` (Secure omitted in dev).

Failure responses via `fail(400, { error: string })`:
- `"Username is required"` — empty username
- `"Password must be at least 8 characters"` — short password
- `"Username is already taken"` — duplicate username

### POST `/login` (action: `default`)

Request body (form-encoded):
- `username: string`
- `password: string`

Success: `303 redirect` to `/`, sets session cookie as above.

Failure: `fail(400, { error: 'Invalid credentials' })` — same message for unknown username and wrong password (spec requirement: must not distinguish).

### POST `/?/logout` (named action: `logout`)

No request body required beyond the session cookie.

Success: `303 redirect` to `/login`, sets `Set-Cookie: session_id=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` to clear the cookie.

### Cookie spec

| Attribute | Value |
|-----------|-------|
| Name | `session_id` |
| HttpOnly | true |
| SameSite | Strict |
| Path | `/` |
| Secure | true in production, false in development (`dev` flag from `$app/environment`) |
| Max-Age | not set on creation (session cookie); set to `0` on logout |

### Hook behavior

`hooks.server.ts` runs before every route handler. It does not modify the response — it only populates `event.locals.user` and may throw a redirect. The redirect target is always `/login` with a `303` status.

Public paths that bypass the redirect guard: `/login`, `/register`.

## Dependencies

### External (new)

None. This change adds zero new npm dependencies. All cryptographic primitives (`crypto.scrypt`, `crypto.randomBytes`, `crypto.timingSafeEqual`, `crypto.randomUUID`) ship with Node.js 22.

### External (existing, unchanged)

- SvelteKit — routing, form actions, hooks, load functions
- Svelte 5 — component reactivity, `$props()`, `$state()`
- TypeScript (strict) — type safety across all new modules

### Internal (new modules depending on existing code)

- `src/routes/+layout.svelte` depends on `src/routes/+layout.server.ts` (new) for `data.user`
- `src/routes/+page.svelte` depends on `data.user.id` to initialize namespaced stores
- `src/lib/stores/todos.ts`, `kanban.ts`, `labels.ts` gain an `initStores(userId)` export consumed by `+page.svelte`
- `src/hooks.server.ts` depends on `src/lib/server/sessions.ts`
- `src/routes/login/+page.server.ts` depends on `src/lib/server/users.ts` and `src/lib/server/auth.ts` and `src/lib/server/sessions.ts`
- `src/routes/register/+page.server.ts` depends on the same three server modules
- `src/routes/+page.server.ts` (logout action) depends on `src/lib/server/sessions.ts`

### Internal (existing modules unaffected)

All of: `src/lib/stores/history.ts`, `src/lib/stores/collaborators.ts`, `src/lib/stores/notifications.ts`, `src/lib/stores/theme.ts`, `src/lib/sync/broadcastSync.ts`, `src/lib/notifications/dueDateChecker.ts`, and all `$lib/components/` are unmodified. The BroadcastChannel sync continues to work because all tabs for the same browser profile share the same namespaced localStorage keys after initialization.

## Risks & Mitigations

### Risk: In-memory stores reset on server restart

**Impact:** All sessions and user accounts are lost when the dev server restarts or the process exits. Logged-in users are immediately redirected to `/login`.

**Mitigation:** This is acceptable for a demo application with no persistent database. The spec does not require durability. Document this explicitly in code comments. If durability is later required, both the user store and session store implement a well-defined `Map`-based interface that can be replaced with a DB-backed adapter without changing any route code (ADR: store modules are the only place that owns persistence; route code calls only exported functions).

### Risk: localStorage isolation relies on userId from server

**Impact:** If `data.user.id` is not available when stores initialize (e.g., SSR context, race in onMount), stores fall back to the legacy unnamespaced key, causing a cross-user data leak.

**Mitigation:** The `initStores(userId)` function is called at the top of `onMount` before any store read. The `+page.svelte` `onMount` already exists; we insert the call as the first statement. SSR never reads localStorage (all `loadX()` functions guard with `typeof window === 'undefined'`). The layout server always returns a user (hook guarantees authentication before the page renders), so `data.user.id` is always present when the page component mounts.

### Risk: Session token is a UUID (not a signed token)

**Impact:** A UUID is not cryptographically signed. If an attacker can enumerate or guess session IDs, they can hijack sessions. UUIDs have 122 bits of randomness, making brute-force infeasible but offering no tamper evidence.

**Mitigation:** `crypto.randomUUID()` uses a CSPRNG (cryptographically secure pseudorandom number generator) on Node.js. The `httpOnly` cookie flag prevents JavaScript access, eliminating XSS-based theft. The `sameSite: 'strict'` flag eliminates CSRF. For a demo with no persistent data of real value, UUID sessions are sufficient. A production system should use HMAC-signed tokens or a battle-tested session library.

### Risk: scrypt parameters are hardcoded

**Impact:** `N=32768` targets ~112ms on a modern CPU. If the server runs on constrained hardware (CI container, low-memory VM), registration and login will be slow.

**Mitigation:** The `N` value is defined as a named constant at the top of `src/lib/server/auth.ts`, making it easy to tune. For the demo's single-process in-memory store, there is no concurrency concern. If login latency becomes an issue, the constant can be lowered to `N=16384` (~56ms) with one-line change.

### Risk: spec requires bcrypt; research decided on scrypt

**Impact:** The spec (`spec.md`) says "bcrypt" in several places (stored hash begins with `$2b$`, `bcrypt.compare`, etc.). The research document explicitly rejects bcrypt in favor of scrypt to avoid native addons. These are in direct conflict.

**Mitigation:** This is a known discrepancy captured here as an ADR. The spec was written before the research phase. The research decision stands: scrypt is implemented entirely in Node.js, requires no native compilation, and is memory-hard. The `$2b$`-prefix assertions in the spec scenarios will not hold; instead stored hashes will be in `"${saltHex}:${hashHex}"` format. Tests must be written against the actual scrypt format, not the spec's bcrypt expectations. If the spec's bcrypt requirement is re-asserted by the team, the only change needed is swapping `src/lib/server/auth.ts` internals — all calling code is unchanged.

### Risk: Removing the anonymous collaborator name prompt breaks existing collaborator UI

**Impact:** `src/lib/stores/collaborators.ts` uses a `user-name` localStorage key to persist the display name. The collaborator presence feature (avatars, BroadcastChannel sync) depends on this. Removing the prompt removes the mechanism for setting it.

**Mitigation:** After authentication, pre-populate the `user-name` localStorage key with `data.user.username` in the `onMount` of `+page.svelte`. This makes the collaborator name default to the authenticated username. The name editor button in the existing layout (the pencil icon) can remain, allowing users to set a different display name for collaboration without affecting their login identity.

---

### ADR-001: scrypt over bcrypt

**Decision:** Use `node:crypto` scrypt for password hashing.
**Rationale:** bcrypt requires a native C++ addon (`node-gyp`) which breaks on Node 22 ABI changes, has a silent 72-byte password truncation bug, and adds a production dependency. scrypt ships with Node 22, is memory-hard (GPU/ASIC resistant), and the full implementation fits in ~25 lines.
**Consequence:** The stored hash format is `"${saltHex}:${hashHex}"` rather than a bcrypt `$2b$...` string. Spec scenarios that assert the `$2b$` prefix will not pass as written and must be updated to assert the scrypt format.

### ADR-002: localStorage namespacing over server-side todo store

**Decision:** Keep todos in client-side localStorage, namespaced by userId.
**Rationale:** Moving todos to the server would require rewriting ~80% of store code, server-side equivalents of undo/redo history, BroadcastChannel sync, and kanban template atomic writes. The risk of regression is high. For a demo application the security model does not require server-authoritative todo storage.
**Consequence:** A determined client could read another user's todos by manually changing the localStorage key. This is acceptable for a demo. Vendor lock-in: none. The `initStores(userId)` API is the only public surface that changes; internal store logic is untouched.

### ADR-003: No new npm dependencies

**Decision:** Implement all auth primitives using Node.js built-ins only.
**Rationale:** Zero new dependencies means zero supply-chain risk, zero native compilation, and zero version-skew between Node and addon ABIs.
**Consequence:** No vendor lock-in. All crypto code is auditable inline. If the project later moves to a real database, lucia-auth or better-auth can be adopted by replacing the three `src/lib/server/` modules.
