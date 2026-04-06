# Research: build-auth-system

## Decision: Custom server sessions + crypto.scrypt + thin localStorage namespacing

### Sessions — Custom in-memory Map + crypto.randomUUID()

**Selected.** Zero new dependencies — Node 22 ships `crypto.randomUUID()` built-in. The entire session module is ~35 lines: a `Map<sessionId, {userId, createdAt}>` with `createSession`/`getSession`/`deleteSession`. Cookie flags: `httpOnly: true`, `sameSite: 'strict'`, `path: '/'`, `secure` toggled on dev flag.

**Rejected alternatives:**
- **lucia-auth** — v3 dropped built-in in-memory adapter; you'd still write the Map logic while paying ~400KB dependency cost. Lucia's value is audited DB adapters — there is no DB here.
- **Cookies-only (no server store)** — Storing userId directly in cookie makes logout non-invalidating, violating the spec requirement.

### Passwords — Node.js crypto.scrypt

**Selected.** Zero new dependencies, ships with Node 22, memory-hard (GPU/ASIC resistant), benchmarked at ~112ms with N=32768. Manual salt management adds ~15 lines. Uses `timingSafeEqual` for timing-safe comparison.

**Rejected alternatives:**
- **bcrypt** — Native C++ addon requires node-gyp rebuild for Node 22 ABI. Silent 72-byte password truncation is a correctness footgun.
- **argon2** — Strongest algorithm but also requires native addon. Security uplift over scrypt is marginal for an in-memory demo store.

### Data Store — Thin server layer with namespaced localStorage

**Selected.** Server handles only auth (session cookie -> userId). Client-side localStorage keys become `todos_${userId}`, `kanban-state_${userId}`, etc. ~10 lines changed per store, zero behavior change, zero regression risk. Undo/redo, BroadcastChannel sync, kanban templates all work unchanged.

**Rejected alternatives:**
- **Full server migration** — Rewrites ~80% of store code, routes every mutation through server actions. High regression risk (undo/redo, BroadcastChannel, template atomic writes all need server equivalents). Overkill for a demo.
- **Hybrid (optimistic + server)** — Most moving parts; dual-write logic drifts from server logic over time. Complexity without clear benefit.

### Implementation Files

| Module | Path | Purpose |
|--------|------|---------|
| Session store | `src/lib/server/sessions.ts` | Map-based session CRUD |
| Auth helpers | `src/lib/server/auth.ts` | Password hash/verify with crypto.scrypt |
| User store | `src/lib/server/users.ts` | In-memory user accounts Map |
| Hooks | `src/hooks.server.ts` | Cookie read, session lookup, redirect guard |
| Types | `src/app.d.ts` | Extend App.Locals with user type |
| Login route | `src/routes/login/` | +page.svelte, +page.server.ts |
| Register route | `src/routes/register/` | +page.svelte, +page.server.ts |
| Layout | `src/routes/+layout.server.ts` | Pass user to all pages |
| Stores | `src/lib/stores/*.ts` | Namespace localStorage keys by userId |

### Rationale

All three decisions optimize for the same axis: **zero new dependencies, minimal migration surface, maximal compatibility with existing code.** The app is a demo — the threat model doesn't justify argon2 or a full server-side data layer. The thin approach keeps all existing client-side features (undo/redo, kanban templates, BroadcastChannel sync) working without modification while adding real authentication and per-user data isolation.
