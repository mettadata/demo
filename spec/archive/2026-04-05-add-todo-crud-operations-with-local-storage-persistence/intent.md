# add-todo-crud-operations-with-local-storage-persistence

## Problem
The app has no way to manage todos. Users need to create, read, update (mark complete/incomplete), and delete tasks, and they expect those tasks to survive a page refresh. Without persistence, any todos entered during a session vanish the moment the browser reloads, making the app unusable for real task tracking.

## Proposal
Implement the full todo CRUD lifecycle backed by browser `localStorage`:

- **Create** — Add a new todo with a text description. Each todo gets a unique id, a `completed` flag (default `false`), and a `createdAt` timestamp.
- **Read** — Display all todos in a reactive list. Support three filter views: All, Active (incomplete), and Completed.
- **Update** — Toggle a todo's `completed` state.
- **Delete** — Remove a single todo permanently.
- **Persist** — Serialize the todo array to `localStorage` on every mutation and rehydrate it on app load via a Svelte writable store with a custom subscriber.
- **Filter** — Client-side filtering by completion status using a derived store.

All state lives in a `$lib/stores/todos.ts` Svelte store module. Components in `$lib/components/` handle input, list rendering, individual todo items, and filter controls. The main `+page.svelte` route composes these components.

Unit tests cover the store logic (add, toggle, remove, filter, serialization round-trip) using Vitest.

## Impact
This is a greenfield project with no existing functionality. There is no code to break. The change establishes the foundational data model, state management pattern, and component structure that all future features will build on.

## Out of Scope
- Server-side storage, databases, or any backend persistence (IndexedDB, SQLite, APIs).
- User authentication or multi-user support.
- Editing a todo's text after creation (only toggle and delete).
- Drag-and-drop reordering or priority levels.
- Due dates, tags, or categorization.
- Animations or transition effects.
- PWA / offline-first service worker caching.
- End-to-end or integration tests (unit tests only for this change).
