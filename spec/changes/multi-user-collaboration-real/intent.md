# multi-user-collaboration-real

## Problem

The todo app is fully single-user. All state lives in the browser's `localStorage` and is driven by Svelte's `writable` stores (`todos`, `kanbanState`, `labels`, and `viewPreference`). Two browser tabs — let alone two distinct users on separate machines — share no state. A user who opens the board in a second tab sees a frozen copy; any card move, addition, or deletion in one tab is invisible to the other until the page is hard-refreshed.

This matters because the kanban board, with its columns, drag-and-drop, comments, attachments, and activity log, is already built for team-style workflows. Without real-time sync the board is a solo-use artifact, limiting its practical value and making it impossible for two people to coordinate on the same board in real time.

Affected users: anyone who wants to share a board between two browser tabs on the same machine, or between two peers on a local network without spinning up a dedicated backend.

## Proposal

Add lightweight multi-user collaboration by introducing two coordinated mechanisms:

**1. Cross-tab sync via BroadcastChannel**

A new module `src/lib/sync/broadcastSync.ts` MUST wrap a `BroadcastChannel` on the channel name `metta-todo-sync`. Every mutation that writes to `todos` or `kanbanState` MUST emit a typed message over the channel carrying the full serialized state payload. Any tab that receives a message MUST apply the payload to its own stores without re-broadcasting, preventing echo loops. This delivers instant same-machine, same-origin sync at zero infrastructure cost.

**2. Lightweight peer identity via `collaborators` store**

A new Svelte store `src/lib/stores/collaborators.ts` MUST manage a `Collaborator` record for the current user, containing:
- `id`: a `crypto.randomUUID()` generated once and persisted in `localStorage` under the key `user-id`
- `name`: a short display name, defaulting to `"Anonymous"`, editable by the user and persisted under `user-name`
- `color`: a deterministic hex color derived from the user's `id` (e.g., the first six hex characters of a SHA-1-style hash), used exclusively as the avatar background

The `collaborators` store MUST broadcast a presence heartbeat over BroadcastChannel every 30 seconds and on page load, so that other open tabs can render a "who is here" list. A collaborator MUST be considered gone and removed from the active list after 90 seconds of silence.

**3. User avatar display**

`KanbanCard.svelte` and `KanbanBoard.svelte` MUST render a small circular avatar (initials on colored background) for each active collaborator who is known to have last touched that card. "Last touched" is determined by matching the `activityLog` entry with the highest `timestamp` against a collaborator `id` stored in the event's `detail` field.

To make this work, all mutation functions in `todos.ts` (`addTodo`, `toggleTodo`, `updateTodo`, `moveCard`, `addComment`, `addAttachment`, etc.) MUST accept an optional `actorId: string` parameter and, when provided, include `{ actorId }` in the `detail` field of any `ActivityEvent` they append.

**4. User name prompt on first visit**

On first load (no `user-name` in `localStorage`), `+page.svelte` MUST display a non-blocking banner or modal asking the user to enter a display name. The user MAY dismiss without entering a name, in which case `"Anonymous"` is used. The name MUST be editable at any time via a settings affordance in the page header.

**Sync scope**: this change covers same-origin tabs only. Cross-machine sync is explicitly out of scope (see below). The BroadcastChannel API is available in all modern browsers (Chrome 54+, Firefox 38+, Safari 15.4+) and MUST be the sole transport.

## Impact

### `src/lib/stores/todos.ts`
All mutation functions (`addTodo`, `toggleTodo`, `removeTodo`, `updateTodo`, `moveCard`, `archiveTodo`, `unarchiveTodo`, `addComment`, `editComment`, `deleteComment`, `addAttachment`, `removeAttachment`, `addReply`, `editReply`, `deleteReply`) MUST accept an optional `actorId` parameter. Existing callers that omit it continue to work without change.

### `src/lib/stores/kanban.ts`
`moveCard`, `addColumn`, `renameColumn`, `deleteColumn`, and `applyTemplate` emit their mutations to BroadcastChannel after writing to the store.

### `src/lib/stores/history.ts`
The undo/redo stacks (`undoStack`, `redoStack`) are local to each tab and MUST NOT be synchronized. A remote mutation received over BroadcastChannel bypasses the snapshot mechanism to avoid contaminating the local undo history.

### `src/lib/components/KanbanCard.svelte`
Gains an optional avatar overlay showing the initials of the last actor on the card.

### `src/lib/components/KanbanBoard.svelte`
Gains a "who is here" pill row in the board header, listing avatars of all active collaborators (those who sent a heartbeat within the last 90 seconds).

### `src/routes/+page.svelte`
Gains a first-visit name prompt and a persistent settings control (e.g., pencil icon) to change the display name.

### `src/lib/stores/labels.ts` and `theme.ts`
These stores are not mutation-heavy or identity-sensitive and MAY be left outside the sync loop in the initial implementation. Label changes in one tab will not automatically appear in another tab.

## Out of Scope

- **Cross-machine / cross-origin real-time sync**: No WebSocket server, no server-sent events, no CRDT library (e.g., Yjs, Automerge), no external service (Firebase, Supabase, Liveblocks). The constitution prohibits an external database and this change stays within that boundary.
- **Authentication and authorization**: No login, no sessions, no password protection, no role-based access. The `user-id` is a browser-local identifier only. Any tab on the same origin can read and write the board.
- **Conflict resolution beyond last-write-wins**: The BroadcastChannel transport delivers the full state snapshot. The most recently received message wins. No operational transform or CRDT merge logic is implemented.
- **Presence cursors or live typing indicators**: Showing where another user's mouse is, or streaming in-progress text as they type, is not part of this change.
- **Persistent collaborator history**: The list of who has ever contributed to a card is not stored beyond what already exists in `activityLog`. The avatars rendered in the UI reflect only currently active tabs (live presence), not historical contributors.
- **Label sync across tabs**: `labels.ts` mutations are not broadcast in this change. A label created in one tab will not appear in another tab until the page is reloaded.
- **Mobile or PWA offline support**: Service workers, background sync, and IndexedDB-based persistence strategies are not addressed here.
- **User profile images or custom avatars**: Avatars are initials on a deterministic color background only. No image upload.

---

### Scenarios

**Given** a user opens the board in two browser tabs on the same machine  
**When** they add a new card in tab A  
**Then** tab B MUST display the new card within 200 ms without requiring a page reload

---

**Given** a user has no `user-id` entry in `localStorage`  
**When** the app loads for the first time  
**Then** a `crypto.randomUUID()` MUST be generated, stored under `user-id`, and used as the collaborator identity for the lifetime of that browser profile

---

**Given** a user dismisses the first-visit name prompt without entering a name  
**When** their avatar is rendered  
**Then** the avatar MUST display `"AN"` (initials of `"Anonymous"`) on the deterministic color background

---

**Given** a user renames a column in tab A  
**When** the rename is committed  
**Then** `kanbanState` in tab B MUST reflect the new column title within 200 ms and the column title in `KanbanBoard.svelte` MUST re-render automatically

---

**Given** a user moves a card from column "To Do" to column "In Progress" in tab A  
**When** the card is dropped  
**Then** the `activityLog` entry appended to that card's `Todo` record MUST include `{ actorId: <userId> }` in its `detail` field, and tab B MUST show the card in "In Progress"

---

**Given** tab A and tab B both have the board open  
**When** tab B has not received a heartbeat from tab A for more than 90 seconds  
**Then** tab A's avatar MUST be removed from the "who is here" list in tab B

---

**Given** a user performs an undo action in tab A after receiving a remote mutation from tab B  
**When** `undo()` is called  
**Then** the undo MUST revert only tab A's own prior action and MUST NOT revert the remote mutation that arrived from tab B
