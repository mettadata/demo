# build-auth-system

## Problem

The todo app has no authentication. Any user who opens the app sees and mutates a single shared todo list. Identity is a disposable client-side artifact — a UUID and display name stored in `localStorage` — that disappears when the browser clears storage and carries no server-side meaning. There is no concept of ownership: every todo is visible to everyone, and nothing prevents one session from overwriting another user's data.

This affects anyone who wants to use the app as a personal tool. Because todos are not scoped to a user, the app cannot be shared across devices or browsers without data collisions, and it cannot be trusted as a private workspace. The collaborator presence system (heartbeat, color avatars, `BroadcastChannel` sync) further reinforces the assumption that all sessions share one workspace, which breaks down the moment a second real user opens the app expecting their own list.

## Proposal

Introduce a server-side authentication layer so that each user has a private, isolated todo list.

**Registration** — A new `/register` route provides a form with `username` and `password` fields. The server action validates that the username is unique and the password is at least 8 characters, hashes the password with `bcrypt` (or equivalent), and stores the account in an in-memory server-side user store. On success the user is redirected to the app as a logged-in session.

**Login** — A new `/login` route provides a form with `username` and `password` fields. The server action verifies credentials against the user store. On success it creates a server-side session record keyed to a cryptographically random session ID, sets an `httpOnly` `SameSite=Strict` cookie (`session_id`), and redirects to the app.

**Logout** — A form action (reachable from the main layout) invalidates the server-side session record and clears the `session_id` cookie, then redirects to `/login`.

**Session enforcement** — A SvelteKit `hooks.server.ts` `handle` function reads the `session_id` cookie on every request, resolves it to the authenticated user, and attaches the user to `event.locals`. Routes and load functions that require authentication MUST redirect unauthenticated requests to `/login`.

**Per-user todo isolation** — The server-side in-memory store MUST key todos by `userId`. Load functions MUST return only the authenticated user's todos. Form actions that create, update, or delete todos MUST scope all operations to `event.locals.user.id`. The `Todo` type gains an `ownerId: string` field.

**Data stores** — All todo, kanban column, and label state MUST be held in a server-side in-memory map keyed by `userId` so that a server restart produces a clean slate (demo-friendly). The existing `localStorage`-backed Svelte stores MAY be retained as a client-side cache layer for optimistic UI, but the server store is authoritative. The `BroadcastChannel` cross-tab sync MAY remain for same-user multi-tab use but MUST NOT leak data across users.

**Password policy** — Passwords MUST be at least 8 characters. No complexity rules beyond length are required.

**No email** — Accounts require only a username and password. No email address, no verification flow, no password reset.

## Impact

- **`src/hooks.server.ts` (new)** — Session resolution runs on every request; unauthenticated access to `/` redirects to `/login`.
- **`src/routes/+page.server.ts` (new)** — The main page gains a `load` function that reads `event.locals.user` and returns that user's todos and kanban state from the server store instead of relying solely on `localStorage`.
- **`src/lib/stores/todos.ts`** — The `Todo` interface gains `ownerId`. Store initialisation changes: initial state comes from the server `load` function via page data props, not a bare `localStorage.getItem` call.
- **`src/lib/stores/kanban.ts`** — Same change as `todos.ts`: initial column and card state is seeded from server-loaded data.
- **`src/lib/stores/collaborators.ts`** — The `initSelf` function currently generates or reads a `user-id` UUID from `localStorage`. After this change, the authenticated user's server-assigned ID and username MUST be used instead. The UUID generation path is removed for authenticated sessions.
- **`src/routes/+layout.svelte`** — The name-prompt modal (currently shown when `localStorage` has no `user-name`) is removed and replaced with a logout button and the authenticated username display.
- **`src/lib/sync/broadcastSync.ts`** — `BroadcastChannel` messages MUST be namespaced by `userId` so that two users on the same browser do not exchange todo updates.
- **Existing form actions** — Any SvelteKit form action that mutates todo/kanban/label state MUST be moved to or wrapped in server actions that enforce `event.locals.user`; currently there are no `+page.server.ts` files, so these are all net-new.

## Out of Scope

- **OAuth / social login** — No Google, GitHub, or any third-party identity provider.
- **Email addresses, verification, or password reset** — Accounts are username + password only; forgotten passwords require a server restart.
- **Persistent storage** — No database, no file-based persistence. The in-memory store resets on server restart by design.
- **Role-based access control** — All authenticated users have the same capabilities; there are no admin or read-only roles.
- **Sharing todos between users** — Per-user isolation is the goal; collaborative real-time editing across accounts is not part of this change.
- **Rate limiting or brute-force protection** — Login attempts are not throttled.
- **Session expiry or refresh tokens** — Sessions persist until explicit logout or server restart; sliding expiry and token rotation are not implemented.
- **HTTPS enforcement** — TLS termination is outside the scope of this SvelteKit app layer.
- **Collaborator presence across users** — The heartbeat/avatar presence system currently operates over `BroadcastChannel` (same-browser only) and is not extended to server-sent events or WebSockets for cross-user presence.
- **Account management** — No username change, password change, or account deletion flows.
