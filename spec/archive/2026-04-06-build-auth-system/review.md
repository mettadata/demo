# Review: build-auth-system

## Correctness Review — PASS_WITH_WARNINGS

### Fixed Issues
- `+page.server.ts:12` — `redirect()` was missing `throw` (logout would not redirect). **Fixed.**
- `register/+page.server.ts:8` — Unnecessary `as Record<string, unknown>` cast on locals. **Fixed.**

### Remaining Warnings
- `hooks.server.ts` — PUBLIC_PATHS uses exact string match; trailing slashes or query strings won't match. Acceptable for demo scope.
- `kanban.ts:129` — `getInitialTodoIds()` runs at module load before `currentUserId` is set. Uses default key, which is backward-compatible.
- `kanban.ts:260` — `applyTemplate` creates todos with `ownerId: ''`. Acceptable — template todos are pre-populated data.

### Spec Deviation (Accepted)
The spec references bcrypt but research.md and design.md document the deliberate choice of crypto.scrypt (zero dependencies, no native addon). This is an accepted architectural decision.

## Security Review — PASS_WITH_WARNINGS

### Fixed Issues
- `+page.server.ts` — Logout cookie was missing `secure` flag. **Fixed.**

### Remaining Warnings
- No maximum password length. Could allow CPU exhaustion via very large passwords. Acceptable for demo scope (no rate limiting either).
- No session expiration/TTL. Sessions live until server restart or logout. Out of scope per intent.

### Verified Secure
- scrypt with N=32768, proper salt, timingSafeEqual for comparison
- httpOnly, sameSite strict, secure cookie flags
- Consistent "Invalid credentials" message (no user enumeration)
- SvelteKit auto-escaping prevents XSS
- SvelteKit built-in CSRF protection on form actions

## Quality Review — PASS_WITH_WARNINGS

### Fixed Issues
- `+page.server.ts` — Missing `throw` on redirect. **Fixed.**
- `register/+page.server.ts` — Unnecessary type cast. **Fixed.**

### Remaining Warnings
- Cookie settings duplicated across 3 files (login, register, logout). Could extract to shared constant. Low priority for demo.
- `findUserById` lacks dedicated test coverage (exercised indirectly via integration test).
- `auth.test.ts` mocks scrypt params for speed. Production hashing code exercised in integration test.
- `currentUserId` pattern duplicated across 3 store files. Could extract. Low priority.

## Overall Verdict: PASS_WITH_WARNINGS

All critical issues have been fixed. Remaining warnings are acceptable for demo scope.
