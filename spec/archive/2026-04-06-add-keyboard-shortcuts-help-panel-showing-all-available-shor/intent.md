# add-keyboard-shortcuts-help-panel-showing-all-available-shor

## Problem
The app has twelve keyboard shortcuts spread across five components, but they are entirely undiscoverable. New users have no way to learn that kanban cards support keyboard-driven reordering, that undo/redo is available, or that column titles and labels can be edited without a mouse. Power users who know shortcuts exist cannot easily recall the exact key combinations. This affects any user who has not read the source code.

## Proposal
Add a keyboard shortcuts help panel — a modal overlay — that lists all available shortcuts in the app grouped by context:

- **Trigger**: Pressing `?` (question mark) anywhere in the app MUST open the panel. Pressing `Escape` or clicking outside the overlay MUST close it. A visible help button (e.g., a `?` icon) MUST also be added to the header so the panel is discoverable without knowing the trigger shortcut.
- **ShortcutsHelpModal component**: A new `$lib/components/ShortcutsHelpModal.svelte` component MUST render the panel as a focusable modal with a backdrop. It MUST be mounted once in the root layout or `+page.svelte` and shown/hidden via a boolean store or prop.
- **Shortcut registry**: Shortcuts MUST be declared as a static data structure (an array of `{ key: string; description: string; context: string }` entries) colocated with the modal component. This list MUST include all twelve shortcuts identified at the time of implementation:
  - Global: `Ctrl+Z` / `Cmd+Z` → Undo, `Ctrl+Shift+Z` / `Cmd+Shift+Z` → Redo, `?` → Open shortcuts help
  - Todo input: `Enter` → Add new todo
  - Kanban card (navigation): `Enter` / `Space` → Pick up card, `Arrow Up` / `Arrow Down` → Move within column, `Arrow Left` / `Arrow Right` → Move between columns, `Enter` → Drop card, `Escape` → Cancel move
  - Column title edit: `Enter` → Save, `Escape` → Cancel
  - Label editing: `Enter` → Save, `Escape` → Cancel
  - Add column input: `Enter` → Create column, `Escape` → Cancel
- **Layout**: Shortcuts SHOULD be grouped by context with a heading per group. Each row MUST show the key combination(s) in a `<kbd>` element and a plain-English description. The panel MUST be scrollable if content overflows the viewport.
- **Accessibility**: The modal MUST trap focus while open, MUST have `role="dialog"` and `aria-label="Keyboard shortcuts"`, and MUST return focus to the previously focused element on close.
- **Mac/Windows display**: Key combinations that differ by platform (Ctrl vs. Cmd) SHOULD display both variants (e.g., `Ctrl+Z / Cmd+Z`).

## Impact
- `+page.svelte` gains a `keydown` listener for `?` to toggle the panel and renders `<ShortcutsHelpModal>`.
- The existing `keydown` handler for `Ctrl+Z` / `Ctrl+Shift+Z` in `+page.svelte` must not intercept bare `?` key presses when a text input is focused — the new listener MUST check that the active element is not an `<input>`, `<textarea>`, or `contenteditable` element before opening the panel.
- A help icon button added to the header bar sits alongside the existing undo/redo buttons.
- No changes to existing shortcut behavior or the stores layer.

## Out of Scope
- Runtime shortcut customization or remapping
- Persisting user-defined shortcut preferences
- Surfacing shortcuts via tooltips on individual UI elements
- Automatically keeping the shortcut registry in sync with code (no static analysis)
- Keyboard shortcuts for features not yet implemented
- Touch or mouse gesture documentation
