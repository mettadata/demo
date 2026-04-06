# notification-system-alerts-due

## Requirement: notification_store

MUST export a Svelte writable store named  whose value is an array of  records. The store MUST expose three functions:  that appends a new record and returns its generated ;  that removes a record by ; and  that empties the array. Each  record MUST carry the fields  (UUID string),  (),  (string),  (string), and  (ISO 8601 string). When a new notification is pushed and the queue already contains 5 records, the store MUST remove the oldest record (lowest ) before appending the new one, so the array length never exceeds 5.

### Scenario: push adds a record and returns its id
- GIVEN the  store is empty
- WHEN  is called
- THEN the store value MUST contain exactly one record whose  is ,  is , and the returned string MUST equal that record's

### Scenario: dismiss removes the correct record
- GIVEN the  store holds two records with ids  and
- WHEN  is called
- THEN the store value MUST contain exactly one record with   and no record with

### Scenario: clearAll empties the store
- GIVEN the  store holds three records
- WHEN  is called
- THEN the store value MUST be an empty array

### Scenario: push at capacity evicts the oldest record
- GIVEN the  store holds 5 records where the record with   has the earliest
- WHEN  is called
- THEN the store value MUST contain exactly 5 records, the record with   MUST NOT be present, and the new record MUST be present

### Scenario: push below capacity does not evict
- GIVEN the  store holds 4 records
- WHEN  is called
- THEN the store value MUST contain exactly 5 records and all 4 previously existing records MUST still be present

### Scenario: dismiss on unknown id is a no-op
- GIVEN the  store holds one record with
- WHEN  is called
- THEN the store value MUST still contain the record with   and no error MUST be thrown


## Requirement: toast_component

MUST render a fixed-position container anchored to the bottom-right corner of the viewport () and display one  child per entry in the  store, stacked vertically with the most recent notification visually on top.  MUST accept props  (string),  (),  (string), and  (string). Each toast MUST slide in from the right using a CSS transition on mount. Each toast MUST display a close button that calls  when clicked. Each toast MUST render a visual accent (distinct color or icon) that varies by : overdue uses a red accent, mention uses a blue accent, and activity uses a yellow accent. The  component MUST be mounted once at the  root level.

### Scenario: toasts render in reverse chronological order
- GIVEN three notifications are in the store with  values T1 < T2 < T3
- WHEN  renders
- THEN the toast for T3 MUST appear visually above the toast for T1 in the stacked list

### Scenario: close button dismisses the toast
- GIVEN a toast with   is visible
- WHEN the user clicks its close button
- THEN  MUST be called, the toast MUST be removed from the DOM, and no other toasts MUST be affected

### Scenario: overdue toast has red accent
- GIVEN a notification with   is in the store
- WHEN  renders
- THEN the corresponding  MUST apply a red color class or style to its accent element

### Scenario: mention toast has blue accent
- GIVEN a notification with   is in the store
- WHEN  renders
- THEN the corresponding  MUST apply a blue color class or style to its accent element

### Scenario: activity toast has yellow accent
- GIVEN a notification with   is in the store
- WHEN  renders
- THEN the corresponding  MUST apply a yellow color class or style to its accent element

### Scenario: slide-in transition fires on mount
- GIVEN the  store is empty
- WHEN  adds a new notification
- THEN the newly rendered  MUST apply a CSS slide-in transition from the right on initial mount

### Scenario: Toaster is mounted at the page root
- GIVEN  is rendered
- WHEN the page loads
- THEN exactly one  element MUST be present in the DOM


## Requirement: overdue_detector

MUST export a function  that, when called, begins a polling cycle and returns a cleanup function that stops polling when invoked. On each cycle the checker MUST iterate over every  in the  store where  is ,  is , and  is a non-null ISO date string that is strictly less than today's date (compared as  strings using ). For each such todo, the checker MUST call  exactly once per page session. The checker MUST maintain a module-level  of todo  values already notified during the current session and MUST NOT call  again for any id already in that set. The checker MUST run its first cycle synchronously or within the first event loop tick after  is called, and MUST schedule subsequent cycles at an interval of exactly 60 000 milliseconds using .  MUST call  inside its  callback and MUST call the returned cleanup function in the  callback.

### Scenario: overdue card triggers toast on page load
- GIVEN a todo exists with  set to yesterday's date, , and
- WHEN the page mounts and  is called
- THEN exactly one notification MUST be pushed with  ,  , and  containing the todo's  field

### Scenario: overdue card does not produce a duplicate toast after the interval fires
- GIVEN a todo with  yesterday was already detected and added to the session set on the first cycle
- WHEN the 60-second polling interval fires a second time
- THEN no additional notification MUST be pushed for that todo

### Scenario: card due today is not treated as overdue
- GIVEN a todo exists with  equal to today's date in  format, , and
- WHEN the due-date checker runs
- THEN no  notification MUST be pushed for that todo

### Scenario: card due in the future is not treated as overdue
- GIVEN a todo exists with  set to tomorrow's date, , and
- WHEN the due-date checker runs
- THEN no  notification MUST be pushed for that todo

### Scenario: completed overdue card is skipped
- GIVEN a todo exists with  set to yesterday's date and
- WHEN the due-date checker runs
- THEN no  notification MUST be pushed for that todo

### Scenario: archived overdue card is skipped
- GIVEN a todo exists with  set to yesterday's date, , and
- WHEN the due-date checker runs
- THEN no  notification MUST be pushed for that todo

### Scenario: cleanup function stops polling
- GIVEN  has been called and returned a cleanup function
- WHEN the cleanup function is invoked
- THEN no further polling cycles MUST fire after that point

### Scenario: multiple overdue cards each produce one toast
- GIVEN two todos both have  set to yesterday, , and
- WHEN the due-date checker runs for the first time
- THEN exactly two notifications MUST be pushed, one for each todo


## Requirement: mention_parser

MUST export a pure function  that returns the list of collaborator names (lowercased) found in  as  tokens using a case-insensitive whole-word boundary regex of the form  for each name. The  function in  MUST, after writing the comment to the store, call  with the trimmed comment body and the current list of collaborator names from the  store. For each matched name whose corresponding collaborator  equals the current user's  from the  store,  MUST call . The same mention-detection logic MUST apply inside . The  and  functions MUST NOT trigger mention detection.

### Scenario: mention of current user fires a notification
- GIVEN the current user's name is  and a comment body is
- WHEN  is called
- THEN exactly one notification MUST be pushed with  ,  , and  containing the card's  and the commenter's display name

### Scenario: mention is case-insensitive
- GIVEN the current user's name is  and a comment body is
- WHEN  is called
- THEN exactly one  notification MUST be pushed for the current user

### Scenario: mention of another collaborator does not fire a notification
- GIVEN the current user's name is  and a comment body is
- WHEN  is called
- THEN no  notification MUST be pushed

### Scenario: editing a comment with a mention does not re-fire
- GIVEN a comment already contains the body
- WHEN  is called
- THEN no  notification MUST be pushed

### Scenario: mention in a reply fires a notification
- GIVEN the current user's name is  and a reply body is
- WHEN  is called
- THEN exactly one  notification MUST be pushed with

### Scenario: editing a reply with a mention does not re-fire
- GIVEN a reply already contains the body
- WHEN  is called
- THEN no  notification MUST be pushed

### Scenario: partial word match does not count as a mention
- GIVEN the current user's name is  and a comment body is
- WHEN  is called
- THEN no  notification MUST be pushed because  is not at a word boundary

### Scenario: multiple mentions in one comment body
- GIVEN the current user's name is  and the comment body is
- WHEN  is called
- THEN exactly one  notification MUST be pushed (not two), since one comment triggers at most one mention notification per matched user


## Requirement: board_activity_notifications

MUST be extended so that when a  message is received from another tab, the handler compares the incoming  payload against the local current kanban state to detect: (a) any card whose  differs between the previous and incoming state (card moved between columns), and (b) any column present in the incoming state whose  does not exist in the previous state (new column added) or whose  differs from the previous state (column renamed). For each detected change, the handler MUST call  on the  store with   and  . For a card move, the  MUST read . For a new column, the  MUST read . For a column rename, the  MUST read . Activity notifications MUST NOT be generated for  messages, only for  messages. The current tab MUST NOT generate activity toasts for its own mutations — only for messages received over .

### Scenario: card move in another tab triggers activity toast
- GIVEN two tabs both have the board open and tab B is listening on the  channel
- WHEN tab A moves card  from column  to column  and broadcasts the new kanban state
- THEN tab B MUST push exactly one notification with  ,  , and

### Scenario: card move in the current tab does not trigger an activity toast
- GIVEN the user moves a card within their own tab
- WHEN the kanban store broadcasts the updated state
- THEN the originating tab MUST NOT push any  notification, because the  does not deliver messages to the sender tab

### Scenario: new column in another tab triggers activity toast
- GIVEN tab B is listening and tab A adds a new column titled
- WHEN tab A broadcasts the updated kanban state
- THEN tab B MUST push exactly one notification with

### Scenario: column rename in another tab triggers activity toast
- GIVEN tab B is listening and tab A renames the column  to
- WHEN tab A broadcasts the updated kanban state
- THEN tab B MUST push exactly one notification with

### Scenario: todos-updated message does not trigger activity toast
- GIVEN tab B is listening
- WHEN tab A broadcasts a  message after editing a card title
- THEN tab B MUST NOT push any  notification

### Scenario: multiple simultaneous column changes produce one notification each
- GIVEN tab A simultaneously adds one column and renames another in a single state broadcast
- WHEN tab B receives the  message
- THEN tab B MUST push exactly two  notifications, one for the new column and one for the rename


## Requirement: notification_broadcast

The  store in  MUST participate in the existing  BroadcastChannel. The  union type in  MUST be extended with a new variant  and a variant . When  is called and the notification originates locally (not from a BroadcastChannel receive), the store MUST post a  message to the channel after appending the record. When  is called locally, the store MUST post a  message. When a tab receives a  message over BroadcastChannel, it MUST append the notification to its local store without re-broadcasting. When a tab receives a  message, it MUST call  locally without re-broadcasting. A tab MUST NOT re-broadcast any notification message it received from the channel, preventing infinite echo loops. The  store MUST accept an optional  flag (or equivalent internal mechanism) on its  and  calls to distinguish local from remote origins.

### Scenario: notification pushed in one tab appears in another tab
- GIVEN two tabs have the board open and both listen on
- WHEN tab A calls
- THEN tab B's  store MUST contain a record with   within 200 ms

### Scenario: receiving tab does not re-broadcast the notification
- GIVEN tab B receives a  message from tab A
- WHEN tab B appends the notification to its local store
- THEN tab B MUST NOT post any further  message to the BroadcastChannel, preventing echo loops

### Scenario: dismiss in one tab removes toast in another tab
- GIVEN a notification with   is visible in both tab A and tab B
- WHEN tab A calls
- THEN tab B MUST receive a  message and remove the record with   from its local store

### Scenario: receiving tab does not re-broadcast the dismiss
- GIVEN tab B receives a  message from tab A
- WHEN tab B removes the record from its local store
- THEN tab B MUST NOT post any further  message to the BroadcastChannel

### Scenario: broadcast is silently dropped when BroadcastChannel is unavailable
- GIVEN the browser does not support  and  is
- WHEN  is called
- THEN the notification MUST still be added to the local store and no error MUST be thrown


## Requirement: toast_auto_dismiss

Each  instance MUST start a 5 000-millisecond countdown on mount. When the countdown expires without interruption,  MUST call , which removes the toast from the store and triggers its exit transition. When the user moves the mouse cursor over the toast (), the countdown MUST be paused. When the cursor leaves the toast (), the countdown MUST resume from the remaining time, not restart from 5 000 ms. The countdown MUST be cleared via  /  in the component's  callback to prevent memory leaks and stale dismissals after the component is unmounted.

### Scenario: toast auto-dismisses after 5 seconds of no interaction
- GIVEN a toast is mounted with   and no user interaction occurs
- WHEN 5 000 ms elapse
- THEN  MUST be called and the toast MUST no longer be present in the DOM

### Scenario: hover pauses the auto-dismiss countdown
- GIVEN a toast has been visible for 3 000 ms with 2 000 ms remaining
- WHEN the user moves the mouse over the toast ()
- THEN the countdown MUST pause and MUST NOT call  during the hover

### Scenario: mouse-leave resumes countdown from remaining time
- GIVEN the countdown was paused with 2 000 ms remaining during a hover
- WHEN the user moves the mouse away from the toast ()
- THEN the countdown MUST resume and call  after the remaining 2 000 ms, not after 5 000 ms

### Scenario: close button dismisses before the timer expires
- GIVEN a toast has been visible for 1 000 ms with 4 000 ms remaining
- WHEN the user clicks the close button
- THEN  MUST be called immediately and the remaining countdown MUST be cancelled

### Scenario: timer is cleared on component destroy
- GIVEN a toast component is mounted and a timer is active
- WHEN the component is destroyed (e.g., the notification is removed from the store externally)
- THEN the pending timer MUST be cancelled via  or  and no stale  call MUST fire


## Requirement: toast_accessibility

MUST render an ARIA live region wrapping all toasts using  and  so that screen readers announce new toasts without interrupting in-progress speech. Each  close button MUST have an  of . Each  MUST include a visually-hidden text element (e.g., ) that concatenates  and  for screen reader consumption when the toast mounts. The close button in each  MUST be reachable and activatable via keyboard (Tab to focus, Enter or Space to activate). The live region container MUST NOT use  unless the notification  is , in which case  MAY remain  — assertive mode is explicitly excluded to avoid disrupting screen reader users.

### Scenario: ARIA live region announces new toast to screen readers
- GIVEN  is mounted with  and  on its container
- WHEN a new notification is pushed to the store
- THEN the newly rendered toast content MUST be within the live region so assistive technologies announce it automatically

### Scenario: close button has descriptive aria-label
- GIVEN a  is rendered
- WHEN the DOM is inspected
- THEN the close button MUST have

### Scenario: close button is keyboard-focusable and activatable
- GIVEN a toast is visible
- WHEN the user presses Tab until the close button receives focus and then presses Enter
- THEN  MUST be called and the toast MUST be removed from the DOM

### Scenario: screen-reader-only text includes title and message
- GIVEN a toast with   and   is rendered
- WHEN the DOM is inspected
- THEN a visually-hidden element (e.g., carrying ) MUST contain text that includes both  and

### Scenario: live region does not use assertive mode
- GIVEN  is rendered for any notification type
- WHEN the DOM is inspected
- THEN the live region container MUST NOT have  on any element
