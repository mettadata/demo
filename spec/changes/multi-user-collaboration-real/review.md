# Code Review: multi-user-collaboration-real

## Summary
The multi-user collaboration implementation uses BroadcastChannel for same-origin tab sync with presence heartbeats. The overall attack surface is limited (same-origin, client-only), but there are meaningful input validation gaps on the BroadcastChannel receive path and minor DOM injection vectors through user-controlled data rendered in style attributes.

## Issues Found

### Critical (must fix)

(none)

### Major (should fix)

- **src/lib/sync/broadcastSync.ts:68** -- No payload validation on received BroadcastChannel messages. The `event.data` is cast via `as SyncMessage` (line 68) with zero runtime validation. Any script running on the same origin (e.g., a browser extension content script, an XSS in another same-origin app) can post arbitrary data to the `"metta-todo-sync"` channel. A malformed `todos-updated` payload (e.g., objects with `__proto__` keys, missing required fields, non-string `id` values, or payloads containing `<script>` in text fields) will be passed directly to `todos.set()` and `kanbanState.set()`. While Svelte's template rendering does escape text content by default, the lack of schema validation means the stores will accept structurally invalid data that could cause runtime exceptions or undefined behavior downstream.

- **src/lib/stores/collaborators.ts:104-108** -- Heartbeat payload from BroadcastChannel is consumed without validation. The `payload.id`, `payload.name`, and `payload.color` fields are used directly from the incoming message. A malicious same-origin script could inject arbitrary strings into `name` and `color`. The `color` value is rendered directly in a `style` attribute (see KanbanBoard.svelte:148 and KanbanCard.svelte:226), which creates a CSS injection vector. While modern browsers block `expression()` and `url()` in inline styles from executing JS, a crafted `color` value like `red; position:fixed; width:100vw; height:100vh; z-index:9999` could be used for UI redressing/clickjacking within the page.

### Warnings (should fix)

- **src/lib/components/KanbanBoard.svelte:143-144** -- User-controlled `$self.color` is interpolated directly into a `style` attribute via `style="background-color: {$self.color}"`. Since `self.color` is derived deterministically from `deriveColor()` using the AVATAR_PALETTE array (collaborators.ts:12-15), the local user's color is safe. However, the same pattern at line 148 uses `collaborator.color` from a remote heartbeat, which is not validated against the palette. A remote tab (or malicious script) could send an arbitrary CSS string as `color`.

- **src/lib/components/KanbanCard.svelte:226** -- Same CSS injection risk as above: `style="background-color: {lastActorAvatar.color}"` where `color` ultimately comes from either `self.color` (safe) or a remote collaborator's `color` field (unvalidated).

- **src/routes/+page.svelte:60** -- Remote `todos-updated` payloads are applied via `todos.set(t)` with no validation. This replaces the entire local todo store with whatever the remote tab sent. A malicious payload could include todos with extremely large `dataUrl` strings in attachments, potentially causing localStorage quota exhaustion or browser tab crashes. There is no size guard or structural check.

- **src/lib/stores/collaborators.ts:43-44** -- The `user-id` (a UUID) is stored in localStorage under a generic key name `"user-id"`. Any same-origin JavaScript can read this value. While UUIDs are not secrets per se, this identifier is used as the sole "identity" for attributing actions. Another same-origin script could read and spoof it. This is an inherent limitation of the localStorage-based architecture but worth noting.

- **src/lib/stores/collaborators.ts:49** -- The `user-name` is stored in localStorage under `"user-name"`. Same concern as above -- any same-origin code can read and modify it. Not a vulnerability in the current threat model (same-origin, no server) but worth documenting.

### Suggestions (nice to have)

- **src/lib/sync/broadcastSync.ts:66-84** -- Consider adding lightweight runtime validation (e.g., check `Array.isArray(msg.payload)` for `todos-updated`, check `msg.payload && Array.isArray(msg.payload.columns)` for `kanban-updated`, and check `typeof payload.id === 'string'` for heartbeats). This would guard against malformed data causing store corruption without requiring a full Zod schema.

- **src/lib/stores/collaborators.ts:104-108** -- Consider validating that `payload.color` matches the expected hex color pattern (`/^#[0-9a-f]{6}$/i`) before inserting it into the collaborator record. This would eliminate the CSS injection vector entirely.

- **src/lib/stores/collaborators.ts:26-36** -- The `getInitials()` function handles empty/whitespace names but does not cap the length of the returned string in edge cases. If a remote collaborator sends a `name` that is a single Unicode character, `word.slice(0, 2)` returns a 1-char string, which is fine. No actual bug, but adding a `substring(0, 2)` guard on the final return would make the contract explicit.

- **src/routes/+page.svelte:60** -- The spec requires that remote mutations bypass the snapshot/undo mechanism. The current implementation calls `todos.set(t)` directly (not via `addTodo`/`toggleTodo`), which does bypass snapshot. This is correct but fragile -- if someone later changes this to call mutation functions, it would break. A comment documenting this design decision would help.

- **src/lib/stores/todos.ts:55** -- The `STORAGE_KEY` is the bare string `"todos"`. In a multi-app same-origin scenario, this could collide with another app's localStorage key. Consider namespacing (e.g., `"metta-todo-todos"`).

## Secrets and Credentials

No secrets, API keys, tokens, or credentials were found in any of the reviewed files. The `crypto.randomUUID()` value is a local browser identifier, not a secret.

## Verdict
PASS_WITH_WARNINGS

The implementation is sound for the stated threat model (same-origin, client-only, no server). The two major items (lack of BroadcastChannel payload validation and CSS injection via unvalidated `color` in style attributes) should be addressed before this feature is considered hardened, but they are not exploitable in a critical way given the same-origin constraint and Svelte's default text escaping. The missing input validation on the receive path is the most important item to fix, as it affects data integrity and application stability.
