# add-undo-and-redo-for-card-actions-with-keyboard-shortcuts

## Problem
Users have no way to undo accidental actions like deleting a card, toggling completion, changing priority, or editing a due date. Mistakes require manually recreating lost data.

## Proposal
Add an undo/redo system that tracks todo mutations (add, toggle, remove, update) as reversible actions on a history stack:

- **Ctrl+Z** (Cmd+Z on Mac) undoes the last action
- **Ctrl+Shift+Z** (Cmd+Shift+Z on Mac) redoes the last undone action
- Undo/redo buttons in the header for discoverability
- History stack stores snapshots of the todos array (simple and reliable)
- New mutations clear the redo stack (standard undo behavior)
- Stack limited to 50 entries to bound memory usage

## Impact
- Wraps all todo mutations (addTodo, toggleTodo, removeTodo, updateTodo) with history tracking
- Adds global keyboard listener for Ctrl+Z / Ctrl+Shift+Z
- Adds UndoRedoButtons component to the header bar
- No changes to kanban column/card operations (only todo data mutations)

## Out of Scope
- Undo for kanban column operations (add/rename/delete column, move card between columns)
- Persistent undo history across page reloads
- Multi-level undo UI showing action descriptions
- Undo for search/filter state changes
