# Summary: Dark Mode Toggle with System Preference Detection

## What Changed

Added a three-mode dark theme toggle (system/light/dark) to the todo app with automatic system preference detection and localStorage persistence.

## Files Created

- `src/lib/stores/theme.ts` — Theme store with `themePreference` (writable), `resolvedTheme` (derived), and `cycleTheme()` function. Persists to localStorage, listens for system `prefers-color-scheme` changes.
- `src/lib/components/ThemeToggle.svelte` — Button component that cycles through system/light/dark modes with contextual SVG icons (monitor, moon, sun).

## Files Modified

- `src/app.css` — Added `@custom-variant dark` for class-based dark mode in Tailwind v4, plus transition on `html`.
- `src/app.html` — Added inline script to prevent flash of wrong theme on page load.
- `src/routes/+layout.svelte` — Imported theme store to activate subscriptions.
- `src/routes/+page.svelte` — Added `ThemeToggle` to header, wrapped page in `min-h-screen` dark-aware container.
- `src/lib/components/TodoInput.svelte` — Added `dark:` variants for input background, border, text, placeholder.
- `src/lib/components/TodoItem.svelte` — Added `dark:text-white` to item container.
- `src/lib/components/TodoFilter.svelte` — Added `dark:` variants to inactive filter buttons.
- `src/lib/components/ViewToggle.svelte` — Added `dark:` variants to inactive toggle buttons.
- `src/lib/components/KanbanBoard.svelte` — Added `dark:` variants to column input and add-column button.
- `src/lib/components/KanbanColumn.svelte` — Added `dark:` variants to column background, drag-over state, edit input, title, and counter badge.
- `src/lib/components/KanbanCard.svelte` — Added `dark:` variants to card background, border, and text.

## Verification

- All 23 existing tests pass.
- svelte-check reports 0 errors (1 pre-existing a11y warning unrelated to this change).
