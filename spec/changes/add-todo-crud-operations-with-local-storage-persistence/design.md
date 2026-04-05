# Design: add-todo-crud-operations-with-local-storage-persistence

## Approach

Single Svelte writable store (`writable<Todo[]>`) in `$lib/stores/todos.ts` with exported mutation functions and a `subscribe`-based localStorage auto-sync. A second writable holds the active filter (`'all' | 'active' | 'completed'`), and a `derived` store combines both to produce the filtered view. Components never touch the internal array directly -- they call module-level functions (`addTodo`, `toggleTodo`, `removeTodo`) that go through `store.update()`.

Rehydration happens once at module load: read localStorage, parse inside try/catch, fall back to `[]` on missing or corrupt data, and pass the result as the initial value to `writable()`. The subscriber fires on every subsequent mutation, keeping localStorage in sync without manual save calls.

Four Svelte components in `$lib/components/` (TodoInput, TodoList, TodoItem, TodoFilter) compose on `+page.svelte`. Tailwind CSS handles all styling. No external state libraries, no context API, no event dispatching -- store functions are imported directly where needed.

## Components

### TodoInput
- **File:** `$lib/components/TodoInput.svelte`
- **Props:** none
- **Responsibility:** Renders a text input and handles submit (Enter key). Calls `addTodo(text)` on submit. Trims input and rejects empty/whitespace-only strings. Clears the input field after successful submission.
- **Internal state:** `let text = ''` (bound to the input)

### TodoList
- **File:** `$lib/components/TodoList.svelte`
- **Props:** none
- **Responsibility:** Subscribes to `$filteredTodos` and renders a `<TodoItem>` for each entry via `{#each $filteredTodos as todo (todo.id)}`. Renders nothing when the list is empty.

### TodoItem
- **File:** `$lib/components/TodoItem.svelte`
- **Props:**
  - `todo: Todo` -- the todo object to display
- **Responsibility:** Displays the todo text and a checkbox for completion status. Completed todos receive a line-through style via Tailwind (`line-through text-gray-400`). A delete button calls `removeTodo(todo.id)`. The checkbox calls `toggleTodo(todo.id)` on change.

### TodoFilter
- **File:** `$lib/components/TodoFilter.svelte`
- **Props:** none
- **Responsibility:** Renders three buttons ("All", "Active", "Completed"). Reads `$filter` to highlight the active button. Sets `$filter` on click. Active button is visually distinguished with a different background/text color via Tailwind.

### +page.svelte
- **File:** `src/routes/+page.svelte`
- **Responsibility:** Composes TodoInput, TodoFilter, and TodoList in a centered vertical layout. Contains no business logic.

## Data Model

### Todo Interface

```typescript
// $lib/stores/todos.ts

export interface Todo {
  /** Unique identifier, generated via crypto.randomUUID() */
  id: string;
  /** The todo description text, always trimmed and non-empty */
  text: string;
  /** Whether the todo is completed; defaults to false on creation */
  completed: boolean;
  /** ISO 8601 timestamp string set at creation time via new Date().toISOString() */
  createdAt: string;
}
```

### Filter Type

```typescript
export type Filter = 'all' | 'active' | 'completed';
```

### localStorage Schema

- **Key:** `"todos"`
- **Value:** `JSON.stringify(Todo[])` -- a JSON array of Todo objects
- No versioning needed for this initial implementation; invalid data falls back to `[]`

## API Design

### Store Exports (`$lib/stores/todos.ts`)

```typescript
import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

/** The primary todo list store. Persists to localStorage via subscribe. */
export const todos: Writable<Todo[]>;

/** The current filter selection. */
export const filter: Writable<Filter>;

/** Derived store: todos filtered by the current filter value. */
export const filteredTodos: Readable<Todo[]>;

/**
 * Add a new todo. Trims text; no-ops if text is empty or whitespace-only.
 * Generates id via crypto.randomUUID(), sets completed to false, sets createdAt to now.
 */
export function addTodo(text: string): void;

/**
 * Toggle the completed flag for the todo with the given id.
 * No-ops if the id is not found.
 */
export function toggleTodo(id: string): void;

/**
 * Remove the todo with the given id from the store.
 * No-ops if the id is not found.
 */
export function removeTodo(id: string): void;
```

### Internal Implementation Details

```typescript
const STORAGE_KEY = 'todos';

function loadTodos(): Todo[] {
  // try/catch around localStorage.getItem + JSON.parse
  // returns [] on missing key, invalid JSON, or any error
}

// Initialize with rehydrated data
export const todos = writable<Todo[]>(loadTodos());

// Auto-persist on every mutation
todos.subscribe((value) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
});

// Derived filtered view
export const filteredTodos = derived(
  [todos, filter],
  ([$todos, $filter]) => {
    switch ($filter) {
      case 'active': return $todos.filter(t => !t.completed);
      case 'completed': return $todos.filter(t => t.completed);
      default: return $todos;
    }
  }
);
```

## Dependencies

### External (already in SvelteKit scaffold)
- **svelte/store** -- `writable`, `derived`, `Writable`, `Readable` types
- **crypto.randomUUID()** -- built into all modern browsers and Node 19+; no polyfill needed
- **localStorage** -- Web Storage API; available in all target browsers
- **Tailwind CSS** -- already configured in the project for utility-class styling

### Internal
- `$lib/stores/todos.ts` -- imported by all four components and by `todos.test.ts`
- `$lib/components/*` -- imported by `+page.svelte`

### Dev Dependencies
- **Vitest** -- test runner, already in the SvelteKit template
- `vi.stubGlobal` / manual mock for `localStorage` in tests

### No New Dependencies
This change requires zero additional npm packages. Everything is satisfied by SvelteKit's built-in tooling, browser APIs, and the existing Tailwind setup.

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **localStorage quota exceeded** | Low (5KB limit is ~thousands of todos) | Todos silently fail to persist | Wrap `setItem` in try/catch; log a console warning on quota error. For this scale the risk is negligible. |
| **Corrupted localStorage data on load** | Low (manual tampering, browser bugs) | App crashes on startup | `loadTodos()` wraps parse in try/catch and falls back to `[]`. Already specified in the spec. |
| **SSR hydration mismatch** | Medium (SvelteKit renders on server where localStorage is unavailable) | Console warning, brief content flash | Guard `loadTodos()` with `typeof window !== 'undefined'` check. Return `[]` during SSR. The subscribe auto-sync also needs the same guard around the `setItem` call. |
| **crypto.randomUUID() unavailable** | Very Low (missing only in older browsers and insecure HTTP contexts) | `addTodo` throws at runtime | SvelteKit dev server runs on localhost (secure context). For production, the app will be served over HTTPS. No polyfill needed. |
| **Store subscriber fires during SSR** | Medium | Server-side code calls `localStorage.setItem` and throws | Wrap the subscribe callback with a `typeof window !== 'undefined'` guard so it no-ops during SSR. |
| **Test isolation between test cases** | Medium | One test's store state bleeds into the next | Reset the store to `[]` in a `beforeEach` hook and clear the mocked localStorage between tests. |
