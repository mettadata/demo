# Tasks for add-todo-crud-operations-with-local-storage-persistence

## Batch 1 (no dependencies)

### Task 1.1: Scaffold SvelteKit project
- **Files**: `package.json`, `svelte.config.js`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `src/app.html`, `src/app.css`
- **Action**: Initialize a new SvelteKit project with TypeScript, Tailwind CSS, and Vitest. Configure ESM, strict TypeScript, and the Tailwind utility layer in `app.css`. Ensure `vitest` is listed as a dev dependency and a `test` script is defined in `package.json`.
- **Verify**: Run `npm install && npm run build` completes without errors. Run `npx vitest --version` confirms Vitest is available.
- **Done**: A clean SvelteKit skeleton compiles, Tailwind classes are processed, and `npm test` invokes Vitest (even if no tests exist yet).

### Task 1.2: Define Todo interface and Filter type
- **Files**: `src/lib/stores/todos.ts` (types section only)
- **Action**: Create the `Todo` interface with `id: string`, `text: string`, `completed: boolean`, `createdAt: string`. Create the `Filter` type as `'all' | 'active' | 'completed'`. Export both. Define the `STORAGE_KEY` constant as `'todos'`.
- **Verify**: `tsc --noEmit` passes. Import the types in a scratch file and confirm they resolve.
- **Done**: `Todo` and `Filter` are exported from `$lib/stores/todos.ts` with all required fields and the correct TypeScript types.

## Batch 2 (depends on Batch 1)

### Task 2.1: Implement todo store with localStorage persistence
- **Depends on**: Task 1.1, Task 1.2
- **Files**: `src/lib/stores/todos.ts`
- **Action**: Implement `loadTodos()` that reads from `localStorage` key `'todos'`, parses JSON inside try/catch, returns `[]` on missing or corrupt data, and guards with `typeof window !== 'undefined'` for SSR safety. Create `todos` as `writable<Todo[]>(loadTodos())`. Subscribe to `todos` to auto-persist via `localStorage.setItem`, guarded for SSR. Create `filter` as `writable<Filter>('all')`. Create `filteredTodos` as a `derived` store combining `todos` and `filter` that returns all, active-only, or completed-only todos. Export `addTodo(text: string): void` (trims, rejects empty, generates UUID via `crypto.randomUUID()`, sets `completed: false`, sets `createdAt` via `new Date().toISOString()`), `toggleTodo(id: string): void`, and `removeTodo(id: string): void`.
- **Verify**: Import the store in a test file, call `addTodo('test')`, read the store value, and confirm it contains one todo with the correct shape.
- **Done**: All five exports (`todos`, `filter`, `filteredTodos`, `addTodo`, `toggleTodo`, `removeTodo`) are functional. Mutations persist to localStorage. Rehydration loads from localStorage. Invalid localStorage data falls back to `[]`.

### Task 2.2: Write unit tests for the todo store
- **Depends on**: Task 1.1, Task 1.2
- **Files**: `src/lib/stores/todos.test.ts`
- **Action**: Create Vitest tests covering: (1) `addTodo` creates a todo with correct fields (`text`, `completed: false`, valid UUID `id`, valid ISO `createdAt`), (2) `addTodo` rejects empty and whitespace-only strings, (3) `toggleTodo` flips `completed` from `false` to `true` and back, (4) `removeTodo` removes the correct todo and leaves others, (5) `filteredTodos` returns only active todos when filter is `'active'`, (6) `filteredTodos` returns only completed todos when filter is `'completed'`, (7) `filteredTodos` returns all todos when filter is `'all'`, (8) localStorage round-trip: write todos, re-instantiate, confirm deep equality. Mock `localStorage` using `vi.stubGlobal`. Reset store to `[]` in `beforeEach`.
- **Verify**: Run `npm test` and all tests pass.
- **Done**: All eight test scenarios pass. Store state is properly isolated between tests. No browser environment required.

## Batch 3 (depends on Batch 2)

### Task 3.1: Create TodoInput component
- **Depends on**: Task 2.1
- **Files**: `src/lib/components/TodoInput.svelte`
- **Action**: Create a Svelte component with a text input bound to a local `text` variable. On `keydown` Enter, trim the text, call `addTodo(text)` if non-empty, and clear the input. Style with Tailwind: full-width input with padding, border, rounded corners, and focus ring.
- **Verify**: Run the dev server, type text, press Enter -- todo appears in store (observable via console or devtools). Pressing Enter on empty input does nothing.
- **Done**: Component renders an input field, calls `addTodo` on Enter with valid text, clears input after submission, and ignores empty/whitespace input.

### Task 3.2: Create TodoItem component
- **Depends on**: Task 2.1
- **Files**: `src/lib/components/TodoItem.svelte`
- **Action**: Create a Svelte component accepting a `todo: Todo` prop. Render a checkbox bound to `todo.completed` that calls `toggleTodo(todo.id)` on change. Display `todo.text` with conditional Tailwind classes: `line-through text-gray-400` when completed. Render a delete button that calls `removeTodo(todo.id)`. Style with Tailwind: flex row, items centered, gap between elements, hover state on delete button.
- **Verify**: Pass a mock todo object as prop, confirm checkbox toggles completion, confirm delete button removes the item.
- **Done**: Component displays todo text, visually distinguishes completed todos with strikethrough, toggles completion via checkbox, and deletes via button.

### Task 3.3: Create TodoFilter component
- **Depends on**: Task 2.1
- **Files**: `src/lib/components/TodoFilter.svelte`
- **Action**: Create a Svelte component that imports `filter` from the store. Render three buttons labeled "All", "Active", "Completed". On click, set `$filter` to the corresponding value. The active filter button gets a visually distinct style (e.g., `bg-blue-500 text-white`) while inactive buttons get a neutral style (e.g., `bg-gray-200 text-gray-700`).
- **Verify**: Click each button and confirm `$filter` updates. Active button visually changes.
- **Done**: Three filter buttons render, clicking sets the filter store value, and the active button is visually distinguished.

### Task 3.4: Create TodoList component
- **Depends on**: Task 2.1, Task 3.2
- **Files**: `src/lib/components/TodoList.svelte`
- **Action**: Create a Svelte component that imports `filteredTodos` from the store. Use `{#each $filteredTodos as todo (todo.id)}` to render a `<TodoItem>` for each todo. Render nothing (or an empty container) when the list is empty. Style with Tailwind: vertical stack with gap between items.
- **Verify**: Add todos via store functions, confirm they appear as TodoItem components. Change filter, confirm list updates reactively.
- **Done**: Component renders a TodoItem for each filtered todo, updates reactively when todos or filter change, and handles empty state.

## Batch 4 (depends on Batch 3)

### Task 4.1: Compose page route
- **Depends on**: Task 3.1, Task 3.3, Task 3.4
- **Files**: `src/routes/+page.svelte`
- **Action**: Import and compose `TodoInput`, `TodoFilter`, and `TodoList` in a centered vertical layout. Add a page title ("Todos" or similar). Use Tailwind for layout: `max-w-lg mx-auto p-4 flex flex-col gap-4`. No business logic in this file -- purely composition.
- **Verify**: Run `npm run dev`, open in browser. Confirm all four components render: input at top, filter buttons, todo list below. Full CRUD flow works end-to-end: add, toggle, delete, filter.
- **Done**: Page renders all components. User can create todos, toggle completion, delete todos, and filter by status. Refreshing the page preserves todos via localStorage.

## Batch 5 (depends on Batch 4)

### Task 5.1: End-to-end verification and build check
- **Depends on**: Task 4.1, Task 2.2
- **Files**: none (verification only)
- **Action**: Run the full test suite with `npm test`. Run `npm run build` to confirm production build succeeds. Run `npm run preview` and manually verify: (1) add a todo, (2) toggle it complete, (3) delete it, (4) add multiple todos and use all three filters, (5) refresh the page and confirm todos persist, (6) clear localStorage and refresh to confirm empty state.
- **Verify**: `npm test` passes all tests. `npm run build` exits 0. Manual verification of all six scenarios above.
- **Done**: All unit tests pass, production build succeeds, and the full CRUD + persistence + filtering workflow functions correctly in the browser.
