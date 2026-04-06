# Tasks for board-statistics-dashboard-tas

## Batch 1 (no dependencies)

- [ ] **Task 1.1: Create BoardStatsDashboard.svelte component**
  - **Files**: `src/lib/components/BoardStatsDashboard.svelte` (create)
  - **Action**: Create the component with no props and no emitted events. At the top of `<script lang="ts">`, import `kanbanBoard` and `todos` from `$lib/stores/kanban.js` and `$lib/stores/todos.js` respectively, and type-import `ResolvedColumn` and `Todo`. Declare a `const today = new Date().toISOString().split('T')[0]` constant (evaluated once at mount, matching the pattern in `DueDateDisplay.svelte`). Derive all display values with Svelte 5 `$derived` runes:
    - `const columnStats = $derived($kanbanBoard.map(col => ({ id: col.id, title: col.title, count: col.cards.length })))` — one entry per `ResolvedColumn`; `cards` is already filtered to non-archived by the derived store.
    - `const activeTodos = $derived($todos.filter(t => !t.archived))`
    - `const total = $derived(activeTodos.length)`
    - `const completedCount = $derived(activeTodos.filter(t => t.completed).length)`
    - `const completionPct = $derived(total === 0 ? 0 : Math.round((completedCount / total) * 100))`
    - `const overdueCount = $derived(activeTodos.filter(t => !t.completed && t.dueDate !== null && t.dueDate < today).length)`
    - Do NOT import or call `addColumn`, `renameColumn`, `deleteColumn`, `moveCard`, `moveColumn`, `applyTemplate`, `todos.set`, or `todos.update`.
    Render a `<section>` wrapper with `aria-label="Board statistics"` containing three metric groups in a horizontal bar:
    1. **Column counts**: `{#each columnStats as col (col.id)}` — render each as a `<div>` with text `{col.title}: {col.count}` and an `aria-label="{col.title}: {col.count} tasks"`.
    2. **Completion**: a visible label `{completionPct}% complete` plus a progress bar `<div role="progressbar" aria-valuenow={completionPct} aria-valuemin="0" aria-valuemax="100">` whose inner filled `<div>` uses `style="width: {completionPct}%"` for geometry and Tailwind color classes (no inline color styles).
    3. **Overdue badge**: a `<span>` with `aria-label="{overdueCount} overdue"` and visible text `{overdueCount} overdue`.
    Apply Tailwind classes throughout: light-mode base classes (`bg-gray-50`, `text-gray-700`, `border-gray-200`) paired with `dark:` variants (`dark:bg-gray-800`, `dark:text-gray-200`, `dark:border-gray-700`). Progress bar fill uses `bg-blue-500 dark:bg-blue-400`. No hardcoded color values in `style` attributes.
  - **Verify**: Run `npx tsc --noEmit` from the demo root — zero type errors. Confirm the file contains none of the banned mutation imports by running `grep -E "addColumn|renameColumn|deleteColumn|moveCard|moveColumn|applyTemplate|todos\.set|todos\.update" src/lib/components/BoardStatsDashboard.svelte` — no output.
  - **Done**: File exists at `src/lib/components/BoardStatsDashboard.svelte`, TypeScript resolves the import without errors, no mutation functions are referenced, all three metric sections are present in the template, the progress bar element has `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax="100"` bound to `completionPct`.

- [ ] **Task 1.2: Write unit tests for BoardStatsDashboard**
  - **Files**: `src/lib/components/__tests__/BoardStatsDashboard.test.ts` (create)
  - **Action**: Create the test file using the same preamble pattern as `BoardTemplateSelector.test.ts`: `@vitest-environment jsdom` docblock, `localStorage` mock via `vi.stubGlobal`, `matchMedia` mock via `vi.stubGlobal`. Import `render`, `screen`, `cleanup` from `@testing-library/svelte`, `vi`, `describe`, `it`, `expect`, `beforeEach`, `afterEach` from `vitest`. Import `kanbanState` and `todos` from the actual store modules (not mocked) so tests can prime state directly. Call `cleanup()` in `afterEach` and reset stores in `beforeEach` by calling `kanbanState.set({ columns: [] })` and `todos.set([])`.

    Write the following `describe('BoardStatsDashboard')` test cases:

    - **`renders 0% complete and 0 overdue with empty stores`**: set both stores empty, render, assert `screen.getByText('0% complete')` and `screen.getByText('0 overdue')` are present, no column entries visible.
    - **`displays column title and count for each column`**: set `kanbanState` to a board with two columns — `col-a` "To Do" with `cardIds: ['t1', 't2']` and `col-b` "Done" with `cardIds: ['t3']`; set `todos` to three non-archived todos with matching ids; render; assert `screen.getByText(/To Do: 2/)` and `screen.getByText(/Done: 1/)`.
    - **`column with zero cards shows count 0`**: set one column with an empty `cardIds` array; render; assert `screen.getByText(/In Progress: 0/)`.
    - **`completion percentage rounds correctly`**: set `todos` to 7 non-archived todos of which 3 have `completed: true`; render; assert `screen.getByText('43% complete')`.
    - **`shows 100% complete when all todos are done`**: set 4 non-archived todos all with `completed: true`; render; assert `screen.getByText('100% complete')`.
    - **`excludes archived todos from completion calculation`**: set 3 non-archived todos (1 completed) and 2 archived todos (both completed); render; assert `screen.getByText('33% complete')`.
    - **`overdue count reflects past-due incomplete todos`**: set `todos` to two non-archived, non-completed todos with `dueDate: '2026-04-05'` and `dueDate: '2026-03-01'`; use `vi.setSystemTime(new Date('2026-04-06'))` and restore in `afterEach`; render; assert `screen.getByText('2 overdue')`.
    - **`due today is not counted as overdue`**: set a non-archived, non-completed todo with `dueDate: '2026-04-06'`; render with system time `2026-04-06`; assert `screen.getByText('0 overdue')`.
    - **`completed past-due todo is not overdue`**: set a todo with `dueDate: '2026-04-01'`, `completed: true`, `archived: false`; render; assert `screen.getByText('0 overdue')`.
    - **`archived past-due todo is not overdue`**: set a todo with `dueDate: '2026-04-01'`, `completed: false`, `archived: true`; render; assert `screen.getByText('0 overdue')`.
    - **`progress bar has correct ARIA attributes`**: set 2 completed of 4 non-archived todos; render; query `screen.getByRole('progressbar')`; assert `aria-valuenow="50"`, `aria-valuemin="0"`, `aria-valuemax="100"`.
    - **`overdue section has accessible label`**: set one overdue todo; render; assert an element with `aria-label` matching `"1 overdue"` is present.
  - **Verify**: Run `npx vitest run src/lib/components/__tests__/BoardStatsDashboard.test.ts` from the demo root — all tests pass, zero failures.
  - **Done**: All test cases listed above pass. Test file is at `src/lib/components/__tests__/BoardStatsDashboard.test.ts`. No tests in other files are broken (run `npx vitest run` to confirm).

## Batch 2 (depends on Batch 1)

- [ ] **Task 2.1: Mount BoardStatsDashboard in +page.svelte**
  - **Depends on**: Task 1.1
  - **Files**: `src/routes/+page.svelte` (modify)
  - **Action**: Add one import line in the `<script>` block alongside the existing component imports:
    ```ts
    import BoardStatsDashboard from '$lib/components/BoardStatsDashboard.svelte';
    ```
    Then in the template, locate the `{:else}` branch of the `{#if $viewPreference === 'list'}` conditional (currently just `<KanbanBoard />`). Insert `<BoardStatsDashboard />` as the first child immediately before `<KanbanBoard />`:
    ```svelte
    {:else}
      <BoardStatsDashboard />
      <KanbanBoard />
    {/if}
    ```
    Make no other changes to the file. `KanbanBoard.svelte` itself is not modified.
  - **Verify**: Run `npx tsc --noEmit` — zero type errors. Start the dev server (`npm run dev`) and open the app in a browser; switch to kanban view and confirm the stats bar is visible above the columns with correct counts, a percentage label, a progress bar, and an overdue badge. Switch to list view and confirm the stats bar is not present.
  - **Done**: `+page.svelte` imports `BoardStatsDashboard` and renders `<BoardStatsDashboard />` immediately before `<KanbanBoard />` inside the `{:else}` branch. The dashboard is visible in kanban view and absent in list view. TypeScript reports no errors. All existing tests continue to pass.
