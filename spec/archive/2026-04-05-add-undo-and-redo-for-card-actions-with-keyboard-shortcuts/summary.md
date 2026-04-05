# Verification: add-undo-and-redo-for-card-actions-with-keyboard-shortcuts

## Spec Scenarios

- [x] Undo restores previous todos state after any mutation
- [x] Redo re-applies undone action
- [x] New mutation clears redo stack
- [x] Undo on empty stack is a no-op
- [x] Redo on empty stack is a no-op
- [x] History capped at 50 entries
- [x] Ctrl+Z / Cmd+Z triggers undo
- [x] Ctrl+Shift+Z / Cmd+Shift+Z triggers redo
- [x] Keyboard shortcuts don't fire when input/textarea/select is focused
- [x] UndoRedoButtons show disabled state correctly
- [x] All four mutations (add, toggle, remove, update) auto-snapshot
- [x] Dark mode support on buttons

## Gate Results

- Tests: PASS (76 total across 4 files — 12 new history tests)
- Typecheck: PASS (0 errors)
- Lint: PASS

## Summary

Snapshot-based undo/redo system using a callback registration pattern to avoid circular imports between `todos.ts` and `history.ts`. Each mutation auto-saves a snapshot before executing. Global keyboard listener on `+page.svelte` handles Ctrl+Z/Ctrl+Shift+Z with input element exclusion. UndoRedoButtons in header for discoverability.
