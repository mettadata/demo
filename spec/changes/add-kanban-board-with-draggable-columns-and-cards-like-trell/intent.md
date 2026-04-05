# add-kanban-board-with-draggable-columns-and-cards-like-trell

## Problem
The current todo app only offers a flat list view, which breaks down once users accumulate more than a handful of tasks. There is no way to visualize workflow stages or track progress at a glance. Users who manage tasks across multiple states (backlog, active work, completed) are forced to mentally map status to list position or rely solely on filter toggles, which hides items rather than organizing them spatially. This affects anyone using the app for lightweight project tracking or daily task management.

## Proposal
Add a Trello-style kanban board view alongside the existing list view. Specifically:

- **Kanban data model**: Introduce a `KanbanStore` (Svelte writable store) that tracks columns (id, title, order) and the assignment of each todo to a column and position. Default columns: "To Do", "In Progress", "Done". Persist the full column/card mapping to localStorage under a dedicated key (`kanban-state`).
- **Board view component** (`KanbanBoard.svelte`): Renders columns horizontally with cards stacked vertically inside each column. Each card displays the todo title, optional description preview, and priority indicator pulled from the existing todo store.
- **Drag-and-drop**: Implement HTML5 Drag and Drop API (no external library) for moving cards between columns and reordering cards within a column. Update store positions on drop and persist immediately to localStorage.
- **Column management**: Allow users to add, rename, reorder, and delete columns through inline editing and a column header menu. Deleting a column moves its cards to the first remaining column.
- **View toggle**: Add a view switcher (list icon / board icon) in the app header that flips between the existing todo list and the new kanban board. Persist the selected view preference to localStorage.
- **Sync with todo store**: New todos created from either view default to the first column. Deleting a todo from the list view also removes its card from the board. Completing a todo in list view does not auto-move it on the board (users control column assignment).

## Impact
- The existing `todoStore` remains the source of truth for todo data (title, completed, priority). The kanban store holds only layout metadata (column assignments and positions), so current list-view functionality is unaffected.
- The app header gains a view toggle control, which changes its layout slightly.
- localStorage usage increases by one additional key (`kanban-state`).
- The test suite needs new test files for the kanban store, board component, and drag-and-drop interactions. Existing todo store and list view tests should remain passing without modification.

## Out of Scope
- No backend, database, or authentication. All data stays in localStorage.
- No swimlanes, labels, due dates, or card detail modals beyond what the existing todo model already provides.
- No multi-board support; there is one board that maps to the single todo list.
- No real-time collaboration or WebSocket sync.
- No external drag-and-drop libraries (e.g., dnd-kit, SortableJS). We use the native HTML5 Drag and Drop API only.
- No migration tooling for existing localStorage data; the kanban store initializes with defaults if no saved state is found, placing all existing todos into the first column.
- No mobile touch-optimized drag gestures (pointer events, touch handling); mobile support is limited to what the HTML5 DnD API provides natively.
