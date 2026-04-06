# add-board-templates-with-preset-columns-and-sample-cards-for

## ADDED: Template Data Model

A `BOARD_TEMPLATES` constant MUST be exported from `src/lib/stores/kanban.ts`. It MUST define exactly three named templates: `"kanban"`, `"scrum"`, and `"personal"`. Each template entry MUST contain an ordered array of column definitions and, for each column, an ordered array of sample card title strings. The constant MUST be typed so that column definitions and card titles are statically known strings — no `any` or untyped objects.

Template column definitions MUST be:

- **kanban**: Backlog, To Do, In Progress, Review, Done
- **scrum**: Sprint Backlog, In Progress, In Review, Testing, Done
- **personal**: Ideas, Today, This Week, Completed

Each column MUST include at least two sample card titles that are representative of realistic work items for that workflow.

### Scenario: BOARD_TEMPLATES exports all three templates with correct column names

- GIVEN the `kanban.ts` module is imported in a test environment
- WHEN `BOARD_TEMPLATES` is accessed
- THEN it MUST contain entries keyed `"kanban"`, `"scrum"`, and `"personal"`, each with column titles matching the lists above in the specified order

### Scenario: Each template column carries sample card titles

- GIVEN `BOARD_TEMPLATES` is accessed
- WHEN the `"kanban"` template's first column (`"Backlog"`) is inspected
- THEN it MUST contain at least two non-empty sample card title strings

---

## ADDED: Apply Template

An `applyTemplate(templateName: string): void` function MUST be exported from `src/lib/stores/kanban.ts`. When called with a valid template name it MUST:

1. Clear all existing columns and their `cardIds` from `kanbanState`.
2. Create one `KanbanColumn` entry for each column defined in the chosen template, using `crypto.randomUUID()` for each new column `id`.
3. Create one `Todo` entry via the `todos` store for each sample card title in each column, using the title as the todo's `text` field and populating all required `Todo` fields with sensible defaults (e.g., `completed: false`, `archived: false`, empty `activityLog`).
4. Place each newly created todo's `id` into the `cardIds` array of the corresponding column, in the same order as the sample card titles.
5. Persist the resulting `KanbanState` to `localStorage` under `KANBAN_STORAGE_KEY` via the existing store subscription.

If `templateName` does not match any key in `BOARD_TEMPLATES`, `applyTemplate` MUST throw an `Error` with a descriptive message and MUST NOT modify `kanbanState` or the todos store.

The function MUST NOT leave any orphaned todo IDs (IDs present in `kanbanState` but absent from the todos store) after completion.

### Scenario: Applying "scrum" template replaces default columns

- GIVEN the board is in its default state with columns `col-todo`, `col-in-progress`, `col-done` and zero cards
- WHEN `applyTemplate("scrum")` is called
- THEN `kanbanState` MUST contain exactly five columns titled `"Sprint Backlog"`, `"In Progress"`, `"In Review"`, `"Testing"`, `"Done"` in that order, with none of the original default column IDs present

### Scenario: Applying a template creates todos for every sample card

- GIVEN the board contains no existing todos
- WHEN `applyTemplate("personal")` is called
- THEN the todos store MUST contain one `Todo` entry for each sample card title defined across all four columns of the `"personal"` template, and every one of those todo IDs MUST appear in the `cardIds` of its corresponding column

### Scenario: Applying a template over an existing modified board replaces all prior data

- GIVEN the board has been modified — it contains two user-created columns with three user-created todo cards
- WHEN `applyTemplate("kanban")` is called
- THEN all prior columns and todos MUST be removed and replaced exclusively with the `"kanban"` template columns and sample cards; no previously existing column IDs or todo IDs MUST remain in `kanbanState`

### Scenario: Invalid template name throws without mutating state

- GIVEN the board is in a known state with specific columns and cards
- WHEN `applyTemplate("unknown-template")` is called
- THEN the function MUST throw an `Error`, and `kanbanState` MUST remain unchanged from before the call

---

## ADDED: Template Selector UI

A `BoardTemplateSelector.svelte` component MUST be created under `src/lib/components/`. It MUST present the three available templates to the user and allow selecting exactly one. For each template the component MUST display:

- The template name
- The list of column titles the template provides
- A representative description of the workflow it targets

The component MUST emit or invoke a callback when the user confirms a selection, passing the chosen template name as the argument. It MUST render a dismiss action that allows the user to close the selector without applying any template. The component SHOULD be presented as a modal or overlay so it does not obscure the board permanently during browsing.

### Scenario: Template selector displays all three options

- GIVEN `BoardTemplateSelector` is rendered
- WHEN the component mounts
- THEN it MUST display three selectable options labeled `"Kanban"`, `"Scrum"`, and `"Personal"`, each showing its column titles

### Scenario: Selecting a template invokes the apply callback with the correct name

- GIVEN `BoardTemplateSelector` is rendered and the user views the `"scrum"` option
- WHEN the user clicks the confirm / apply button for `"Scrum"`
- THEN the component MUST invoke `applyTemplate` (or equivalent callback) with the argument `"scrum"`

### Scenario: Dismiss closes the selector without applying a template

- GIVEN `BoardTemplateSelector` is rendered
- WHEN the user activates the dismiss action (e.g., clicks "Skip" or closes the modal)
- THEN the component MUST close and `applyTemplate` MUST NOT have been called; the board MUST remain in its current state

---

## ADDED: Dismiss Template Selector

The template selector dismissal state MUST be tracked so that a dismissed selector does not reappear on subsequent renders within the same session unless the board is reset to pristine state or the user explicitly triggers the selector. Dismissal MUST be captured in component-local or parent state — it MUST NOT be persisted to `localStorage` (a page reload of a pristine board SHOULD show the selector again).

### Scenario: Dismissed selector does not reappear on the same page load

- GIVEN the board is in pristine state and `BoardTemplateSelector` is visible
- WHEN the user dismisses the selector
- THEN the selector MUST no longer be visible; if the component's parent re-renders without a page reload, the selector MUST NOT reappear

### Scenario: Refreshing the page with a pristine board shows the selector again

- GIVEN the user dismissed the selector during a session without applying a template, so the board remains in pristine default state
- WHEN the user reloads the page
- THEN `BoardTemplateSelector` MUST be shown again because the board is still in pristine state

---

## ADDED: Change Template Action

`KanbanBoard.svelte` MUST expose a "Change template" action in the board header area. This action MUST be available at all times when the kanban view is active, not only when the board is in pristine state. Activating the action MUST display a destructive-action warning that explicitly states all current columns and cards will be permanently replaced. The warning MUST require a confirmation step before `BoardTemplateSelector` is shown. If the user cancels at the confirmation step, the board MUST remain unchanged.

### Scenario: Change template button is always visible in the board header

- GIVEN the board has been populated with user-created columns and cards (non-pristine state)
- WHEN the user views the board header
- THEN a "Change template" button or equivalent control MUST be present and interactive

### Scenario: Confirmation warning appears before the selector is shown

- GIVEN the board contains at least one user-created card
- WHEN the user activates the "Change template" action
- THEN a warning dialog MUST appear that mentions data loss before the `BoardTemplateSelector` is displayed; the selector MUST NOT open until the user confirms

### Scenario: Cancelling the confirmation leaves the board unchanged

- GIVEN the destructive-action warning is displayed
- WHEN the user selects the cancel option in the confirmation dialog
- THEN the warning MUST close, `BoardTemplateSelector` MUST NOT open, and the board state MUST be identical to what it was before the action was triggered

---

## ADDED: Pristine Detection

A `isBoardPristine(): boolean` helper function MUST be exported from `src/lib/stores/kanban.ts`. It MUST return `true` if and only if the current `kanbanState` satisfies all of the following conditions simultaneously:

1. There are exactly three columns.
2. The column IDs are exactly `"col-todo"`, `"col-in-progress"`, and `"col-done"` in that order.
3. Every column's `cardIds` array is empty (length zero).

It MUST return `false` for any other board configuration, including boards with the default column IDs but non-empty `cardIds`, or boards with a different number of columns, or boards where any column ID differs from the defaults.

### Scenario: Default blank board is detected as pristine

- GIVEN `kanbanState` holds the three default columns with IDs `col-todo`, `col-in-progress`, `col-done` and all `cardIds` are empty
- WHEN `isBoardPristine()` is called
- THEN it MUST return `true`

### Scenario: Default columns with at least one card are not pristine

- GIVEN `kanbanState` holds the three default column IDs but `col-todo` has one card ID in its `cardIds`
- WHEN `isBoardPristine()` is called
- THEN it MUST return `false`

### Scenario: Board with custom columns is not pristine

- GIVEN `kanbanState` holds five columns produced by `applyTemplate("kanban")`
- WHEN `isBoardPristine()` is called
- THEN it MUST return `false`

---

## MODIFIED: KanbanBoard Integration

`KanbanBoard.svelte` MUST be updated to conditionally render `BoardTemplateSelector` using the following logic:

- On mount, call `isBoardPristine()`. If it returns `true` and the selector has not already been dismissed in the current session, `BoardTemplateSelector` MUST be shown.
- When the user applies a template via `BoardTemplateSelector`, the selector MUST be hidden and `applyTemplate` MUST be called with the selected template name.
- When the user dismisses `BoardTemplateSelector`, the selector MUST be hidden and the board MUST remain in its current default state.
- The "Change template" control MUST be rendered in the board header unconditionally whenever the kanban view is active.
- No existing board functionality (column management, card drag-and-drop, dark mode, view switching) MUST be broken or removed by this integration.

### Scenario: Pristine board shows template selector on initial render

- GIVEN `localStorage` contains no persisted kanban state (board will default to pristine)
- WHEN `KanbanBoard.svelte` mounts with the kanban view active
- THEN `BoardTemplateSelector` MUST be visible without any user interaction

### Scenario: Template selector is absent after a template is applied

- GIVEN `BoardTemplateSelector` is visible and the user applies the `"personal"` template
- WHEN the template selector callback fires and `applyTemplate("personal")` completes
- THEN `BoardTemplateSelector` MUST no longer be rendered in the DOM, and the board MUST display the four columns of the `"personal"` template with their sample cards

### Scenario: Non-pristine board does not show selector on mount

- GIVEN `localStorage` contains a persisted `KanbanState` with a user-created column titled `"My Column"` and one card
- WHEN `KanbanBoard.svelte` mounts
- THEN `BoardTemplateSelector` MUST NOT be rendered automatically; only the board content MUST be shown
