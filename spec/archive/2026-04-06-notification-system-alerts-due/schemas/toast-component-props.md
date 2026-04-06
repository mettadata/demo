# Data Model: Toast Component Props

**Components:** `src/lib/components/Toast.svelte`, `src/lib/components/Toaster.svelte`

## Toast.svelte Props

```ts
let {
  id,       // string  — notification id, passed to dismiss()
  type,     // NotificationType — controls accent color
  title,    // string  — bold heading line
  message,  // string  — body text
}: {
  id: string;
  type: 'overdue' | 'mention' | 'activity';
  title: string;
  message: string;
} = $props();
```

## Toaster.svelte

No explicit props. Reads the `notifications` store directly via `$notifications`. Renders one `Toast.svelte` per record in **reverse order** (`[...$notifications].reverse()`) so the newest entry appears at the visual top of the stack.

## DOM Structure (Toaster)

```html
<div
  role="status"
  aria-live="polite"
  style="position: fixed; bottom: 1.5rem; right: 1.5rem; display: flex; flex-direction: column-reverse; gap: 0.5rem; z-index: 9999"
>
  {#each [...$notifications].reverse() as n (n.id)}
    <Toast id={n.id} type={n.type} title={n.title} message={n.message} />
  {/each}
</div>
```

Using `flex-direction: column-reverse` with the array reversed means newest toast is at the bottom of the flex container but visually closest to the bottom-right anchor, matching the spec that "most recent on top" means visually highest in the stack — i.e., farthest from the viewport bottom edge.

Alternative: keep array order and use `flex-direction: column` with newest toast appended last, achieving the same visual ordering. Either approach is acceptable; the implementation should pick one and be consistent.

## DOM Structure (Toast)

```html
<div
  role="alert"
  class="toast toast--{type}"
  onmouseenter={pauseTimer}
  onmouseleave={resumeTimer}
  in:fly="{{ x: 64, duration: 250 }}"
  out:fly="{{ x: 64, duration: 200 }}"
>
  <span class="toast__accent"></span>  <!-- color bar, varies by type -->
  <div class="toast__body">
    <span class="sr-only">{title}: {message}</span>
    <p class="toast__title" aria-hidden="true">{title}</p>
    <p class="toast__message" aria-hidden="true">{message}</p>
  </div>
  <button
    type="button"
    aria-label="Dismiss notification"
    onclick={() => dismiss(id)}
  >×</button>
</div>
```

## Auto-dismiss Timer State (internal to Toast.svelte)

```ts
let remaining = $state(5000);        // ms remaining
let startedAt: number;               // timestamp when current interval began
let timer: ReturnType<typeof setTimeout> | null = null;

function startTimer() {
  startedAt = Date.now();
  timer = setTimeout(() => dismiss(id), remaining);
}

function pauseTimer() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
    remaining -= Date.now() - startedAt;
  }
}

function resumeTimer() {
  if (timer === null) startTimer();
}

onMount(() => startTimer());
onDestroy(() => { if (timer !== null) clearTimeout(timer); });
```
