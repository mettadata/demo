# multi-user-collaboration-real

## ADDED: Requirement: broadcast_sync_module

A new module `src/lib/sync/broadcastSync.ts` MUST be created. It MUST open a `BroadcastChannel` with the channel name `"metta-todo-sync"`. The module MUST export two typed message kinds: `"todos-updated"` carrying the full serialized `Todo[]` payload, and `"kanban-updated"` carrying the full serialized `KanbanState` payload. The module MUST export a `broadcastTodos(todos: Todo[]): void` function and a `broadcastKanban(state: KanbanState): void` function. The module MUST export a `listenForRemoteUpdates(onTodos: (t: Todo[]) => void, onKanban: (s: KanbanState) => void): () => void` function that returns an unsubscribe callback. A received message MUST NOT trigger a re-broadcast; the handler MUST apply the payload directly to the store without invoking any broadcast function, preventing echo loops.

### Scenario: add card in tab A, tab B receives update within 200 ms
- GIVEN two browser tabs (tab A and tab B) have the todo app open on the same origin
- WHEN `addTodo` is called in tab A
- THEN tab B's `todos` store MUST be updated with the new `Todo` within 200 ms and no page reload is required

### Scenario: broadcast does not echo back to the originating tab
- GIVEN `listenForRemoteUpdates` is active in tab A
- WHEN tab A calls `broadcastTodos` and the channel delivers the message back to tab A's own listener
- THEN the listener in tab A MUST NOT call `broadcastTodos` again, and the `todos` store in tab A MUST NOT be updated by its own outbound message

### Scenario: received payload replaces store state wholesale
- GIVEN tab B receives a `"todos-updated"` message with a payload containing five `Todo` items
- WHEN `onTodos` is called with that payload
- THEN tab B's `todos` store MUST be set to exactly those five items, overwriting any previous value

### Scenario: unsupported message type is ignored
- GIVEN `listenForRemoteUpdates` is active
- WHEN a `MessageEvent` arrives on the channel with an unknown `type` field
- THEN neither `onTodos` nor `onKanban` MUST be called and no error MUST be thrown

---

## ADDED: Requirement: collaborator_identity_store

A new Svelte store module `src/lib/stores/collaborators.ts` MUST be created. It MUST export a `Collaborator` interface with fields `id: string`, `name: string`, `color: string`, and `lastSeen: number` (Unix epoch milliseconds). The module MUST export a `self` derived or writable store holding the `Collaborator` record for the current user. On first load, when `localStorage` has no entry under the key `"user-id"`, the module MUST call `crypto.randomUUID()`, store the result under `"user-id"`, and use it as `self.id` for the lifetime of that browser profile. The `name` field MUST default to `"Anonymous"` when `localStorage` has no entry under `"user-name"`. Any update to `self.name` MUST persist the new value to `localStorage` under `"user-name"`. The `color` field MUST be a deterministic hex color string (e.g., `"#a3b4c5"`) derived solely from `self.id`; the same `id` MUST always produce the same `color` across page reloads and tabs. The module MUST export an `activeCollaborators` store of type `Writable<Collaborator[]>` holding records for remote users currently detected as present.

### Scenario: first-ever page load generates and persists a UUID
- GIVEN `localStorage` contains no entry for `"user-id"`
- WHEN `collaborators.ts` is first imported and its initialization runs
- THEN a UUID MUST be generated via `crypto.randomUUID()`, stored in `localStorage` under `"user-id"`, and `self.id` MUST equal that UUID

### Scenario: returning user reuses existing UUID
- GIVEN `localStorage` contains `"user-id"` equal to `"abc-123"`
- WHEN the app loads
- THEN `self.id` MUST equal `"abc-123"` and no new UUID MUST be generated

### Scenario: deterministic color is stable across reloads
- GIVEN a user whose `self.id` is `"abc-123"`
- WHEN `self.color` is read on two separate page loads
- THEN both reads MUST return the same hex string

### Scenario: name defaults to Anonymous when not set
- GIVEN `localStorage` has no entry for `"user-name"`
- WHEN `self.name` is read
- THEN it MUST equal `"Anonymous"`

### Scenario: name update persists to localStorage
- GIVEN the user's current name is `"Anonymous"`
- WHEN `self.name` is set to `"Alice"`
- THEN `localStorage.getItem("user-name")` MUST equal `"Alice"` and subsequent page loads MUST initialize `self.name` to `"Alice"`

---

## ADDED: Requirement: presence_heartbeat

The `collaborators.ts` module MUST broadcast a presence heartbeat message over BroadcastChannel on page load and every 30 seconds thereafter. The heartbeat message MUST carry at minimum the current user's `id`, `name`, `color`, and the current timestamp. Any tab that receives a heartbeat MUST upsert the sender into its `activeCollaborators` store, setting or refreshing `lastSeen` to the received timestamp. A `Collaborator` entry in `activeCollaborators` MUST be removed when the current wall-clock time exceeds `lastSeen` by more than 90 000 ms (90 seconds). The expiry check MUST run on a polling interval of at most 10 seconds so that stale entries are removed promptly. The module MUST expose a `destroyPresence(): void` function (or equivalent cleanup) that stops the heartbeat interval and closes the channel, to be called on component/store teardown.

### Scenario: heartbeat on page load registers self in another tab
- GIVEN tab B's `activeCollaborators` store is empty
- WHEN tab A loads and emits its initial heartbeat
- THEN tab B's `activeCollaborators` MUST contain a `Collaborator` entry for tab A's user within 200 ms

### Scenario: heartbeat refreshes lastSeen
- GIVEN tab A is already in tab B's `activeCollaborators` with `lastSeen` 25 seconds ago
- WHEN tab A emits its 30-second heartbeat
- THEN the entry for tab A in tab B's `activeCollaborators` MUST have an updated `lastSeen` reflecting the new heartbeat timestamp

### Scenario: stale collaborator is evicted after 90 seconds
- GIVEN tab A is in tab B's `activeCollaborators` with `lastSeen` 91 seconds ago
- WHEN the expiry check runs in tab B
- THEN tab A's entry MUST be removed from `activeCollaborators`

### Scenario: self is not added to activeCollaborators
- GIVEN the current tab emits a heartbeat
- WHEN the BroadcastChannel echoes it back (same-origin, same-tab listener)
- THEN `activeCollaborators` MUST NOT contain an entry whose `id` matches `self.id`

---

## MODIFIED: Requirement: todos_mutation_actor_id

All mutation functions exported from `src/lib/stores/todos.ts` — `addTodo`, `toggleTodo`, `removeTodo`, `updateTodo`, `archiveTodo`, `unarchiveTodo`, `addComment`, `editComment`, `deleteComment`, `addAttachment`, `removeAttachment`, `addReply`, `editReply`, and `deleteReply` — MUST accept an optional final parameter `actorId?: string`. When `actorId` is provided and the function appends an `ActivityEvent` to `activityLog`, that event's `detail` field MUST include `{ actorId }`. Existing callers that omit `actorId` MUST continue to work without modification. Functions that do not append an `ActivityEvent` (e.g., `removeTodo`, `deleteComment`, `deleteReply`, `editComment`, `editReply`) MAY accept but MUST NOT be required to embed `actorId` in any persistent field, since they do not produce activity entries.

### Scenario: addTodo with actorId embeds it in the created event
- GIVEN the current user's `id` is `"user-1"`
- WHEN `addTodo("Buy milk", "user-1")` is called
- THEN the new `Todo`'s `activityLog` MUST contain exactly one event with `type: "created"` and `detail.actorId === "user-1"`

### Scenario: toggleTodo with actorId embeds it in the completed/uncompleted event
- GIVEN a todo with `id` `"t-1"` exists and is not completed, and the caller provides `actorId` `"user-2"`
- WHEN `toggleTodo("t-1", "user-2")` is called
- THEN the appended `ActivityEvent` MUST have `type: "completed"` and `detail.actorId === "user-2"`

### Scenario: moveCard with actorId embeds it in the moved event
- GIVEN a todo `"t-1"` exists in column `"col-todo"` and the caller provides `actorId` `"user-3"`
- WHEN `moveCard("t-1", "col-in-progress", 0, "user-3")` is called
- THEN the appended `ActivityEvent` MUST have `type: "moved"` and `detail.actorId === "user-3"`

### Scenario: existing callers without actorId still function
- GIVEN an existing caller invokes `addTodo("task")` with no second argument
- WHEN the mutation executes
- THEN the `Todo` MUST be created successfully and `detail` on the `created` event MUST NOT contain an `actorId` key

### Scenario: archiveTodo with actorId embeds it in the archived event
- GIVEN a todo with `id` `"t-2"` exists
- WHEN `archiveTodo("t-2", "user-4")` is called
- THEN the appended `ActivityEvent` MUST have `type: "archived"` and `detail.actorId === "user-4"`

---

## MODIFIED: Requirement: kanban_mutations_broadcast

The mutation functions `moveCard`, `addColumn`, `renameColumn`, `deleteColumn`, and `applyTemplate` in `src/lib/stores/kanban.ts` MUST call `broadcastKanban(newState)` after each successful write to `kanbanState`. The broadcast MUST happen after the store has been updated so that the payload reflects the committed state. `moveCard` MUST additionally call `broadcastTodos(newTodos)` after appending the `moved` activity event to the affected `Todo`, because `todos` is also mutated as part of a cross-column move. The `moveColumn` function MAY also broadcast if it modifies column order; at minimum it SHOULD broadcast `kanbanState` for consistency.

### Scenario: renameColumn broadcasts updated kanbanState
- GIVEN tab A and tab B both have the board open
- WHEN `renameColumn("col-todo", "Backlog")` is called in tab A
- THEN tab B MUST receive a `"kanban-updated"` message and its `kanbanState` MUST reflect `title: "Backlog"` within 200 ms

### Scenario: addColumn broadcasts new column list
- GIVEN tab B has three columns
- WHEN `addColumn("Design Review")` is called in tab A
- THEN tab B's board MUST render four columns, including `"Design Review"`, within 200 ms

### Scenario: deleteColumn broadcasts updated kanbanState
- GIVEN tab A deletes a column and tab B has the same column visible
- WHEN `deleteColumn` completes in tab A
- THEN tab B's board MUST no longer render the deleted column within 200 ms

### Scenario: moveCard broadcasts both todos and kanbanState
- GIVEN tab B shows card `"t-1"` in column `"To Do"`
- WHEN `moveCard("t-1", "col-in-progress", 0)` is called in tab A
- THEN tab B MUST show `"t-1"` in `"In Progress"` within 200 ms, and the `activityLog` for `"t-1"` in tab B MUST include the `"moved"` event

---

## MODIFIED: Requirement: history_remote_bypass

Remote mutations received over BroadcastChannel MUST bypass the snapshot mechanism in `src/lib/stores/history.ts`. Specifically, the `todos.set(payload)` or `todos.update(...)` calls triggered by an inbound `"todos-updated"` message MUST NOT invoke `saveSnapshot()`. The `undoStack` and `redoStack` stores MUST remain local to each tab and MUST NOT be synchronized over BroadcastChannel. A call to `undo()` in tab A MUST revert only the most recent local action in tab A and MUST NOT affect tab B's state.

### Scenario: remote mutation does not pollute local undo stack
- GIVEN tab A has performed one local mutation (snapshot saved) and tab B then sends a remote `"todos-updated"` payload
- WHEN tab A receives and applies the remote payload
- THEN tab A's `undoStack` length MUST still be 1

### Scenario: undo reverts only the local action
- GIVEN tab A's `undoStack` contains one snapshot (from a local `addTodo`) and a remote mutation has since arrived
- WHEN `undo()` is called in tab A
- THEN tab A's `todos` store MUST revert to the snapshot before the local `addTodo`, not to the state before the remote mutation

### Scenario: redo is unaffected by remote mutations
- GIVEN tab A has undone a local action, placing a snapshot on the `redoStack`
- WHEN a remote `"todos-updated"` message arrives
- THEN `canRedo` MUST remain `true` in tab A and `redo()` MUST apply the previously undone local change

---

## ADDED: Requirement: first_visit_name_prompt

`src/routes/+page.svelte` MUST display a non-blocking name prompt on first visit when `localStorage` has no entry for `"user-name"`. The prompt MUST be rendered as a dismissible banner or modal that does not prevent interaction with the rest of the page. The prompt MUST contain a text input for a display name and a confirm button. The prompt MUST also offer a dismiss action that closes it without saving a name, leaving `self.name` as `"Anonymous"`. Submitting a non-empty name MUST call the name-update function from `collaborators.ts`, persist it to `localStorage`, and close the prompt. The prompt MUST NOT appear again after the user has either entered a name or explicitly dismissed it (the dismissal itself MUST set `"user-name"` to `"Anonymous"` in `localStorage` to prevent re-prompt on reload).

### Scenario: prompt appears on first load
- GIVEN `localStorage` contains no entry for `"user-name"`
- WHEN `+page.svelte` mounts
- THEN the name prompt MUST be visible

### Scenario: prompt does not appear when name is already stored
- GIVEN `localStorage` contains `"user-name"` equal to `"Alice"`
- WHEN `+page.svelte` mounts
- THEN the name prompt MUST NOT be visible

### Scenario: submitting a name closes the prompt and persists
- GIVEN the name prompt is visible
- WHEN the user types `"Bob"` and confirms
- THEN the prompt MUST close, `localStorage.getItem("user-name")` MUST equal `"Bob"`, and `self.name` MUST equal `"Bob"`

### Scenario: dismissing without a name uses Anonymous and suppresses re-prompt
- GIVEN the name prompt is visible
- WHEN the user dismisses it without entering a name
- THEN the prompt MUST close, `localStorage.getItem("user-name")` MUST equal `"Anonymous"`, and reloading the page MUST NOT show the prompt again

### Scenario: empty name submission is ignored
- GIVEN the name prompt is visible and the input field is empty or contains only whitespace
- WHEN the user attempts to confirm
- THEN the prompt MUST remain open and `"user-name"` MUST NOT be written to `localStorage`

---

## ADDED: Requirement: editable_name_in_header

`src/routes/+page.svelte` MUST render a persistent settings control in the page header that allows the user to change their display name at any time. The control MUST be accessible via keyboard. Activating the control MUST open an inline input or small popover pre-filled with the current `self.name`. Submitting a new non-empty name MUST update `self.name` and persist it to `localStorage` under `"user-name"`. The UI MUST reflect the updated name immediately after submission.

### Scenario: settings control is always visible in header
- GIVEN any user with any name (including `"Anonymous"`)
- WHEN `+page.svelte` is rendered
- THEN the name-edit control MUST be present in the page header DOM and reachable via Tab key navigation

### Scenario: activating the control shows current name
- GIVEN the user's current name is `"Carol"`
- WHEN the user activates the name-edit control
- THEN the input field MUST be pre-filled with `"Carol"`

### Scenario: submitting a new name updates the store and localStorage
- GIVEN the name-edit control is open with current name `"Carol"`
- WHEN the user changes the value to `"Dave"` and submits
- THEN `self.name` MUST equal `"Dave"`, `localStorage.getItem("user-name")` MUST equal `"Dave"`, and the header MUST display `"Dave"` as the active name

### Scenario: submitting an empty name is rejected
- GIVEN the name-edit control is open
- WHEN the user clears the input and submits
- THEN `self.name` MUST remain unchanged and `"user-name"` in `localStorage` MUST retain its previous value

---

## ADDED: Requirement: kanban_card_last_actor_avatar

`src/lib/components/KanbanCard.svelte` MUST render a small circular avatar overlay for the most recent actor on the card. The last actor is determined by finding the `ActivityEvent` in `todo.activityLog` with the highest `timestamp` whose `detail.actorId` is a non-empty string. If `activeCollaborators` contains an entry with `id` matching that `actorId`, the avatar MUST display the collaborator's initials (first letter of each word in `name`, up to two characters, uppercased) on a background colored with `collaborator.color`. If the `actorId` matches `self.id`, the avatar MUST still be rendered using `self.name` and `self.color`. If no matching `actorId` is found in any activity event, no avatar MUST be rendered. The avatar MUST include an `aria-label` stating the collaborator's display name.

### Scenario: card with actorId matching an active collaborator shows avatar
- GIVEN `todo.activityLog` contains a `"moved"` event with `detail.actorId: "user-1"` and `activeCollaborators` contains `{ id: "user-1", name: "Eve", color: "#aabbcc" }`
- WHEN `KanbanCard` renders
- THEN a circular avatar with initials `"E"` on background `"#aabbcc"` MUST be visible and have `aria-label` containing `"Eve"`

### Scenario: card where actorId matches self shows self avatar
- GIVEN the most recent activity event has `detail.actorId` equal to `self.id` and `self.name` is `"Frank"`
- WHEN `KanbanCard` renders
- THEN an avatar with initials derived from `"Frank"` MUST be rendered using `self.color`

### Scenario: card with no actorId in any event shows no avatar
- GIVEN `todo.activityLog` contains only a `"created"` event with no `detail.actorId`
- WHEN `KanbanCard` renders
- THEN no avatar element MUST be present in the card's DOM

### Scenario: initials are derived from collaborator name
- GIVEN a collaborator with `name: "Grace Hopper"`
- WHEN their avatar is rendered on a card
- THEN the initials displayed MUST be `"GH"`

### Scenario: single-word name produces one-character initial
- GIVEN a collaborator with `name: "Anonymous"`
- WHEN their avatar is rendered
- THEN the initials displayed MUST be `"AN"` (first two characters of the single word, uppercased)

---

## ADDED: Requirement: kanban_board_who_is_here

`src/lib/components/KanbanBoard.svelte` MUST render a "who is here" section in the board header area. This section MUST display one circular avatar per entry in `activeCollaborators`, plus one avatar for `self`, for a total of `activeCollaborators.length + 1` avatars when other users are present. Each avatar MUST use the same initials-on-color rendering as specified in the `kanban_card_last_actor_avatar` requirement. Each avatar MUST include an `aria-label` with the collaborator's display name. The self avatar MUST be visually distinguished (e.g., a ring or border) from remote collaborator avatars. When `activeCollaborators` is empty, only the self avatar MUST appear.

### Scenario: board header shows self avatar when alone
- GIVEN `activeCollaborators` is empty
- WHEN `KanbanBoard` renders
- THEN exactly one avatar MUST appear in the "who is here" section, representing `self`

### Scenario: board header shows remote collaborators
- GIVEN `activeCollaborators` contains two entries for `"Alice"` and `"Bob"`
- WHEN `KanbanBoard` renders
- THEN three avatars MUST be present: one for self, one for `"Alice"`, and one for `"Bob"`

### Scenario: collaborator removed from presence is removed from header
- GIVEN the "who is here" section shows avatars for self and `"Alice"`
- WHEN `"Alice"` is evicted from `activeCollaborators` due to 90-second expiry
- THEN `KanbanBoard` MUST re-render with only the self avatar in the "who is here" section

### Scenario: each avatar has accessible label
- GIVEN `KanbanBoard` renders with `self.name` `"Heidi"` and one remote collaborator `"Ivan"`
- WHEN the "who is here" section is inspected
- THEN each avatar element MUST have an `aria-label` attribute containing the respective collaborator's name

---

## Out of Scope

- Cross-machine or cross-origin real-time sync: no WebSocket server, server-sent events, CRDT library (Yjs, Automerge), or external service (Firebase, Supabase, Liveblocks) is introduced.
- Authentication and authorization: no login, sessions, passwords, or role-based access control. The `user-id` is a browser-local identifier only.
- Conflict resolution beyond last-write-wins: the most recently received BroadcastChannel message wins; no operational transform or CRDT merge logic is implemented.
- Presence cursors or live typing indicators: mouse position streaming or in-progress keystroke sharing is not part of this change.
- Persistent collaborator history: avatars reflect only currently active tabs (live presence), not historical contributors beyond what `activityLog` already records.
- Label sync across tabs: `src/lib/stores/labels.ts` mutations are not broadcast; a label created in one tab will not appear in another tab until page reload.
- Theme sync across tabs: `src/lib/stores/theme.ts` is not synchronized.
- Mobile or PWA offline support: service workers, background sync, and IndexedDB strategies are not addressed.
- User profile images or custom avatars: avatars are initials on a deterministic color background only; no image upload.
- `viewPreference` sync: the list/kanban view toggle state is not broadcast to other tabs.
