# Research: add-todo-crud-operations-with-local-storage-persistence

## Decision: Single writable store with subscribe-based localStorage sync and fine-grained components

### Approaches Considered

#### Store Architecture

1. **Single writable store with action functions** (selected) — A single `writable<Todo[]>` store in `$lib/stores/todos.ts` with exported `addTodo`, `toggleTodo`, and `removeTodo` functions that call `store.update()`. A separate `writable<Filter>` holds the current filter, and a `derived` store combines both to produce filtered results. This keeps all state co-located, makes persistence trivial (one subscribe call serializes the entire array), and aligns directly with the spec requirement that components must not manipulate the store's internal array.

2. **Multiple stores (one per concern)** — Separate writable stores for the todo list, filter state, and a derived filtered view. This adds indirection without benefit at this scale. Since the todo array is the only persisted state and the filter is a simple enum, splitting into multiple writable stores creates unnecessary coordination overhead and complicates the localStorage sync (you'd need multiple subscribers or a combined persistence layer). Not worth it for a single-entity CRUD app.

#### localStorage Sync Strategy

1. **Subscribe-based automatic sync** (selected) — Call `todos.subscribe(value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)))` once at module initialization. Every mutation flows through `store.update()`, which triggers the subscriber, which writes to localStorage. This is zero-effort persistence: no manual save calls, no forgotten writes, no sync bugs. The subscriber fires synchronously after each update, so localStorage is always consistent with the in-memory store.

2. **Manual save after each mutation** — Each action function (`addTodo`, `toggleTodo`, `removeTodo`) explicitly calls a `persist()` helper after updating the store. This gives precise control over when writes happen but introduces a maintenance burden: every new mutation must remember to call persist. For a client-side-only app with no batching needs and no performance concerns (localStorage writes for a small JSON array are sub-millisecond), the subscribe approach is strictly simpler and less error-prone.

#### Component Granularity

1. **Four components: TodoInput, TodoList, TodoItem, TodoFilter** (selected) — Matches the spec exactly. Each component has a single responsibility: TodoInput owns the text input and submit logic, TodoList iterates over the filtered store and renders TodoItems, TodoItem displays one todo with toggle/delete controls, TodoFilter renders the three filter buttons and manages active state. This decomposition is the natural granularity for this feature set and keeps each file small and testable.

2. **Two components: TodoApp and TodoItem** — Collapse input, list, and filter into a single TodoApp component, with only TodoItem extracted for the repeated element. This reduces file count but creates a monolithic component that handles input state, list rendering, and filter logic all at once. It violates the spec requirement for discrete components and makes future enhancements (e.g., adding a clear-completed button or a todo counter) harder to slot in without growing the monolith.

### Rationale

The single-store-with-subscribe pattern is the idiomatic Svelte approach for small-to-medium state. It leverages Svelte's reactivity system directly: components use `$todos` and `$filteredTodos` with automatic subscriptions, mutations go through exported functions that call `update()`, and persistence is a side effect of the store's own subscription mechanism. There is no need for a state management library, no context API boilerplate, and no custom event system.

The rehydration strategy is straightforward: at module load time, read from localStorage, parse JSON inside a try/catch (falling back to `[]` on any error), and pass that as the initial value to `writable()`. This handles the missing-data, corrupted-data, and normal-load scenarios from the spec with a single code path.

For testing, the store module can be imported directly in Vitest. `localStorage` is mocked via `vi.stubGlobal` or a simple object implementing the Storage interface. Since the store functions are pure operations on an array (add, toggle, remove) wrapped in `update()`, they are trivially testable without a DOM or browser environment. The derived filtered store can be tested by subscribing to it, setting the filter writable, and asserting the emitted values.

### Artifacts Produced

- **Data Model: Todo Interface** — `{ id: string, text: string, completed: boolean, createdAt: string }`. The `id` is generated via `crypto.randomUUID()`, `createdAt` is `new Date().toISOString()`, and `completed` defaults to `false`. The localStorage key is `"todos"` and the serialized format is a JSON array of Todo objects.

- **Store API: todos.ts exports** — The module exports: `todos` (writable store of `Todo[]`), `filter` (writable store of `'all' | 'active' | 'completed'`), `filteredTodos` (derived store combining both), `addTodo(text: string): void`, `toggleTodo(id: string): void`, `removeTodo(id: string): void`. The subscribe-based localStorage sync is an internal detail, not exported.

- **Component Tree: Page composition** — `+page.svelte` renders `<TodoInput />`, `<TodoFilter />`, and `<TodoList />` in a vertical layout. `<TodoList />` subscribes to `$filteredTodos` and renders `<TodoItem {todo} />` for each entry via an `{#each}` block keyed by `todo.id`. `<TodoItem>` dispatches toggle/delete by calling the imported store functions directly (no event bubbling needed since store functions are module-level).

- **Test Plan: todos.test.ts** — Six test cases mapping to the spec scenarios: (1) addTodo creates a todo with correct defaults, (2) addTodo rejects empty/whitespace input, (3) toggleTodo flips completed, (4) removeTodo removes by id, (5) filter derived store returns correct subset for each filter value, (6) localStorage round-trip: mock localStorage, add todos, verify serialized JSON, re-import store module, verify rehydrated state matches.
