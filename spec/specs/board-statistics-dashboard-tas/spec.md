# board-statistics-dashboard-tas

## Requirement: board-stats-dashboard-component-exists

A  component MUST exist at
. It MUST accept no props and
MUST derive all displayed data reactively from the  derived store
and the  writable store. It MUST NOT call any store mutation function.

### Scenario: component file is present and importable
- GIVEN the repository has been built or the dev server is running
- WHEN TypeScript resolves the import
- THEN the import succeeds with no type errors and the component mounts without runtime exceptions


## Requirement: dashboard-rendered-above-kanban-columns

MUST render  as a sibling element
placed immediately above the scrollable columns  whenever the kanban view
is active. The dashboard MUST NOT appear in the list view.

### Scenario: dashboard is visible in kanban view
- GIVEN the user has selected the kanban view ()
- WHEN the page renders
- THEN a  element is present in the DOM above the flex container that holds  elements

### Scenario: dashboard is absent in list view
- GIVEN the user has selected the list view ()
- WHEN the page renders
- THEN no  element is present in the DOM


## Requirement: column-task-counts-display

The dashboard MUST display one entry per column in . Each entry
MUST show the column's  and the count of items in 
(non-archived cards, as already filtered by the derived store). The count MUST
be an integer rendered as a visible numeric label.

### Scenario: counts reflect the current card distribution
- GIVEN a board with three columns: "To Do" (2 cards), "In Progress" (1 card), "Done" (3 cards)
- WHEN the dashboard renders
- THEN it displays "To Do: 2", "In Progress: 1", and "Done: 3" (or equivalent label/count pair for each column)

### Scenario: column with zero cards shows count of zero
- GIVEN a board where the "In Progress" column has no cards
- WHEN the dashboard renders
- THEN the "In Progress" entry displays a count of 0

### Scenario: newly added column appears in the dashboard
- GIVEN the user adds a column titled "Review" with 0 cards
- WHEN the  store emits the updated value
- THEN the dashboard immediately shows a "Review: 0" entry without a page reload

### Scenario: archived cards are not counted
- GIVEN a column contains 2 non-archived cards and 1 archived card (archived cards are excluded by the  derived store before  is populated)
- WHEN the dashboard renders
- THEN that column's count displays 2, not 3


## Requirement: overall-completion-percentage

The dashboard MUST display an overall completion percentage calculated as
 where  is the
number of non-archived todos with  and  is the
total number of non-archived todos. When  is zero the percentage
MUST be displayed as 0%. The value MUST be rendered as both a numeric label
(e.g., "42% complete") and a filled progress bar whose filled width corresponds
to the percentage.

### Scenario: percentage rounds correctly with mixed completed todos
- GIVEN there are 7 non-archived todos, 3 of which have
- WHEN the dashboard renders
- THEN the label shows "43% complete" () and the progress bar is filled to 43% of its total width

### Scenario: all todos completed shows 100%
- GIVEN there are 4 non-archived todos and all 4 have
- WHEN the dashboard renders
- THEN the label shows "100% complete" and the progress bar is fully filled

### Scenario: no todos shows 0%
- GIVEN the  store contains no non-archived todos
- WHEN the dashboard renders
- THEN the label shows "0% complete" and the progress bar is empty (0% fill)

### Scenario: completing a todo updates the percentage live
- GIVEN the dashboard is rendered and shows "50% complete" (2 of 4 completed)
- WHEN a third todo is marked  in the  store
- THEN the label updates to "75% complete" and the progress bar fill updates without a page reload

### Scenario: archived todos are excluded from percentage calculation
- GIVEN there are 3 non-archived todos (1 completed) and 2 archived todos (both completed)
- WHEN the dashboard renders
- THEN the percentage is %, not a value that includes the archived todos


## Requirement: overdue-item-count

The dashboard MUST display a count of overdue items. An item is overdue when all
of the following are true: , ,
 is a non-null ISO date string, and the date portion of  is
strictly before today's date (i.e.,  where
 is today's date in  format). The count MUST be rendered
as a visible badge or label. When there are no overdue items the count MUST
display 0.

### Scenario: overdue count reflects past-due incomplete todos
- GIVEN today is 2026-04-06, and there are two non-archived, non-completed todos with  of "2026-04-05" and "2026-03-01"
- WHEN the dashboard renders
- THEN the overdue count displays 2

### Scenario: due today is not overdue
- GIVEN today is 2026-04-06 and a non-archived, non-completed todo has  of "2026-04-06"
- WHEN the dashboard renders
- THEN that todo is NOT counted as overdue

### Scenario: completed past-due todo is not overdue
- GIVEN a todo has  of "2026-04-01", , and
- WHEN the dashboard renders
- THEN that todo is NOT counted as overdue

### Scenario: archived past-due todo is not overdue
- GIVEN a todo has  of "2026-04-01", , and
- WHEN the dashboard renders
- THEN that todo is NOT counted as overdue

### Scenario: todo with null dueDate is not overdue
- GIVEN a non-archived, non-completed todo has
- WHEN the dashboard renders
- THEN that todo is NOT counted as overdue

### Scenario: zero overdue items displays 0
- GIVEN all non-archived, non-completed todos either have  or
- WHEN the dashboard renders
- THEN the overdue count displays 0

### Scenario: resolving an overdue item decrements the live count
- GIVEN the dashboard shows an overdue count of 2
- WHEN a user marks one of the overdue todos as
- THEN the overdue count updates to 1 without a page reload


## Requirement: dashboard-reactivity

The dashboard MUST update automatically and synchronously (within the same
Svelte render cycle) whenever the  or  stores emit a new
value. No manual refresh, polling, or user interaction MUST be required to see
current values.

### Scenario: adding a new todo updates column count and total
- GIVEN the dashboard is rendered showing "To Do: 2" and "0% complete" with 2 active todos
- WHEN a new non-completed todo is added and the  store updates
- THEN "To Do" count increments to 3 and the completion percentage recalculates in the same render cycle

### Scenario: moving a card between columns updates both column counts
- GIVEN "To Do" shows 3 and "In Progress" shows 1
- WHEN a card is moved from "To Do" to "In Progress" via
- THEN the dashboard shows "To Do: 2" and "In Progress: 2" immediately after the store updates


## Requirement: empty-board-state

When the board has no columns the dashboard MUST render without errors and MUST
NOT show any column count entries. The completion percentage MUST display as 0%
and the overdue count MUST display as 0.

### Scenario: empty board renders cleanly
- GIVEN  emits an empty array  and  is empty
- WHEN the dashboard renders
- THEN no column entries are visible, the label shows "0% complete", and the overdue count shows 0, with no JavaScript exceptions thrown


## Requirement: dark-mode-support

The  component MUST apply Tailwind dark-mode variant
classes () to all visible elements so that text, backgrounds, borders,
and the progress bar fill are legible and visually consistent with the existing
board UI when the  class is present on the  element. No hardcoded
color values or inline styles MUST be used for theme-sensitive properties.

### Scenario: dashboard is legible in dark mode
- GIVEN the  class is applied to the  element (dark mode active)
- WHEN the  component renders
- THEN all text elements have a  class resolving to a light color, background containers have  classes consistent with  or equivalent, and the progress bar has a visible fill color under the dark theme

### Scenario: dashboard is legible in light mode
- GIVEN the  class is NOT present on the  element (light mode active)
- WHEN the  component renders
- THEN all text elements and backgrounds use the default (non-dark) Tailwind color classes and remain legible against a light background


## Requirement: accessibility

The dashboard MUST be accessible to screen readers and keyboard users.
The progress bar element MUST use  with ,
, and  attributes reflecting the current
completion percentage. The overdue count MUST be accompanied by a visible or
screen-reader-accessible label that identifies it as an overdue item count.
Column count entries MUST convey both the column name and count to assistive
technology.

### Scenario: progress bar exposes ARIA attributes
- GIVEN the completion percentage is 42%
- WHEN a screen reader queries the progress bar element
- THEN the element has , , , and

### Scenario: overdue count has an accessible label
- GIVEN the overdue count is 3
- WHEN a screen reader reads the overdue section
- THEN it announces text equivalent to "3 overdue" or "Overdue: 3" (either a visible label or  on the count element)

### Scenario: column count entries are readable by assistive technology
- GIVEN a column titled "In Progress" with 4 cards
- WHEN a screen reader encounters the column count entry
- THEN it announces both the column title and the count, e.g., "In Progress: 4"


## Requirement: no-store-mutations

MUST NOT import or call any store mutation function
(, , , , ,
, or any  write). It MUST only subscribe to 
and  as read-only reactive sources.

### Scenario: component source contains no mutation imports
- GIVEN the source of
- WHEN it is statically analyzed
- THEN it contains no imports of , , , , , , and does not call  or
- Per-column completion percentages or per-column overdue counts
- Priority-based breakdowns (e.g., count of high-priority overdue items)
- Historical or time-series metrics (burndown charts, throughput graphs)
- Filtering the board by clicking a statistic (e.g., "show only overdue cards")
- Statistics panel in the list view
- Exporting or sharing statistics (CSV, clipboard, screenshot)
- Configuring which metrics are shown or hidden by the user
- Counts or statistics involving archived todos beyond their exclusion from calculations
- Changes to the  schema,  interface, or  interface
