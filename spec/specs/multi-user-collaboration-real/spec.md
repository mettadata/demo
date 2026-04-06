# multi-user-collaboration-real

## Requirement: broadcast_sync_module

A new module  MUST be created. It MUST open a  with the channel name . The module MUST export two typed message kinds:  carrying the full serialized  payload, and  carrying the full serialized  payload. The module MUST export a  function and a  function. The module MUST export a  function that returns an unsubscribe callback. A received message MUST NOT trigger a re-broadcast; the handler MUST apply the payload directly to the store without invoking any broadcast function, preventing echo loops.

### Scenario: add card in tab A, tab B receives update within 200 ms
- GIVEN two browser tabs (tab A and tab B) have the todo app open on the same origin
- WHEN  is called in tab A
- THEN tab B's  store MUST be updated with the new  within 200 ms and no page reload is required

### Scenario: broadcast does not echo back to the originating tab
- GIVEN  is active in tab A
- WHEN tab A calls  and the channel delivers the message back to tab A's own listener
- THEN the listener in tab A MUST NOT call  again, and the  store in tab A MUST NOT be updated by its own outbound message

### Scenario: received payload replaces store state wholesale
- GIVEN tab B receives a  message with a payload containing five  items
- WHEN  is called with that payload
- THEN tab B's  store MUST be set to exactly those five items, overwriting any previous value

### Scenario: unsupported message type is ignored
- GIVEN  is active
- WHEN a  arrives on the channel with an unknown  field
- THEN neither  nor  MUST be called and no error MUST be thrown


## Requirement: collaborator_identity_store

A new Svelte store module  MUST be created. It MUST export a  interface with fields , , , and  (Unix epoch milliseconds). The module MUST export a  derived or writable store holding the  record for the current user. On first load, when  has no entry under the key , the module MUST call , store the result under , and use it as  for the lifetime of that browser profile. The  field MUST default to  when  has no entry under . Any update to  MUST persist the new value to  under . The  field MUST be a deterministic hex color string (e.g., ) derived solely from ; the same  MUST always produce the same  across page reloads and tabs. The module MUST export an  store of type  holding records for remote users currently detected as present.

### Scenario: first-ever page load generates and persists a UUID
- GIVEN  contains no entry for
- WHEN  is first imported and its initialization runs
- THEN a UUID MUST be generated via , stored in  under , and  MUST equal that UUID

### Scenario: returning user reuses existing UUID
- GIVEN  contains  equal to
- WHEN the app loads
- THEN  MUST equal  and no new UUID MUST be generated

### Scenario: deterministic color is stable across reloads
- GIVEN a user whose  is
- WHEN  is read on two separate page loads
- THEN both reads MUST return the same hex string

### Scenario: name defaults to Anonymous when not set
- GIVEN  has no entry for
- WHEN  is read
- THEN it MUST equal

### Scenario: name update persists to localStorage
- GIVEN the user's current name is
- WHEN  is set to
- THEN  MUST equal  and subsequent page loads MUST initialize  to


## Requirement: presence_heartbeat

The  module MUST broadcast a presence heartbeat message over BroadcastChannel on page load and every 30 seconds thereafter. The heartbeat message MUST carry at minimum the current user's , , , and the current timestamp. Any tab that receives a heartbeat MUST upsert the sender into its  store, setting or refreshing  to the received timestamp. A  entry in  MUST be removed when the current wall-clock time exceeds  by more than 90 000 ms (90 seconds). The expiry check MUST run on a polling interval of at most 10 seconds so that stale entries are removed promptly. The module MUST expose a  function (or equivalent cleanup) that stops the heartbeat interval and closes the channel, to be called on component/store teardown.

### Scenario: heartbeat on page load registers self in another tab
- GIVEN tab B's  store is empty
- WHEN tab A loads and emits its initial heartbeat
- THEN tab B's  MUST contain a  entry for tab A's user within 200 ms

### Scenario: heartbeat refreshes lastSeen
- GIVEN tab A is already in tab B's  with  25 seconds ago
- WHEN tab A emits its 30-second heartbeat
- THEN the entry for tab A in tab B's  MUST have an updated  reflecting the new heartbeat timestamp

### Scenario: stale collaborator is evicted after 90 seconds
- GIVEN tab A is in tab B's  with  91 seconds ago
- WHEN the expiry check runs in tab B
- THEN tab A's entry MUST be removed from

### Scenario: self is not added to activeCollaborators
- GIVEN the current tab emits a heartbeat
- WHEN the BroadcastChannel echoes it back (same-origin, same-tab listener)
- THEN  MUST NOT contain an entry whose  matches


## Requirement: first_visit_name_prompt

MUST display a non-blocking name prompt on first visit when  has no entry for . The prompt MUST be rendered as a dismissible banner or modal that does not prevent interaction with the rest of the page. The prompt MUST contain a text input for a display name and a confirm button. The prompt MUST also offer a dismiss action that closes it without saving a name, leaving  as . Submitting a non-empty name MUST call the name-update function from , persist it to , and close the prompt. The prompt MUST NOT appear again after the user has either entered a name or explicitly dismissed it (the dismissal itself MUST set  to  in  to prevent re-prompt on reload).

### Scenario: prompt appears on first load
- GIVEN  contains no entry for
- WHEN  mounts
- THEN the name prompt MUST be visible

### Scenario: prompt does not appear when name is already stored
- GIVEN  contains  equal to
- WHEN  mounts
- THEN the name prompt MUST NOT be visible

### Scenario: submitting a name closes the prompt and persists
- GIVEN the name prompt is visible
- WHEN the user types  and confirms
- THEN the prompt MUST close,  MUST equal , and  MUST equal

### Scenario: dismissing without a name uses Anonymous and suppresses re-prompt
- GIVEN the name prompt is visible
- WHEN the user dismisses it without entering a name
- THEN the prompt MUST close,  MUST equal , and reloading the page MUST NOT show the prompt again

### Scenario: empty name submission is ignored
- GIVEN the name prompt is visible and the input field is empty or contains only whitespace
- WHEN the user attempts to confirm
- THEN the prompt MUST remain open and  MUST NOT be written to


## Requirement: editable_name_in_header

MUST render a persistent settings control in the page header that allows the user to change their display name at any time. The control MUST be accessible via keyboard. Activating the control MUST open an inline input or small popover pre-filled with the current . Submitting a new non-empty name MUST update  and persist it to  under . The UI MUST reflect the updated name immediately after submission.

### Scenario: settings control is always visible in header
- GIVEN any user with any name (including )
- WHEN  is rendered
- THEN the name-edit control MUST be present in the page header DOM and reachable via Tab key navigation

### Scenario: activating the control shows current name
- GIVEN the user's current name is
- WHEN the user activates the name-edit control
- THEN the input field MUST be pre-filled with

### Scenario: submitting a new name updates the store and localStorage
- GIVEN the name-edit control is open with current name
- WHEN the user changes the value to  and submits
- THEN  MUST equal ,  MUST equal , and the header MUST display  as the active name

### Scenario: submitting an empty name is rejected
- GIVEN the name-edit control is open
- WHEN the user clears the input and submits
- THEN  MUST remain unchanged and  in  MUST retain its previous value


## Requirement: kanban_card_last_actor_avatar

MUST render a small circular avatar overlay for the most recent actor on the card. The last actor is determined by finding the  in  with the highest  whose  is a non-empty string. If  contains an entry with  matching that , the avatar MUST display the collaborator's initials (first letter of each word in , up to two characters, uppercased) on a background colored with . If the  matches , the avatar MUST still be rendered using  and . If no matching  is found in any activity event, no avatar MUST be rendered. The avatar MUST include an  stating the collaborator's display name.

### Scenario: card with actorId matching an active collaborator shows avatar
- GIVEN  contains a  event with  and  contains
- WHEN  renders
- THEN a circular avatar with initials  on background  MUST be visible and have  containing

### Scenario: card where actorId matches self shows self avatar
- GIVEN the most recent activity event has  equal to  and  is
- WHEN  renders
- THEN an avatar with initials derived from  MUST be rendered using

### Scenario: card with no actorId in any event shows no avatar
- GIVEN  contains only a  event with no
- WHEN  renders
- THEN no avatar element MUST be present in the card's DOM

### Scenario: initials are derived from collaborator name
- GIVEN a collaborator with
- WHEN their avatar is rendered on a card
- THEN the initials displayed MUST be

### Scenario: single-word name produces one-character initial
- GIVEN a collaborator with
- WHEN their avatar is rendered
- THEN the initials displayed MUST be  (first two characters of the single word, uppercased)


## Requirement: kanban_board_who_is_here

MUST render a "who is here" section in the board header area. This section MUST display one circular avatar per entry in , plus one avatar for , for a total of  avatars when other users are present. Each avatar MUST use the same initials-on-color rendering as specified in the  requirement. Each avatar MUST include an  with the collaborator's display name. The self avatar MUST be visually distinguished (e.g., a ring or border) from remote collaborator avatars. When  is empty, only the self avatar MUST appear.

### Scenario: board header shows self avatar when alone
- GIVEN  is empty
- WHEN  renders
- THEN exactly one avatar MUST appear in the "who is here" section, representing

### Scenario: board header shows remote collaborators
- GIVEN  contains two entries for  and
- WHEN  renders
- THEN three avatars MUST be present: one for self, one for , and one for

### Scenario: collaborator removed from presence is removed from header
- GIVEN the "who is here" section shows avatars for self and
- WHEN  is evicted from  due to 90-second expiry
- THEN  MUST re-render with only the self avatar in the "who is here" section

### Scenario: each avatar has accessible label
- GIVEN  renders with   and one remote collaborator
- WHEN the "who is here" section is inspected
- THEN each avatar element MUST have an  attribute containing the respective collaborator's name
- Cross-machine or cross-origin real-time sync: no WebSocket server, server-sent events, CRDT library (Yjs, Automerge), or external service (Firebase, Supabase, Liveblocks) is introduced.
- Authentication and authorization: no login, sessions, passwords, or role-based access control. The  is a browser-local identifier only.
- Conflict resolution beyond last-write-wins: the most recently received BroadcastChannel message wins; no operational transform or CRDT merge logic is implemented.
- Presence cursors or live typing indicators: mouse position streaming or in-progress keystroke sharing is not part of this change.
- Persistent collaborator history: avatars reflect only currently active tabs (live presence), not historical contributors beyond what  already records.
- Label sync across tabs:  mutations are not broadcast; a label created in one tab will not appear in another tab until page reload.
- Theme sync across tabs:  is not synchronized.
- Mobile or PWA offline support: service workers, background sync, and IndexedDB strategies are not addressed.
- User profile images or custom avatars: avatars are initials on a deterministic color background only; no image upload.
- sync: the list/kanban view toggle state is not broadcast to other tabs.
