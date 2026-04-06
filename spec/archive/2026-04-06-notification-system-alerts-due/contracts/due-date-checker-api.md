# API Contract: Due Date Checker

**Module:** `src/lib/notifications/dueDateChecker.ts`

## Exported Symbols

### `startDueDateChecker`
```ts
export function startDueDateChecker(): () => void
```
Starts the overdue-detection polling loop and returns a cleanup function that stops it.

**Behavior:**
1. Runs its first detection cycle synchronously (or within the same event loop tick via `queueMicrotask` / immediate call before `setInterval`).
2. Schedules subsequent cycles at 60 000 ms intervals via `setInterval`.
3. Returns a cleanup function that calls `clearInterval` on the running timer.

**Detection logic per cycle:**
- Reads current todos via `get(todos)` from `$lib/stores/todos.js`.
- Computes today's date as `new Date().toISOString().split('T')[0]` (YYYY-MM-DD).
- Iterates todos where `archived === false`, `completed === false`, `dueDate !== null`, and `dueDate < today` (string comparison, both are YYYY-MM-DD format).
- For each qualifying todo whose `id` is NOT in the session `Set`, calls `push({ type: 'overdue', title: 'Card Overdue', message: todo.text })` and adds the `id` to the session `Set`.

**Session deduplication:** A module-level `const notifiedIds = new Set<string>()` persists for the page session lifetime. It is never cleared by the checker itself.

**Lifecycle usage (in `+page.svelte`):**
```ts
import { onMount, onDestroy } from 'svelte';
import { startDueDateChecker } from '$lib/notifications/dueDateChecker.js';

let stopDueDateChecker: () => void;

onMount(() => {
  stopDueDateChecker = startDueDateChecker();
});

onDestroy(() => {
  stopDueDateChecker?.();
});
```

**Error contract:** Never throws. If the `todos` store is empty, the function is a no-op for that cycle.
