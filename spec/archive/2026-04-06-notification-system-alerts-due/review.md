# Code Review: notification-system-alerts-due

## Summary

The notification system is well-structured with clear separation of concerns across store, checker, sync, and UI layers. The main issues are: an eviction strategy that does not match the spec's "lowest createdAt" requirement, a type-safety hack to smuggle `id`/`createdAt` through an `Omit` type, duplicated mention-detection logic, a race condition on lazy imports, and several missing test scenarios from the spec.

## Issues Found

### Critical (must fix)

- **src/lib/stores/notifications.ts:29** -- Eviction removes `queue[0]` via `queue.slice(1)`, but the spec requires removing "the oldest record (lowest `createdAt`)". When a notification arrives from BroadcastChannel with an earlier `createdAt` and is appended at the end, `queue[0]` may not be the oldest by `createdAt`. The eviction must scan for the minimum `createdAt` value and remove that record.

- **src/lib/stores/notifications.ts:23-25** -- The function signature is `Omit<Notification, 'id' | 'createdAt'>` but the body casts `(notification as Notification).id` and `(notification as Notification).createdAt` to read fields that TypeScript says do not exist. This unsafe cast is relied upon by the BroadcastChannel handler (line 73) which passes a full `Notification` object. The function signature should use a union type or overload to express both use cases safely, e.g. `Omit<Notification, 'id' | 'createdAt'> & Partial<Pick<Notification, 'id' | 'createdAt'>>`.

### Warnings (should fix)

- **src/lib/stores/todos.ts:344-360 and 416-432** -- The mention-detection block in `addComment` and `addReply` is copy-pasted verbatim (18 lines identical logic). This violates DRY and creates a maintenance risk where a fix to one copy could miss the other. Extract a private helper function such as `detectAndNotifyMentions(todoId, trimmedBody, actorId)`.

- **src/lib/sync/broadcastSync.ts:163** -- Race condition on lazy import resolution. `ensureLazyImports()` is async but `handler` on line 165 is synchronous. If a `kanban-updated` message arrives before the dynamic `import()` calls on lines 57-60 resolve, `_kanbanState`, `_todos`, and `_push` will all be `null`, causing the activity notification path (line 181) to silently skip. The first kanban update from another tab after page load could be lost.

- **src/lib/stores/notifications.ts:62-89** -- The notifications module creates its own `BroadcastChannel('metta-todo-sync')` listener independently from the one in `broadcastSync.ts`. This means two separate channel instances exist for the same channel name. While functionally correct, it creates architectural inconsistency and makes message flow harder to trace.

- **src/routes/+page.svelte:54-98** -- The spec requires `startDueDateChecker()` cleanup in an `onDestroy` callback, but the code uses the `onMount` return function. While Svelte 5 runs `onMount` return functions on destroy (functionally equivalent), the spec explicitly states "MUST call the returned cleanup function in the `onDestroy` callback." This is a spec compliance deviation.

- **src/lib/stores/todos.test.ts (mention integration)** -- Missing test for `editReply` not triggering mention notifications. The spec scenario "editing a reply with a mention does not re-fire" (spec lines 155-158) has no corresponding test case. Only `editComment` is tested (line 1003).

- **src/lib/stores/todos.test.ts (mention integration)** -- Missing test for case-insensitive mention matching through the integration path. The spec scenario "mention is case-insensitive" (spec lines 136-138) where `@alice` (lowercase) triggers notification for user `Alice` is covered in the unit `parseMentions` tests but not in the `addComment` integration tests.

- **src/lib/stores/notifications.test.ts:101-116** -- The "push at capacity evicts oldest" test pushes 5 items sequentially, so the first element always has the earliest `createdAt`. This does not expose the Critical eviction bug above. A test should push items with out-of-order `createdAt` values and verify the one with the lowest `createdAt` is evicted regardless of array position.

### Security Findings

- **src/lib/stores/notifications.ts:22-26 -- Unvalidated object spread from BroadcastChannel (MAJOR).** The `push()` function spreads `...notification` into the record object. When called from the BroadcastChannel handler (line 73), the payload is an arbitrary object from another browsing context. The spread copies ALL enumerable own properties, including unexpected keys. A malicious same-origin script can set `id` and `createdAt` to chosen values (exploiting the fallback at lines 24-25), or inject extra properties that flow into Svelte component props. Recommend explicit property picking (allowlist `type`, `title`, `message` only) instead of spread.

- **src/lib/stores/notifications.ts:70-79 -- No schema validation on notification-pushed payload (MAJOR).** The handler checks `msg.payload.id` exists but does not validate that `type` is one of the allowed `NotificationType` values, or that `title` and `message` are strings with bounded length. A malicious same-origin tab can push notifications with arbitrary type values and oversized strings causing layout breakage.

- **src/lib/sync/broadcastSync.ts:171-173 -- Unvalidated todos array from BroadcastChannel replaces entire store (MAJOR).** The `todos-updated` handler only checks `Array.isArray(msg.payload)` before passing to `onTodos()`, which calls `todos.set(t)` and writes to localStorage. A malicious same-origin script can inject crafted todo objects. While Svelte escapes HTML in current templates, the data persists in localStorage. Any future `{@html}` usage would be immediately exploitable. Recommend Zod schema validation on inbound payloads.

- **src/lib/components/Toast.svelte:52-53 -- XSS via notification content: SAFE.** The `{title}` and `{message}` values use Svelte's standard text interpolation which auto-escapes HTML entities. No `{@html}` is used anywhere in Toast.svelte or Toaster.svelte.

- **src/lib/stores/todos.ts:64 -- Regex in parseMentions: SAFE.** The escape pattern correctly neutralizes all regex metacharacters. Lookbehind/lookahead are fixed-width, so catastrophic backtracking is not possible. No ReDoS risk.

- **No secrets or credentials found** in any reviewed file.

- **src/lib/stores/todos.ts:359,431 -- User-controlled text in notification messages without length limits (MINOR).** `todo?.text` and `commenterName` are unbounded user inputs. While Svelte escapes HTML, extremely long strings could cause toast layout overflow.

- **src/lib/notifications/dueDateChecker.ts:6 -- Unbounded notifiedIds Set (MINOR memory leak).** The Set grows monotonically; IDs are never removed even when todos are deleted or completed.

### Suggestions (nice to have)

- **src/lib/stores/notifications.ts:16** -- The exported `notifications` store is `Writable<Notification[]>`, meaning any consumer can call `.set()` or `.update()` directly, bypassing eviction logic and BroadcastChannel sync. Consider exporting a derived read-only store and keeping the writable private.

- **src/lib/notifications/dueDateChecker.ts:5-6** -- The module-level `notifiedIds` Set is never cleared between `startDueDateChecker` calls. During HMR or component remount, previously-notified IDs persist and suppress legitimate notifications. Consider clearing the set in the cleanup function or scoping it inside `startDueDateChecker`.

- **src/lib/components/Toast.svelte:9** -- `remaining` uses `$state(5000)` but is only read imperatively, never bound to the template. A plain `let` would be clearer since reactive tracking is unnecessary here.

- **src/lib/sync/broadcastSync.test.ts:167** -- `mockPush` is typed as `any` with an eslint-disable comment. Use `ReturnType<typeof vi.fn>` or vitest's `Mock` type instead.

- **src/lib/sync/broadcastSync.ts:100-153** -- `diffKanbanStates` does not detect column deletion. If a column is removed in another tab, no notification fires. The spec does not require this, but it could be a user-facing gap.

- **src/lib/components/Toaster.svelte:11** -- `[...$notifications].reverse()` creates two array copies per render. For a max of 5 items this is negligible, but iterating in reverse index order would be zero-allocation.

## Verdict
NEEDS_CHANGES

### Required fixes before merge:
1. **notifications.ts:29** -- Eviction must remove the record with the lowest `createdAt`, not the first array element. This directly violates the spec scenario "push at capacity evicts the oldest record."
2. **notifications.ts:23-25** -- Fix the type-unsafe cast. Use a proper type signature that explicitly accepts optional `id` and `createdAt` for channel-originated pushes.
3. **todos.test.ts** -- Add missing test for `editReply` not triggering mention notifications (spec scenario at lines 155-158).
