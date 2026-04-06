# Review: add-board-templates-with-preset-columns-and-sample-cards-for

## Verdict: PASS_WITH_WARNINGS

## Issues Found

### Warnings (should fix)

- **File**: src/lib/stores/kanban.test.ts
- **Line**: 385-387
- **Description**: The "throws on invalid template name" test only verifies the error is thrown, but does not assert that kanbanState and todos remain unchanged after the throw. The spec scenario explicitly requires: "the function MUST throw an Error, and kanbanState MUST remain unchanged from before the call."
- **Fix**: Capture state before the call with `const stateBefore = get(kanbanState)` and `const todosBefore = get(todos)`, then after the throw assert `expect(get(kanbanState)).toEqual(stateBefore)` and `expect(get(todos)).toEqual(todosBefore)`.

---

- **File**: src/lib/stores/kanban.test.ts
- **Line**: 357-362
- **Description**: The scrum template test only checks column count and first column title. The spec scenario requires verifying all five column titles in order: "Sprint Backlog", "In Progress", "In Review", "Testing", "Done", and that none of the original default column IDs remain. Similarly, the personal template test (lines 363-368) only checks count and first column.
- **Fix**: Assert all column titles in order for each template test, and verify no default column IDs (`col-todo`, `col-in-progress`, `col-done`) remain.

---

- **File**: src/lib/components/KanbanBoard.svelte
- **Line**: 160-169
- **Description**: The "Change template" button is placed in the add-column area at the far right of the board rather than in a distinct "board header area" as the spec states. This is a minor layout concern -- functionally it works, but the spec says "board header area" which typically implies a toolbar above the columns.
- **Fix**: Consider moving the button to a header row above the column flex container if strict spec compliance is desired.

---

- **File**: src/lib/stores/kanban.test.ts
- **Line**: 300-317
- **Description**: The BOARD_TEMPLATES test validates structure generically but does not assert the exact column titles for each template as required by the spec ("columns Backlog, To Do, In Progress, Review, Done" for kanban, etc.). The spec scenario says "each with column titles matching the lists above in the specified order."
- **Fix**: Add explicit assertions for column title ordering per template, e.g., `expect(BOARD_TEMPLATES.kanban.columns.map(c => c.title)).toEqual(['Backlog', 'To Do', 'In Progress', 'Review', 'Done'])`.

---

- **File**: src/lib/stores/kanban.test.ts
- **Line**: 300-317
- **Description**: The spec scenario "Each template column carries sample card titles" requires asserting at least two non-empty sample card titles for each column. The test only asserts `sampleCards.length > 0` (at least one), not `>= 2`.
- **Fix**: Change `expect(col.sampleCards.length).toBeGreaterThan(0)` to `expect(col.sampleCards.length).toBeGreaterThanOrEqual(2)`.

### Suggestions (nice to have)

- **File**: src/lib/components/BoardTemplateSelector.svelte
- **Line**: 60-68
- **Description**: There are four `svelte-ignore` comments suppressing a11y warnings. The backdrop div's click handler is intentional (dismiss on backdrop click), and the inner div has `role="dialog"`, but the `a11y_interactive_supports_focus` warning on line 68 is being suppressed for the dialog div which already has a role. Consider adding `tabindex="-1"` to the dialog div to satisfy the linter without suppressing.
- **Fix**: Add `tabindex="-1"` to the dialog div (line 69) and remove the `a11y_interactive_supports_focus` ignore comment.

---

- **File**: src/lib/components/BoardTemplateSelector.svelte
- **Line**: 62-64
- **Description**: The backdrop div uses `onclick={ondismiss}` directly. If a user clicks on the backdrop and drags into the dialog before releasing, the click will fire on the backdrop and dismiss unexpectedly. This is a minor UX concern.
- **Fix**: Track mousedown target and only dismiss if both mousedown and mouseup occurred on the backdrop.

---

- **File**: src/lib/components/__tests__/BoardTemplateSelector.test.ts
- **Line**: 43-130
- **Description**: No test for backdrop click dismissal. The spec says the modal should be dismissable, and the implementation supports backdrop click, but only "Skip for now" button and Escape key are tested.
- **Fix**: Add a test that clicks the backdrop overlay and asserts `ondismiss` is called.

## Strengths

- The atomicity of `applyTemplate` is handled correctly: `kanbanState.set` is called before `todos.update`, preventing `syncWithTodos` from creating orphans during the transition. This matches the design doc's risk mitigation precisely.
- `isBoardPristine` correctly checks all three conditions (column count, IDs in order, empty cardIds) with early returns.
- The focus trap implementation in BoardTemplateSelector is solid -- it captures previous focus, traps Tab/Shift+Tab, and restores focus on cleanup via the `$effect` return.
- Clean separation of concerns: BoardTemplateSelector only imports `BOARD_TEMPLATES` for display data and communicates via callbacks, keeping it testable in isolation.
- Dismissal state is correctly kept as component-local state (not persisted to localStorage), satisfying the spec requirement that page reload re-shows the selector.
- The `window.confirm` approach for the destructive action warning is pragmatic and avoids introducing a new dialog component.
- Todo objects created by `applyTemplate` match the full `Todo` interface shape exactly, including all required fields like `attachments`, `comments`, and `activityLog`.

## Summary

The implementation is functionally correct and well-structured. The critical design decision (store update ordering in `applyTemplate`) is handled properly. The main gaps are in test coverage: several spec scenarios are only partially verified (column title ordering, invalid template state preservation, sample card count threshold). These are test quality issues, not code correctness issues -- the underlying code does the right thing, the tests just do not fully assert it. The "Change template" button placement is a minor spec compliance question. No security or performance concerns.
