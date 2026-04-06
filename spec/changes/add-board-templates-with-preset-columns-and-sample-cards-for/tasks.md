# Tasks for add-board-templates-with-preset-columns-and-sample-cards-for

## Batch 1 (no dependencies — store logic)

### Task 1.1: Add BoardTemplate interface and BOARD_TEMPLATES constant to kanban.ts
- **Files**: `src/lib/stores/kanban.ts`
- **Action**: Declare a `BoardTemplate` interface with fields `name: string`, `description: string`, and `columns: Array<{ title: string; sampleCards: string[] }>`. Export a `BOARD_TEMPLATES` constant typed as `Record<'kanban' | 'scrum' | 'personal', BoardTemplate>`. Define all three template entries with the exact column order and sample cards specified in the design:
  - `kanban`: columns Backlog, To Do, In Progress, Review, Done — sample cards include "Define acceptance criteria", "Implement feature", "Request peer review", "Update documentation", "Deploy to production" distributed across columns (at least two per column).
  - `scrum`: columns Sprint Backlog, In Progress, In Review, Testing, Done — sample cards include "Refine user stories", "Write unit tests", "Deploy to staging", "Review pull request", "Conduct sprint retrospective".
  - `personal`: columns Ideas, Today, This Week, Completed — sample cards include "Read for 20 minutes", "Respond to emails", "Plan weekend", "Exercise", "Review weekly goals".
  - Each column must carry at least two non-empty sample card title strings. Place the constant after the `DEFAULT_COLUMNS` declaration. Do not modify any existing exports or types.
- **Verify**: `grep -n "BOARD_TEMPLATES" src/lib/stores/kanban.ts` shows the export. Confirm all three keys (`kanban`, `scrum`, `personal`) are present with the correct column counts (5, 5, 4) and that TypeScript strict compilation passes (`npx tsc --noEmit`).
- **Done**: `BOARD_TEMPLATES` is exported from `kanban.ts`, typed as `Record<'kanban' | 'scrum' | 'personal', BoardTemplate>`, contains exactly three entries, each entry has the correct ordered column titles and at least two sample card strings per column, and `tsc --noEmit` reports no errors.

---

### Task 1.2: Add isBoardPristine() function to kanban.ts
- **Files**: `src/lib/stores/kanban.ts`
- **Action**: Export a function `isBoardPristine(): boolean` placed after the `BOARD_TEMPLATES` constant. The function uses `get(kanbanState)` (the `get` import already exists via `svelte/store`) for a synchronous snapshot. It returns `true` if and only if all three conditions hold simultaneously: (1) `state.columns.length === 3`, (2) column IDs in order are exactly `'col-todo'`, `'col-in-progress'`, `'col-done'`, (3) every column's `cardIds` array has length zero. It returns `false` for any deviation — different column count, any mismatched ID, any column with cards. No store subscriptions, no derived stores, no side effects.
- **Verify**: `grep -n "isBoardPristine" src/lib/stores/kanban.ts` shows the export. Run `npx tsc --noEmit` and confirm no errors. Manually trace the logic: the three-condition check covers the spec scenarios (default blank = true, default with one card = false, post-applyTemplate = false).
- **Done**: `isBoardPristine` is exported, performs an order-sensitive three-condition check using `get(kanbanState)`, returns `boolean`, and `tsc --noEmit` passes.

---

### Task 1.3: Add applyTemplate() function to kanban.ts
- **Files**: `src/lib/stores/kanban.ts`
- **Action**: Export a function `applyTemplate(templateName: string): void` placed after `isBoardPristine`. The implementation follows the exact execution order required by the `syncWithTodos` atomicity constraint described in the design:
  1. Validate `templateName` against `BOARD_TEMPLATES` keys. If not found, throw `new Error(\`Unknown template: "${templateName}"\`)` immediately without touching any store.
  2. Capture `const now = new Date().toISOString()`.
  3. For each column in the chosen template, call `crypto.randomUUID()` to generate the column ID. For each sample card in each column, call `crypto.randomUUID()` to generate the todo ID.
  4. Construct the full `Todo[]` array with every field matching the shape produced by `addTodo`: `{ id, text: sampleCardTitle, description: '', completed: false, createdAt: now, priority: 'none', dueDate: null, labelIds: [], attachments: [], comments: [], archived: false, activityLog: [{ type: 'created', timestamp: now }] }`.
  5. Construct the full `KanbanState` with new columns, each having the pre-assigned `cardIds` matching the todo UUIDs in order.
  6. Call `kanbanState.set(newKanbanState)` first — this makes the new column IDs with their `cardIds` live before `todos` is touched, so when `syncWithTodos` fires in step 7 it finds every new todo ID already present in a column.
  7. Call `todos.update(() => newTodos)` — replaces the entire todos array.
  No call to `snapshot()` is needed (template application is not an undoable edit action). No `addTodo` calls — construct `Todo` objects inline.
- **Verify**: `grep -n "applyTemplate" src/lib/stores/kanban.ts` shows the export. Run `npx tsc --noEmit` and confirm no errors. Review the set-then-update ordering in the source matches steps 6 and 7 above.
- **Done**: `applyTemplate` is exported, throws on unknown template name before any store mutation, builds complete `KanbanState` and `Todo[]` in memory, calls `kanbanState.set` before `todos.update`, produces no orphaned IDs, and `tsc --noEmit` passes.

---

## Batch 2 (depends on Batch 1 — UI components)

### Task 2.1: Create BoardTemplateSelector.svelte component
- **Files**: `src/lib/components/BoardTemplateSelector.svelte`
- **Action**: Create a new Svelte 5 component that functions as a fixed-position modal overlay. The component imports `BOARD_TEMPLATES` from `$lib/stores/kanban.js` for display data only — it does not import `applyTemplate` or any writable store. It dispatches two component events: `select` carrying `{ name: string }` when the user confirms a template, and `dismiss` carrying no payload when the user skips or closes the modal.

  Layout: a full-screen semi-transparent backdrop (`fixed inset-0 bg-black/50 z-50`) with a centred card container. Inside the card, render one panel per template (iterate over `Object.entries(BOARD_TEMPLATES)`). Each panel displays: the template `name` as a heading, the `description` text, and an ordered list of column titles from `template.columns`. Each panel has an "Apply" or "Use this template" button that dispatches `select` with the template key as `name`. A "Skip for now" button at the bottom of the modal dispatches `dismiss`.

  Accessibility: set `role="dialog"` and `aria-modal="true"` on the container element. On mount, use `$effect` to move focus to the first focusable element inside the dialog. Implement a focus trap: intercept `keydown` Tab and Shift+Tab to cycle focus within the modal's focusable elements. Intercept `keydown` Escape to dispatch `dismiss`. On destroy, return focus to the previously focused element. Backdrop click dispatches `dismiss`. Use Tailwind utility classes for all styling; support dark mode via `dark:` variants consistent with the existing component style in the codebase.
- **Verify**: The file exists at `src/lib/components/BoardTemplateSelector.svelte`. Run `npx tsc --noEmit`. Confirm the component contains `role="dialog"`, `aria-modal="true"`, both event dispatches (`select`, `dismiss`), Escape key handling, and backdrop click handling.
- **Done**: Component file exists, renders three template panels with name/description/column list, has "Apply" buttons that dispatch `select` with the correct key, has a "Skip" button that dispatches `dismiss`, implements focus trap and Escape-to-dismiss, uses no writable store imports, and `tsc --noEmit` passes.

---

### Task 2.2: Integrate template selector into KanbanBoard.svelte
- **Files**: `src/lib/components/KanbanBoard.svelte`
- **Action**: Read the full file before editing. Add the following changes only — do not touch any existing column management, drag-and-drop, dark mode, or view-switching logic:

  1. Import `isBoardPristine` and `applyTemplate` from `$lib/stores/kanban.js` and `BoardTemplateSelector` from `$lib/components/BoardTemplateSelector.svelte`.
  2. Declare two component-local state variables: `let showTemplateSelector = false` and `let selectorDismissed = false`.
  3. Add a `$effect` (or `onMount` equivalent for Svelte 5) that runs once on mount: if `isBoardPristine()` returns `true` and `selectorDismissed` is `false`, set `showTemplateSelector = true`. This effect must not re-run reactively on subsequent store changes.
  4. In the board header area (where existing controls like the "Add column" button or view toggle live), add a "Change template" button rendered unconditionally whenever the kanban view is active. On click, call `window.confirm('Applying a new template will permanently replace all current columns and cards. Continue?')`. If the user confirms, reset `selectorDismissed = false` and set `showTemplateSelector = true`. If the user cancels, do nothing.
  5. Conditionally render `<BoardTemplateSelector>` after the board DOM when `showTemplateSelector` is true. Wire its `select` event: call `applyTemplate(event.detail.name)` then set `showTemplateSelector = false`. Wire its `dismiss` event: set `showTemplateSelector = false` and `selectorDismissed = true`.
- **Verify**: Run `npx tsc --noEmit`. Confirm `BoardTemplateSelector` is conditionally rendered, the "Change template" button is present in the board header markup, and both event handlers are wired. Confirm no existing template-unrelated functionality was removed by diffing the original and modified files.
- **Done**: `KanbanBoard.svelte` mounts and auto-shows the selector when pristine, the "Change template" button is always visible during kanban view, applying a template hides the selector and calls `applyTemplate`, dismissing sets `selectorDismissed` so it will not reappear without a reload, and `tsc --noEmit` passes.

---

## Batch 3 (depends on Batch 1 — store unit tests)

### Task 3.1: Write unit tests for template store logic
- **Files**: `src/lib/stores/kanban.test.ts`
- **Action**: Read the existing test file before editing to understand the current test setup and any existing helpers (temp dir isolation, localStorage mocking). Add a new `describe('BOARD_TEMPLATES')` block and a `describe('isBoardPristine')` block and a `describe('applyTemplate')` block. Do not modify any existing test cases.

  `BOARD_TEMPLATES` tests:
  - Verify it contains exactly the keys `'kanban'`, `'scrum'`, `'personal'`.
  - Verify `BOARD_TEMPLATES.kanban.columns` has 5 entries with titles `['Backlog', 'To Do', 'In Progress', 'Review', 'Done']` in that order.
  - Verify `BOARD_TEMPLATES.scrum.columns` has 5 entries with titles `['Sprint Backlog', 'In Progress', 'In Review', 'Testing', 'Done']`.
  - Verify `BOARD_TEMPLATES.personal.columns` has 4 entries with titles `['Ideas', 'Today', 'This Week', 'Completed']`.
  - Verify each column in each template has at least two non-empty strings in `sampleCards`.

  `isBoardPristine` tests:
  - Returns `true` when `kanbanState` holds exactly the three default columns (`col-todo`, `col-in-progress`, `col-done`) with all `cardIds` empty.
  - Returns `false` when `col-todo` has one card ID in `cardIds`.
  - Returns `false` after `applyTemplate('kanban')` sets five columns.
  - Returns `false` when there are four columns that happen to start with the three default IDs.

  `applyTemplate` tests:
  - After `applyTemplate('scrum')`, `kanbanState` contains exactly 5 columns with the titles `['Sprint Backlog', 'In Progress', 'In Review', 'Testing', 'Done']` in order, and none of the original default column IDs (`col-todo`, `col-in-progress`, `col-done`) remain.
  - After `applyTemplate('personal')`, the `todos` store contains exactly as many entries as the total number of sample cards defined across the 4 personal template columns, and every todo ID appears in exactly one column's `cardIds`.
  - After `applyTemplate('kanban')` called over a board that had 2 user-created columns with 3 user-created todo cards, all prior column IDs and todo IDs are absent from `kanbanState` and the todos store.
  - Calling `applyTemplate('unknown-template')` throws an `Error` and leaves `kanbanState` and the todos store unchanged.
- **Verify**: Run `npx vitest run src/lib/stores/kanban.test.ts` and confirm all new tests pass with no failures.
- **Done**: All four describe blocks are present, all test cases pass, no existing tests are broken.

---

## Batch 4 (depends on Batch 2 — component tests)

### Task 4.1: Write component tests for BoardTemplateSelector
- **Files**: `src/lib/components/__tests__/BoardTemplateSelector.test.ts`
- **Action**: Read any existing component test files in `src/lib/components/__tests__/` to match the established testing pattern (Vitest + `@testing-library/svelte` or equivalent). Create the test file and add the following test cases inside a `describe('BoardTemplateSelector')` block:

  - **Renders all three template options on mount**: Mount the component and assert the DOM contains three elements labeled `'Kanban'`, `'Scrum'`, and `'Personal'` (case-insensitive). Assert each template card shows its column titles (spot-check at least one column title per template, e.g., `'Backlog'` for kanban, `'Sprint Backlog'` for scrum, `'Ideas'` for personal).
  - **Clicking Apply for scrum dispatches select with name 'scrum'**: Mount the component, find the Apply/Use button associated with the Scrum template, click it, and assert a `select` event was dispatched with `detail.name === 'scrum'`.
  - **Clicking Skip dispatches dismiss without calling applyTemplate**: Mount the component, find the "Skip" button, click it, and assert a `dismiss` event was dispatched. Assert no `select` event was fired.
  - **Pressing Escape dispatches dismiss**: Mount the component, dispatch a `keydown` event with `key: 'Escape'` on the document or modal container, and assert a `dismiss` event was dispatched.
  - **Clicking backdrop dispatches dismiss**: Mount the component, click the backdrop element (outside the card container), and assert a `dismiss` event was dispatched.
  - **Modal has correct ARIA attributes**: Assert the dialog container element has `role="dialog"` and `aria-modal="true"`.
- **Verify**: Run `npx vitest run src/lib/components/__tests__/BoardTemplateSelector.test.ts` and confirm all six test cases pass.
- **Done**: All six test cases are present and passing, the file follows the existing component test conventions in the project, and no other test files are broken.
