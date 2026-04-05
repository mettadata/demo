# add-todo-crud-operations-with-local-storage-persistence

## Requirement: todo-data-model

Each todo item MUST be represented as a TypeScript interface with the following properties: a unique string  (generated via ), a non-empty string , a boolean  defaulting to , and a  ISO 8601 timestamp string set at creation time.

### Scenario: todo-has-required-fields
- GIVEN the todo TypeScript interface is defined in
- WHEN a developer inspects the  type
- THEN it MUST contain , , , and

### Scenario: new-todo-defaults
- GIVEN a user creates a new todo with the text "Buy groceries"
- WHEN the todo is added to the store
- THEN  MUST be ,  MUST be a valid UUID, and  MUST be a valid ISO 8601 timestamp


## Requirement: create-todo

The application MUST allow users to create a new todo by entering text into an input field and submitting it. The input field MUST be cleared after successful submission. Empty or whitespace-only input MUST NOT create a todo.

### Scenario: create-todo-with-valid-text
- GIVEN the todo input field is empty and the todo list is empty
- WHEN the user types "Buy groceries" and presses Enter
- THEN a new todo with text "Buy groceries" MUST appear in the list, and the input field MUST be cleared

### Scenario: reject-empty-input
- GIVEN the todo input field contains only whitespace
- WHEN the user presses Enter
- THEN no todo MUST be created and the list MUST remain unchanged

### Scenario: reject-blank-submission
- GIVEN the todo input field is empty
- WHEN the user presses Enter
- THEN no todo MUST be created


## Requirement: read-todos

The application MUST display all todos in a reactive list, ordered by creation time (newest first or consistent insertion order). Each todo item MUST display its text and its completion status visually.

### Scenario: display-all-todos
- GIVEN the store contains three todos: "Buy groceries", "Walk the dog", "Read a book"
- WHEN the user views the todo list with the "All" filter active
- THEN all three todos MUST be visible in the list

### Scenario: empty-state
- GIVEN the store contains no todos
- WHEN the user views the todo list
- THEN the list MUST be empty and no todo items MUST be rendered


## Requirement: toggle-todo-completion

The application MUST allow users to toggle a todo's  status between  and . The UI MUST visually distinguish completed todos from active todos.

### Scenario: mark-todo-as-completed
- GIVEN a todo "Buy groceries" exists with
- WHEN the user toggles its completion status
- THEN the todo's  property MUST be  and the UI MUST reflect the completed state (e.g., strikethrough text or visual indicator)

### Scenario: mark-completed-todo-as-active
- GIVEN a todo "Buy groceries" exists with
- WHEN the user toggles its completion status
- THEN the todo's  property MUST be  and the UI MUST reflect the active state


## Requirement: delete-todo

The application MUST allow users to permanently delete a single todo. Deletion MUST remove the todo from both the store and the persisted localStorage data.

### Scenario: delete-existing-todo
- GIVEN the store contains todos "Buy groceries" and "Walk the dog"
- WHEN the user deletes "Buy groceries"
- THEN only "Walk the dog" MUST remain in the list and in localStorage

### Scenario: delete-last-todo
- GIVEN the store contains a single todo "Buy groceries"
- WHEN the user deletes "Buy groceries"
- THEN the store MUST be empty and localStorage MUST contain an empty array


## Requirement: localstorage-persistence

The application MUST persist the entire todo array to  under a consistent key on every mutation (create, toggle, delete). On application load, the store MUST rehydrate its state from . If no stored data exists or the stored data is invalid, the store MUST initialize with an empty array.

### Scenario: persist-on-create
- GIVEN the store is empty
- WHEN the user creates a todo "Buy groceries"
- THEN  MUST contain a JSON-serialized array with one todo matching "Buy groceries"

### Scenario: persist-on-toggle
- GIVEN the store contains a todo "Buy groceries" with
- WHEN the user toggles it to completed
- THEN  MUST contain the updated todo with

### Scenario: persist-on-delete
- GIVEN the store contains todos "Buy groceries" and "Walk the dog"
- WHEN the user deletes "Buy groceries"
- THEN  MUST contain only "Walk the dog"

### Scenario: rehydrate-on-load
- GIVEN  contains a JSON array with two valid todos
- WHEN the application loads
- THEN the store MUST initialize with exactly those two todos

### Scenario: handle-missing-localstorage-data
- GIVEN  has no entry for the todos key
- WHEN the application loads
- THEN the store MUST initialize with an empty array

### Scenario: handle-corrupted-localstorage-data
- GIVEN  contains invalid JSON for the todos key
- WHEN the application loads
- THEN the store MUST initialize with an empty array and SHOULD NOT throw an error

### Scenario: round-trip-serialization
- GIVEN a todo is created with text "Buy groceries"
- WHEN the data is serialized to  and then deserialized on reload
- THEN all fields (, , , ) MUST match their original values exactly


## Requirement: client-side-filtering

The application MUST provide three filter options: "All", "Active", and "Completed". The active filter MUST be visually indicated. Filtering MUST be implemented via a Svelte derived store and MUST NOT modify the underlying todo data.

### Scenario: filter-all
- GIVEN the store contains two active todos and one completed todo
- WHEN the user selects the "All" filter
- THEN all three todos MUST be displayed

### Scenario: filter-active
- GIVEN the store contains two active todos and one completed todo
- WHEN the user selects the "Active" filter
- THEN only the two active (incomplete) todos MUST be displayed

### Scenario: filter-completed
- GIVEN the store contains two active todos and one completed todo
- WHEN the user selects the "Completed" filter
- THEN only the one completed todo MUST be displayed

### Scenario: filter-does-not-mutate-store
- GIVEN the store contains three todos
- WHEN the user switches between "All", "Active", and "Completed" filters
- THEN the underlying todo store MUST remain unchanged with all three todos intact

### Scenario: active-filter-indication
- GIVEN the "All" filter is currently selected
- WHEN the user views the filter controls
- THEN the "All" button MUST be visually distinguished from "Active" and "Completed"


## Requirement: svelte-store-architecture

All todo state MUST be managed in a  module using a Svelte writable store. The store MUST expose functions for , , and . A derived store MUST provide filtered results based on the current filter selection. Components MUST NOT directly manipulate the store's internal array.

### Scenario: store-exports-required-functions
- GIVEN the  module is imported
- WHEN a developer inspects its exports
- THEN it MUST export , , , a writable todos store, and a derived filtered todos store

### Scenario: add-todo-via-store-function
- GIVEN the store is empty
- WHEN  is called
- THEN the store MUST contain exactly one todo with text "Buy groceries"

### Scenario: toggle-todo-via-store-function
- GIVEN the store contains a todo with  "abc" and
- WHEN  is called
- THEN the todo with  "abc" MUST have

### Scenario: remove-todo-via-store-function
- GIVEN the store contains a todo with  "abc"
- WHEN  is called
- THEN the store MUST NOT contain a todo with  "abc"


## Requirement: component-structure

The UI MUST be composed of discrete Svelte components in : a  component for creating todos, a  component for rendering the list, a  component for individual todo display with toggle and delete controls, and a  component for filter selection. The main  route MUST compose these components.

### Scenario: component-files-exist
- GIVEN the project source tree
- WHEN a developer inspects
- THEN , , , and  MUST exist

### Scenario: page-composes-components
- GIVEN the application is loaded at the root route
- WHEN the user views the page
- THEN the page MUST render the TodoInput, TodoList, and TodoFilter components together


## Requirement: unit-test-coverage

Unit tests MUST be written in Vitest covering the store logic: adding a todo, toggling completion, removing a todo, filtering by status, and localStorage serialization round-trip. Tests MUST NOT depend on a browser environment for store logic and MUST mock  where necessary.

### Scenario: test-add-todo
- GIVEN a clean store instance
- WHEN  is called
- THEN the store MUST contain one todo with text "Test item", , a valid UUID , and a valid  timestamp

### Scenario: test-toggle-todo
- GIVEN a store with one todo that has
- WHEN  is called with that todo's
- THEN the todo's  MUST be

### Scenario: test-remove-todo
- GIVEN a store with two todos
- WHEN  is called with the first todo's
- THEN the store MUST contain exactly one todo

### Scenario: test-filter-active
- GIVEN a store with one active and one completed todo
- WHEN the filter is set to "Active"
- THEN the filtered result MUST contain only the active todo

### Scenario: test-filter-completed
- GIVEN a store with one active and one completed todo
- WHEN the filter is set to "Completed"
- THEN the filtered result MUST contain only the completed todo

### Scenario: test-localstorage-round-trip
- GIVEN a mocked  and a store with two todos
- WHEN the store persists to  and a new store instance rehydrates from it
- THEN the rehydrated todos MUST be deeply equal to the originals
