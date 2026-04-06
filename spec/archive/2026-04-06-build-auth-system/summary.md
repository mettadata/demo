# Implementation Summary: build-auth-system

## What was built

Cookie-based authentication with per-user todo isolation for the SvelteKit demo todo app. Zero new npm dependencies — all crypto from Node.js built-ins.

## Files created

| File | Purpose |
|------|---------|
| `src/lib/server/sessions.ts` | In-memory Map session store with create/get/delete |
| `src/lib/server/auth.ts` | Password hashing via crypto.scrypt (salt:hash format) |
| `src/lib/server/users.ts` | In-memory user accounts with validation |
| `src/hooks.server.ts` | Session cookie reader, redirect guard for protected routes |
| `src/routes/+layout.server.ts` | Passes user to all pages via layout load |
| `src/routes/+page.server.ts` | Logout form action |
| `src/routes/login/+page.server.ts` | Login load + form action |
| `src/routes/login/+page.svelte` | Login form UI |
| `src/routes/register/+page.server.ts` | Register load + form action |
| `src/routes/register/+page.svelte` | Register form UI |
| `src/lib/stores/init.ts` | Combined store initialization barrel |

## Files modified

| File | Change |
|------|--------|
| `src/app.d.ts` | Added LocalUser, Locals, PageData types |
| `src/routes/+layout.svelte` | Added auth header with username + logout |
| `src/routes/+page.svelte` | Init stores with userId, removed name prompt |
| `src/lib/stores/todos.ts` | Added ownerId field, namespaced localStorage keys |
| `src/lib/stores/kanban.ts` | Namespaced localStorage keys, ownerId in templates |
| `src/lib/stores/labels.ts` | Namespaced localStorage keys |
| `src/lib/components/TodoInput.svelte` | Added userId prop for ownerId |

## Tests added

| File | Coverage |
|------|----------|
| `src/lib/server/sessions.test.ts` | 5 tests: CRUD + uniqueness |
| `src/lib/server/auth.test.ts` | 5 tests: hash format, verify correct/incorrect/malformed |
| `src/lib/server/users.test.ts` | 7 tests: create, validation errors, find |
| `src/lib/server/auth-integration.test.ts` | 2 tests: full flow + rejection path |

## Key decisions

- **crypto.scrypt** over bcrypt (zero deps, no native addon)
- **Thin server layer** — auth only, localStorage namespaced by userId
- **Same error message** for bad username/password on login (prevents enumeration)
- **In-memory store** resets on server restart (demo-friendly)
