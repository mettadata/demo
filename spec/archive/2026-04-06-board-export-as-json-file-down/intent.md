# board-export-as-json-file-down

## Problem
Users who maintain a Kanban board in the app have no way to extract their board data for backup, handoff, or analysis outside the browser. All state lives exclusively in `localStorage`, which is opaque, tied to the browser profile, and lost on a clear. When a user wants to share board state with a teammate, migrate to another machine, or inspect their data in an external tool, they have no supported path. This affects any user actively managing work on the Kanban view with multiple columns and cards.

## Proposal
Add a single "Export JSON" button that, when clicked, triggers a browser file download of the complete board state serialized as a JSON file.

The exported payload includes:

1. **Columns** — each column's `id`, `title`, and ordered array of `cardIds` (from `kanbanState`).
2. **Cards** — the full `Todo` objects for every non-archived card that appears in any column (resolved from the `todos` store). The `Todo` shape includes `id`, `text`, `description`, `completed`, `createdAt`, `priority`, `dueDate`, `labelIds`, `activityLog`, `attachments`, and `comments`.
3. **Labels** — the full `Label` objects for every label referenced by any exported card (from the `labels` store), each with `id`, `name`, and `color`.
4. **Metadata** — a top-level `exportedAt` ISO 8601 timestamp and a `version` string set to `"1"` to allow future format evolution.

The download is triggered via the `Blob` + `URL.createObjectURL` + programmatic anchor-click pattern entirely in the browser — no server request. The filename is `board-export-YYYY-MM-DD.json` using the local date at export time.

**New file**: `src/lib/components/ExportBoardButton.svelte` — a self-contained button component that reads `kanbanBoard` and `labels` from their stores, assembles the payload, and fires the download on click.

**Mount point**: `src/routes/+page.svelte` — the button is placed in the kanban view's toolbar area (the same row as any existing kanban-only controls), rendered only when `$viewPreference === 'kanban'`.

No new stores, no new routes, no server-side code.

## Impact
- **`src/routes/+page.svelte`**: imports and mounts `ExportBoardButton.svelte` in the kanban toolbar section; no changes to data flow or form actions.
- **`src/lib/components/ExportBoardButton.svelte`**: new file; reads `kanbanBoard` (derived store) and `labels` store directly; has no side effects beyond triggering a browser download.
- **No existing stores are modified** — the feature is purely a read path over `kanbanBoard` and `labels`.
- **No existing components are modified** beyond the single mount point in `+page.svelte`.
- **Dark mode**: the button must use `dark:` Tailwind variants consistent with the existing toolbar buttons so it does not break the dark mode layout.

## Out of Scope
- Importing / restoring board state from a previously exported JSON file.
- CSV or any export format other than JSON.
- Exporting archived cards.
- Exporting the raw `kanbanState` column order independently of resolved cards (the export uses the already-derived `kanbanBoard`).
- Server-side export endpoint or any form action.
- Compression or encryption of the exported file.
- Automated Vitest tests for the download side-effect (browser `Blob`/`URL` APIs are not covered in the unit test suite for this change).
- Any changes to the `todos`, `kanban`, or `labels` store interfaces.
