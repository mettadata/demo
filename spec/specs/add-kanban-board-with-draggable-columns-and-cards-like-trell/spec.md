# add-kanban-board-with-draggable-columns-and-cards-like-trell

## Requirement: kanban-data-model

The application MUST introduce a  backed by a Svelte writable store that tracks an ordered list of columns. Each column MUST have a unique  (string), a  (string), and an  (number). The store MUST also track an ordered mapping of todo IDs to columns and positions within those columns. The default column set MUST be "To Do", "In Progress", and "Done". Any todo not yet assigned to a column MUST be placed in the first column automatically.

### Scenario: store-initializes-with-defaults
- GIVEN the application starts with no saved kanban state in localStorage
- WHEN the KanbanStore initializes
- THEN it MUST create three columns titled "To Do", "In Progress", and "Done" in that order AND place all existing todos from the todo store into the "To Do" column in their current order

### Scenario: store-initializes-from-persisted-state
- GIVEN localStorage contains a valid  key
- WHEN the KanbanStore initializes
- THEN it MUST restore all columns and card-to-column assignments from the persisted state AND any todos present in the todo store but missing from the persisted mapping MUST be appended to the first column

### Scenario: orphaned-card-cleanup
- GIVEN the kanban store contains a card reference for a todo ID that no longer exists in the todo store
- WHEN the store synchronizes with the todo store
- THEN the orphaned card reference MUST be removed from the kanban state


## Requirement: column-crud

Users MUST be able to add, rename, and delete columns. Users SHOULD be able to reorder columns via drag-and-drop. Column titles MUST NOT be empty strings. There MUST always be at least one column on the board.

### Scenario: add-column
- GIVEN the kanban board is displayed with existing columns
- WHEN the user clicks the "Add Column" control and enters a title "Review"
- THEN a new column titled "Review" MUST appear as the last column on the board AND the board state MUST be persisted to localStorage

### Scenario: rename-column
- GIVEN a column titled "In Progress" exists on the board
- WHEN the user double-clicks the column title, changes it to "Doing", and confirms
- THEN the column title MUST update to "Doing" AND the board state MUST be persisted to localStorage

### Scenario: rename-column-empty-title
- GIVEN a column titled "In Progress" exists on the board
- WHEN the user attempts to rename the column to an empty string
- THEN the rename MUST be rejected AND the column title MUST remain "In Progress"

### Scenario: delete-column-with-cards
- GIVEN a column titled "Review" contains 3 cards AND another column "To Do" is the first column
- WHEN the user deletes the "Review" column
- THEN the "Review" column MUST be removed from the board AND all 3 cards MUST be moved to the "To Do" column appended at the end AND the board state MUST be persisted to localStorage

### Scenario: delete-last-column-prevented
- GIVEN only one column remains on the board
- WHEN the user attempts to delete that column
- THEN the deletion MUST be prevented AND the user MUST see a message indicating at least one column is required


## Requirement: card-drag-and-drop-between-columns

The application MUST support moving cards between columns using the HTML5 Drag and Drop API without any external library. When a card is dropped into a different column, the kanban store MUST update the card's column assignment and position, then persist to localStorage immediately.

### Scenario: drag-card-to-another-column
- GIVEN a card "Fix login bug" is in the "To Do" column at position 0
- WHEN the user drags the card and drops it into the "In Progress" column at position 0
- THEN the card MUST appear at position 0 in the "In Progress" column AND the card MUST no longer appear in the "To Do" column AND localStorage MUST be updated

### Scenario: drag-card-to-empty-column
- GIVEN a card "Write docs" is in the "To Do" column AND the "Done" column is empty
- WHEN the user drags the card and drops it into the "Done" column
- THEN the card MUST appear as the only card in the "Done" column AND localStorage MUST be updated

### Scenario: drag-visual-feedback
- GIVEN a card is being dragged over a column
- WHEN the card enters the column drop zone
- THEN the column MUST display a visual drop indicator (such as a highlighted border or placeholder) to signal it is a valid drop target


## Requirement: card-reordering-within-column

Users MUST be able to reorder cards within the same column by dragging a card to a new position. The kanban store MUST update all affected card positions and persist to localStorage immediately.

### Scenario: reorder-card-within-column
- GIVEN the "To Do" column contains cards A, B, C in that order
- WHEN the user drags card C to the position before card A
- THEN the "To Do" column MUST display cards in order C, A, B AND localStorage MUST be updated

### Scenario: reorder-single-card-noop
- GIVEN the "To Do" column contains only one card
- WHEN the user drags and drops it back in the same position
- THEN no state change MUST occur AND the card MUST remain in its position


## Requirement: localstorage-persistence

The full kanban board layout (columns and card-to-column assignments with positions) MUST be persisted to localStorage under the key . The store MUST write to localStorage on every mutation (column add/rename/delete, card move, card reorder). The view preference (list or kanban) MUST be persisted to localStorage under a separate key .

### Scenario: persist-on-mutation
- GIVEN the kanban board is in its default state
- WHEN the user moves a card from "To Do" to "In Progress"
- THEN the  key in localStorage MUST contain a JSON value reflecting the updated column assignments

### Scenario: persist-view-preference
- GIVEN the user is viewing the list view
- WHEN the user toggles to the kanban board view
- THEN the  key in localStorage MUST be set to "kanban"

### Scenario: restore-view-preference-on-load
- GIVEN localStorage  is set to "kanban"
- WHEN the application loads
- THEN the kanban board view MUST be displayed instead of the list view


## Requirement: view-toggle

The app header MUST include a view toggle control with a list icon and a board icon that switches between the existing todo list view and the kanban board view. The currently active view MUST be visually indicated. The toggle MUST persist the selected view to localStorage.

### Scenario: toggle-to-kanban-view
- GIVEN the user is viewing the todo list
- WHEN the user clicks the board icon in the view toggle
- THEN the todo list MUST be hidden AND the kanban board MUST be displayed AND the board icon MUST appear as the active selection

### Scenario: toggle-to-list-view
- GIVEN the user is viewing the kanban board
- WHEN the user clicks the list icon in the view toggle
- THEN the kanban board MUST be hidden AND the todo list MUST be displayed AND the list icon MUST appear as the active selection


## Requirement: sync-with-todo-store

The kanban board MUST treat the existing  as the source of truth for todo data (title, completed status, priority). The kanban store MUST hold only layout metadata. New todos created from either view MUST appear in the first kanban column. Deleting a todo from the list view MUST remove its card from the kanban board. Completing a todo in list view MUST NOT automatically move it to a different column.

### Scenario: new-todo-appears-in-first-column
- GIVEN the kanban board has columns "To Do", "In Progress", "Done"
- WHEN the user creates a new todo titled "Buy milk" from the list view
- THEN a card for "Buy milk" MUST appear at the end of the "To Do" column on the kanban board

### Scenario: deleted-todo-removed-from-board
- GIVEN a todo "Fix typo" exists in the "In Progress" column on the kanban board
- WHEN the user deletes the todo "Fix typo" from the list view
- THEN the card for "Fix typo" MUST no longer appear anywhere on the kanban board AND the kanban state MUST be persisted

### Scenario: completing-todo-does-not-move-card
- GIVEN a todo "Write tests" is in the "In Progress" column on the kanban board
- WHEN the user marks "Write tests" as completed in the list view
- THEN the card for "Write tests" MUST remain in the "In Progress" column AND its completed status MUST be visually reflected on the card


## Requirement: board-component-structure

The kanban feature MUST be implemented with three primary Svelte components:  (renders the full board with horizontal column layout),  (renders a single column with its header and list of cards), and  (renders a single card displaying todo title, description preview, and priority indicator). Each component MUST accept its data via props from the parent component.

### Scenario: board-renders-all-columns
- GIVEN the kanban store has 3 columns with 2, 1, and 0 cards respectively
- WHEN the KanbanBoard component mounts
- THEN it MUST render 3 KanbanColumn components horizontally AND each column MUST contain the correct number of KanbanCard components

### Scenario: card-displays-todo-data
- GIVEN a todo exists with title "Deploy app", priority "high", and a description "Push to production server"
- WHEN the KanbanCard for that todo renders
- THEN the card MUST display the title "Deploy app" AND a priority indicator for "high" AND a truncated description preview


## Requirement: accessibility-for-drag-and-drop

All draggable cards MUST have  and columns MUST have . Cards MUST include  and  attributes that update during drag operations. The board SHOULD provide keyboard-accessible card movement as an alternative to mouse drag-and-drop. Each column MUST have an accessible label derived from its title.

### Scenario: screen-reader-card-announcement
- GIVEN a screen reader user focuses on a card titled "Fix bug" in the "To Do" column
- WHEN the card receives focus
- THEN the screen reader MUST announce the card title and its containing column name

### Scenario: keyboard-card-movement
- GIVEN a card "Review PR" in the "To Do" column has keyboard focus
- WHEN the user activates the card (Space or Enter) and presses the right arrow key, then confirms
- THEN the card SHOULD move to the next column ("In Progress") AND focus SHOULD remain on the moved card

### Scenario: aria-attributes-during-drag
- GIVEN a card is idle (not being dragged)
- WHEN the user initiates a drag on the card
- THEN  MUST change from "false" to "true" on the card AND the target column MUST have  set to "move"


## Requirement: unit-tests-for-kanban-store

The kanban store logic MUST have unit tests covering all store operations. Tests MUST be written using Vitest. Tests MUST NOT depend on browser APIs directly; localStorage MUST be mocked. Tests MUST cover: initialization with defaults, initialization from persisted state, adding a column, renaming a column, deleting a column (with card reassignment), moving a card between columns, reordering cards within a column, syncing with new todos, and removing orphaned cards.

### Scenario: test-add-column
- GIVEN the kanban store is initialized with default columns
- WHEN the  function is called
- THEN the store MUST contain 4 columns AND the last column MUST have the title "Review"

### Scenario: test-move-card
- GIVEN the store has a card in column "To Do" at position 0
- WHEN  is called
- THEN the card MUST be in column "In Progress" at position 0 AND the "To Do" column MUST not contain the card

### Scenario: test-delete-column-reassigns-cards
- GIVEN column "Review" has 2 cards AND "To Do" is the first column
- WHEN  is called
- THEN the store MUST not contain a column titled "Review" AND the 2 cards MUST be appended to the "To Do" column

### Scenario: test-persistence-called-on-mutation
- GIVEN localStorage.setItem is mocked
- WHEN any mutation function is called on the store
- THEN localStorage.setItem MUST have been called with key "kanban-state" and a valid JSON string
