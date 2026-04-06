# notification-system-alerts-due

## ADDED: Requirement: notification_store

`src/lib/stores/notifications.ts` MUST export a Svelte writable store named `notifications` whose value is an array of `Notification` records. The store MUST expose three functions: `push(notification: Omit<Notification, 'id' | 'createdAt'>): string` that appends a new record and returns its generated `id`; `dismiss(id: string): void` that removes a record by `id`; and `clearAll(): void` that empties the array. Each `Notification` record MUST carry the fields `id` (UUID string), `type` (`"overdue" | "mention" | "activity"`), `title` (string), `message` (string), and `createdAt` (ISO 8601 string). When a new notification is pushed and the queue already contains 5 records, the store MUST remove the oldest record (lowest `createdAt`) before appending the new one, so the array length never exceeds 5.

### Scenario: push adds a record and returns its id
- GIVEN the `notifications` store is empty
- WHEN `push({ type: 'overdue', title: 'Card Overdue', message: 'Fix login bug is overdue' })` is called
- THEN the store value MUST contain exactly one record whose `title` is `"Card Overdue"`, `type` is `"overdue"`, and the returned string MUST equal that record's `id`

### Scenario: dismiss removes the correct record
- GIVEN the `notifications` store holds two records with ids `"aaa"` and `"bbb"`
- WHEN `dismiss("aaa")` is called
- THEN the store value MUST contain exactly one record with `id` `"bbb"` and no record with `id` `"aaa"`

### Scenario: clearAll empties the store
- GIVEN the `notifications` store holds three records
- WHEN `clearAll()` is called
- THEN the store value MUST be an empty array

### Scenario: push at capacity evicts the oldest record
- GIVEN the `notifications` store holds 5 records where the record with `id` `"oldest"` has the earliest `createdAt`
- WHEN `push({ type: 'activity', title: 'Board Updated', message: 'New column added' })` is called
- THEN the store value MUST contain exactly 5 records, the record with `id` `"oldest"` MUST NOT be present, and the new record MUST be present

### Scenario: push below capacity does not evict
- GIVEN the `notifications` store holds 4 records
- WHEN `push({ type: 'mention', title: 'You were mentioned', message: 'Mentioned in Fix login bug' })` is called
- THEN the store value MUST contain exactly 5 records and all 4 previously existing records MUST still be present

### Scenario: dismiss on unknown id is a no-op
- GIVEN the `notifications` store holds one record with `id` `"aaa"`
- WHEN `dismiss("nonexistent")` is called
- THEN the store value MUST still contain the record with `id` `"aaa"` and no error MUST be thrown

---

## ADDED: Requirement: toast_component

`src/lib/components/Toaster.svelte` MUST render a fixed-position container anchored to the bottom-right corner of the viewport (`position: fixed; bottom: 1.5rem; right: 1.5rem`) and display one `Toast.svelte` child per entry in the `notifications` store, stacked vertically with the most recent notification visually on top. `src/lib/components/Toast.svelte` MUST accept props `id` (string), `type` (`"overdue" | "mention" | "activity"`), `title` (string), and `message` (string). Each toast MUST slide in from the right using a CSS transition on mount. Each toast MUST display a close button that calls `dismiss(id)` when clicked. Each toast MUST render a visual accent (distinct color or icon) that varies by `type`: overdue uses a red accent, mention uses a blue accent, and activity uses a yellow accent. The `Toaster.svelte` component MUST be mounted once at the `+page.svelte` root level.

### Scenario: toasts render in reverse chronological order
- GIVEN three notifications are in the store with `createdAt` values T1 < T2 < T3
- WHEN `Toaster.svelte` renders
- THEN the toast for T3 MUST appear visually above the toast for T1 in the stacked list

### Scenario: close button dismisses the toast
- GIVEN a toast with `id` `"abc"` is visible
- WHEN the user clicks its close button
- THEN `dismiss("abc")` MUST be called, the toast MUST be removed from the DOM, and no other toasts MUST be affected

### Scenario: overdue toast has red accent
- GIVEN a notification with `type` `"overdue"` is in the store
- WHEN `Toaster.svelte` renders
- THEN the corresponding `Toast.svelte` MUST apply a red color class or style to its accent element

### Scenario: mention toast has blue accent
- GIVEN a notification with `type` `"mention"` is in the store
- WHEN `Toaster.svelte` renders
- THEN the corresponding `Toast.svelte` MUST apply a blue color class or style to its accent element

### Scenario: activity toast has yellow accent
- GIVEN a notification with `type` `"activity"` is in the store
- WHEN `Toaster.svelte` renders
- THEN the corresponding `Toast.svelte` MUST apply a yellow color class or style to its accent element

### Scenario: slide-in transition fires on mount
- GIVEN the `notifications` store is empty
- WHEN `push(...)` adds a new notification
- THEN the newly rendered `Toast.svelte` MUST apply a CSS slide-in transition from the right on initial mount

### Scenario: Toaster is mounted at the page root
- GIVEN `src/routes/+page.svelte` is rendered
- WHEN the page loads
- THEN exactly one `<Toaster />` element MUST be present in the DOM

---

## ADDED: Requirement: overdue_detector

`src/lib/notifications/dueDateChecker.ts` MUST export a function `startDueDateChecker(): () => void` that, when called, begins a polling cycle and returns a cleanup function that stops polling when invoked. On each cycle the checker MUST iterate over every `Todo` in the `todos` store where `archived` is `false`, `completed` is `false`, and `dueDate` is a non-null ISO date string that is strictly less than today's date (compared as `YYYY-MM-DD` strings using `new Date().toISOString().split('T')[0]`). For each such todo, the checker MUST call `push({ type: 'overdue', title: 'Card Overdue', message: <card title> })` exactly once per page session. The checker MUST maintain a module-level `Set<string>` of todo `id` values already notified during the current session and MUST NOT call `push` again for any id already in that set. The checker MUST run its first cycle synchronously or within the first event loop tick after `startDueDateChecker()` is called, and MUST schedule subsequent cycles at an interval of exactly 60 000 milliseconds using `setInterval`. `src/routes/+page.svelte` MUST call `startDueDateChecker()` inside its `onMount` callback and MUST call the returned cleanup function in the `onDestroy` callback.

### Scenario: overdue card triggers toast on page load
- GIVEN a todo exists with `dueDate` set to yesterday's date, `completed: false`, and `archived: false`
- WHEN the page mounts and `startDueDateChecker()` is called
- THEN exactly one notification MUST be pushed with `type` `"overdue"`, `title` `"Card Overdue"`, and `message` containing the todo's `text` field

### Scenario: overdue card does not produce a duplicate toast after the interval fires
- GIVEN a todo with `dueDate` yesterday was already detected and added to the session set on the first cycle
- WHEN the 60-second polling interval fires a second time
- THEN no additional notification MUST be pushed for that todo

### Scenario: card due today is not treated as overdue
- GIVEN a todo exists with `dueDate` equal to today's date in `YYYY-MM-DD` format, `completed: false`, and `archived: false`
- WHEN the due-date checker runs
- THEN no `"overdue"` notification MUST be pushed for that todo

### Scenario: card due in the future is not treated as overdue
- GIVEN a todo exists with `dueDate` set to tomorrow's date, `completed: false`, and `archived: false`
- WHEN the due-date checker runs
- THEN no `"overdue"` notification MUST be pushed for that todo

### Scenario: completed overdue card is skipped
- GIVEN a todo exists with `dueDate` set to yesterday's date and `completed: true`
- WHEN the due-date checker runs
- THEN no `"overdue"` notification MUST be pushed for that todo

### Scenario: archived overdue card is skipped
- GIVEN a todo exists with `dueDate` set to yesterday's date, `completed: false`, and `archived: true`
- WHEN the due-date checker runs
- THEN no `"overdue"` notification MUST be pushed for that todo

### Scenario: cleanup function stops polling
- GIVEN `startDueDateChecker()` has been called and returned a cleanup function
- WHEN the cleanup function is invoked
- THEN no further polling cycles MUST fire after that point

### Scenario: multiple overdue cards each produce one toast
- GIVEN two todos both have `dueDate` set to yesterday, `completed: false`, and `archived: false`
- WHEN the due-date checker runs for the first time
- THEN exactly two notifications MUST be pushed, one for each todo

---

## ADDED: Requirement: mention_parser

`src/lib/stores/todos.ts` MUST export a pure function `parseMentions(body: string, collaboratorNames: string[]): string[]` that returns the list of collaborator names (lowercased) found in `body` as `@name` tokens using a case-insensitive whole-word boundary regex of the form `/(?<!\w)@(name)(?!\w)/gi` for each name. The `addComment` function in `todos.ts` MUST, after writing the comment to the store, call `parseMentions` with the trimmed comment body and the current list of collaborator names from the `collaborators` store. For each matched name whose corresponding collaborator `id` equals the current user's `id` from the `self` store, `addComment` MUST call `push({ type: 'mention', title: 'You were mentioned', message: 'Mentioned in <card title> by <commenter display name>' })`. The same mention-detection logic MUST apply inside `addReply`. The `editComment` and `editReply` functions MUST NOT trigger mention detection.

### Scenario: mention of current user fires a notification
- GIVEN the current user's name is `"Alice"` and a comment body is `"@Alice can you review this?"`
- WHEN `addComment(todoId, "@Alice can you review this?", actorId)` is called
- THEN exactly one notification MUST be pushed with `type` `"mention"`, `title` `"You were mentioned"`, and `message` containing the card's `text` and the commenter's display name

### Scenario: mention is case-insensitive
- GIVEN the current user's name is `"Alice"` and a comment body is `"@alice please check"`
- WHEN `addComment` is called
- THEN exactly one `"mention"` notification MUST be pushed for the current user

### Scenario: mention of another collaborator does not fire a notification
- GIVEN the current user's name is `"Alice"` and a comment body is `"@Bob can you help?"`
- WHEN `addComment` is called
- THEN no `"mention"` notification MUST be pushed

### Scenario: editing a comment with a mention does not re-fire
- GIVEN a comment already contains the body `"@Alice please check"`
- WHEN `editComment(todoId, commentId, "@Alice please check updated", actorId)` is called
- THEN no `"mention"` notification MUST be pushed

### Scenario: mention in a reply fires a notification
- GIVEN the current user's name is `"Alice"` and a reply body is `"@Alice follow up here"`
- WHEN `addReply(todoId, commentId, "@Alice follow up here", actorId)` is called
- THEN exactly one `"mention"` notification MUST be pushed with `type` `"mention"`

### Scenario: editing a reply with a mention does not re-fire
- GIVEN a reply already contains the body `"@Alice check this"`
- WHEN `editReply(todoId, commentId, replyId, "@Alice check this too", actorId)` is called
- THEN no `"mention"` notification MUST be pushed

### Scenario: partial word match does not count as a mention
- GIVEN the current user's name is `"Alice"` and a comment body is `"email@alicewonderland.com"`
- WHEN `addComment` is called
- THEN no `"mention"` notification MUST be pushed because `@alice` is not at a word boundary

### Scenario: multiple mentions in one comment body
- GIVEN the current user's name is `"Alice"` and the comment body is `"@Alice and @Alice please both confirm"`
- WHEN `addComment` is called
- THEN exactly one `"mention"` notification MUST be pushed (not two), since one comment triggers at most one mention notification per matched user

---

## ADDED: Requirement: board_activity_notifications

`src/lib/sync/broadcastSync.ts` MUST be extended so that when a `"kanban-updated"` message is received from another tab, the handler compares the incoming `KanbanState` payload against the local current kanban state to detect: (a) any card whose `columnId` differs between the previous and incoming state (card moved between columns), and (b) any column present in the incoming state whose `id` does not exist in the previous state (new column added) or whose `title` differs from the previous state (column renamed). For each detected change, the handler MUST call `push` on the `notifications` store with `type` `"activity"` and `title` `"Board Updated"`. For a card move, the `message` MUST read `"'<card title>' moved to <destination column title>"`. For a new column, the `message` MUST read `"New column '<column title>' added"`. For a column rename, the `message` MUST read `"Column renamed to '<new title>'"`. Activity notifications MUST NOT be generated for `"todos-updated"` messages, only for `"kanban-updated"` messages. The current tab MUST NOT generate activity toasts for its own mutations — only for messages received over `BroadcastChannel`.

### Scenario: card move in another tab triggers activity toast
- GIVEN two tabs both have the board open and tab B is listening on the `metta-todo-sync` channel
- WHEN tab A moves card `"Fix login bug"` from column `"In Progress"` to column `"Done"` and broadcasts the new kanban state
- THEN tab B MUST push exactly one notification with `type` `"activity"`, `title` `"Board Updated"`, and `message` `"'Fix login bug' moved to Done"`

### Scenario: card move in the current tab does not trigger an activity toast
- GIVEN the user moves a card within their own tab
- WHEN the kanban store broadcasts the updated state
- THEN the originating tab MUST NOT push any `"activity"` notification, because the `BroadcastChannel` does not deliver messages to the sender tab

### Scenario: new column in another tab triggers activity toast
- GIVEN tab B is listening and tab A adds a new column titled `"Backlog"`
- WHEN tab A broadcasts the updated kanban state
- THEN tab B MUST push exactly one notification with `message` `"New column 'Backlog' added"`

### Scenario: column rename in another tab triggers activity toast
- GIVEN tab B is listening and tab A renames the column `"Todo"` to `"Inbox"`
- WHEN tab A broadcasts the updated kanban state
- THEN tab B MUST push exactly one notification with `message` `"Column renamed to 'Inbox'"`

### Scenario: todos-updated message does not trigger activity toast
- GIVEN tab B is listening
- WHEN tab A broadcasts a `"todos-updated"` message after editing a card title
- THEN tab B MUST NOT push any `"activity"` notification

### Scenario: multiple simultaneous column changes produce one notification each
- GIVEN tab A simultaneously adds one column and renames another in a single state broadcast
- WHEN tab B receives the `"kanban-updated"` message
- THEN tab B MUST push exactly two `"activity"` notifications, one for the new column and one for the rename

---

## ADDED: Requirement: notification_broadcast

The `notifications` store in `src/lib/stores/notifications.ts` MUST participate in the existing `metta-todo-sync` BroadcastChannel. The `SyncMessage` union type in `broadcastSync.ts` MUST be extended with a new variant `{ type: 'notification-pushed'; payload: Notification }` and a variant `{ type: 'notification-dismissed'; payload: { id: string } }`. When `push(...)` is called and the notification originates locally (not from a BroadcastChannel receive), the store MUST post a `"notification-pushed"` message to the channel after appending the record. When `dismiss(id)` is called locally, the store MUST post a `"notification-dismissed"` message. When a tab receives a `"notification-pushed"` message over BroadcastChannel, it MUST append the notification to its local store without re-broadcasting. When a tab receives a `"notification-dismissed"` message, it MUST call `dismiss(id)` locally without re-broadcasting. A tab MUST NOT re-broadcast any notification message it received from the channel, preventing infinite echo loops. The `notifications` store MUST accept an optional `_fromChannel?: boolean` flag (or equivalent internal mechanism) on its `push` and `dismiss` calls to distinguish local from remote origins.

### Scenario: notification pushed in one tab appears in another tab
- GIVEN two tabs have the board open and both listen on `metta-todo-sync`
- WHEN tab A calls `push({ type: 'overdue', title: 'Card Overdue', message: 'Task A is overdue' })`
- THEN tab B's `notifications` store MUST contain a record with `title` `"Card Overdue"` within 200 ms

### Scenario: receiving tab does not re-broadcast the notification
- GIVEN tab B receives a `"notification-pushed"` message from tab A
- WHEN tab B appends the notification to its local store
- THEN tab B MUST NOT post any further `"notification-pushed"` message to the BroadcastChannel, preventing echo loops

### Scenario: dismiss in one tab removes toast in another tab
- GIVEN a notification with `id` `"xyz"` is visible in both tab A and tab B
- WHEN tab A calls `dismiss("xyz")`
- THEN tab B MUST receive a `"notification-dismissed"` message and remove the record with `id` `"xyz"` from its local store

### Scenario: receiving tab does not re-broadcast the dismiss
- GIVEN tab B receives a `"notification-dismissed"` message from tab A
- WHEN tab B removes the record from its local store
- THEN tab B MUST NOT post any further `"notification-dismissed"` message to the BroadcastChannel

### Scenario: broadcast is silently dropped when BroadcastChannel is unavailable
- GIVEN the browser does not support `BroadcastChannel` and `channel` is `null`
- WHEN `push(...)` is called
- THEN the notification MUST still be added to the local store and no error MUST be thrown

---

## ADDED: Requirement: toast_auto_dismiss

Each `Toast.svelte` instance MUST start a 5 000-millisecond countdown on mount. When the countdown expires without interruption, `Toast.svelte` MUST call `dismiss(id)`, which removes the toast from the store and triggers its exit transition. When the user moves the mouse cursor over the toast (`mouseenter`), the countdown MUST be paused. When the cursor leaves the toast (`mouseleave`), the countdown MUST resume from the remaining time, not restart from 5 000 ms. The countdown MUST be cleared via `clearTimeout` / `clearInterval` in the component's `onDestroy` callback to prevent memory leaks and stale dismissals after the component is unmounted.

### Scenario: toast auto-dismisses after 5 seconds of no interaction
- GIVEN a toast is mounted with `id` `"t1"` and no user interaction occurs
- WHEN 5 000 ms elapse
- THEN `dismiss("t1")` MUST be called and the toast MUST no longer be present in the DOM

### Scenario: hover pauses the auto-dismiss countdown
- GIVEN a toast has been visible for 3 000 ms with 2 000 ms remaining
- WHEN the user moves the mouse over the toast (`mouseenter`)
- THEN the countdown MUST pause and MUST NOT call `dismiss` during the hover

### Scenario: mouse-leave resumes countdown from remaining time
- GIVEN the countdown was paused with 2 000 ms remaining during a hover
- WHEN the user moves the mouse away from the toast (`mouseleave`)
- THEN the countdown MUST resume and call `dismiss` after the remaining 2 000 ms, not after 5 000 ms

### Scenario: close button dismisses before the timer expires
- GIVEN a toast has been visible for 1 000 ms with 4 000 ms remaining
- WHEN the user clicks the close button
- THEN `dismiss(id)` MUST be called immediately and the remaining countdown MUST be cancelled

### Scenario: timer is cleared on component destroy
- GIVEN a toast component is mounted and a timer is active
- WHEN the component is destroyed (e.g., the notification is removed from the store externally)
- THEN the pending timer MUST be cancelled via `clearTimeout` or `clearInterval` and no stale `dismiss` call MUST fire

---

## MODIFIED: Requirement: comment_mention_integration

The `addComment` function in `src/lib/stores/todos.ts` MUST be modified to import and use both the `self` store from `src/lib/stores/collaborators.ts` and the `activeCollaborators` store to build the full list of collaborator names against which the comment body is parsed. After writing the new comment record to the `todos` store, `addComment` MUST call `parseMentions(trimmed, allCollaboratorNames)` where `allCollaboratorNames` is the union of `get(self).name` and all names from `get(activeCollaborators)`. For each matched name that matches `get(self).name` (case-insensitive), the function MUST call `push` from the `notifications` store. The `addReply` function MUST apply the identical post-write logic. Neither `editComment` nor `editReply` MUST call `parseMentions` or `push`. The `actorId` parameter passed to `addComment` MUST be used as the commenter's display name source when constructing the `message` field, falling back to `get(self).name` if `actorId` does not resolve to a collaborator name.

### Scenario: addComment calls parseMentions after writing to store
- GIVEN the `todos` store contains a todo with `id` `"t1"` and `text` `"Fix login bug"`
- WHEN `addComment("t1", "@Alice check this", "actor-id-for-alice")` is called and `"Alice"` is the current user's name
- THEN the comment MUST appear in the todo's `comments` array AND a notification MUST be pushed in the same function call, confirming the write happens before mention detection

### Scenario: commenter name appears in the mention notification message
- GIVEN the current user's name is `"Alice"`, a collaborator named `"Bob"` (`id` `"bob-id"`) is active, and `Bob` submits a comment `"@Alice please review"`
- WHEN `addComment(todoId, "@Alice please review", "bob-id")` is called
- THEN the pushed notification's `message` MUST include both the card's `text` and `"Bob"` as the commenter's name

### Scenario: addReply triggers mention detection
- GIVEN the current user's name is `"Alice"` and a reply body is `"@alice lgtm"`
- WHEN `addReply(todoId, commentId, "@alice lgtm", actorId)` is called
- THEN a `"mention"` notification MUST be pushed

### Scenario: editComment does not import or invoke parseMentions path
- GIVEN the current user's name is `"Alice"` and an existing comment body is `"@Alice original"`
- WHEN `editComment(todoId, commentId, "@Alice updated", actorId)` is called
- THEN no `"mention"` notification MUST be pushed

---

## ADDED: Requirement: toast_accessibility

`Toaster.svelte` MUST render an ARIA live region wrapping all toasts using `role="status"` and `aria-live="polite"` so that screen readers announce new toasts without interrupting in-progress speech. Each `Toast.svelte` close button MUST have an `aria-label` of `"Dismiss notification"`. Each `Toast.svelte` MUST include a visually-hidden text element (e.g., `class="sr-only"`) that concatenates `title` and `message` for screen reader consumption when the toast mounts. The close button in each `Toast.svelte` MUST be reachable and activatable via keyboard (Tab to focus, Enter or Space to activate). The live region container MUST NOT use `aria-live="assertive"` unless the notification `type` is `"overdue"`, in which case `aria-live` MAY remain `"polite"` — assertive mode is explicitly excluded to avoid disrupting screen reader users.

### Scenario: ARIA live region announces new toast to screen readers
- GIVEN `Toaster.svelte` is mounted with `role="status"` and `aria-live="polite"` on its container
- WHEN a new notification is pushed to the store
- THEN the newly rendered toast content MUST be within the live region so assistive technologies announce it automatically

### Scenario: close button has descriptive aria-label
- GIVEN a `Toast.svelte` is rendered
- WHEN the DOM is inspected
- THEN the close button MUST have `aria-label="Dismiss notification"`

### Scenario: close button is keyboard-focusable and activatable
- GIVEN a toast is visible
- WHEN the user presses Tab until the close button receives focus and then presses Enter
- THEN `dismiss(id)` MUST be called and the toast MUST be removed from the DOM

### Scenario: screen-reader-only text includes title and message
- GIVEN a toast with `title` `"Card Overdue"` and `message` `"Task A is overdue"` is rendered
- WHEN the DOM is inspected
- THEN a visually-hidden element (e.g., carrying `class="sr-only"`) MUST contain text that includes both `"Card Overdue"` and `"Task A is overdue"`

### Scenario: live region does not use assertive mode
- GIVEN `Toaster.svelte` is rendered for any notification type
- WHEN the DOM is inspected
- THEN the live region container MUST NOT have `aria-live="assertive"` on any element
