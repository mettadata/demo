# add-dark-mode-toggle-with-system-preference-detection

## Problem
Users who prefer dark interfaces — either by system setting or personal preference — have no way to use the todo app in dark mode. The app renders only in light mode regardless of the user's OS-level preference, causing visual discomfort and inconsistency with the rest of their environment.

## Proposal
Add a dark mode toggle to the todo app that:

1. Reads the user's system preference on initial load via `prefers-color-scheme: dark` and applies dark mode automatically when detected.
2. Renders a toggle button (sun/moon icon) in the app header that lets the user override the system preference.
3. Persists the user's explicit choice to `localStorage` so it survives page reloads.
4. Applies dark mode via Tailwind's `class` strategy (`dark:` variants) by toggling a `dark` class on the `<html>` element.

The scope is limited to wiring up the toggle mechanism and applying `dark:` variants to existing UI components (layout, todo list, todo items, filter controls, input fields, buttons). No new pages or routes.

## Impact
- **Layout / root component**: must manage and expose the dark mode state; `<html>` element needs the `dark` class toggled.
- **All UI components**: need `dark:` Tailwind variants added to colors, backgrounds, borders, and text.
- **Tailwind config**: `darkMode` must be set to `'class'` (may already be the default or need explicit configuration).
- **No server-side logic is affected** — this is entirely client-side state.

## Out of Scope
- Per-route or per-component theme customization.
- Multiple color themes beyond light/dark.
- Server-side rendering of the correct theme class (no flash-of-wrong-theme mitigation).
- Any changes to data models, load functions, or form actions.
- Automated tests for the toggle UI (visual/interaction coverage is out of scope for this quick change).
