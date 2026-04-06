# notification-system-alerts-due

## Problem

Users have no way to know when something relevant has happened on the board unless they are actively looking at it. Three classes of events go silently unnoticed:

1. **Overdue cards**: A card's `dueDate` passes without any alert. `DueDateDisplay.svelte` shows overdue status visually, but only if the user is already looking at the card. There is no proactive signal.
2. **@mentions in comments**: Comments support free-text bodies, but there is no mechanism to parse `@name` patterns or notify the referenced collaborator that they were addressed.
3. **Board activity**: Card moves and column changes are recorded in `activityLog` but produce no real-time signal to other open tabs. A collaborator watching the board in a second tab has no awareness that the board changed beneath them.

Affected users: anyone using the kanban board across multiple browser tabs on the same machine, or anyone relying on due dates to manage work — which is the primary audience for a task-management board.

## Proposal

Add an in-browser notification system with three trigger sources and a toast-based UI.

**1. Toast notification UI**

A new `Toaster.svelte` component MUST be mounted at the `+page.svelte` root and render a vertically-stacked list of toast notifications anchored to the bottom-right corner of the viewport. Each toast MUST:
- Slide in from the right using a CSS transition on mount
- Auto-dismiss after 5 seconds unless the user hovers over it, in which case the countdown MUST pause and resume on mouse-leave
- Be manually dismissible via a close button
- Stack vertically with the most recent toast on top, up to a maximum of 5 visible toasts at once (oldest MUST be removed when the cap is exceeded)
- Display a title, a short message body, and an optional icon or color accent indicating notification type (overdue, mention, activity)

A `notifications` Svelte store MUST manage the active toast queue. It MUST expose `push(notification)` and `dismiss(id)` functions. Each notification record MUST carry `id`, `type` (`"overdue" | "mention" | "activity"`), `title`, `message`, and `createdAt`.

**2. Overdue due-date alerts**

A new module `src/lib/notifications/dueDateChecker.ts` MUST compare each non-archived todo's `dueDate` (ISO date string) against the current date on every check cycle. A todo is considered overdue when its `dueDate` is strictly before today's date and its `completed` field is `false`.

- The checker MUST run once on page load.
- The checker MUST repeat on a polling interval of 60 seconds.
- Each newly detected overdue todo MUST push exactly one toast notification per session — a todo that was already flagged as overdue on the previous check cycle MUST NOT produce a duplicate toast. The checker MUST maintain a `Set<string>` of todo IDs already notified during the current page session.
- The toast title MUST read `"Card Overdue"` and the message MUST include the card title.

**3. @mention detection in comments**

Comment submission logic in `todos.ts` MUST parse newly added comment bodies for `@name` tokens, where `name` matches any collaborator's `name` from the `collaborators` store (case-insensitive, whole-word boundary match).

- For each matched collaborator whose `id` equals the current user's `id` (i.e., the mention targets the local user), the system MUST push a mention toast.
- The toast title MUST read `"You were mentioned"` and the message MUST identify the card title and the commenter's display name.
- Mentions in edited comments MUST NOT re-trigger notifications. Only newly submitted comments trigger mention detection.
- The same rule applies to newly submitted replies.

**4. Board activity alerts**

`src/lib/sync/broadcastSync.ts` MUST be extended so that when a board-state message is received from another tab, the receiving tab MUST inspect the diff to detect:
- A card being moved from one column to another
- A column being renamed or a new column being added

For each such detected change, the receiving tab MUST push one activity toast. The toast title MUST read `"Board Updated"` and the message MUST describe the change (e.g., `"'Fix login bug' moved to Done"` or `"New column 'Backlog' added"`).

Activity toasts MUST NOT be generated for changes initiated by the current tab — only for changes received from other tabs over BroadcastChannel.

**5. Cross-tab notification sync**

The `notifications` store MUST participate in BroadcastChannel sync. When a notification is pushed in one tab (from any trigger source), all other open tabs MUST receive and display the same toast. This uses the existing `metta-todo-sync` channel and message-type convention established in `broadcastSync.ts`. A tab MUST NOT re-broadcast a notification it received from BroadcastChannel, preventing echo loops.

## Impact

- **`src/lib/stores/notifications.ts`** (new): manages the toast queue; exposes `push` and `dismiss`; integrates with BroadcastChannel
- **`src/lib/components/Toaster.svelte`** (new): renders the stacked toast list at bottom-right; handles auto-dismiss timer and hover-pause
- **`src/lib/components/Toast.svelte`** (new): individual toast component with slide-in transition, type accent, and close button
- **`src/lib/notifications/dueDateChecker.ts`** (new): polling loop; overdue detection; session-scoped deduplication set
- **`src/lib/stores/todos.ts`**: comment and reply submission functions gain @mention parsing logic; MUST import and call `notifications.push` for matched mentions
- **`src/lib/sync/broadcastSync.ts`**: extended to emit activity toasts on received board-state diffs; extended to relay notification messages across tabs
- **`src/routes/+page.svelte`**: mounts `<Toaster />` and initializes the due-date checker on component mount
- **`src/lib/components/DueDateDisplay.svelte`**: no logic changes required; overdue detection moves to `dueDateChecker.ts`

## Out of Scope

- **Pre-due-date reminders**: No alerts for "due in X hours/days". Notifications fire only when a card is already overdue.
- **Persistent notification history / inbox**: Dismissed toasts are gone. No bell icon, no unread count badge, no notification log panel.
- **Push notifications / service workers**: No browser Push API, no background sync, no notifications when the page is closed or the tab is not open.
- **Email or webhook delivery**: Notifications are in-browser only.
- **Per-user notification preferences**: No settings panel to mute specific notification types or cards.
- **@mention autocomplete in the comment input**: The mention parser fires on submission only. Inline `@` autocomplete while typing is a separate feature.
- **Mentions targeting other users across machines**: The mention system notifies only the local user when their own name is referenced. Cross-machine delivery requires a backend and is out of scope.
- **Sound or vibration alerts**: Audio and haptic feedback are not part of this change.
- **Mobile / responsive toast layout**: Toasts render at bottom-right on desktop. Responsive repositioning for small screens is not addressed here.

---

### Scenarios

**Given** the board has a card with `dueDate` set to yesterday and `completed: false`  
**When** the page loads  
**Then** the system MUST push exactly one `"overdue"` toast naming that card's title within the first render cycle

---

**Given** an overdue card was already flagged and toasted during the current page session  
**When** the 60-second polling interval fires again  
**Then** the system MUST NOT push a second toast for that same card

---

**Given** a card's `dueDate` is today or in the future  
**When** the due-date checker runs  
**Then** the system MUST NOT push an overdue toast for that card

---

**Given** a user submits a comment with the body `"@Alice can you review this?"`  
**When** `"Alice"` matches the current user's collaborator `name` (case-insensitive)  
**Then** the system MUST push exactly one `"mention"` toast with the title `"You were mentioned"` and a message identifying the card

---

**Given** a user edits an existing comment that already contains an @mention of the current user  
**When** the edit is saved  
**Then** the system MUST NOT push a mention toast

---

**Given** two browser tabs have the board open  
**When** a user in tab A moves card `"Fix login bug"` from column `"In Progress"` to column `"Done"`  
**Then** tab B MUST display an `"activity"` toast reading `"'Fix login bug' moved to Done"` within 200 ms

---

**Given** a card move originates in the current tab  
**When** the move completes  
**Then** the current tab MUST NOT display an activity toast for its own action

---

**Given** a toast notification has been visible for 5 seconds without user interaction  
**When** the auto-dismiss timer expires  
**Then** the toast MUST slide out and be removed from the DOM

---

**Given** a user moves their mouse cursor over an active toast  
**When** the hover begins before the 5-second timer expires  
**Then** the auto-dismiss countdown MUST pause, and MUST resume only after the cursor leaves the toast

---

**Given** 5 toasts are already visible in the stack  
**When** a sixth notification is pushed  
**Then** the oldest toast MUST be immediately removed and the new toast MUST appear at the top of the stack

---

**Given** a notification is pushed in tab A  
**When** tab B receives the BroadcastChannel message carrying that notification  
**Then** tab B MUST display the same toast and MUST NOT re-broadcast the notification to prevent echo loops
