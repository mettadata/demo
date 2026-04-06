# Code Review: notification-system-alerts-due

## Summary
The notification system implementation is largely correct and well-structured. The core flows (push/dismiss/clearAll, due date checking, mention parsing, board activity diffing, toast auto-dismiss) all function as intended. There are two correctness issues with the eviction logic and a race condition in lazy imports that warrant attention, plus a minor spec deviation in cleanup lifecycle.

## Issues Found

### Critical (must fix)

- **src/lib/stores/notifications.ts:29** -- Eviction removes wrong record when array is not time-ordered. The spec requires "remove the oldest record (lowest `createdAt`)" but `queue.slice(1)` removes index 0, which is not guaranteed to have the lowest `createdAt`. When a notification arrives via BroadcastChannel with an earlier timestamp, it is appended at the end, making index 0 potentially newer than the last element. The eviction should find and remove the record with the minimum `createdAt` value, e.g.:
  ```
  const oldestIdx = queue.reduce((mi, n, i, a) => n.createdAt < a[mi].createdAt ? i : mi, 0);
  const next = [...queue.slice(0, oldestIdx), ...queue.slice(oldestIdx + 1)];
  ```

### Warnings (should fix)

- **src/lib/sync/broadcastSync.ts:163** -- Race condition on lazy import resolution. `ensureLazyImports()` is async but the `handler` function on line 165 is synchronous. If a `kanban-updated` BroadcastChannel message arrives before the dynamic `import()` calls on lines 57-60 resolve, `_kanbanState`, `_todos`, and `_push` will all be `null`, causing the activity notification path on line 181 to silently skip. The first kanban update from another tab after page load could be missed entirely. Consider awaiting resolution before attaching the handler, or re-processing the first missed message.

- **src/lib/stores/notifications.ts:23-25** -- Unsafe type cast to extract `id` and `createdAt` from an `Omit<Notification, 'id' | 'createdAt'>` parameter. The function signature says these fields are omitted, but the body casts `(notification as Notification).id` to read them. This works at runtime when the BroadcastChannel handler passes a full `Notification` object (line 73), but it circumvents TypeScript's type system. A cleaner approach would be to accept `Partial<Pick<Notification, 'id' | 'createdAt'>> & Omit<Notification, 'id' | 'createdAt'>` or use an internal overload.

- **src/lib/stores/notifications.ts:62-89** -- A second `BroadcastChannel('metta-todo-sync')` instance is created inside the notifications module, separate from the `channel` export in `broadcastSync.ts`. Messages are posted via the `broadcastSync.channel` (line 36) but received on this separate instance. While BroadcastChannel semantics allow this, it creates two independent channel objects for the same logical channel, making the architecture harder to reason about and potentially leading to subtle ordering issues.

- **src/routes/+page.svelte:54-98** -- Spec requires `startDueDateChecker()` cleanup in an `onDestroy` callback, but the code uses the `onMount` return function instead. While Svelte 5 runs `onMount` return functions on destroy (making this functionally equivalent), the spec explicitly states "MUST call the returned cleanup function in the `onDestroy` callback." This is a spec compliance deviation.

### Suggestions (nice to have)

- **src/lib/notifications/dueDateChecker.ts:6** -- The module-level `notifiedIds` Set is never cleared. During development with HMR, or if `startDueDateChecker` were called more than once, stale IDs would persist and suppress legitimate notifications. Consider clearing the set in the cleanup function or scoping it inside `startDueDateChecker`.

- **src/lib/stores/todos.ts:325-361 and 392-433** -- The mention detection logic in `addComment` and `addReply` is duplicated verbatim (lines 345-360 and 417-432). Extract a shared helper like `detectAndNotifyMentions(trimmed, todoId, actorId)` to reduce duplication and ensure both paths stay in sync during future changes.

- **src/lib/components/Toast.svelte:28** -- If `remaining` somehow reaches exactly 0 during `pauseTimer`, `dismiss(id)` is called immediately. However, `remaining` could theoretically go slightly negative due to timer imprecision (`Date.now() - startedAt` could exceed `remaining`). The `<= 0` check handles this correctly, but the negative value is then stored in `remaining`. This is harmless since the subsequent `resumeTimer` check `remaining > 0` prevents re-scheduling, but clamping to 0 would be cleaner.

- **src/lib/sync/broadcastSync.ts:100-153** -- `diffKanbanStates` does not detect column deletion. If a column is removed in another tab, no notification is generated. The spec does not require this, so it is not a bug, but it could be a useful future addition.

- **src/lib/components/Toaster.svelte:11** -- `[...$notifications].reverse()` creates two array copies on every render. For a max of 5 items this is negligible, but a `{#each}` block iterating in reverse index order would avoid the allocations.

## Verdict
NEEDS_CHANGES

### Required fixes:
1. **notifications.ts:29** -- Eviction must remove the record with the lowest `createdAt`, not simply the first array element. This directly violates the spec scenario "push at capacity evicts the oldest record."
