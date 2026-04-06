# Tasks for build-auth-system

## Batch 1 (no dependencies)

- [ ] **Task 1.1: Create session store module**
  - **Files**: `src/lib/server/sessions.ts` (create new)
  - **Action**: Implement a module-scoped `Map<string, Session>` where `Session = { userId: string; createdAt: string }`. Export three functions: `createSession(userId: string): string` generates a UUID via `crypto.randomUUID()`, stores the record, and returns the session ID; `getSession(sessionId: string): Session | undefined` returns the record or undefined; `deleteSession(sessionId: string): void` removes the record. Add a JSDoc comment noting the Map resets on server restart.
  - **Verify**: Import the module in a scratch script and call all three functions: create returns a UUID string, get returns the session after create, get returns undefined after delete.
  - **Done**: `sessions.ts` exports `createSession`, `getSession`, `deleteSession` with correct TypeScript types; the `Session` interface is exported; no external dependencies are imported.

- [ ] **Task 1.2: Create password hashing module**
  - **Files**: `src/lib/server/auth.ts` (create new)
  - **Action**: Implement password helpers using `node:crypto` scrypt only. Export `hashPassword(password: string): Promise<string>` which generates 16 random bytes as salt, runs `scrypt` with `N=32768, r=8, p=1, dkLen=64`, and returns `"${saltHex}:${hashHex}"`. Export `verifyPassword(password: string, stored: string): Promise<boolean>` which splits the stored string on `:`, re-derives the hash from the same salt, and compares using `timingSafeEqual`. Define `SCRYPT_N = 32768` as a named constant at module top.
  - **Verify**: Call `hashPassword('testpass')` and confirm the result contains a `:` separator and never equals the plaintext. Call `verifyPassword('testpass', hash)` and confirm it returns `true`; call with a wrong password and confirm `false`.
  - **Done**: `auth.ts` exports `hashPassword` and `verifyPassword` with correct `Promise<string>` and `Promise<boolean>` return types; no plaintext passwords appear in stored format; imports only `node:crypto`.

- [ ] **Task 1.3: Create user store module**
  - **Files**: `src/lib/server/users.ts` (create new)
  - **Action**: Implement a module-scoped `Map<string, User>` where `User = { id: string; username: string; passwordHash: string; createdAt: string }`. Export `createUser(username: string, password: string): Promise<User>` which validates that username is non-empty, normalises it to lowercase, enforces minimum 8-character password length, checks uniqueness in the Map, calls `hashPassword` from `auth.ts`, stores the record with `crypto.randomUUID()` as id, and returns the user. Throw typed errors for validation failures: `{ code: 'USERNAME_REQUIRED' }`, `{ code: 'PASSWORD_TOO_SHORT' }`, `{ code: 'USERNAME_TAKEN' }`. Export `findUser(username: string): User | undefined` which looks up by lowercase username.
  - **Verify**: Call `createUser('Alice', 'password123')` and confirm a user with lowercase `alice` username is stored; call again with `alice` and confirm an error with code `USERNAME_TAKEN`; call with password `short` and confirm `PASSWORD_TOO_SHORT`.
  - **Done**: `users.ts` exports `createUser`, `findUser`, and the `User` interface; password is never stored in plaintext; import of `auth.ts` uses a `.js` extension.

- [ ] **Task 1.4: Extend App.Locals types in app.d.ts**
  - **Files**: `src/app.d.ts` (modify existing)
  - **Action**: Replace the commented-out `interface Locals {}` and `interface PageData {}` stubs with active declarations. Add `interface LocalUser { id: string; username: string }` inside the `App` namespace. Declare `interface Locals { user?: LocalUser }` and `interface PageData { user?: LocalUser }` so all SvelteKit route files get typed access to `event.locals.user` and `data.user`.
  - **Verify**: Run `npx tsc --noEmit` and confirm no type errors in `src/app.d.ts`. In a route file, write `event.locals.user?.id` and confirm TypeScript resolves it as `string | undefined` without casting.
  - **Done**: `app.d.ts` contains active (non-commented) `Locals` and `PageData` interfaces with `user?: LocalUser`; the `LocalUser` interface is declared inside the `App` namespace; the file still exports `{}` at bottom.

---

## Batch 2 (depends on Batch 1)

- [ ] **Task 2.1: Create hooks.server.ts request guard**
  - **Files**: `src/hooks.server.ts` (create new)
  - **Action**: Implement the SvelteKit `handle` hook. Import `getSession` from `$lib/server/sessions.js` and `findUser` from `$lib/server/users.js`. In the handler: read `event.cookies.get('session_id')`; if present, call `getSession` then `findUser` and assign `event.locals.user = { id: user.id, username: user.username }` if both resolve. Define `PUBLIC_PATHS = ['/login', '/register']`. If `event.locals.user` is undefined and `event.url.pathname` is not in `PUBLIC_PATHS`, throw `redirect(303, '/login')` from `@sveltejs/kit`. Otherwise call `resolve(event)`.
  - **Verify**: Start the dev server and navigate to `/` without a cookie — confirm redirect to `/login`. Navigate to `/login` without a cookie — confirm no redirect.
  - **Done**: `hooks.server.ts` exports `handle`; unauthenticated requests to protected routes receive 303 redirect to `/login`; `/login` and `/register` pass through without redirect; `event.locals.user` is set for valid sessions.

- [ ] **Task 2.2: Create layout server load function**
  - **Files**: `src/routes/+layout.server.ts` (create new)
  - **Action**: Export a `load` function of type `LayoutServerLoad`. Read `event.locals.user` and return `{ user: event.locals.user ?? null }`. The hook guarantees authenticated pages always have a user; the null fallback covers the `/login` and `/register` public routes where `user` is undefined.
  - **Verify**: Log the return value of the load function during a request to `/login` (expect `{ user: null }`) and during an authenticated request to `/` (expect `{ user: { id: '...', username: '...' } }`).
  - **Done**: `+layout.server.ts` exports `load` typed with `LayoutServerLoad` from `./$types.js`; it returns `{ user }` where `user` is either the `LocalUser` shape or null; no other logic is present.

- [ ] **Task 2.3: Create login route**
  - **Files**: `src/routes/login/+page.server.ts` (create new), `src/routes/login/+page.svelte` (create new)
  - **Action**: In `+page.server.ts`, export a `load` function that redirects to `/` if `event.locals.user` is defined. Export a `default` form action that reads `username` and `password` from `request.formData()`, calls `findUser`, calls `verifyPassword`, and on success calls `createSession`, sets the `session_id` cookie with `httpOnly: true, sameSite: 'strict', path: '/', secure: dev === false` using `$app/environment`'s `dev` flag, and throws `redirect(303, '/')`. On any failure (unknown user or wrong password) return `fail(400, { error: 'Invalid credentials' })` without distinguishing the two cases. In `+page.svelte`, render a centered card with a `<form method="POST">` containing username and password inputs, a submit button, an inline error display when `form?.error` is set, and a link to `/register`.
  - **Verify**: Submit the login form with invalid credentials — confirm the error message "Invalid credentials" is shown and no redirect occurs. Register a user in a separate test, then log in with correct credentials — confirm redirect to `/`.
  - **Done**: `+page.server.ts` exports `load` and `actions.default`; the form action returns the same error string for bad username and bad password; on success the `session_id` cookie is set and the response is a 303 to `/`; `+page.svelte` renders a form with username, password, error display, and a link to `/register`.

- [ ] **Task 2.4: Create register route**
  - **Files**: `src/routes/register/+page.server.ts` (create new), `src/routes/register/+page.svelte` (create new)
  - **Action**: In `+page.server.ts`, export a `load` function that redirects to `/` if the user is already authenticated. Export a `default` form action that reads `username` and `password` from `request.formData()`, calls `createUser`, and on success calls `createSession`, sets the same `session_id` cookie as login, and throws `redirect(303, '/')`. Catch the typed user-store errors and map them to `fail(400, { error: string })` responses: `USERNAME_REQUIRED` -> `"Username is required"`, `PASSWORD_TOO_SHORT` -> `"Password must be at least 8 characters"`, `USERNAME_TAKEN` -> `"Username is already taken"`. In `+page.svelte`, mirror the login form layout with username and password fields, inline error display, and a link to `/login`.
  - **Verify**: Submit the register form with a duplicate username — confirm "Username is already taken" is shown. Submit with a 5-character password — confirm "Password must be at least 8 characters". Submit valid new credentials — confirm redirect to `/`.
  - **Done**: `+page.server.ts` exports `load` and `actions.default`; each validation path returns the correct error string; successful registration sets the session cookie and redirects to `/`; `+page.svelte` renders a form with the correct fields and a link to `/login`.

---

## Batch 3 (depends on Batch 2)

- [ ] **Task 3.1: Add logout action to main page server**
  - **Files**: `src/routes/+page.server.ts` (create new)
  - **Action**: Export a named `logout` form action. Read `event.cookies.get('session_id')` and call `deleteSession` if the value is present. Delete the cookie by calling `event.cookies.set('session_id', '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 })`. Throw `redirect(303, '/login')`. No `load` function is needed — the hook enforces authentication and the layout server provides the user.
  - **Verify**: While authenticated, submit a POST to `/?/logout` (via the layout logout button added in Task 3.2). Confirm the `session_id` cookie is cleared and the browser lands on `/login`. Attempt to re-use the old session ID — confirm it does not authenticate.
  - **Done**: `+page.server.ts` exports `actions.logout`; the session is deleted from the server store; the cookie is cleared with `maxAge: 0`; the response is a 303 redirect to `/login`.

- [ ] **Task 3.2: Update layout to show auth UI**
  - **Files**: `src/routes/+layout.svelte` (modify existing)
  - **Action**: Add `let { data, children } = $props()` to receive layout server data. Import `enhance` from `$app/forms` for progressive enhancement. Add a header element above `{@render children()}` that displays `data.user?.username` and a `<form method="POST" action="/?/logout" use:enhance>` containing a logout button. This header should only render when `data.user` is not null. Preserve the existing `import '../app.css'` and `import '$lib/stores/theme.js'` lines. The name-prompt modal referenced in `+page.svelte` will be removed in Task 3.4; this task only adds the server-driven auth header.
  - **Verify**: Log in as a user and confirm the layout header shows the username and a logout button. Visit `/login` and confirm the header does not render (user is null).
  - **Done**: `+layout.svelte` renders a header with username and logout form when `data.user` is non-null; the layout compiles without TypeScript errors; existing children rendering is preserved.

- [ ] **Task 3.3: Namespace localStorage keys in store modules**
  - **Files**: `src/lib/stores/todos.ts` (modify), `src/lib/stores/kanban.ts` (modify), `src/lib/stores/labels.ts` (modify)
  - **Action**: In each store file, add an `initStores` export (or per-store equivalent) that accepts `userId: string` and re-keys the localStorage entries. Specifically: in `todos.ts` add `export function initTodos(userId: string): void` which calls `todos.set(loadTodos(userId))` where `loadTodos` now accepts an optional `userId` and uses `` `todos_${userId}` `` as the key when provided, falling back to `'todos'` for backward compatibility. Update the `todos.subscribe` persister to write to the same namespaced key. Apply the same pattern to `kanban.ts` (key: `` `kanban-state_${userId}` ``, function: `initKanban`) and `labels.ts` (key: `` `labels_${userId}` ``, function: `initLabels`). The `SORT_STORAGE_KEY`, `VIEW_PREF_STORAGE_KEY`, and `theme-preference` keys are not namespaced. Export a single `initStores(userId: string): void` function from each file that calls the respective init function — or export one combined `initStores` from a new `src/lib/stores/index.ts` barrel that calls all three.
  - **Verify**: After calling `initStores('user-abc')`, add a todo and confirm it appears under `localStorage.getItem('todos_user-abc')`, not `localStorage.getItem('todos')`.
  - **Done**: Each store module exports its init function; `localStorage.setItem` calls in the subscribe callbacks use the namespaced key after `initStores` is called; unnamespaced key is used only before `initStores` is called (backward compatibility guard); no existing store mutation function signatures change.

- [ ] **Task 3.4: Update main page to initialize stores with userId**
  - **Files**: `src/routes/+page.svelte` (modify existing)
  - **Action**: Add `let { data } = $props()` to receive layout-inherited `data.user`. At the top of the `onMount` callback, before `initPresence()`, call `initStores(data.user.id)` imported from `$lib/stores/todos.js` (or the barrel). Pre-populate the collaborator display name by calling `updateSelfName(data.user.username)` if the collaborator store has not been set yet, so the presence avatars show the authenticated username. Remove the `showNamePrompt` state variable, the `confirmName`, `dismissPrompt` functions, and the name-prompt modal markup block (the block that renders when `showNamePrompt === true`). Keep the `showNameEditor` state and the pencil-icon name editor (design note: the editor allows changing the collaboration display name independently of login identity). Add `ownerId: data.user.id` to the object literal inside `addTodo` if todos are created directly in this component — otherwise this will be enforced at the store level in Task 3.3.
  - **Verify**: Log in, navigate to `/`, add a todo, refresh — confirm the todo persists under the namespaced key. Log in as a second user in a different browser profile, confirm they see an empty list. Confirm the name-prompt modal is gone.
  - **Done**: `+page.svelte` calls `initStores(data.user.id)` before any store reads; name-prompt modal is removed; collaboration display name defaults to the authenticated username; TypeScript compiles without errors.

---

## Batch 4 (depends on Batch 1)

- [ ] **Task 4.1: Tests for sessions.ts**
  - **Files**: `src/lib/server/sessions.test.ts` (create new)
  - **Action**: Write Vitest tests covering: `createSession` returns a UUID-format string; `getSession` returns the session after creation; `getSession` returns undefined for an unknown ID; `deleteSession` removes the session so `getSession` returns undefined afterward; creating two sessions with the same userId returns different session IDs.
  - **Verify**: Run `npx vitest run src/lib/server/sessions.test.ts` — all tests pass.
  - **Done**: Test file has at least 5 `it` blocks, all passing; no imports outside `node:crypto`, `vitest`, and `./sessions.js`.

- [ ] **Task 4.2: Tests for auth.ts**
  - **Files**: `src/lib/server/auth.test.ts` (create new)
  - **Action**: Write Vitest tests covering: `hashPassword` returns a string containing `:`; `hashPassword` never returns the plaintext password; `verifyPassword` returns true for the correct password; `verifyPassword` returns false for an incorrect password; `verifyPassword` returns false when the stored string is malformed (no `:` separator). Use `expect.assertions` counts to guard async paths.
  - **Verify**: Run `npx vitest run src/lib/server/auth.test.ts` — all tests pass. Note: scrypt is intentionally slow; tests may take 1-2 seconds.
  - **Done**: Test file has at least 5 `it` blocks, all passing; no imports outside `vitest` and `./auth.js`.

- [ ] **Task 4.3: Tests for users.ts**
  - **Files**: `src/lib/server/users.test.ts` (create new)
  - **Action**: Write Vitest tests covering: `createUser` returns a user with a UUID id and lowercase username; the stored `passwordHash` is not plaintext; `createUser` throws `USERNAME_TAKEN` for a duplicate username (case-insensitive: registering `Alice` then `alice` should fail); `createUser` throws `PASSWORD_TOO_SHORT` for passwords shorter than 8 characters; `createUser` throws `USERNAME_REQUIRED` for an empty username; `findUser` returns undefined for unknown usernames; `findUser` returns the user after creation. Use `beforeEach` to reset module state by re-importing via a dynamic import or by calling a test-only `clearUsers()` export (add that export guarded by `if (process.env.NODE_ENV === 'test')`).
  - **Verify**: Run `npx vitest run src/lib/server/users.test.ts` — all tests pass.
  - **Done**: Test file has at least 7 `it` blocks, all passing; module state is isolated between tests.

---

## Batch 5 (depends on Batches 2, 3, 4)

- [ ] **Task 5.1: Integration smoke test for auth flow**
  - **Files**: `src/lib/server/auth-integration.test.ts` (create new)
  - **Action**: Write Vitest tests that simulate the full flow end-to-end at the module level (no HTTP): register a user via `createUser`, verify the user exists via `findUser`, verify the password via `verifyPassword`, create a session via `createSession`, resolve the session via `getSession`, confirm `userId` matches, delete the session via `deleteSession`, and confirm `getSession` now returns undefined. Include a test that verifies the login rejection path: `createUser` succeeds, `verifyPassword` with the wrong password returns false, and no session is created.
  - **Verify**: Run `npx vitest run src/lib/server/auth-integration.test.ts` — all tests pass.
  - **Done**: Test file has at least 2 `it` blocks (happy path and rejection path), all passing; test imports only from the three server module `.js` paths and vitest.

- [ ] **Task 5.2: Todo ownerId field addition**
  - **Files**: `src/lib/stores/todos.ts` (modify)
  - **Action**: Add `ownerId: string` to the `Todo` interface after `createdAt`. Update `addTodo` to accept an `ownerId: string` parameter and include it in the created object literal. Update the `loadTodos` mapper to include `ownerId: (t.ownerId as string) ?? ''` so existing persisted todos without the field do not cause runtime errors. Update `applyTemplate` in `kanban.ts` (which creates todos directly) to pass an empty string as `ownerId` since template todos are pre-populated data, not user-created.
  - **Verify**: Call `addTodo('Test', actorId, 'user-abc')` (updated signature) and confirm the resulting todo object has `ownerId === 'user-abc'`. Load a legacy todo JSON (without `ownerId`) through `loadTodos` and confirm it parses without error, defaulting to `''`.
  - **Done**: `Todo` interface includes `ownerId: string`; `addTodo` accepts and stores `ownerId`; `loadTodos` deserialises legacy records without throwing; TypeScript compiles with `--strict` without errors.

- [ ] **Task 5.3: Wire ownerId in page.svelte addTodo calls**
  - **Files**: `src/routes/+page.svelte` (modify)
  - **Action**: Update all `addTodo(...)` call sites in `+page.svelte` and any component that directly calls it (check `TodoInput.svelte`) to pass `data.user.id` as the `ownerId` argument. Since `+page.svelte` passes `data` down as a prop or via context, ensure `TodoInput.svelte` has access to the userId either as a prop or via the Svelte context API. Prefer adding a `userId` prop to `TodoInput` and passing `data.user.id` from `+page.svelte`.
  - **Verify**: Add a todo while authenticated, inspect `localStorage.getItem('todos_<userId>')` — confirm the stored todo has `ownerId` equal to the logged-in user's id.
  - **Done**: Every `addTodo` call includes a correct `ownerId` from `data.user.id`; `TodoInput.svelte` accepts a `userId: string` prop typed in its `$props()` destructure; TypeScript compiles without errors.
