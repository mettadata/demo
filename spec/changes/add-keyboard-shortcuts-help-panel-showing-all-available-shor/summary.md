# Summary: Add Keyboard Shortcuts Help Panel

## What was built

A modal overlay component (`ShortcutsHelpModal.svelte`) that displays all available keyboard shortcuts, grouped by context, with proper accessibility and dark mode support.

## Files changed

- **`src/lib/components/ShortcutsHelpModal.svelte`** (new) -- Modal component with shortcut registry, focus trap, Escape-to-close, click-outside-to-close, and focus restoration.
- **`src/lib/components/__tests__/ShortcutsHelpModal.test.ts`** (new) -- 8 unit tests covering rendering, group headings, shortcut descriptions, kbd elements, close button, and Ctrl/Cmd variants.
- **`src/routes/+page.svelte`** (modified) -- Added `?` keydown listener (guarded against input focus), imported and rendered the modal, added a `?` help icon button in the header toolbar.
- **`vite.config.ts`** (modified) -- Added `resolve.conditions: ['browser']` so Svelte 5 resolves to client bundle in jsdom test environment, enabling component rendering tests.

## Shortcut groups

| Context | Shortcuts |
|---------|-----------|
| Global | Ctrl+Z / Cmd+Z (Undo), Ctrl+Shift+Z / Cmd+Shift+Z (Redo), ? (Help) |
| Todo Input | Enter (Add) |
| Kanban Card | Enter/Space (Pick up), Arrow keys (Move), Enter (Drop), Escape (Cancel) |
| Column Title Edit | Enter (Save), Escape (Cancel) |
| Label Editing | Enter (Save), Escape (Cancel) |
| Add Column Input | Enter (Create), Escape (Cancel) |

## Trigger methods

1. Press `?` key globally (when not focused on input/textarea/select)
2. Click the `?` icon button in the header toolbar

## Accessibility

- `role="dialog"` with `aria-label="Keyboard shortcuts"` and `aria-modal="true"`
- Focus trap keeps Tab/Shift+Tab within the modal
- Focus restores to previously focused element on close
- Close button has `aria-label="Close shortcuts help"`

## Deviations

- **`vite.config.ts` modified** (infrastructure fix): Added `resolve.conditions: ['browser']` at the top level to fix Svelte 5 component rendering in jsdom. Without this, Svelte resolves to its server bundle in tests, preventing `mount()` calls. All 112 existing tests continue to pass.
